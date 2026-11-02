import type { Device } from '@/stores/configurator';

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
  target: Device;
}

export interface TypeTilesProps {
  onPick: (_typeId: string) => void;
}

export interface DeviceListProps {
  onAdd: () => void;
  onClear: () => void;
  onSelect: () => void;
}

export interface DevicePanelProps {
  item: Device;
  onRemove: (_name: string) => void;
  onAddRows: () => void;
}

export interface AddDialogProps {
  isOpened: boolean;
  onClose: () => void;
  // устройство контроллера, открытое сразу; иначе из привязок target
  // или первое со свободными контролами
  initialDeviceId?: string | null;
  // карточка, в которую добавляются строки; без неё создаётся новая
  target?: Device;
  onAdded?: (_device: Device) => void;
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
