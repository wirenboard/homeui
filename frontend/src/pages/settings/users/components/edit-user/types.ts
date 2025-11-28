import type { User } from '@/stores/auth';

export type UserParams = User & { readOnly?: boolean; password: string };

export interface EditUserModalProps {
  user: UserParams;
  onSave: (_user: Partial<UserParams>) => void;
  onCancel: () => void;
}
