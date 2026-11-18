import { classify, hasUnit, primaryRole, requiredRoles } from './catalog';
import { fromConfig, stable, toConfig } from './model';
import type { Config, ControlMeta, Device, LiveControls } from './types';

const liveOf = (controls: Record<string, ControlMeta>): LiveControls => ({
  meta: (deviceId, controlId) => controls[`${deviceId}/${controlId}`] ?? null,
});

const device = (fields: Partial<Device>): Device =>
  ({ id: 'd', name: 'd', matter: true, alice: true, rows: [], ...fields });

const relayConfig: Config = {
  version: '1.0',
  devices: [{
    did: 10,
    name: 'Реле',
    type: 'switch',
    module: 'wb-gpio',
    area: 'Прихожая',
    adapter_settings: { matter: true, alice: false },
    services: [{
      sid: 1,
      role: 'on_off',
      binding: {
        state: '/devices/wb-gpio/controls/A1_OUT',
        command: '/devices/wb-gpio/controls/A1_OUT/on',
        transform: { type: 'boolean' },
      },
    }],
  }],
};

describe('classify', () => {
  it('maps control meta to channel classes', () => {
    expect(classify({ type: 'switch' }).cls).toBe('bin_rw');
    expect(classify({ type: 'switch', readonly: true }).cls).toBe('bin_r');
    expect(classify({ type: 'value', units: 'deg C' }).cls).toBe('temp');
    expect(classify({ type: 'temperature' }).cls).toBe('temp');
    expect(classify({ type: 'range' }).cls).toBe('level');
    expect(classify({ type: 'range', max: 254 }).cls).toBe('level');
    expect(classify({ id: 'battery', type: 'value', readonly: true, units: '%' }))
      .toEqual({ cls: 'battery', why: 'battery' });
    expect(classify({ id: 'battery_temperature', type: 'value', readonly: true, units: 'deg C' }).cls).toBe('temp');
    expect(classify({ type: 'text', readonly: true, isEnum: true, enumKeys: ['single', 'double', 'long'] }))
      .toEqual({ cls: 'press' });
  });

  it('turns any number without its own type into a numeric sensor or setting with units', () => {
    expect(classify({ id: 'occupancy_level', type: 'value', readonly: true })).toEqual({ cls: 'number', units: '' });
    expect(classify({ type: 'value', readonly: true, units: 'V' })).toEqual({ cls: 'number', units: 'V' });
    expect(classify({ id: 'Noise Level (dBA)', type: 'value', readonly: true }))
      .toEqual({ cls: 'number', units: 'dBA' });
    expect(classify({ id: 'LED Period (s)', type: 'range', max: 10 })).toEqual({ cls: 'setting', units: 's' });
    expect(classify({ id: 'noise_timeout', type: 'range', units: 's', max: 2000 }))
      .toEqual({ cls: 'setting', units: 's' });
    expect(classify({ type: 'value', units: 'V' })).toEqual({ cls: 'setting', units: 'V' });
    expect(classify({ type: 'voltage', readonly: true, valueType: 'number', units: 'V' }))
      .toEqual({ cls: 'number', units: 'V' });
  });

  it('keeps non-numeric legacy and unknown types out of numeric classes', () => {
    expect(classify({ type: 'wo-switch', valueType: 'boolean' })).toEqual({ cls: 'none', why: 'none' });
    expect(classify({ type: 'local_time', valueType: 'string' })).toEqual({ cls: 'none', why: 'none' });
    expect(classify({ type: 'something_new' })).toEqual({ cls: 'none', why: 'none' });
  });

  it('explains why a control has no type', () => {
    expect(classify({ id: 'available', type: 'switch', readonly: true })).toEqual({ cls: 'none', why: 'availability' });
    expect(classify({ id: 'linkquality', type: 'value', readonly: true })).toEqual({ cls: 'none', why: 'service' });
    expect(classify({ id: 'serial_number', type: 'value', readonly: true })).toEqual({ cls: 'none', why: 'service' });
    expect(classify({ id: 'Modbus Slave ID', type: 'value', readonly: true })).toEqual({ cls: 'none', why: 'service' });
    expect(classify({ type: 'switch', isEnum: true })).toEqual({ cls: 'none', why: 'enum' });
    expect(classify({ type: 'text', readonly: true, isEnum: true, enumKeys: ['Battery', 'Mains'] }))
      .toEqual({ cls: 'none', why: 'enum' });
    expect(classify({ type: 'text' })).toEqual({ cls: 'none', why: 'text' });
  });
});

describe('catalog roles', () => {
  it('picks the role the channel class fits', () => {
    expect(primaryRole('light', 'level')).toBe('brightness');
    expect(primaryRole('light', 'bin_rw')).toBe('on_off');
    expect(primaryRole('cover')).toBe('position');
  });

  it('marks only numeric sensor and setting types as having units', () => {
    expect(hasUnit('number_sensor')).toBe(true);
    expect(hasUnit('number_setting')).toBe(true);
    expect(hasUnit('temperature_sensor')).toBe(false);
    expect(hasUnit('')).toBe(false);
  });

  it('requires brightness once a light has a color', () => {
    expect(requiredRoles('light', {})).toEqual(['on_off']);
    expect(requiredRoles('light', { color: 'x' })).toEqual(['on_off', 'brightness']);
  });
});

describe('fromConfig / toConfig', () => {
  it('round-trips a device without changes', () => {
    const parsed = fromConfig(relayConfig);
    expect(parsed.devices).toHaveLength(1);
    expect(parsed.devices[0]).toMatchObject({ id: 'module:wb-gpio', name: 'wb-gpio', matter: true, alice: false });
    expect(parsed.devices[0].rows[0]).toMatchObject({
      did: 10, name: 'Реле', group: 'Прихожая', bind: { on_off: 'wb-gpio/A1_OUT' },
    });

    const live = liveOf({ 'wb-gpio/A1_OUT': { type: 'switch' } });
    const built = toConfig(parsed, live, parsed.orig);
    expect(stable(built.config)).toBe(stable(relayConfig));
    expect(built.drafts).toEqual([]);
  });

  it('keeps unrecognized entries and the binding of a control that is offline', () => {
    const unknown = { did: 30, name: 'X', type: 'thermostat', module: 'm', services: [] };
    const parsed = fromConfig({ ...relayConfig, devices: [...relayConfig.devices, unknown] });
    expect(parsed.raw).toEqual([unknown]);

    const built = toConfig(parsed, liveOf({}), parsed.orig);
    expect(built.config.devices[0].services[0].binding).toEqual(relayConfig.devices[0].services[0].binding);
    expect(built.config.devices[1]).toEqual(unknown);
  });

  it('puts entries with an unknown role or a foreign topic into raw', () => {
    const badRole = {
      did: 11, name: 'A', type: 'switch', module: 'm',
      services: [{ sid: 1, role: 'rotate', binding: { state: '/devices/d/controls/c' } }],
    };
    const badTopic = {
      did: 12, name: 'B', type: 'switch', module: 'm',
      services: [{ sid: 1, role: 'on_off', binding: { state: 'zigbee2mqtt/lamp/state' } }],
    };
    const parsed = fromConfig({ version: '1.0', devices: [badRole, badTopic] as Config['devices'] });
    expect(parsed.devices).toEqual([]);
    expect(parsed.raw).toEqual([badRole, badTopic]);
  });

  it('groups entries by module into one device with their dids, even with channels from several devices', () => {
    const entry = (did: number, module: string, state: string, matter = true) => ({
      did, name: `n${did}`, type: 'switch', module, adapter_settings: { matter, alice: true },
      services: [{ sid: 1, role: 'on_off', binding: { state } }],
    });
    const parsed = fromConfig({
      version: '1.0',
      devices: [
        entry(10, 'wb-mr6c_1', '/devices/wb-mr6c_1/controls/K1'),
        entry(11, 'Кухня', '/devices/relay/controls/K1'),
        entry(12, 'wb-mr6c_1', '/devices/wb-mr6c_1/controls/K2'),
        entry(13, 'Кухня', '/devices/dimmer/controls/K1', false),
      ] as Config['devices'],
    });

    expect(parsed.devices.map((item) => [item.name, item.rows.map((row) => row.did)])).toEqual([
      ['wb-mr6c_1', [10, 12]],
      ['Кухня', [11, 13]],
    ]);
    expect(parsed.devices[1].rows[1].bind).toEqual({ on_off: 'dimmer/K1' });
    expect(parsed.mixed).toEqual({ 'module:Кухня': true });
  });

  it('writes the roles in the order of the type definition and reads them back', () => {
    const live = liveOf({ 'mdm/K1': { type: 'switch' }, 'mdm/Channel 1': { type: 'range', max: 100 } });
    const built = toConfig({
      raw: [],
      devices: [device({
        rows: [{
          did: 11, name: 'Свет', type: 'light', group: '', bind: { brightness: 'mdm/Channel 1', on_off: 'mdm/K1' },
        }],
      })],
    }, live, {});
    expect(built.config.devices[0].services.map((service) => [service.sid, service.role]))
      .toEqual([[1, 'on_off'], [2, 'brightness']]);

    const parsed = fromConfig(built.config);
    expect(parsed.raw).toEqual([]);
    expect(parsed.devices[0].rows[0].bind).toEqual({ brightness: 'mdm/Channel 1', on_off: 'mdm/K1' });
  });

  it('puts entries without a module or with a blank one into one unnamed device written as own-<first did>', () => {
    const entry = (did: number, module?: string) => ({
      did, name: `n${did}`, type: 'switch', ...(module === undefined ? {} : { module }),
      services: [{ sid: 1, role: 'on_off', binding: { state: `/devices/r/controls/K${did}` } }],
    });
    const parsed = fromConfig({ version: '1.0', devices: [entry(10), entry(11, '   ')] as Config['devices'] });

    expect(parsed.devices.map((item) => [item.name, item.rows.map((row) => row.did)])).toEqual([['', [10, 11]]]);
    expect(toConfig(parsed, liveOf({}), parsed.orig).config.devices.map((item) => item.module))
      .toEqual(['own-10', 'own-10']);
  });

  it('uses the device name as module and own-<did> for a blank name', () => {
    const built = toConfig({
      raw: [],
      devices: [
        device({ name: ' Щит ', rows: [{ did: 10, name: 'A', type: 'switch', group: '', bind: { on_off: 'r/K1' } }] }),
        device({
          id: 'x', name: '', rows: [{ did: 11, name: 'B', type: 'switch', group: '', bind: { on_off: 'r/K2' } }],
        }),
      ],
    }, liveOf({}), {});

    expect(built.config.devices.map((item) => item.module)).toEqual(['Щит', 'own-11']);
  });

  it('skips a device without a channel for a required role and scales a level', () => {
    const live = liveOf({ 'dimmer/Level': { type: 'range', min: 0, max: 255 } });
    const built = toConfig({
      raw: [],
      devices: [
        device({ rows: [{ did: 11, name: 'Лампа', type: 'light', group: '', bind: { brightness: 'dimmer/Level' } }] }),
        device({
          id: 'Шторы', name: 'Шторы', alice: false,
          rows: [{ did: 12, type: 'cover', name: 'Шторы', group: '', bind: { position: 'dimmer/Level' } }],
        }),
      ],
    }, live, {});

    expect(built.drafts).toEqual([{ name: 'Лампа', role: 'on_off' }]);
    expect(built.config.devices).toHaveLength(1);
    expect(built.config.devices[0].services[0].binding.transform)
      .toEqual({ type: 'scale', from: { min: 0, max: 255 }, to: { min: 0, max: 100 } });
  });

  it('exports the battery level as an extra service of the button', () => {
    const built = toConfig({
      raw: [],
      devices: [device({
        rows: [{
          did: 10, name: 'Кнопка', type: 'button', group: '', bind: { press: 'snzb/action', battery: 'snzb/battery' },
        }],
      })],
    }, liveOf({ 'snzb/action': { type: 'text' }, 'snzb/battery': { type: 'value', units: '%' } }), {});

    expect(built.config.devices[0].services.map((service) => [service.role, service.binding.state])).toEqual([
      ['press', '/devices/snzb/controls/action'],
      ['battery', '/devices/snzb/controls/battery'],
    ]);
  });

  it('exports a numeric setting with a command and the range from meta', () => {
    const built = toConfig({
      raw: [],
      devices: [device({
        rows: [{
          did: 10, name: 'LED Period (s)', type: 'number_setting', group: '', bind: { setting: 'msw/LED Period (s)' },
        }],
      })],
    }, liveOf({ 'msw/LED Period (s)': { type: 'range', min: 1, max: 10, step: 1 } }), {});

    expect(built.config.devices[0].services[0]).toEqual({
      sid: 1,
      role: 'setting',
      binding: { state: '/devices/msw/controls/LED Period (s)', command: '/devices/msw/controls/LED Period (s)/on' },
      range: { min: 1, max: 10, step: 1 },
    });
  });

  it('writes the unit of a numeric sensor to the config and reads it back', () => {
    const live = liveOf({ 'msw/occupancy_level': { type: 'value', readonly: true } });
    const built = toConfig({
      raw: [],
      devices: [device({
        rows: [{
          did: 10, name: 'Присутствие', type: 'number_sensor', group: '', unit: ' lvl ',
          bind: { number: 'msw/occupancy_level' },
        }],
      })],
    }, live, {});

    expect(built.config.devices[0].services[0].unit).toBe('lvl');
    expect(fromConfig(built.config).devices[0].rows[0].unit).toBe('lvl');
  });

  it('writes and reads back the unit of a numeric sensor in a device', () => {
    const built = toConfig({
      raw: [],
      devices: [device({
        id: 'module:Свет',
        name: 'Свет',
        alice: false,
        rows: [{
          did: 12, type: 'number_sensor', name: 'Освещённость', group: '', unit: 'lvl', bind: { number: 'dev/ctl' },
        }],
      })],
    }, liveOf({ 'dev/ctl': { type: 'value', readonly: true } }), {});

    expect(built.config.devices[0].services[0].unit).toBe('lvl');
    expect(fromConfig(built.config).devices[0].rows[0].unit).toBe('lvl');
  });

  it('puts the unit only on numeric services and skips a blank unit', () => {
    const live = liveOf({
      'msw/level': { type: 'value', readonly: true },
      'msw/battery': { type: 'value', readonly: true, units: '%' },
    });
    const sensor = (did: number, unit: string) => ({
      did, name: 'Уровень', type: 'number_sensor', group: '', unit,
      bind: { number: 'msw/level', battery: 'msw/battery' },
    });
    const built = toConfig({
      raw: [],
      devices: [device({ rows: [sensor(10, 'V'), sensor(11, '  ')] })],
    }, live, {});

    const [withUnit, blank] = built.config.devices;
    expect(withUnit.services.map((service) => [service.role, service.unit])).toEqual([
      ['number', 'V'],
      ['battery', undefined],
    ]);
    expect(blank.services.every((service) => !('unit' in service))).toBe(true);
    expect(fromConfig(built.config).devices[0].rows[1].unit).toBeUndefined();
  });

  it('fills range defaults of a numeric setting and omits the range without max', () => {
    const setting = (did: number, key: string) => ({
      did, name: key, type: 'number_setting', group: '', bind: { setting: key },
    });
    const built = toConfig({
      raw: [],
      devices: [device({ rows: [setting(10, 'a/period'), setting(11, 'b/offset')] })],
    }, liveOf({ 'a/period': { type: 'range', max: 10 }, 'b/offset': { type: 'value' } }), {});

    expect(built.config.devices[0].services[0].range).toEqual({ min: 0, max: 10, step: 1 });
    expect(built.config.devices[1].services[0]).not.toHaveProperty('range');
  });
});
