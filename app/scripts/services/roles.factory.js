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
  roles.notConfiguredAdminResolve = null;
  roles.notConfiguredAdmin = false;
  roles.notConfiguredAdminPromise = new Promise(resolve => {
    roles.notConfiguredAdminResolve = resolve;
  });

  // проверяет есть ли права доступа/просмотра
  // принимает значение минимально возможного статуса для доступа/просмотра
  roles.checkRights = onlyRoleGreatThanOrEqual => {
    return roles.current.role >= onlyRoleGreatThanOrEqual;
  };

  fetch('/auth/check_config').then(response => {
    if (response.ok) {
      roles.notConfiguredAdmin = true;
    }
    roles.notConfiguredAdminResolve();
  });

  return roles;
}
