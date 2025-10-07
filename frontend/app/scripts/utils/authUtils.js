import { authStore } from '@/stores/auth';

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
    const user = await authStore.checkAuth()
    rolesFactory.setRole(user.user_type);
    rolesFactory.setUsersAreConfigured(true);
    rolesFactory.setCurrentUserIsAutologinUser(user.autologin);
    return 'ok';
  } catch (e) {
    return 'login';
  }
  // No users are configured, so we have admin access
  rolesFactory.setRole('admin');
  rolesFactory.setUsersAreConfigured(false);
  return 'ok';
}
