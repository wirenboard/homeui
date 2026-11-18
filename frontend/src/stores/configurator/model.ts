import { findType, requiredRoles, ROLES } from './catalog';
import type {
  BuiltConfig,
  Config,
  ConfigDevice,
  ConfigService,
  Device,
  DeviceRow,
  Draft,
  EditorModel,
  LiveControls,
  OrigBinding,
  ParsedConfig,
  RoleId,
} from './types';

export const topicOf = (deviceId: string, controlId: string) => `/devices/${deviceId}/controls/${controlId}`;

export const parseTopic = (topic: string): { dev: string; ctl: string } | null => {
  const match = /^\/devices\/([^/]+)\/controls\/([^/]+)$/.exec(topic || '');
  return match ? { dev: match[1], ctl: match[2] } : null;
};

export const splitKey = (key: string): [string, string] => {
  const index = key.indexOf('/');
  return [key.slice(0, index), key.slice(index + 1)];
};

// Сериализация с отсортированными ключами — для сравнения моделей.
export const stable = (value: unknown): string => {
  if (Array.isArray(value)) {
    return `[${value.map(stable).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value === undefined ? null : value);
};

export const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

// Сервисы строки: привязанные роли в порядке описания типа и обязательные роли без привязки.
export const rowServices = (row: DeviceRow) => {
  const roles = findType(row.type).roles.map(([role]) => role).filter((role) => row.bind[role]);
  return {
    list: roles.map((role) => ({ role, key: row.bind[role] })),
    missing: requiredRoles(row.type, row.bind).filter((role) => !row.bind[role]),
  };
};

// Название карточки так, как оно пишется в module; '' у безымянной карточки без строк.
export const moduleName = (device: Pick<Device, 'name' | 'rows'>) =>
  device.name.trim() || (device.rows.length ? `own-${device.rows[0].did}` : '');

const isRole = (role: unknown): role is RoleId => typeof role === 'string' && role in ROLES;

// Конфиг -> модель: записи собираются в устройства по module, нераспознанные — в raw.
export const fromConfig = (config: Partial<Config> | null): ParsedConfig => {
  const devices: Device[] = [];
  const raw: unknown[] = [];
  const orig: ParsedConfig['orig'] = {};
  const mixed: Record<string, boolean> = {};
  const list = Array.isArray(config?.devices) ? config.devices : [];

  list.forEach((device: ConfigDevice) => {
    if (!device || typeof device !== 'object' || !findType(device.type)
      || !Array.isArray(device.services) || !device.services.length) {
      raw.push(device);
      return;
    }
    const services = device.services.map((service) => ({
      role: service?.role,
      topic: parseTopic(service?.binding?.state),
      service,
    }));
    if (!services.every((item) => item.topic && isRole(item.role))) {
      raw.push(device);
      return;
    }
    orig[device.did] = {};
    services.forEach(({ role, service }) => {
      orig[device.did][role] = { binding: service.binding, range: service.range };
    });
    const unit = services.find((item) => ROLES[item.role as RoleId]?.unit)?.service.unit;
    const matter = !!device.adapter_settings?.matter;
    const alice = !!device.adapter_settings?.alice;
    const bind: DeviceRow['bind'] = {};
    services.forEach((item) => {
      bind[item.role as RoleId] = `${item.topic.dev}/${item.topic.ctl}`;
    });
    const row: DeviceRow = {
      did: device.did, type: device.type, name: device.name || '', group: device.area || '', bind,
      ...(unit ? { unit } : {}),
    };

    const name = String(device.module || '').trim();
    const id = `module:${name}`;
    let target = devices.find((item) => item.id === id);
    if (!target) {
      target = { id, name, matter, alice, rows: [] };
      devices.push(target);
    } else if (target.matter !== matter || target.alice !== alice) {
      mixed[id] = true;
    }
    target.rows.push(row);
  });

  return { devices, raw, orig, mixed };
};

const toNumber = (value: unknown): number | undefined => {
  const parsed = Number(value);
  return value === undefined || value === null || value === '' || Number.isNaN(parsed) ? undefined : parsed;
};

const buildService = (
  sid: number, role: RoleId, deviceId: string, controlId: string, live: LiveControls, orig?: OrigBinding,
): ConfigService => {
  const topic = topicOf(deviceId, controlId);
  const meta = live.meta(deviceId, controlId);
  // Канал сейчас не публикуется — сохраняем исходную привязку без изменений.
  if (!meta && orig?.binding?.state === topic) {
    return orig.range ? { sid, role, binding: orig.binding, range: orig.range } : { sid, role, binding: orig.binding };
  }
  const binding: ConfigService['binding'] = { state: topic };
  if (ROLES[role].rw) {
    binding.command = `${topic}/on`;
  }
  if (ROLES[role].bool) {
    binding.transform = { type: 'boolean' };
  } else if (role === 'color') {
    binding.transform = { type: 'rgb_hs' };
  } else if (ROLES[role].scale && meta) {
    const min = toNumber(meta.min) ?? 0;
    const max = toNumber(meta.max);
    if (max !== undefined && (min !== 0 || max !== 100)) {
      binding.transform = { type: 'scale', from: { min, max }, to: { min: 0, max: 100 } };
    }
  }
  const service: ConfigService = { sid, role, binding };
  if (role === 'setting' && toNumber(meta?.max) !== undefined) {
    service.range = { min: toNumber(meta.min) ?? 0, max: toNumber(meta.max), step: toNumber(meta.step) ?? 1 };
  }
  if (role === 'color_temperature') {
    const low = toNumber(meta?.min);
    const high = toNumber(meta?.max);
    service.range = low !== undefined && high !== undefined
      ? { min: low, max: high, step: 100 }
      : { min: 2700, max: 6500, step: 100 };
  }
  return service;
};

// Модель -> конфиг. Устройства без канала для обязательной роли не пишутся, а попадают в drafts.
export const toConfig = (
  model: EditorModel & Pick<ParsedConfig, 'raw'>, live: LiveControls, orig: ParsedConfig['orig'],
): BuiltConfig => {
  let devices: ConfigDevice[] = [];
  const drafts: Draft[] = [];

  const makeDevice = (
    did: number, name: string, type: string, module: string, area: string, matter: boolean, alice: boolean,
    services: [RoleId, string, string][], rawUnit?: string,
  ): ConfigDevice => {
    const unit = rawUnit?.trim();
    return {
      did,
      name: name.trim() || `did ${did}`,
      type,
      module,
      ...(area?.trim() ? { area: area.trim() } : {}),
      adapter_settings: { matter, alice },
      services: services.map(([role, deviceId, controlId], index) => {
        const service = buildService(index + 1, role, deviceId, controlId, live, orig[did]?.[role]);
        return unit && ROLES[role].unit ? { ...service, unit } : service;
      }),
    };
  };

  model.devices.forEach((device) => {
    const module = moduleName(device);
    device.rows.forEach((row) => {
      const { list, missing } = rowServices(row);
      if (missing.length) {
        drafts.push({ name: row.name, role: missing[0] });
        return;
      }
      devices.push(makeDevice(
        row.did, row.name, row.type, module, row.group, device.matter, device.alice,
        list.map(({ role, key }) => [role, ...splitKey(key)]),
        row.unit,
      ));
    });
  });

  devices = devices.concat(model.raw as ConfigDevice[]);
  devices.sort((a, b) => (a?.did || 0) - (b?.did || 0));
  return { config: { version: '1.0', devices }, drafts };
};
