import { Capability, Color, modeInstances, ranges, type SmartDeviceCapability, toggles } from '@/stores/alice';

export const getAvailableModeInstances = (
  capabilities: SmartDeviceCapability[],
  excludeIndex?: number,
): string[] => {
  const usedInstances = capabilities
    .filter((cap, index) =>
      cap.type === Capability.Mode &&
      index !== excludeIndex &&
      cap.parameters?.instance,
    )
    .map((cap) => cap.parameters.instance);

  return modeInstances.filter(
    (modeInstance) => !usedInstances.includes(modeInstance),
  );
};

// Default range values for unlocked instances
export const RANGE_LIMITS_DEFAULT = { min: 0, max: 100, precision: 1 };

// Instances with fixed ranges that cannot be changed in UI
export const RANGE_LIMITS_LOCKED: Record<string, { min: number; max: number; precision?: number }> = {
  brightness: { min: 0, max: 100, precision: 1 },
  // channel: No lock applied
  humidity:   { min: 0, max: 100, precision: 1 },
  open:       { min: 0, max: 100, precision: 1 },
  // temperature: No lock applied
  // volume: No lock applied
};

export const getAvailableRangeInstances = (
  capabilities: SmartDeviceCapability[],
  excludeIndex?: number,
): string[] => {
  const usedInstances = capabilities
    .filter((cap, index) =>
      cap.type === Capability.Range &&
      index !== excludeIndex &&
      cap.parameters?.instance,
    )
    .map((cap) => cap.parameters.instance);

  return ranges.filter(
    (rangeInstance) => !usedInstances.includes(rangeInstance),
  );
};

export const getAvailableColorModels = (
  capabilities: SmartDeviceCapability[],
  excludeIndex?: number,
): Color[] => {
  // Collect already used Color models among color-setting capabilities
  const usedColorModels = capabilities
    .filter((cap, index) => cap.type === Capability['Color setting'] && index !== excludeIndex)
    .map((cap) => {
      if (cap.parameters?.color_model) return Color.ColorModel;
      if (cap.parameters?.temperature_k) return Color.TemperatureK;
      if (cap.parameters?.color_scene) return Color.ColorScene;
      return null;
    })
    .filter(Boolean);

  return Object.values(Color)
    .filter((m) => m !== Color.ColorScene) // TODO: <DISABLED_COLOR> Its disable Color scene, need remove for enable
    .filter((colorModel) => !usedColorModels.includes(colorModel));
};

export const getCurrentColorModel = (capability: SmartDeviceCapability) => {
  if (capability.parameters?.color_model) return Color.ColorModel;
  if (capability.parameters?.temperature_k) return Color.TemperatureK;
  if (capability.parameters?.color_scene) return Color.ColorScene;
  return Color.ColorModel; // Default value
};

export const getColorModelLabel = (colorKey: string, t: (k: string) => string) => {
  switch (colorKey) {
    case 'ColorModel': return t('alice.labels.color-model');
    case 'TemperatureK': return t('alice.labels.color-temperature');
    case 'ColorScene': return t('alice.labels.color-scenes');
    default: return colorKey;
  }
};

export const getAvailableToggleInstances = (
  capabilities: SmartDeviceCapability[],
  excludeIndex?: number,
): string[] => {
  const usedInstances = capabilities
    .filter((cap, index) =>
      cap.type === Capability.Toggle &&
      index !== excludeIndex &&
      cap.parameters?.instance,
    )
    .map((cap) => cap.parameters.instance);

  return toggles.filter(
    (toggleInstance) => !usedInstances.includes(toggleInstance),
  );
};
