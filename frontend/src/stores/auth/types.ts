import { type UserRole } from './constants';

export interface AuthResponse {
  user_type: UserRole;
  autologin?: boolean;
}

export interface User {
  autologin: boolean;
  id: string;
  login: string;
  type: UserRole;
}

export interface UserBody {
  login: string;
  password: string;
  type: UserRole;
  autologin?: boolean;
}
