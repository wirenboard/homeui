import type { User } from '@/stores/auth';

export interface UsersListProps {
  users: User[];
  passkeysDisabledHint: string;
  onlyOneAdmin: boolean;
  onEdit: (user: User) => void;
  onPasskeys: (user: User) => void;
  onDelete: (user: User) => void;
}
