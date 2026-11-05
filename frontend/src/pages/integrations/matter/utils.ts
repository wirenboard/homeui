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
 * Vendor ids of the ecosystems we have actually seen on a fabric, as keys of the
 * translations. The label of a fabric is filled by the controller of the ecosystem and
 * Yandex leaves it empty, so without this the list of connected apps shows a bullet with
 * nothing next to it. The CSA keeps the full list of vendor ids and matter.js does not
 * ship it, so this map holds only what was observed, and anything else falls back to the
 * number. See docs/ecosystems.md of wb-mqtt-matter-bridge, finding Я3.
 */
const KNOWN_VENDORS: Record<number, string> = {
  // 0x132F, seen on a live Yandex station.
  4911: 'yandex',
};

export const vendorKey = (vendorId: number) => KNOWN_VENDORS[vendorId] ?? null;
