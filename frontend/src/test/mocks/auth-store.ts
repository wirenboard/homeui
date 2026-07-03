export { UserRole } from '@/stores/auth/constants';
export type { User } from '@/stores/auth/types';

export const authStoreMock = {
  userRole: undefined as string | undefined,
  isAutologin: false,
  areUsersConfigured: true,
  users: [] as any[],
  isAuthenticated: false,
  me: undefined as any,
  checkAuth: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  getUsers: vi.fn(),
  addUser: vi.fn(),
  updateUser: vi.fn(),
  deleteUser: vi.fn(),
  hasRights: vi.fn().mockReturnValue(false),
};

export { authStoreMock as authStore };
