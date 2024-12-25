/**
 * Created by ozknemoy on 21.06.2017.
 */

export default function rolesFactory() {
  'ngInject';
  var roles = {};

  const DEFAULT_ROLE = 1;

  roles._ROLE_ONE = {
    id: 1,
    name: 'app.roles.user',
    isAdmin: false,
  };
  roles._ROLE_TWO = {
    id: 2,
    name: 'app.roles.operator',
    isAdmin: false,
  };
  roles._ROLE_THREE = {
    id: 3,
    name: 'app.roles.admin',
    isAdmin: true,
  };

  roles.ROLE_ONE = roles._ROLE_ONE.id;
  roles.ROLE_TWO = roles._ROLE_TWO.id;
  roles.ROLE_THREE = roles._ROLE_THREE.id;
  roles.ROLES = [roles._ROLE_ONE, roles._ROLE_TWO, roles._ROLE_THREE];

  const typeToRoleId = {
    admin: roles.ROLE_THREE,
    operator: roles.ROLE_TWO,
    user: roles.ROLE_ONE,
  };
  const roleId = typeToRoleId[localStorage.getItem('user_type')] || DEFAULT_ROLE;
  roles.current = { role: roleId, roles: roles.ROLES[roleId - 1] };
  roles.notConfiguredUsers = [];
  roles.notConfiguredUsersMessage = '';

  const updateMessage = () => {
    if (!roles.notConfiguredUsers.length) {
      roles.notConfiguredUsersMessage = '';
    } else {
      roles.notConfiguredUsersMessage =
        'app.errors.not-configured-' + roles.notConfiguredUsers.join('-');
    }
  };

  // проверяет есть ли права доступа/просмотра
  // принимает значение минимально возможного статуса для доступа/просмотра
  roles.checkRights = onlyRoleGreatThanOrEqual => {
    return roles.current.role >= onlyRoleGreatThanOrEqual;
  };

  roles.setNotConfiguredUsers = notConfiguredUsers => {
    if (!notConfiguredUsers) {
      roles.notConfiguredUsers = [];
    } else {
      roles.notConfiguredUsers = notConfiguredUsers.split(',').sort();
    }
    updateMessage();
  };

  roles.setConfiguredUser = configuredUser => {
    roles.notConfiguredUsers = roles.notConfiguredUsers.filter(user => user != configuredUser);
    updateMessage();
  };

  fetch('/not_configured_users')
    .then(response => response.text())
    .then(data => roles.setNotConfiguredUsers(data));

  return roles;
}
