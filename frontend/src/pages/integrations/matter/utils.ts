import { type TFunction } from 'i18next';
import type { Selection } from '@/stores/configurator';
import type {
  MatterAnswer, MatterDevice, MatterDeviceRole, MatterFabric, MatterLabel, MatterOutcome,
} from '@/stores/matter';

/**
 * How the answer of an app about a device is drawn: one that did not take it is a
 * problem, one that cannot be asked now has nothing to say.
 */
export const STATUS_OF_ANSWER: Record<MatterAnswer, MatterOutcome> = { yes: 'ok', no: 'error', unknown: 'off' };

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

/**
 * Whose a fabric is, for the line under its name: the official name of its vendor, and
 * its number only where the bridge has no name for it. Always the vendor, also under a
 * fabric that is named by its vendor: the name above may be a word of this page
 * ("Яндекс"), the line under it is what the vendor is called in the list of the standard.
 */
export const fabricVendor = (fabric: MatterFabric) => fabric.vendor_name ?? vendorHex(fabric.vendor_id);

/**
 * The label the app gave a fabric, where one typed on this controller stands instead of
 * it; null where none was typed here.
 */
export const replacedLabelText = (fabric: MatterFabric, t: TFunction) => {
  const { source, replaced } = fabric.label ?? NO_LABEL;
  if (source !== 'local') {
    return null;
  }
  return replaced && replaced.source !== 'none' ? labelText(replaced, fabric, t) : t('matter.labels.none');
};

/** What an app is called, by the index of its fabric; a bare number for one the page was not told of. */
export const appLabel = (fabrics: MatterFabric[], index: number, t: TFunction) => {
  const fabric = fabrics.find((one) => one.index === index);
  return fabric ? fabricDisplayLabel(fabric, t) : `#${index}`;
};

/**
 * A reason of the bridge in the words of the page. A code this page has no words for is
 * a newer bridge: then what the bridge itself said is better than nothing.
 */
export const reasonText = (code: string, t: TFunction, fallback = code) => (
  t(`matter.labels.reason-${code}`, { defaultValue: fallback })
);

/** Why a device is not given to Matter; nothing while the bridge has not said. */
export const deviceReason = ({ reason_code: code, reason }: MatterDevice, t: TFunction) => (
  code ? reasonText(code, t, reason ?? code) : reason ?? ''
);

// What is a line of its own in the details: a heading, a fact, a remark.
const DETAILS_LINES = 'h4, h5, .matter-fact, .matter-detailsNote, .matter-detailsAdvice';

/**
 * The text of an element with its pieces apart, as they are apart on the screen. A remark
 * inside stands under its value there: in a line of text it goes into brackets.
 */
const wordsOf = (node: Node, isInside = false): string => {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent.trim();
  }
  const words = [...node.childNodes].map((child) => wordsOf(child, true)).filter(Boolean).join(' ');
  return isInside && words && (node as Element).matches('.matter-detailsNote') ? `(${words})` : words;
};

/**
 * The details of a row as text, to paste into a message: the name of the row, then a
 * heading on a line of its own and a fact as "name: value". Read from what is drawn, so
 * the copy says what the page says and nothing else. What is marked data-nocopy is a
 * control of the page, and is left out.
 */
export const detailsText = (title: string, details: HTMLElement) => {
  const lines = [...details.querySelectorAll<HTMLElement>(DETAILS_LINES)]
    .filter((line) => !line.parentElement.closest(DETAILS_LINES) && !line.closest('[data-nocopy]'))
    .map((line) => {
      if (line.matches('.matter-fact')) {
        return `${wordsOf(line.querySelector('dt'))}: ${wordsOf(line.querySelector('dd'))}`;
      }
      // A section starts after an empty line.
      return line.matches('h4') ? `\n${wordsOf(line)}` : wordsOf(line);
    });
  return [title, ...lines].join('\n');
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
