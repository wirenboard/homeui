export interface MqttMessage {
  topic: string;
  payload: string;
  qos: number;
  retained: boolean;
}

export type MqttCallback = (message: MqttMessage) => void;

const topicRegexCache = new Map<string, RegExp>();

export function topicMatches(pattern: string, topic: string): boolean {
  let reg = topicRegexCache.get(pattern);
  if (!reg) {
    const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    reg = new RegExp(`^${escaped.replace(/\\\+/g, '[^/]+').replace(/#/g, '.*')}$`);
    topicRegexCache.set(pattern, reg);
  }
  return reg.test(topic);
}

const textDecoder = new TextDecoder();

// Duktape (wbrules engine) encodes characters outside BMP as CESU-8 surrogate
// pairs instead of proper 4-byte UTF-8. Detect and convert before decoding.
export function decodeMqttPayload(buf: Uint8Array): string {
  let needsConversion = false;
  for (let i = 0; i < buf.length - 1; i++) {
    if (buf[i] === 0xED && buf[i + 1] >= 0xA0) {
      needsConversion = true;
      break;
    }
  }

  if (!needsConversion) {
    return textDecoder.decode(buf);
  }

  const out: number[] = [];
  for (let i = 0; i < buf.length;) {
    if (
      i + 5 < buf.length
      && buf[i] === 0xED && (buf[i + 1] & 0xF0) === 0xA0
      && buf[i + 3] === 0xED && (buf[i + 4] & 0xF0) === 0xB0
    ) {
      const hi = ((buf[i] & 0x0F) << 12) | ((buf[i + 1] & 0x3F) << 6) | (buf[i + 2] & 0x3F);
      const lo = ((buf[i + 3] & 0x0F) << 12) | ((buf[i + 4] & 0x3F) << 6) | (buf[i + 5] & 0x3F);
      const cp = 0x10000 + ((hi - 0xD800) << 10) + (lo - 0xDC00);
      out.push(0xF0 | (cp >> 18), 0x80 | ((cp >> 12) & 0x3F), 0x80 | ((cp >> 6) & 0x3F), 0x80 | (cp & 0x3F));
      i += 6;
    } else {
      out.push(buf[i]);
      i++;
    }
  }
  return textDecoder.decode(new Uint8Array(out));
}
