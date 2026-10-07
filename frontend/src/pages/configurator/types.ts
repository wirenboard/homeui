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
}

export interface ImportFile {
  name: string;
  text: string;
}
