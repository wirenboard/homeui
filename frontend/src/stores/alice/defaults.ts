import { Capability, Property } from './constants';
import type { SmartDeviceCapability, SmartDeviceProperty } from './types';

// Single source of truth for capability/property defaults
// Read by Add buttons, alice-store normalize, options popups, and the
// "modified" badge counter — change a value here and every place updates
// Defaults match Yandex Smart Home API:
// https://yandex.ru/dev/dialogs/smart-home/doc/concepts/capability-types

export interface CapabilityDefaults {
  retrievable: boolean;
  reportable: boolean;
  parameters: { split?: boolean };
}

export interface PropertyDefaults {
  retrievable: boolean;
  reportable: boolean;
}

export const getCapabilityDefaults = (type: Capability): CapabilityDefaults => ({
  retrievable: true,
  reportable: true,
  parameters: type === Capability['On/Off'] ? { split: false } : {},
});

export const getPropertyDefaults = (type: Property): PropertyDefaults => ({
  // Event properties have no persistent state — see property-options-button.tsx
  retrievable: type === Property.Event ? false : true,
  reportable: true,
});

// Count fields whose value differs from the default for this type
// Used for the kebab badge — hides the badge when count is zero
export const countModifiedCapability = (cap: SmartDeviceCapability): number => {
  const defaults = getCapabilityDefaults(cap.type);
  let count = 0;
  if (cap.retrievable !== undefined && cap.retrievable !== defaults.retrievable) count += 1;
  if (cap.reportable !== undefined && cap.reportable !== defaults.reportable) count += 1;
  if (defaults.parameters.split !== undefined) {
    const split = cap.parameters?.split;
    if (split !== undefined && split !== defaults.parameters.split) count += 1;
  }
  return count;
};

export const countModifiedProperty = (prop: SmartDeviceProperty): number => {
  // Event property options are locked at defaults and cannot be modified
  if (prop.type === Property.Event) return 0;
  const defaults = getPropertyDefaults(prop.type);
  let count = 0;
  if (prop.retrievable !== undefined && prop.retrievable !== defaults.retrievable) count += 1;
  if (prop.reportable !== undefined && prop.reportable !== defaults.reportable) count += 1;
  return count;
};
