import { findType, requiredRoles, ROLES } from './catalog';
import type {
  BuiltConfig,
  Config,
  ConfigDevice,
  ConfigService,
  Draft,
  EditorModel,
  LiveControls,
  OrigBinding,
  OwnDevice,
  OwnRow,
  ParsedConfig,
  RoleId,
  WbChannel,
  WbDevice,
} from './types';

const SELF = '__self__';

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

// Роли канала устройства WB: основная плюс дополнительные из того же устройства.
export const channelServices = (channel: WbChannel) => {
  if (!channel.type) {
    return { list: [], missing: [] };
  }
  const bound: Partial<Record<RoleId, string>> = { [channel.prim]: SELF };
  Object.entries(channel.extra || {}).forEach(([role, controlId]) => {
    if (controlId && role !== channel.prim) {
      bound[role] = controlId;
    }
  });
  const missing = requiredRoles(channel.type, bound).filter((role) => !bound[role]);
  const list = findType(channel.type).roles
    .filter(([role]) => bound[role])
    .map(([role]) => ({ role, controlId: bound[role] }));
  return { list, missing };
};

export const ownRowServices = (row: OwnRow) => {
  const bound = row.bind || {};
  const missing = requiredRoles(row.type, bound).filter((role) => !bound[role]);
  const list = findType(row.type).roles
    .filter(([role]) => bound[role])
    .map(([role]) => ({ role, key: bound[role] }));
  return { list, missing };
};

const isRole = (role: unknown): role is RoleId => typeof role === 'string' && role in ROLES;

// Конфиг -> модель. В карточку устройства WB попадает запись, у которой все каналы из одного
// MQTT-устройства и module совпадает с ним; прочее собирается в созданные по module.
export const fromConfig = (config: Partial<Config> | null): ParsedConfig => {
  const wbs: WbDevice[] = [];
  const own: OwnDevice[] = [];
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
    const matter = !!device.adapter_settings?.matter;
    const alice = !!device.adapter_settings?.alice;
    const firstDev = services[0].topic.dev;
    const type = findType(device.type);

    if (services.every((item) => item.topic.dev === firstDev) && device.module === firstDev) {
      const prim = (type.roles.find(([role]) => services.some((item) => item.role === role))?.[0]
        ?? services[0].role) as RoleId;
      const primControl = services.find((item) => item.role === prim).topic.ctl;
      let wb = wbs.find((item) => item.id === firstDev);
      if (!wb) {
        wb = { id: firstDev, matter, alice, channels: {} };
        wbs.push(wb);
      } else if (wb.matter !== matter || wb.alice !== alice) {
        mixed[firstDev] = true;
      }
      if (wb.channels[primControl]) {
        raw.push(device);
        return;
      }
      const extra: WbChannel['extra'] = {};
      services.forEach((item) => {
        if (item.role !== prim) {
          extra[item.role as RoleId] = item.topic.ctl;
        }
      });
      wb.channels[primControl] = {
        did: device.did, name: device.name || '', type: device.type, group: device.area || '', prim, extra,
      };
      return;
    }

    const name = String(device.module || '').trim();
    const id = `own:${name}`;
    let ownDevice = own.find((item) => item.id === id);
    if (!ownDevice) {
      ownDevice = { id, name, matter, alice, rows: [] };
      own.push(ownDevice);
    } else if (ownDevice.matter !== matter || ownDevice.alice !== alice) {
      mixed[id] = true;
    }
    const bind: OwnRow['bind'] = {};
    services.forEach((item) => {
      bind[item.role as RoleId] = `${item.topic.dev}/${item.topic.ctl}`;
    });
    ownDevice.rows.push({
      did: device.did, type: device.type, name: device.name || '', group: device.area || '', bind,
    });
  });

  return { wbs, own, raw, orig, mixed };
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
    services: [RoleId, string, string][],
  ): ConfigDevice => {
    return {
      did,
      name: name.trim() || `did ${did}`,
      type,
      module,
      ...(area?.trim() ? { area: area.trim() } : {}),
      adapter_settings: { matter, alice },
      services: services.map(([role, deviceId, controlId], index) =>
        buildService(index + 1, role, deviceId, controlId, live, orig[did]?.[role])),
    };
  };

  model.wbs.forEach((wb) => {
    Object.entries(wb.channels).forEach(([controlId, channel]) => {
      const { list, missing } = channelServices(channel);
      if (!channel.type || missing.length) {
        drafts.push({ name: channel.name, role: missing[0] ?? null });
        return;
      }
      devices.push(makeDevice(
        channel.did, channel.name, channel.type, wb.id, channel.group, wb.matter, wb.alice,
        list.map(({ role, controlId: bound }) => [role, wb.id, bound === SELF ? controlId : bound]),
      ));
    });
  });

  model.own.forEach((ownDevice) => {
    ownDevice.rows.forEach((row) => {
      const { list, missing } = ownRowServices(row);
      if (missing.length) {
        drafts.push({ name: row.name, role: missing[0] });
        return;
      }
      const module = ownDevice.name.trim() || `own-${ownDevice.rows[0].did}`;
      devices.push(makeDevice(
        row.did, row.name, row.type, module, row.group, ownDevice.matter, ownDevice.alice,
        list.map(({ role, key }) => [role, ...splitKey(key)]),
      ));
    });
  });

  devices = devices.concat(model.raw as ConfigDevice[]);
  devices.sort((a, b) => (a?.did || 0) - (b?.did || 0));
  return { config: { version: '1.0', devices }, drafts };
};
