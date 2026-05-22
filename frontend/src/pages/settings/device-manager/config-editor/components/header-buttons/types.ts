import { type MobileModeTabsStore } from '../../stores/mobile-mode-tabs-store';

export interface HeaderButtonsProps {
  allowSave:boolean;
  allowAddDevice: boolean;
  onSave: () => Promise<void>;
  onAddDevice: (_showAddDeviceModal: () => Promise<{ port: string; deviceType: string } | null>) => Promise<void>;
  onAddWbDevice: () => void;
  mobileModeStore: MobileModeTabsStore;
}
