import type { ParsedBusMonitorLine } from './types';

/**
 * Closed set of gateway status texts that can appear in the response position.
 * Source: wb-mqtt-dali#201 README (DALI bus monitor line format).
 */
const STATUS_TEXTS = [
  'no response from gateway',
  'no transmission, internal gateway error',
  'no power on bus',
  'gateway overheated',
  'transmission cancelled',
  'gateway unavailable',
  'unknown response status',
  'transmission error',
  'framing error',
];

const TIME_RE = /^(\d{2}:\d{2}:\d{2}\.\d{3})\s+/;
const DIR_RE = /^(>>|<<)\s*/;
const HEX_RE = /^([0-9a-fA-F]+)\b\s*/;
const FROM_LUNATONE_RE = /\s*\(from lunatone\)\s*$/;
const FC_RE = /\s*\(fc:\s*(\d+)\)\s*$/;

/** Returns the status text the string ends with (longest match wins), or null. */
const trailingStatus = (text: string): string | null => {
  let found: string | null = null;
  for (const s of STATUS_TEXTS) {
    if ((text === s || text.endsWith(` ${s}`)) && (!found || s.length > found.length)) {
      found = s;
    }
  }
  return found;
};

/**
 * Parses one line of the DALI bus monitor MQTT payload into structured fields.
 *
 * Format (wb-mqtt-dali#201): `{HH:MM:SS.mmm} {dir}{hex} {decode}[ - {response}] [suffixes]`.
 * The command/response text is never decomposed — only the structural separators the
 * backend itself emits (timestamp, direction, ` - `, suffixes) are peeled off.
 */
export const parseBusMonitorLine = (raw: string): ParsedBusMonitorLine => {
  const result: ParsedBusMonitorLine = {
    raw,
    time: '',
    direction: null,
    hex: '',
    command: '',
    response: { kind: 'none', text: '' },
    badges: {},
  };

  let rest = raw.trim();

  const timeMatch = rest.match(TIME_RE);
  if (timeMatch) {
    result.time = timeMatch[1];
    rest = rest.slice(timeMatch[0].length);
  }

  const dirMatch = rest.match(DIR_RE);
  if (dirMatch) {
    result.direction = dirMatch[1] === '>>' ? 'out' : 'in';
    rest = rest.slice(dirMatch[0].length);
  }

  const hexMatch = rest.match(HEX_RE);
  if (hexMatch) {
    result.hex = hexMatch[1];
    rest = rest.slice(hexMatch[0].length);
  }

  // Peel trailing suffix badges (either/both, any order).
  for (let changed = true; changed;) {
    changed = false;
    const lunatone = rest.match(FROM_LUNATONE_RE);
    if (lunatone) {
      result.badges.fromLunatone = true;
      rest = rest.slice(0, lunatone.index).trimEnd();
      changed = true;
    }
    const fc = rest.match(FC_RE);
    if (fc) {
      result.badges.fc = Number(fc[1]);
      rest = rest.slice(0, fc.index).trimEnd();
      changed = true;
    }
  }

  // The response is separated from the decode by ' - ' (only on '>>' requests with a reply).
  const sepIdx = rest.indexOf(' - ');
  if (sepIdx !== -1) {
    result.command = rest.slice(0, sepIdx).trim();
    const respText = rest.slice(sepIdx + 3).trim();
    if (STATUS_TEXTS.includes(respText)) {
      result.response = { kind: 'error', text: respText };
    } else {
      const sp = respText.indexOf(' ');
      result.response = sp === -1
        ? { kind: 'value', text: respText, value: respText }
        : { kind: 'value', text: respText, hex: respText.slice(0, sp), value: respText.slice(sp + 1).trim() };
    }
    return result;
  }

  // No ' - ': an unexpected ('<<') packet received with an error appends the status
  // straight after the descriptor (e.g. 'FF16 framing error').
  const status = trailingStatus(rest);
  if (status) {
    result.response = { kind: 'error', text: status };
    result.command = rest.slice(0, rest.length - status.length).trim();
  } else {
    result.command = rest.trim();
  }

  return result;
};
