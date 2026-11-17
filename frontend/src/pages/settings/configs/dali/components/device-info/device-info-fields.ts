import { type TFunction } from 'i18next';
import type { DaliDeviceDescription } from '@/stores/dali/types';
import type { DeviceInfoField } from './types';

export const getDeviceNames = (description: DaliDeviceDescription): string[] =>
  [description.brand_name, description.product_name].filter(Boolean);

export const getDeviceTypeNames = (description: DaliDeviceDescription, t: TFunction): string[] =>
  (description.types ?? []).map((type) => t(`dali.device-types.${type}`, { defaultValue: `DT${type}` }));

export const getShortDeviceTypes = (description: DaliDeviceDescription): string =>
  (description.types ?? []).map((type) => `DT${type}`).join(', ');

export const getDeviceInfoFields = (description: DaliDeviceDescription, t: TFunction): DeviceInfoField[] => [
  { label: t('dali.labels.info-gtin'), value: description.gtin },
  { label: t('dali.labels.info-identification-number'), value: description.identification_number },
  { label: t('dali.labels.info-firmware'), value: description.firmware_version },
  { label: t('dali.labels.info-hardware'), value: description.hardware_version },
  { label: t('dali.labels.info-oem-gtin'), value: description.oem_gtin },
  { label: t('dali.labels.info-oem-identification-number'), value: description.oem_identification_number },
].filter(({ value }) => value !== undefined && value !== null && value !== '');
