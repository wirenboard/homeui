/**
 * Created by ozknemoy on 21.06.2017.
 */

export default function rolesFactoryService() {
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

  roles.current = { role: DEFAULT_ROLE, roles: roles.ROLES[DEFAULT_ROLE - 1] };
  roles.notConfiguredAdmin = false;
  let roleIsSet = false;

  roles.whenReadyResolve = null;
  roles.whenReadyPromise = new Promise(resolve => {
    roles.whenReadyResolve = resolve;
  });
  roles.whenReady = () => roles.whenReadyPromise;

  // проверяет есть ли права доступа/просмотра
  // принимает значение минимально возможного статуса для доступа/просмотра
  roles.checkRights = onlyRoleGreatThanOrEqual => roles.current.role >= onlyRoleGreatThanOrEqual;

  roles.asyncCheckRights = (onlyRoleGreatThanOrEqual, successCallback) => {
    if (roleIsSet) {
      if (roles.checkRights(onlyRoleGreatThanOrEqual)) {
        successCallback();
      }
      return;
    }
    roles.whenReady().then(() => {
      if (roles.checkRights(onlyRoleGreatThanOrEqual)) {
        successCallback();
      }
    });
  };

  const typeToRoleId = {
    admin: roles.ROLE_THREE,
    operator: roles.ROLE_TWO,
    user: roles.ROLE_ONE,
  };

  roles.setRole = (userType, notConfiguredAdmin) => {
    roleIsSet = true;
    const roleId = typeToRoleId[String(userType)] || DEFAULT_ROLE;
    roles.current = { role: roleId, roles: roles.ROLES[roleId - 1] };
    roles.notConfiguredAdmin = !!notConfiguredAdmin;
    roles.whenReadyResolve();
  };

  return roles;
}
