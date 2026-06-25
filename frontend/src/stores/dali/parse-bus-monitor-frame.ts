import { parseBusMonitorLine } from './parse-bus-monitor-line';
import type { FrameType, ParsedBusMonitorLine } from './types';

/** Bare unrecognized frame token, e.g. "FF16", "FF24", "BF8" (FF/BF + bit length). */
const UNRECOGNIZED_RE = /^(?:FF|BF)\d+$/;
const SHORT_ADDR_RE = /\bA(\d+)\b/;
const GROUP_ADDR_RE = /\bG\d+\b/;

export const frameFilterValue = (type: FrameType, target: number | 'broadcast') => `${type}:${target}`;

/**
 * Frame type from the raw packet length: a 16-bit forward frame is 2 bytes
 * (4 hex chars), a 24-bit (DALI-2) frame is 3 bytes (6 hex chars). Recognized
 * commands carry no explicit FF16/FF24 token, so the hex length is the reliable
 * discriminator.
 */
const frameType = (hex: string): FrameType => (hex.length >= 6 ? 'FF24' : 'FF16');

/**
 * The filter key a bus monitor line matches, or null if it can't be filtered.
 *   - short-addressed command -> "FF16:5" / "FF24:0"
 *   - broadcast (recognized command with no short/group address: "Off()", "Off",
 *     "DAPC(128)") -> "FF16:broadcast" / "FF24:broadcast"
 *   - unrecognized frame ("FF16"/"BF8") or group command ("Off(G3)") -> null
 *
 * FF16 vs FF24 is taken from the hex byte length; broadcast/address from the
 * parsed command field (so trailing badges like "(fc: 42)" don't interfere).
 */
export const frameFilterKey = ({ hex, command }: Pick<ParsedBusMonitorLine, 'hex' | 'command'>): string | null => {
  if (!command) {
    return null;
  }
  const type = frameType(hex);
  const addr = command.match(SHORT_ADDR_RE);
  if (addr) {
    const address = Number(addr[1]);
    return Number.isInteger(address) ? frameFilterValue(type, address) : null;
  }
  if (!UNRECOGNIZED_RE.test(command) && !GROUP_ADDR_RE.test(command)) {
    return frameFilterValue(type, 'broadcast');
  }
  return null;
};

/** Convenience wrapper that parses a raw line and returns its filter key. */
export const lineFilterKey = (line: string): string | null => frameFilterKey(parseBusMonitorLine(line));
