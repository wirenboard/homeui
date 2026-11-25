import { type TFunction } from 'i18next';
import type { Selection } from '@/stores/configurator';
import type {
  MatterDevice, MatterDeviceRole, MatterFabric, MatterLabel,
} from '@/stores/matter';

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

const NO_LABEL: MatterLabel = { source: 'none', text: null };

/**
 * A label of a fabric in words. Which source won is the bridge's answer; the page has a
 * word of its own for a vendor it translates, and says the number of a fabric that offers
 * nothing - that number has to stay visible, or two unlabelled fabrics are two identical
 * rows.
 */
export const labelText = ({ source, text }: MatterLabel, fabric: MatterFabric, t: TFunction) => {
  switch (source) {
    case 'vendor':
      return t(`matter.labels.vendor-${fabric.vendor_id}`, { defaultValue: text });
    case 'none':
      return t('matter.labels.fabric-unlabelled', { index: fabric.index });
    default:
      return text;
  }
};

/** What a fabric is called everywhere on the page: the table, the menu, the unpair dialog. */
export const fabricDisplayLabel = (fabric: MatterFabric, t: TFunction) => (
  labelText(fabric.label ?? NO_LABEL, fabric, t)
);

/** What stands beside the label: what a label typed here replaced, or that there is none at all. */
export const fabricLabelNote = (fabric: MatterFabric, t: TFunction) => {
  const { source, replaced } = fabric.label ?? NO_LABEL;
  if (source === 'local') {
    return t('matter.labels.fabric-label-instead', { label: labelText(replaced ?? NO_LABEL, fabric, t) });
  }
  return source === 'none' ? t('matter.labels.fabric-no-label') : null;
};

/**
 * The vendor id the way every Matter document and every log line writes it. Decimal
 * 4911 and 0x132F are the same number, but only the second one can be searched for.
 */
export const vendorHex = (vendorId: number) => `0x${vendorId.toString(16).toUpperCase().padStart(4, '0')}`;

/** What the role means for this controller, said after its name. A pairing with no date kept has its own wording. */
export const roleSaysKey = (role: MatterDeviceRole, isDated: boolean) => {
  const key = {
    works: 'role-says-works',
    works_paired: 'role-says-works-paired',
    paired: 'role-says-paired',
    paired_alone: 'role-says-paired',
    silent: 'role-says-silent',
    idle: 'role-says-idle',
  }[role];
  return (role === 'works' || role === 'silent' || role === 'idle' || isDated) ? key : `${key}-undated`;
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
