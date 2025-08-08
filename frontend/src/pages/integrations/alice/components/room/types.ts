export interface RoomParams {
  id?: string | 'all';
  onOpenDevice: (_id: string) => void;
  onSave: (_id: string) => void;
  onDelete: () => void;
}
