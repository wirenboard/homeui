import yaml from 'js-yaml';
import { type ZabbixExportInput } from './types';
import { buildZabbixExport } from './yaml-builder';

// Input date intentionally contains ':' so the suite also covers name sanitization
// (the colon must become '-' in the emitted template name).
const TEMPLATE_NAME = 'Wiren Board export 2026-06-04 16-40';

function baseInput(overrides: Partial<ZabbixExportInput> = {}): ZabbixExportInput {
  return {
    templateDate: '2026-06-04 16:40',
    devices: [],
    ...overrides,
  };
}

interface ZabbixItem {
  name: string;
  key: string;
  type: string;
  value_type?: string;
  units?: string;
  trends?: string;
  history?: string;
  valuemap?: { name: string };
  preprocessing?: Array<{ type: string; parameters: string[]; error_handler: string }>;
  master_item?: { key: string };
  triggers?: Array<{ expression: string; name: string; priority: string; manual_close: string }>;
}

interface ParsedExport {
  zabbix_export: {
    version: string;
    template_groups: Array<{ uuid: string; name: string }>;
    templates: Array<{
      uuid: string;
      template: string;
      name: string;
      groups: Array<{ name: string }>;
      items: ZabbixItem[];
      macros: Array<{ macro: string; value: string }>;
      valuemaps?: Array<{ uuid: string; name: string; mappings: Array<{ value: string; newvalue: string }> }>;
    }>;
  };
}

function parse(input: ZabbixExportInput): ParsedExport {
  return yaml.load(buildZabbixExport(input)) as ParsedExport;
}

function items(parsed: ParsedExport): ZabbixItem[] {
  return parsed.zabbix_export.templates[0].items;
}

describe('buildZabbixExport', () => {
  it('produces valid, parseable YAML with the expected top-level shape', () => {
    const parsed = parse(
      baseInput({
        devices: [{ slug: 'wb-m1w2_30', controls: [{ controlId: 'MCU Temperature', name: 'MCU Temperature', type: 'value', units: 'deg C' }] }],
      }),
    );

    expect(parsed.zabbix_export.version).toBe('7.0');
    expect(parsed.zabbix_export.template_groups[0].name).toBe('Templates/Wiren Board');
    expect(parsed.zabbix_export.templates[0].template).toBe(TEMPLATE_NAME);
    expect(parsed.zabbix_export.templates[0].name).toBe(TEMPLATE_NAME);
    expect(parsed.zabbix_export.templates[0].groups).toEqual([{ name: 'Templates/Wiren Board' }]);
  });

  it('emits exactly one master item with the correct key (no {$DEVICE})', () => {
    const parsed = parse(baseInput({ devices: [] }));
    const masterItems = items(parsed).filter((item) => item.type === 'ZABBIX_ACTIVE');

    expect(masterItems).toHaveLength(1);
    expect(masterItems[0]).toMatchObject({
      name: 'MQTT raw stream',
      type: 'ZABBIX_ACTIVE',
      value_type: 'TEXT',
      delay: '0',
      history: '0',
      trends: '0',
      key: 'mqtt.get[tcp://{$MQTT.BROKER}:{$MQTT.PORT},/devices/#]',
    });
    expect(masterItems[0].key).not.toContain('{$DEVICE}');
  });

  it('bakes the slug into keys so identical control names on different devices stay distinct', () => {
    const parsed = parse(
      baseInput({
        devices: [
          { slug: 'wb-m1w2_30', controls: [{ controlId: 'Temperature', name: 'Temperature', type: 'value' }] },
          { slug: 'wb-m1w2_99', controls: [{ controlId: 'Temperature', name: 'Temperature', type: 'value' }] },
        ],
      }),
    );

    const valueKeys = items(parsed)
      .filter((item) => item.type === 'DEPENDENT' && item.key.startsWith('wb.ctrl'))
      .map((item) => item.key);

    expect(valueKeys).toContain('wb.ctrl["wb-m1w2_30/Temperature"]');
    expect(valueKeys).toContain('wb.ctrl["wb-m1w2_99/Temperature"]');
    expect(new Set(valueKeys).size).toBe(valueKeys.length);
  });

  it('skips pushbutton controls entirely', () => {
    const parsed = parse(
      baseInput({
        devices: [
          {
            slug: 'wb-mr6cu_42',
            controls: [
              { controlId: 'Reset', name: 'Reset', type: 'pushbutton' },
              { controlId: 'K1', name: 'Relay 1', type: 'switch' },
            ],
          },
        ],
      }),
    );

    const allKeys = items(parsed).map((item) => item.key);
    expect(allKeys.some((key) => key.includes('Reset'))).toBe(false);
    expect(allKeys).toContain('wb.ctrl["wb-mr6cu_42/K1"]');
  });

  it('maps switch controls to UNSIGNED with the WB binary state valuemap', () => {
    const parsed = parse(
      baseInput({
        devices: [{ slug: 'wb-mr6cu_42', controls: [{ controlId: 'K1', name: 'Relay 1', type: 'switch' }] }],
      }),
    );

    const valueItem = items(parsed).find((item) => item.key === 'wb.ctrl["wb-mr6cu_42/K1"]');
    expect(valueItem?.value_type).toBe('UNSIGNED');
    expect(valueItem?.valuemap).toEqual({ name: 'WB binary state' });

    const template = parsed.zabbix_export.templates[0];
    expect(template.valuemaps).toHaveLength(1);
    expect(template.valuemaps?.[0]).toMatchObject({
      name: 'WB binary state',
      mappings: [
        { value: '0', newvalue: 'Off' },
        { value: '1', newvalue: 'On' },
      ],
    });
    expect(template.valuemaps?.[0].uuid).toMatch(/^[0-9a-f]{12}4[0-9a-f]{3}[89ab][0-9a-f]{15}$/);
  });

  it('omits the WB binary state valuemap when there is no switch/alarm control', () => {
    const parsed = parse(
      baseInput({
        devices: [{ slug: 'wb-m1w2_30', controls: [{ controlId: 'T', name: 'T', type: 'value', units: 'deg C' }] }],
      }),
    );
    expect(parsed.zabbix_export.templates[0].valuemaps).toBeUndefined();
  });

  it('maps "deg C" units to the degree-celsius symbol', () => {
    const parsed = parse(
      baseInput({
        devices: [{ slug: 'wb-m1w2_30', controls: [{ controlId: 'MCU Temperature', name: 'MCU Temperature', type: 'value', units: 'deg C' }] }],
      }),
    );

    const valueItem = items(parsed).find((item) => item.key === 'wb.ctrl["wb-m1w2_30/MCU Temperature"]');
    expect(valueItem?.value_type).toBe('FLOAT');
    expect(valueItem?.units).toBe('°C');
  });

  it('builds value + error items with the correct preprocessing and master link', () => {
    const parsed = parse(
      baseInput({
        devices: [{ slug: 'wb-m1w2_30', controls: [{ controlId: 'Serial', name: 'Serial', type: 'text' }] }],
      }),
    );

    const valueItem = items(parsed).find((item) => item.key === 'wb.ctrl["wb-m1w2_30/Serial"]');
    expect(valueItem?.value_type).toBe('TEXT');
    expect(valueItem?.trends).toBe('0');
    expect(valueItem?.history).toBe('7d');
    expect(valueItem?.master_item).toEqual({ key: 'mqtt.get[tcp://{$MQTT.BROKER}:{$MQTT.PORT},/devices/#]' });
    expect(valueItem?.preprocessing?.[0]).toEqual({
      type: 'JSONPATH',
      parameters: ['$[\'/devices/wb-m1w2_30/controls/Serial\']'],
      error_handler: 'DISCARD_VALUE',
    });

    const errorItem = items(parsed).find((item) => item.key === 'wb.err["wb-m1w2_30/Serial"]');
    expect(errorItem?.name).toBe('wb-m1w2_30: Serial (error)');
    expect(errorItem?.value_type).toBe('CHAR');
    expect(errorItem?.trends).toBe('0');
    expect(errorItem?.history).toBe('7d');
    expect(errorItem?.preprocessing?.[0]).toEqual({
      type: 'JSONPATH',
      parameters: ['$[\'/devices/wb-m1w2_30/controls/Serial/meta/error\']'],
      error_handler: 'DISCARD_VALUE',
    });
  });

  it('produces one trigger per error item', () => {
    const parsed = parse(
      baseInput({
        devices: [
          {
            slug: 'wb-m1w2_30',
            controls: [
              { controlId: 'MCU Temperature', name: 'MCU Temperature', type: 'value' },
              { controlId: 'K1', name: 'Relay 1', type: 'switch' },
            ],
          },
        ],
      }),
    );

    const errorItems = items(parsed).filter((item) => item.key.startsWith('wb.err'));
    expect(errorItems).toHaveLength(2);
    for (const errorItem of errorItems) {
      expect(errorItem.triggers).toHaveLength(1);
    }

    const tempTrigger = items(parsed).find((item) => item.key === 'wb.err["wb-m1w2_30/MCU Temperature"]')?.triggers?.[0];
    expect(tempTrigger).toMatchObject({
      expression: `length(last(/${TEMPLATE_NAME}/wb.err["wb-m1w2_30/MCU Temperature"]))>0`,
      name: 'WB {HOST.HOST} / wb-m1w2_30: error on "MCU Temperature" ({ITEM.VALUE1})',
      priority: 'AVERAGE',
      manual_close: 'YES',
    });

    // value items themselves carry no triggers
    const valueItem = items(parsed).find((item) => item.key === 'wb.ctrl["wb-m1w2_30/MCU Temperature"]');
    expect(valueItem?.triggers).toBeUndefined();
  });

  it('emits template macros without {$DEVICE}', () => {
    const parsed = parse(baseInput({ devices: [] }));
    const macros = parsed.zabbix_export.templates[0].macros;
    expect(macros).toEqual([
      { macro: '{$MQTT.BROKER}', value: '127.0.0.1' },
      { macro: '{$MQTT.PORT}', value: '1883' },
    ]);
    expect(macros.some((macro) => macro.macro.includes('DEVICE'))).toBe(false);
  });

  it('uses 32-hex uuids for template entities', () => {
    const parsed = parse(
      baseInput({
        devices: [{ slug: 'wb-m1w2_30', controls: [{ controlId: 'T', name: 'T', type: 'value' }] }],
      }),
    );

    expect(parsed.zabbix_export.template_groups[0].uuid).toMatch(/^[0-9a-f]{12}4[0-9a-f]{3}[89ab][0-9a-f]{15}$/);
    expect(parsed.zabbix_export.templates[0].uuid).toMatch(/^[0-9a-f]{12}4[0-9a-f]{3}[89ab][0-9a-f]{15}$/);
    for (const item of items(parsed)) {
      expect((item as unknown as { uuid: string }).uuid).toMatch(/^[0-9a-f]{12}4[0-9a-f]{3}[89ab][0-9a-f]{15}$/);
    }
  });
});
