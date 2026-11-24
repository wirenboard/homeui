import { type TFunction } from 'i18next';
import type { Selection } from '@/stores/configurator';
import type { MatterDevice, MatterFabric, MatterFabricDevice } from '@/stores/matter';
import {
  type DeclaredMatter, FabricLabelSource, LinkState, PairedDateKind, type WatchedDevices, WatchingKind,
} from './types';

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
const KNOWN_VENDORS = new Map<number, string>([
  // 0x132F.
  [4911, 'yandex'],
]);

export const vendorKey = (vendorId: number) => KNOWN_VENDORS.get(vendorId) ?? null;

/**
 * The vendor of a fabric in words: ours for the one this page translates, else the
 * official name the bridge sends, else null.
 */
const vendorLabel = ({ vendor_id: vendorId, vendor_name: vendorName }: MatterFabric, t: TFunction) => (
  vendorKey(vendorId) ? t(`matter.labels.vendor-${vendorKey(vendorId)}`) : (vendorName || null)
);

/**
 * Which of the four sources the label shown for a fabric comes from.
 *
 * One function instead of several predicates: the order here *is* the rule, and the page
 * needs both the winner's text and which source won - to mark a label chosen on this
 * controller, and to say so when there is no label at all.
 */
export const fabricLabelSource = (fabric: MatterFabric): FabricLabelSource => {
  if (fabric.localFabricLabel) {
    return FabricLabelSource.Local;
  }
  if (fabric.adminFabricLabel) {
    return FabricLabelSource.Admin;
  }
  return vendorKey(fabric.vendor_id) || fabric.vendor_name ? FabricLabelSource.Vendor : FabricLabelSource.None;
};

/**
 * What to show for a fabric, best source first.
 *
 * A label typed here wins, because it is the only one a person on this controller chose.
 * Then the one the fabric gave itself, which Yandex leaves empty. Then a vendor we
 * recognise. A fabric that offers none of the three is shown by its number, and that
 * number has to stay visible: two unlabelled fabrics would be two identical rows, and the
 * operator could not tell which one to remove.
 *
 * Here and not in the page because three places need the same answer - the table, the
 * menu heading and the unpair dialog - and a label that differed between them would read
 * as three different fabrics.
 */
export const fabricDisplayLabel = (fabric: MatterFabric, t: TFunction) => {
  switch (fabricLabelSource(fabric)) {
    case FabricLabelSource.Local:
      return fabric.localFabricLabel;
    case FabricLabelSource.Admin:
      return fabric.adminFabricLabel;
    case FabricLabelSource.Vendor:
      return vendorLabel(fabric, t);
    default:
      return t('matter.labels.fabric-unlabelled', { index: fabric.index });
  }
};

/**
 * What the label typed here replaced, for the note beside it.
 *
 * The fabric's own label when it had one, and the number it would fall back to when it
 * did not. Showing what it was answers the second half of the question: a mark alone says
 * the label is ours, this says what clearing it would bring back.
 */
export const replacedFabricLabel = (fabric: MatterFabric, t: TFunction) => (
  fabric.adminFabricLabel
  || vendorLabel(fabric, t)
  || t('matter.labels.fabric-unlabelled', { index: fabric.index })
);

/**
 * The vendor id the way every Matter document and every log line writes it. Decimal
 * 4911 and 0x132F are the same number, but only the second one can be searched for.
 */
export const vendorHex = (vendorId: number) => `0x${vendorId.toString(16).toUpperCase().padStart(4, '0')}`;

/**
 * Which of the three things the page may say about when an app paired.
 *
 * `since` is when this controller started keeping dates at all. An app older than that
 * gets Before, not a blank: the bridge genuinely does not know the day, and saying so is
 * better than a gap the reader has to interpret.
 */
export const pairedDateKind = ({ paired_at: pairedAt }: MatterFabric, since?: number | null): PairedDateKind => {
  if (Number.isFinite(pairedAt)) {
    return PairedDateKind.Dated;
  }
  return Number.isFinite(since) ? PairedDateKind.Before : PairedDateKind.Unknown;
};

/**
 * Which of the three things the page may say about the channel to an app.
 *
 * Quiet needs both halves to be true - no channel now, and a moment on record when the
 * last one went - because the bridge writes that moment down only at the break. Every
 * app is Offline for a while after the service restarts, and that is normal.
 */
export const linkState = ({ online, last_seen: lastSeen }: MatterFabric): LinkState => {
  if (online) {
    return LinkState.Online;
  }
  return Number.isFinite(lastSeen) ? LinkState.Quiet : LinkState.Offline;
};

/**
 * The verdicts of the bridge that the row says in their own words. The rest - on the
 * line, or nobody asked yet - read as the row always did.
 */
const LINK_WORDS = new Set(['partly', 'left', 'removed', 'forgot', 'offline']);

export const linkWord = ({ link }: MatterFabric) => (link && LINK_WORDS.has(link.code) ? link.code : null);

export const deviceNameOf = (devices: MatterDevice[], did: number) => (
  devices.find((device) => device.did === did)?.name ?? null
);

/** What the bridge says a fabric follows, against the devices that reached Matter. */
export const watchedDevices = (
  { watching, subscriptions }: MatterFabric,
  devices: MatterDevice[],
): WatchedDevices => {
  const of = devices.filter((device) => device.exposed).length;
  if (!watching || !subscriptions) {
    return { kind: WatchingKind.None, count: 0, of, missing: [] };
  }
  if (watching.missing.length === 0) {
    return { kind: WatchingKind.All, count: watching.dids.length, of, missing: [] };
  }
  return {
    kind: WatchingKind.Some,
    count: watching.dids.length,
    of,
    missing: watching.missing.map((did) => deviceNameOf(devices, did) ?? `#${did}`),
  };
};

/**
 * The Matter the devices of a fabric declared: one entry while they all declared the same,
 * which is the usual case, and one per version when a home has hubs of different ages.
 */
export const declaredMatter = (devices: MatterFabricDevice[], nameless: string): DeclaredMatter[] => {
  const declared: DeclaredMatter[] = [];
  devices.filter(({ matter }) => matter).forEach(({ matter, name }) => {
    const key = [
      matter.specification_version, matter.data_model_revision, matter.interaction_model_revision,
    ].join('-');
    const same = declared.find((entry) => entry.key === key);
    if (same) {
      same.names.push(name ?? nameless);
    } else {
      declared.push({ key, matter, names: [name ?? nameless] });
    }
  });
  return declared;
};

/**
 * What is left of an open window, as m:ss. A window that is already over reads 0:00
 * rather than a negative number: the page polls every few seconds, so the moment the
 * clock runs out and the moment the bridge says the window is gone are not the same.
 */
export const timeLeft = (closesAt: number, now: number) => {
  const seconds = Math.max(0, Math.round((closesAt - now) / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
};

/**
 * A colour the bridge formatted as hex. The page draws a swatch for it, because a person
 * reads a colour by looking at it and not by parsing six digits.
 */
export const isColour = (part: string) => /^#[0-9A-F]{6}$/.test(part);

/**
 * What the bridge carries beside the state, split the way it joined it. One string with
 * several readings in it - "50 % · #FF0000" - is one string to the service and several
 * things to a person.
 */
export const detailParts = ({ detail }: MatterDevice) => (detail ?? '').split(' · ').filter(Boolean);
