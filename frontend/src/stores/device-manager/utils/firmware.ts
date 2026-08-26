/**
 * Extracts base version and suffix number from WB device firmware version
 * https://wirenboard.com/wiki/Modbus-hardware-version
 */
function splitVersion(version: string): { base: string; suffix: number } {
  let pos = version.indexOf('-rc');
  if (pos !== -1) {
    return { base: version.substring(0, pos), suffix: -parseInt(version.substring(pos + 3)) };
  }
  pos = version.indexOf('+wb');
  if (pos !== -1) {
    return { base: version.substring(0, pos), suffix: parseInt(version.substring(pos + 3)) };
  }
  return { base: version, suffix: 0 };
}

/**
 * Compares device firmware versions according to semver.
 * Uses simplified algorithm for WB devices.
 * https://wirenboard.com/wiki/Modbus-hardware-version
 *
 * undefined < 1.2.3-rc1 < 1.2.3-rc10 < 1.2.3 < 1.2.3+wb1 < 1.2.3+wb10.
 *
 * undefined === undefined, so, the function returns false in this case.
 */
export function firmwareIsNewer(fw1?: string, fw2?: string): boolean {
  return compareFirmware(fw1, fw2) < 0;
}

/**
 * Compares device firmware versions according to semver.
 * Uses simplified algorithm for WB devices.
 * https://wirenboard.com/wiki/Modbus-hardware-version
 *
 * undefined < 1.2.3-rc1 < 1.2.3-rc10 < 1.2.3 < 1.2.3+wb1 < 1.2.3+wb10.
 *
 * undefined === undefined, so, the function returns true in this case.
 */
export function firmwareIsNewerOrEqual(fw1?: string, fw2?: string): boolean {
  return compareFirmware(fw1, fw2) <= 0;
}

// Sort comparator: negative when fw1 is older than fw2, zero when equal. Simplified semver for WB devices,
// https://wirenboard.com/wiki/Modbus-hardware-version: undefined < 1.2.3-rc1 < 1.2.3-rc10 < 1.2.3 < 1.2.3+wb1
export function compareFirmware(fw1?: string, fw2?: string): number {
  if (fw1 === fw2) {
    return 0;
  }
  if (fw1 === undefined) {
    return -1;
  }
  if (fw2 === undefined) {
    return 1;
  }
  const v1 = splitVersion(fw1);
  const v2 = splitVersion(fw2);
  const baseRes = v1.base.localeCompare(v2.base, undefined, { numeric: true, sensitivity: 'base' });
  if (baseRes !== 0) {
    return baseRes;
  }
  // Same major, minor and patch. Release candidates have negative suffixes, a higher rc number is newer
  if (v1.suffix < 0 && v2.suffix < 0) {
    return v2.suffix - v1.suffix;
  }
  return v1.suffix - v2.suffix;
}
