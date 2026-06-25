import { requestMock } from '@/test/mocks/request';
import AuthStore from './auth-store';
import { UserRole } from './constants';
import type { User, UserBody } from './types';

vi.mock('@/utils/request', () => import('@/test/mocks/request'));

describe('AuthStore', () => {
  let store: AuthStore;

  beforeEach(() => {
    vi.clearAllMocks();
    store = new AuthStore();
  });

  describe('isAuthenticated', () => {
    test('returns false when userRole is not set', () => {
      expect(store.isAuthenticated).toBe(false);
    });

    test('returns true when userRole is set', () => {
      store.userRole = UserRole.User;
      expect(store.isAuthenticated).toBe(true);
    });
  });

  describe('hasRights', () => {
    test('returns false when not authenticated', () => {
      expect(store.hasRights(UserRole.User)).toBe(false);
    });

    test.each([
      { role: UserRole.Admin, required: UserRole.Admin, expected: true },
      { role: UserRole.Admin, required: UserRole.Operator, expected: true },
      { role: UserRole.Admin, required: UserRole.User, expected: true },
      { role: UserRole.Operator, required: UserRole.Operator, expected: true },
      { role: UserRole.Operator, required: UserRole.User, expected: true },
      { role: UserRole.Operator, required: UserRole.Admin, expected: false },
      { role: UserRole.User, required: UserRole.User, expected: true },
      { role: UserRole.User, required: UserRole.Operator, expected: false },
      { role: UserRole.User, required: UserRole.Admin, expected: false },
    ])('$role hasRights($required) → $expected', ({ role, required, expected }) => {
      store.userRole = role;
      expect(store.hasRights(required)).toBe(expected);
    });
  });

  describe('checkAuth', () => {
    test('sets user data on success', async () => {
      const data = { user_type: UserRole.Admin, user_id: '1', autologin: true };
      requestMock.get.mockResolvedValue({ data });

      const result = await store.checkAuth();

      expect(requestMock.get).toHaveBeenCalledWith('/auth/who_am_i');
      expect(result).toEqual(data);
      expect(store.userRole).toBe(UserRole.Admin);
      expect(store.isAutologin).toBe(true);
    });

    test('sets autologin false when not provided', async () => {
      requestMock.get.mockResolvedValue({
        data: { user_type: UserRole.User, user_id: '1' },
      });

      await store.checkAuth();
      expect(store.isAutologin).toBe(false);
    });

    test('sets admin role on 404', async () => {
      requestMock.get.mockRejectedValue({ status: 404 });

      await expect(store.checkAuth()).rejects.toEqual({ status: 404 });
      expect(store.userRole).toBe(UserRole.Admin);
      expect(store.areUsersConfigured).toBe(false);
    });

    test('clears userRole on other errors', async () => {
      store.userRole = UserRole.User;
      requestMock.get.mockRejectedValue({ status: 500 });

      await expect(store.checkAuth()).rejects.toEqual({ status: 500 });
      expect(store.userRole).toBeUndefined();
    });
  });

  describe('login', () => {
    test('sets user data and returns response', async () => {
      const data = { user_type: UserRole.Operator, user_id: '2' };
      requestMock.post.mockResolvedValue({ data });

      const result = await store.login({ login: 'user', password: 'pass' });

      expect(requestMock.post).toHaveBeenCalledWith('/auth/login', {
        login: 'user',
        password: 'pass',
      });
      expect(result).toEqual(data);
      expect(store.userRole).toBe(UserRole.Operator);
      expect(store.isAutologin).toBe(false);
      expect(store.areUsersConfigured).toBe(true);
    });
  });

  describe('logout', () => {
    test('calls API when not autologin', async () => {
      requestMock.post.mockResolvedValue({});

      await store.logout();

      expect(requestMock.post).toHaveBeenCalledWith('/auth/logout');
    });

    test('skips API call when autologin', async () => {
      store.isAutologin = true;

      await store.logout();

      expect(requestMock.post).not.toHaveBeenCalled();
    });
  });

  describe('me', () => {
    test('returns current user after checkAuth', async () => {
      requestMock.get.mockResolvedValue({
        data: { user_type: UserRole.Admin, user_id: '1' },
      });
      await store.checkAuth();

      const user: User = { id: '1', login: 'admin', type: UserRole.Admin, autologin: false };
      store.users = [user, { id: '2', login: 'other', type: UserRole.User, autologin: false }];

      expect(store.me).toEqual(user);
    });

    test('returns undefined when not logged in', () => {
      store.users = [{ id: '1', login: 'admin', type: UserRole.Admin, autologin: false }];
      expect(store.me).toBeUndefined();
    });
  });

  describe('getUsers', () => {
    test('fetches and sets users', async () => {
      const users: User[] = [
        { id: '1', login: 'admin', type: UserRole.Admin, autologin: false },
      ];
      requestMock.get.mockResolvedValue({ data: users });

      await store.getUsers();

      expect(requestMock.get).toHaveBeenCalledWith('/auth/users');
      expect(store.users).toEqual(users);
    });
  });

  describe('addUser', () => {
    test('adds user to list', async () => {
      const body: UserBody = { login: 'new', password: 'pass', type: UserRole.User };
      requestMock.post.mockResolvedValue({ data: '42' });

      await store.addUser(body);

      expect(requestMock.post).toHaveBeenCalledWith('/auth/users', body);
      expect(store.users).toHaveLength(1);
      expect(store.users[0]).toMatchObject({ id: '42', login: 'new' });
    });
  });

  describe('updateUser', () => {
    test('updates user in list', async () => {
      store.users = [{ id: '1', login: 'old', type: UserRole.User, autologin: false }];
      requestMock.patch.mockResolvedValue({ data: '1' });

      await store.updateUser('1', { login: 'updated', type: UserRole.Operator });

      expect(requestMock.patch).toHaveBeenCalledWith('/auth/users/1', {
        login: 'updated',
        type: UserRole.Operator,
      });
      expect(store.users[0]).toMatchObject({ login: 'updated', type: UserRole.Operator });
    });

    test('does not modify other users', async () => {
      store.users = [
        { id: '1', login: 'admin', type: UserRole.Admin, autologin: false },
        { id: '2', login: 'user', type: UserRole.User, autologin: false },
      ];
      requestMock.patch.mockResolvedValue({ data: '1' });

      await store.updateUser('1', { login: 'changed' });

      expect(store.users[1]).toMatchObject({ id: '2', login: 'user' });
    });
  });

  describe('deleteUser', () => {
    test('removes user from list', async () => {
      store.users = [
        { id: '1', login: 'admin', type: UserRole.Admin, autologin: false },
        { id: '2', login: 'user', type: UserRole.User, autologin: false },
      ];
      requestMock.delete.mockResolvedValue({ data: '1' });

      await store.deleteUser('1');

      expect(requestMock.delete).toHaveBeenCalledWith('/auth/users/1');
      expect(store.users).toHaveLength(1);
      expect(store.users[0].id).toBe('2');
    });
  });
});
