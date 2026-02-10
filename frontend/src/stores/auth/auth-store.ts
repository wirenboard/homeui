import { makeAutoObservable, runInAction } from 'mobx';
import { request } from '@/utils/request';
import { rolePriority, UserRole } from './constants';
import type { AuthResponse, User, UserBody } from './types';

export default class AuthStore {
  public userRole: UserRole;
  public isAutologin: boolean;
  public areUsersConfigured: boolean = true;
  public users: User[] = [];
  #currentUserId: string;

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  async checkAuth(): Promise<AuthResponse> {
    try {
      const { data } = await request.get<AuthResponse>('/auth/who_am_i');
      return runInAction(() => {
        this.userRole = data.user_type;
        this.#currentUserId = data.user_id;
        this.isAutologin = !!data.autologin;
        return data;
      });
    } catch (err) {
      runInAction(() => {
        // if backend is outdated and there are no users at all
        if (err.status === 404) {
          this.userRole = UserRole.Admin;
          this.areUsersConfigured = false;
        } else {
          this.userRole = undefined;
        }
      });

      throw err;
    }
  }

  async login(body: { login: string; password: string }) {
    const { data } = await request.post<AuthResponse>('/auth/login', body);
    return runInAction(() => {
      this.userRole = data.user_type;
      this.#currentUserId = data.user_id;
      this.isAutologin = false;
      this.areUsersConfigured = true;
      return data;
    });
  }

  async logout(redirectUrl?: string) {
    this.#currentUserId = null;
    if (this.isAutologin) {
      // If the user is an autologin user, just show login page to select another user.
      location.assign('/#!/login');
    } else {
      await request.post('/auth/logout');
      if (redirectUrl) {
        location.assign(redirectUrl);
      }
      location.reload();
    }
  }

  async getUsers() {
    const res = await request.get<User[]>('/auth/users');
    this.users = res.data;
    return res;
  }

  async addUser(body: UserBody) {
    const res = await request.post<string>('/auth/users', body);
    return runInAction(() => {
      this.users.push({ id: res.data, login: body.login, autologin: false } as User);
      return res;
    });
  }

  async updateUser(id: string, body: Partial<UserBody>) {
    const res = await request.patch<string>(`/auth/users/${id}`, body);
    return runInAction(() => {
      this.users = this.users.map((user) =>
        user.id === id ? { ...user, login: body.login, type: body.type } : user
      );
      return res;
    });
  }

  async deleteUser(id: string) {
    const res = await request.delete<string>(`/auth/users/${id}`);
    return runInAction(() => {
      this.users = this.users.filter((user) => user.id !== id);
      return res;
    });
  }

  get isAuthenticated() {
    return !!this.userRole;
  }

  get me() {
    return this.users.find((item) => item.id === this.#currentUserId);
  }

  hasRights(role: UserRole) {
    return this.userRole ? rolePriority[this.userRole] >= rolePriority[role] : false;
  }
}
