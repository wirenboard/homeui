export default function rolesFactoryService() {
  'ngInject';

  const DEFAULT_ROLE = 1;
  const WB_ROLE_KEY = 'wb_role';

  var roles = {};

  roles._ROLE_ONE = {
    id: 1,
    name: 'app.roles.user',
    isAdmin: false,
    type: 'user'
  };
  roles._ROLE_TWO = {
    id: 2,
    name: 'app.roles.operator',
    isAdmin: false,
    type: 'operator'
  };
  roles._ROLE_THREE = {
    id: 3,
    name: 'app.roles.admin',
    isAdmin: true,
    type: 'admin'
  };

  roles.ROLE_ONE = roles._ROLE_ONE.id;
  roles.ROLE_TWO = roles._ROLE_TWO.id;
  roles.ROLE_THREE = roles._ROLE_THREE.id;
  roles.ROLES = [roles._ROLE_ONE, roles._ROLE_TWO, roles._ROLE_THREE];

  roles.usersAreConfigured = true;
  roles.currentUserIsAutologinUser = false;

  roles.current = {
    role: undefined,
    roles: undefined,
  };

  const typeToRoleId = {
    admin: roles.ROLE_THREE,
    operator: roles.ROLE_TWO,
    user: roles.ROLE_ONE,
  };

  roles.setRole = (userType) => {
    const n = typeToRoleId[String(userType)] || DEFAULT_ROLE;
    roles.current = { role: n, roles: roles.ROLES[n - 1] };
  };

  roles.setUsersAreConfigured = (value) => {
    roles.usersAreConfigured = value;
  };

  roles.setCurrentUserIsAutologinUser = (value) => {
    roles.currentUserIsAutologinUser = value;
  };

  roles.isAuthenticated = () => {
    return roles.current.role !== undefined;
  }

  // проверяет есть ли права доступа/просмотра
  // принимает значение минимально возможного статуса для доступа/просмотра
  roles.checkRights = onlyRoleGreatThanOrEqual => {
    return roles.isAuthenticated() && roles.current.role >= onlyRoleGreatThanOrEqual;
  };

  return roles;
}
