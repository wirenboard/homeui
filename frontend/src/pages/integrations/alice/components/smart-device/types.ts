export interface SmartDeviceProps {
  id?: string;
  onSave: (_id: string) => void;
  onDelete: () => void;
  onOpenDevice: (_id: string) => void;
}
