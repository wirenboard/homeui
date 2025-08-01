/**
 * Fills the user type by fetching the current user's information and setting the role in the rolesFactory.
 *
 * @async
 * @function fillUserType
 * @param {Object} rolesFactory - An object responsible for managing user roles.
 * @returns {Promise<string>} A promise that resolves to 'ok' if the user type is successfully set,
 *                            or 'login' if the user is not authenticated (HTTP 401).
 */
export async function fillUserType(rolesFactory) {
  if (rolesFactory.current.role !== undefined) {
    return 'ok';
  }
  try {
    const response = await fetch('/auth/who_am_i');
    if (response.status === 200) {
      const user = await response.json();
      rolesFactory.setRole(user.user_type);
      rolesFactory.setAdminIsConfigured(true);
      rolesFactory.setCurrentUserIsAutologinUser(user.autologin);
      return 'ok';
    }
    if (response.status === 401) {
      return 'login';
    }
  } catch (e) {
    /* empty */
  }
  rolesFactory.setRole('user');
  rolesFactory.setAdminIsConfigured(false);
  return 'ok';
}
