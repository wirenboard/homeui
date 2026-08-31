import type { DeviceDraft } from '@/stores/configurator';
import type { Cell } from '@/stores/devices';
import { roleDef } from './roles';
import { DEVICE_TYPES } from './templates';
import type { Config, ConfigBinding, ConfigDevice, ConfigService, DeviceType, Range, TransformSpec } from './types';

// Роли с девайс-зависимой шкалой: range берётся из /meta и хранится в конфиге.
// Фиксированные шкалы (brightness/position) range не хранят — их несёт transform (scale).
const DEVICE_RANGE_ROLES = new Set(['color_temperature', 'target_temperature']);

export function typeById(id: string): DeviceType | undefined {
  return DEVICE_TYPES.find((type) => type.id === id);
}

// Тип устройства по подсказанной роли — для «создать из контрола» одним кликом.
// Многоролевые (brightness/color/CT) заводят `light` с одним слотом; остальное дособирается в карточке.
const ROLE_TYPE: Record<string, string> = {
  on_off: 'switch',
  brightness: 'light',
  color: 'light',
  color_temperature: 'light',
  temperature: 'temperature_sensor',
  humidity: 'humidity_sensor',
  co2: 'co2_sensor',
  illuminance: 'illuminance_sensor',
  motion: 'motion_sensor',
  occupancy: 'occupancy_sensor',
  contact: 'contact_sensor',
  leak: 'leak_sensor',
  smoke: 'smoke_sensor',
  power: 'power_sensor',
  energy: 'energy_meter',
  position: 'cover',
  press: 'button',
};

export function defaultTypeForRole(role: string): string | undefined {
  return ROLE_TYPE[role];
}

// Обязательные роли: всегда-required + условные (requires сработал — зависящий слот привязан).
export function requiredRoles(device: DeviceDraft, type: DeviceType): Set<string> {
  const roles = new Set<string>();
  type.slots.forEach((slot) => {
    if (slot.required) {
      roles.add(slot.role);
    }
    if (device.bindings[slot.role] && slot.requires) {
      slot.requires.forEach((role) => roles.add(role));
    }
  });
  return roles;
}

export function isReady(device: DeviceDraft, type: DeviceType): boolean {
  return [...requiredRoles(device, type)].every((role) => Boolean(device.bindings[role]));
}

// Итоговый диапазон: правка оператора → фикс. шкала роли → /meta (для девайс-зависимых) → дефолт.
export function resolveRange(role: string, cell: Cell, override?: Range): Range | undefined {
  if (override) {
    return override;
  }
  const def = roleDef(role);
  if (def.fixedScale && def.range) {
    return def.range;
  }
  if (DEVICE_RANGE_ROLES.has(role)) {
    if (cell.min !== undefined && cell.max !== undefined) {
      return { min: cell.min, max: cell.max, step: cell.step ?? def.range?.step ?? 1 };
    }
    return def.range;
  }
  return undefined;
}

function buildBinding(role: string, cell: Cell): ConfigBinding {
  const def = roleDef(role);
  const binding: ConfigBinding = { state: cell.topic };
  if (def.access === 'readwrite') {
    binding.command = `${cell.topic}/on`;
  }
  let transform: TransformSpec | undefined;
  if (def.value_type === 'bool') {
    transform = { type: 'boolean' };
  } else if (def.value_type === 'color') {
    transform = { type: 'rgb_hs' };
  } else if (def.fixedScale && def.range && cell.min !== undefined && cell.max !== undefined
    && (cell.min !== def.range.min || cell.max !== def.range.max)) {
    transform = {
      type: 'scale',
      from: { min: cell.min, max: cell.max },
      to: { min: def.range.min, max: def.range.max },
    };
  }
  if (transform) {
    binding.transform = transform;
  }
  return binding;
}

function buildService(sid: number, role: string, cell: Cell, override?: Range): ConfigService {
  const service: ConfigService = { sid, role, binding: buildBinding(role, cell) };
  if (DEVICE_RANGE_ROLES.has(role)) {
    const range = resolveRange(role, cell, override);
    if (range) {
      service.range = range;
    }
  }
  return service;
}

// Обратная развёртка: сохранённый конфиг → черновики редактора. Привязки восстанавливаются по
// топику (binding.state → id контрола среди обнаруженных); если контрол сейчас недоступен, слот
// останется непривязанным. range и настройки адаптеров переносятся как есть.
export function draftsFromConfig(config: Config, cellByTopic: Map<string, string>): DeviceDraft[] {
  return config.devices.map((device) => {
    const bindings: Record<string, string> = {};
    const ranges: Record<string, Range> = {};
    device.services.forEach((service) => {
      const cellId = cellByTopic.get(service.binding.state);
      if (cellId) {
        bindings[service.role] = cellId;
      }
      if (service.range) {
        ranges[service.role] = service.range;
      }
    });
    return {
      did: device.did,
      name: device.name,
      type: device.type,
      module: device.module,
      area: device.area,
      adapters: { ...(device.adapter_settings ?? {}) },
      bindings,
      ranges,
    };
  });
}

// Черновик → плоский конфиг. Экспортируются только готовые устройства с заданным module;
// сервисы = привязанные слоты типа (в порядке слотов), sid = 1..n.
export function buildConfig(devices: DeviceDraft[], cellById: Map<string, Cell>): Config {
  const config: Config = { version: '1.0', devices: [] };

  devices.forEach((device) => {
    const type = typeById(device.type);
    if (!type || !device.module.trim() || !isReady(device, type)) {
      return;
    }
    const services: ConfigService[] = [];
    type.slots.forEach((slot) => {
      const cellId = device.bindings[slot.role];
      const cell = cellId ? cellById.get(cellId) : undefined;
      if (!cell) {
        return;
      }
      services.push(buildService(services.length + 1, slot.role, cell, device.ranges[slot.role]));
    });
    if (services.length === 0) {
      return;
    }
    const built: ConfigDevice = {
      did: device.did,
      name: device.name.trim() || `did ${device.did}`,
      type: device.type,
      module: device.module.trim(),
      ...(device.area?.trim() ? { area: device.area.trim() } : {}),
      adapter_settings: device.adapters,
      services,
    };
    config.devices.push(built);
  });

  return config;
}
