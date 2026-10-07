import i18n from '@/i18n/config';
import {
  CHANNEL_CLASSES, classify, primaryRole, type ChannelClass, type Classification, type ControlMeta, type LiveControls,
} from '@/stores/configurator';
import { devicesStore, DeviceType, type Cell } from '@/stores/devices';

const t = i18n.t.bind(i18n);

export const UNESCAPED = { interpolation: { escapeValue: false } };

export const controlMeta = (cell: Cell): ControlMeta => ({
  type: cell.type,
  units: cell.units,
  readonly: cell.readOnly,
  isEnum: cell.isEnum,
  min: cell.min,
  max: cell.max,
});

export const classifyCell = (cell: Cell): Classification => classify(controlMeta(cell));

export const deviceControls = (deviceId: string): Cell[] =>
  devicesStore.getDeviceCells(deviceId).filter((cell) => cell.type !== 'incomplete');

export const isLiveDevice = (deviceId: string) => deviceControls(deviceId).length > 0;

// wb-gpio для homeui служебный, но его входы и выходы — обычные реле и датчики контроллера.
export const isSystemDevice = (deviceId: string) =>
  deviceId !== 'wb-gpio' && devicesStore.devices.get(deviceId)?.type === DeviceType.System;

export const isVirtualDevice = (deviceId: string) => devicesStore.devices.get(deviceId)?.type === DeviceType.Virtual;

export const liveControls: LiveControls = {
  meta: (deviceId, controlId) => {
    const cell = devicesStore.cells.get(`${deviceId}/${controlId}`);
    return cell && cell.type !== 'incomplete' ? controlMeta(cell) : null;
  },
};

// Устройства с каналами: сначала обычные, потом служебные, внутри по имени.
export const listDevices = (withSystem: boolean): string[] =>
  Array.from(devicesStore.devices.keys())
    .filter((id) => (withSystem || !isSystemDevice(id)) && isLiveDevice(id))
    .sort((a, b) => Number(isSystemDevice(a)) - Number(isSystemDevice(b))
      || deviceTitle(a).localeCompare(deviceTitle(b)));

export const deviceTitle = (deviceId: string) => devicesStore.devices.get(deviceId)?.name || deviceId;

export const deviceLabel = (deviceId: string) =>
  isLiveDevice(deviceId) && deviceTitle(deviceId) !== deviceId ? `${deviceTitle(deviceId)} (${deviceId})` : deviceId;

export const formatValue = (cell: Cell | undefined): string => {
  if (!cell) {
    return '—';
  }
  if (cell.type === 'pushbutton') {
    return t('configurator.labels.value-button');
  }
  if (cell.valueType === 'boolean') {
    return cell.value ? t('configurator.labels.value-on') : t('configurator.labels.value-off');
  }
  const value = String(cell.value ?? '');
  if (!value || value === '-') {
    return '—';
  }
  return cell.units ? `${value} ${t(`units.${cell.units}`, cell.units)}` : value;
};

export const typeName = (typeId: string) => t(`configurator.types.${typeId}.name`);

export const typeShortName = (typeId: string) => t(`configurator.types.${typeId}.short`);

export const roleLabel = (role: string) => t(`configurator.roles.${role}`, { defaultValue: role });

export const whyText = (classification: Classification) =>
  t(`configurator.why.${classification.why ?? 'none'}`, {
    ...UNESCAPED, units: classification.units ?? '',
  });

// Имя канала в приложениях: для однозначного класса — название роли, иначе тип и имя канала.
export const defaultName = (typeId: string, cell: Cell | undefined, cls: ChannelClass) =>
  CHANNEL_CLASSES[cls]?.types.length === 1
    ? roleLabel(primaryRole(typeId, cls))
    : `${typeName(typeId)} ${cell?.name ?? ''}`.trim();
