/**
 * Pure builder for a Zabbix import YAML (one template + one host).
 *
 * No homeui imports: the caller resolves live devices/controls into the plain
 * {@link ZabbixExportInput} structure, this module turns it into a YAML string
 * ready for `downloadFile(...)` and import into Zabbix 7.0.
 *
 * Design notes:
 *  - ONE master item per template (subscribes to all devices), control items
 *    are dependent and pick their value via a JSONPath over the full topic.
 *  - Slugs are baked into item keys (`wb.ctrl["<slug>/<control>"]`) so controls
 *    with identical names across devices don't collide.
 */
import yaml from 'js-yaml';
import { type ZabbixControlInput, type ZabbixDeviceInput, type ZabbixExportInput } from './types';

const MASTER_KEY = 'mqtt.get[tcp://{$MQTT.BROKER}:{$MQTT.PORT},/devices/#]';
const TEMPLATE_GROUP = 'Templates/Wiren Board';
const BINARY_VALUEMAP = 'WB binary state';
const DEGREE_CELSIUS = '°C';

type ZabbixValueType = 'UNSIGNED' | 'FLOAT' | 'TEXT' | 'CHAR';

interface ResolvedType {
  valueType: ZabbixValueType;
  units?: string;
  /** Name of a valuemap to attach (currently only the binary one). */
  valuemap?: string;
  /** Text-like items keep no trends. */
  noTrends?: boolean;
}

/**
 * A valid v4 UUID as 32 hex chars without dashes — the form Zabbix stores and
 * validates as "UUIDv4". Uses crypto.getRandomValues (works over plain HTTP)
 * instead of crypto.randomUUID, which needs a secure context and is therefore
 * undefined on http:// controllers. The version/variant bits are set explicitly
 * so the result passes Zabbix's UUIDv4 check.
 */
function uuid(): string {
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant (RFC 4122)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function mapUnits(units?: string): string | undefined {
  if (!units) {
    return undefined;
  }
  if (units === 'deg C') {
    return DEGREE_CELSIUS;
  }
  return units;
}

/** Maps a WB control type to a Zabbix value_type and extra item attributes. */
function resolveType(control: ZabbixControlInput): ResolvedType {
  switch (control.type) {
    case 'switch':
    case 'alarm':
      return { valueType: 'UNSIGNED', valuemap: BINARY_VALUEMAP };
    case 'value':
    case 'range':
      return { valueType: 'FLOAT', units: mapUnits(control.units) };
    case 'text':
    case 'rgb':
      return { valueType: 'TEXT', noTrends: true };
    default:
      return { valueType: 'FLOAT', units: mapUnits(control.units) };
  }
}

function buildValueItem(slug: string, deviceName: string, control: ZabbixControlInput): Record<string, unknown> {
  const resolved = resolveType(control);
  const item: Record<string, unknown> = {
    uuid: uuid(),
    name: `${deviceName}: ${control.name}`,
    type: 'DEPENDENT',
    key: `wb.ctrl["${slug}/${control.controlId}"]`,
    history: '7d',
    value_type: resolved.valueType,
  };
  if (resolved.units) {
    item.units = resolved.units;
  }
  if (resolved.noTrends) {
    item.trends = '0';
  }
  if (resolved.valuemap) {
    item.valuemap = { name: resolved.valuemap };
  }
  item.preprocessing = [
    {
      type: 'JSONPATH',
      parameters: [`$['/devices/${slug}/controls/${control.controlId}']`],
      error_handler: 'DISCARD_VALUE',
    },
  ];
  item.master_item = { key: MASTER_KEY };
  return item;
}

function buildErrorItem(
  slug: string,
  deviceName: string,
  control: ZabbixControlInput,
  templateName: string,
): Record<string, unknown> {
  const item: Record<string, unknown> = {
    uuid: uuid(),
    name: `${deviceName}: ${control.name} (error)`,
    type: 'DEPENDENT',
    key: `wb.err["${slug}/${control.controlId}"]`,
    history: '7d',
    value_type: 'CHAR',
    trends: '0',
  };
  item.preprocessing = [
    {
      type: 'JSONPATH',
      parameters: [`$['/devices/${slug}/controls/${control.controlId}/meta/error']`],
      error_handler: 'DISCARD_VALUE',
    },
  ];
  item.master_item = { key: MASTER_KEY };
  // Triggers are always created (the user can disable individual ones in Zabbix).
  item.triggers = [
    {
      uuid: uuid(),
      expression: `length(last(/${templateName}/wb.err["${slug}/${control.controlId}"]))>0`,
      name: `WB {HOST.HOST} / ${deviceName}: error on "${control.name}" ({ITEM.VALUE1})`,
      priority: 'AVERAGE',
      manual_close: 'YES',
    },
  ];
  return item;
}

function buildMasterItem(): Record<string, unknown> {
  return {
    uuid: uuid(),
    name: 'MQTT raw stream',
    type: 'ZABBIX_ACTIVE',
    key: MASTER_KEY,
    delay: '0',
    history: '0',
    value_type: 'TEXT',
    trends: '0',
  };
}

function isMonitored(control: ZabbixControlInput): boolean {
  return control.type !== 'pushbutton';
}

function hasBinaryControl(devices: ZabbixDeviceInput[]): boolean {
  return devices.some((device) =>
    device.controls.some(
      (control) => isMonitored(control) && (control.type === 'switch' || control.type === 'alarm'),
    ),
  );
}

/**
 * Builds a Zabbix 7.0 import YAML string for the given selection of devices and
 * controls. Pure function — same input (modulo random UUIDs) yields the same
 * structure.
 */
export function buildZabbixExport(input: ZabbixExportInput): string {
  const { templateDate, devices } = input;
  // ':' (and other path/expression-special chars) in the template name would break
  // trigger expressions (/template/key) and the downloaded file name, so sanitize it.
  const templateName = `Wiren Board export ${templateDate}`.replace(/[:/\\]/g, '-');

  const items: Array<Record<string, unknown>> = [buildMasterItem()];

  for (const device of devices) {
    const deviceName = device.name ?? device.slug;
    for (const control of device.controls) {
      if (!isMonitored(control)) {
        continue;
      }
      items.push(buildValueItem(device.slug, deviceName, control));
      items.push(buildErrorItem(device.slug, deviceName, control, templateName));
    }
  }

  const template: Record<string, unknown> = {
    uuid: uuid(),
    template: templateName,
    name: templateName,
    groups: [{ name: TEMPLATE_GROUP }],
    items,
    macros: [
      { macro: '{$MQTT.BROKER}', value: '127.0.0.1' },
      { macro: '{$MQTT.PORT}', value: '1883' },
    ],
  };

  if (hasBinaryControl(devices)) {
    template.valuemaps = [
      {
        uuid: uuid(),
        name: BINARY_VALUEMAP,
        mappings: [
          { value: '0', newvalue: 'Off' },
          { value: '1', newvalue: 'On' },
        ],
      },
    ];
  }

  const exportObject = {
    zabbix_export: {
      version: '7.0',
      template_groups: [{ uuid: uuid(), name: TEMPLATE_GROUP }],
      templates: [template],
    },
  };

  return yaml.dump(exportObject, { lineWidth: -1, quotingType: '\'', forceQuotes: false });
}
