import type { Mock } from 'vitest';

export { UserRole } from '@/stores/auth/constants';
export type { User } from '@/stores/auth/types';

export const authStoreMock = {
  userRole: undefined as string | undefined,
  isAutologin: false,
  areUsersConfigured: true,
  users: [] as any[],
  isAuthenticated: false,
  me: undefined as any,
  checkAuth: vi.fn() as Mock,
  login: vi.fn() as Mock,
  logout: vi.fn() as Mock,
  getUsers: vi.fn() as Mock,
  addUser: vi.fn() as Mock,
  updateUser: vi.fn() as Mock,
  deleteUser: vi.fn() as Mock,
  hasRights: vi.fn().mockReturnValue(false) as Mock,
};

export { authStoreMock as authStore };
