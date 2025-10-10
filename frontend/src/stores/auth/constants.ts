export enum UserRole {
  User = 'user',
  Operator = 'operator',
  Admin = 'admin',
}

export const rolePriority: Record<UserRole, number> = {
  user: 1,
  operator: 2,
  admin: 3,
};
