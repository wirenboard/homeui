/**
 * @typedef {Object} SplittedVersion
 * @property {string} base
 * @property {number} suffix
 */

/**
 * Extracts base version and suffix number from WB device firmware version
 * https://wirenboard.com/wiki/Modbus-hardware-version
 *
 * @param {string} version
 * @returns {SplittedVersion}
 */
function splitVersion(version) {
  let pos = version.indexOf('-rc');
  if (pos != -1) {
    return { base: version.substring(0, pos), suffix: -parseInt(version.substring(pos + 3)) };
  }
  pos = version.indexOf('+wb');
  if (pos != -1) {
    return { base: version.substring(0, pos), suffix: parseInt(version.substring(pos + 3)) };
  }
  return { base: version, suffix: 0 };
}

/**
 * Compares device firmware versions according to semver.
 * Uses simplified algorithm for WB devices.
 * https://wirenboard.com/wiki/Modbus-hardware-version
 *
 * 1.2.3-rc1 < 1.2.3-rc10 < 1.2.3 < 1.2.3+wb1 < 1.2.3+wb10.
 *
 * @param {string|undefined} fw1
 * @param {string|undefined} fw2
 * @returns {boolean} true if fw2 is newer than fw1 (i.e. fw2 has bigger version)
 */
export function firmwareIsNewer(fw1, fw2) {
  if (fw1 === undefined) {
    return true;
  }
  if (fw2 === undefined) {
    return false;
  }
  const v1 = splitVersion(fw1);
  const v2 = splitVersion(fw2);
  const baseRes = v1.base.localeCompare(v2.base, undefined, { numeric: true, sensitivity: 'base' });
  // Same major, minor and patch
  if (baseRes == 0) {
    if (v1.suffix < 0 && v2.suffix < 0) {
      return v1.suffix > v2.suffix;
    }
    return v1.suffix < v2.suffix;
  }
  return baseRes < 0;
}

/**
 * Compares device firmware versions according to semver.
 * Uses simplified algorithm for WB devices.
 * https://wirenboard.com/wiki/Modbus-hardware-version
 *
 * 1.2.3-rc1 < 1.2.3-rc10 < 1.2.3 < 1.2.3+wb1 < 1.2.3+wb10.
 *
 * @param {string|undefined} fw1
 * @param {string|undefined} fw2
 * @returns {boolean} true if fw2 is newer than or equal to fw1
 */
export function firmwareIsNewerOrEqual(fw1, fw2) {
  if (fw1 === undefined) {
    return true;
  }
  if (fw2 === undefined) {
    return false;
  }
  const v1 = splitVersion(fw1);
  const v2 = splitVersion(fw2);
  const baseRes = v1.base.localeCompare(v2.base, undefined, { numeric: true, sensitivity: 'base' });
  // Same major, minor and patch
  if (baseRes == 0) {
    if (v1.suffix < 0 && v2.suffix < 0) {
      return v1.suffix >= v2.suffix;
    }
    return v1.suffix <= v2.suffix;
  }
  return baseRes < 0;
}
