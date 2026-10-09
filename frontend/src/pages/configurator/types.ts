import type { OwnDevice, WbDevice } from '@/stores/configurator';

export interface PageStatus {
  variant: 'success' | 'danger' | 'info';
  text: string;
}

export interface TypeChoiceProps {
  types: string[];
  value: string;
  ariaLabel: string;
  onChange: (_typeId: string) => void;
}

export interface AdapterSwitchesProps {
  target: WbDevice | OwnDevice;
}

export interface TypeTilesProps {
  onPick: (_typeId: string) => void;
}

export interface DeviceListProps {
  onAdd: () => void;
  onClear: () => void;
}

export interface WbDevicePanelProps {
  wb: WbDevice;
  onRemove: (_name: string) => void;
}

export interface OwnDevicePanelProps {
  item: OwnDevice;
  onRemove: (_name: string) => void;
}

export interface AddDialogProps {
  isOpened: boolean;
  onClose: () => void;
  // устройство, открытое сразу; иначе первое не добавленное
  initialDeviceId?: string | null;
}

// Выбор канала в диалоге добавления; type '' — тип ещё не выбран.
export interface PickedChannel {
  checked: boolean;
  type: string;
}

export interface UnsupportedChannel {
  id: string;
  name: string;
  reason: string;
}

export interface UnsupportedChannelsProps {
  items: UnsupportedChannel[];
}

export interface ImportFile {
  name: string;
  text: string;
}

export interface UnitFieldProps {
  value: string;
  onChange: (_unit: string) => void;
}

export interface NewDevicesAlertProps {
  onConfigure: (_deviceId: string) => void;
}
