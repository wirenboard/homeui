import { classify, primaryRole, requiredRoles } from './catalog';
import { fromConfig, stable, toConfig } from './model';
import type { Config, ControlMeta, LiveControls } from './types';

const liveOf = (controls: Record<string, ControlMeta>): LiveControls => ({
  meta: (deviceId, controlId) => controls[`${deviceId}/${controlId}`] ?? null,
});

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
    expect(classify({ id: 'available', type: 'switch', readonly: true })).toEqual({ cls: 'none', why: 'availability' });
    expect(classify({ type: 'value', units: 'deg C' }).cls).toBe('temp');
    expect(classify({ type: 'temperature' }).cls).toBe('temp');
    expect(classify({ type: 'range' }).cls).toBe('level');
    expect(classify({ type: 'range', max: 254 }).cls).toBe('level');
    expect(classify({ type: 'range', max: 10 })).toEqual({ cls: 'none', why: 'range_setting' });
  });

  it('explains why a control has no type', () => {
    expect(classify({ type: 'value' })).toEqual({ cls: 'none', why: 'no_units' });
    expect(classify({ type: 'value', units: 'V' })).toEqual({ cls: 'none', why: 'voltage' });
    expect(classify({ type: 'range', units: 's' })).toEqual({ cls: 'none', why: 'range_units', units: 's' });
    expect(classify({ type: 'switch', isEnum: true })).toEqual({ cls: 'none', why: 'enum' });
    expect(classify({ id: 'battery', type: 'value', readonly: true, units: '%' }))
      .toEqual({ cls: 'battery', why: 'battery' });
    expect(classify({ id: 'battery_temperature', type: 'value', readonly: true, units: 'deg C' }).cls).toBe('temp');
    expect(classify({ type: 'text', readonly: true, isEnum: true, enumKeys: ['single', 'double', 'long'] }))
      .toEqual({ cls: 'press' });
    expect(classify({ type: 'text', readonly: true, isEnum: true, enumKeys: ['Battery', 'Mains'] }))
      .toEqual({ cls: 'none', why: 'enum' });
    expect(classify({ type: 'value', units: 'dBA' })).toEqual({ cls: 'none', why: 'noise' });
  });
});

describe('catalog roles', () => {
  it('picks the role the channel class fits', () => {
    expect(primaryRole('light', 'level')).toBe('brightness');
    expect(primaryRole('light', 'bin_rw')).toBe('on_off');
    expect(primaryRole('cover')).toBe('position');
  });

  it('requires brightness once a light has a color', () => {
    expect(requiredRoles('light', {})).toEqual(['on_off']);
    expect(requiredRoles('light', { color: 'x' })).toEqual(['on_off', 'brightness']);
  });
});

describe('fromConfig / toConfig', () => {
  it('round-trips a WB device channel without changes', () => {
    const parsed = fromConfig(relayConfig);
    expect(parsed.wbs).toHaveLength(1);
    expect(parsed.wbs[0].channels.A1_OUT).toMatchObject({ did: 10, name: 'Реле', group: 'Прихожая', prim: 'on_off' });

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

  it('puts channels from different devices into a created device by module', () => {
    const config: Config = {
      version: '1.0',
      devices: [{
        did: 20,
        name: 'Свет',
        type: 'light',
        module: 'Кухня',
        services: [
          { sid: 1, role: 'on_off', binding: { state: '/devices/relay/controls/K1' } },
          { sid: 2, role: 'brightness', binding: { state: '/devices/dimmer/controls/Level' } },
        ],
      }],
    };
    const parsed = fromConfig(config);
    expect(parsed.wbs).toEqual([]);
    expect(parsed.own[0]).toMatchObject({
      name: 'Кухня',
      rows: [{ bind: { on_off: 'relay/K1', brightness: 'dimmer/Level' } }],
    });
  });

  it('skips a device without a channel for a required role and scales a level', () => {
    const live = liveOf({ 'dimmer/Level': { type: 'range', min: 0, max: 255 } });
    const built = toConfig({
      raw: [],
      wbs: [{
        id: 'dimmer',
        matter: true,
        alice: true,
        channels: {
          Level: { did: 11, name: 'Лампа', type: 'light', group: '', prim: 'brightness', extra: {} },
        },
      }],
      own: [{
        id: 'own:Шторы',
        name: 'Шторы',
        matter: true,
        alice: false,
        rows: [{ did: 12, type: 'cover', name: 'Шторы', group: '', bind: { position: 'dimmer/Level' } }],
      }],
    }, live, {});

    expect(built.drafts).toEqual([{ name: 'Лампа', role: 'on_off' }]);
    expect(built.config.devices).toHaveLength(1);
    expect(built.config.devices[0].services[0].binding.transform)
      .toEqual({ type: 'scale', from: { min: 0, max: 255 }, to: { min: 0, max: 100 } });
  });

  it('keeps a channel without a chosen type out of the config as a draft', () => {
    const built = toConfig({
      raw: [],
      own: [],
      wbs: [{
        id: 'wb-msw',
        matter: true,
        alice: true,
        channels: { Noise: { did: 10, name: 'Шум', type: '', group: '', prim: 'leak', extra: {} } },
      }],
    }, liveOf({ 'wb-msw/Noise': { type: 'switch', readonly: true } }), {});

    expect(built.config.devices).toEqual([]);
    expect(built.drafts).toEqual([{ name: 'Шум', role: null }]);
  });

  it('exports the battery level as an extra service of the button', () => {
    const built = toConfig({
      raw: [],
      own: [],
      wbs: [{
        id: 'snzb',
        matter: true,
        alice: true,
        channels: {
          action: { did: 10, name: 'Кнопка', type: 'button', group: '', prim: 'press', extra: { battery: 'battery' } },
        },
      }],
    }, liveOf({ 'snzb/action': { type: 'text' }, 'snzb/battery': { type: 'value', units: '%' } }), {});

    expect(built.config.devices[0].services.map((service) => [service.role, service.binding.state])).toEqual([
      ['press', '/devices/snzb/controls/action'],
      ['battery', '/devices/snzb/controls/battery'],
    ]);
  });
});
