import type { Selection } from '@/stores/configurator';
import type { MatterDevice } from '@/stores/matter';

/**
 * The manual pairing code, grouped the way the smart home apps print it. The service
 * sends the digits as they go into the app, so the grouping is presentation only and the
 * copy button still copies the plain digits.
 *
 * Eleven digits is the short code; a code that carries a vendor and a product id is
 * longer and grouped differently, so it is left alone instead of being split wrong.
 */
export const groupManualCode = (code: string) => (
  code.length === 11 ? `${code.slice(0, 4)}-${code.slice(4, 7)}-${code.slice(7)}` : code
);

/**
 * The card of the configurator a device belongs to.
 *
 * The configurator groups the devices of the config by their module, and the id of a
 * card is that module with a prefix. The rule is the configurator's own, so it is
 * applied here, in the frontend, over the plain fact the bridge reports - and not in the
 * bridge, whose wire format would then hold a detail of somebody else's page. See
 * decision Р9 in the design doc of the bridge.
 *
 * Null for a device with no module: there is nothing to open, and the page falls back to
 * the configurator without a selection.
 */
export const configuratorSelection = ({ module }: MatterDevice): Selection => (
  module ? { id: `module:${module}` } : null
);

/**
 * Only the vendor ids seen on a live fabric: there is no list to import, and an app
 * whose vendor is missing falls back to its number. Needed because Yandex leaves the
 * label of a fabric empty - see docs/ecosystems.md of wb-mqtt-matter-bridge, Я3.
 */
const KNOWN_VENDORS: Record<number, string> = {
  // 0x132F.
  4911: 'yandex',
};

export const vendorKey = (vendorId: number) => KNOWN_VENDORS[vendorId] ?? null;

/**
 * What is left of an open window, as m:ss. A window that is already over reads 0:00
 * rather than a negative number: the page polls every few seconds, so the moment the
 * clock runs out and the moment the bridge says the window is gone are not the same.
 */
export const timeLeft = (closesAt: number, now: number) => {
  const seconds = Math.max(0, Math.round((closesAt - now) / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
};
