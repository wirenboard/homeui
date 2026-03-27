import { authStore } from '@/stores/auth';
import { ApiError, ErrorCode } from '@/utils/request';

/**
 * Fills the user type by fetching the current user's information and setting the role in the rolesFactory.
 *
 * @async
 * @function fillUserType
 * @param {Object} rolesFactory - An object responsible for managing user roles.
 * @returns {Promise<string>} A promise that resolves to 'ok' if the user type is successfully set,
 *                            or 'login' if the user is not authenticated (HTTP 401).
 */
export async function fillUserType(rolesFactory, errors) {
  if (rolesFactory.current.role !== undefined) {
    return 'ok';
  }
  try {
    const user = await authStore.checkAuth()
    rolesFactory.setRole(user.user_type);
    rolesFactory.setUsersAreConfigured(true);
    rolesFactory.setCurrentUserIsAutologinUser(user.autologin);
    return 'ok';
  } catch (err) {
    if (err instanceof ApiError && err.code === ErrorCode.HTMLResponse) {
      errors.showError('app.errors.nginx', err);
    } else if (err.status === 401) {
      return 'login';
    }
  }
  // No users are configured, so we have admin access
  rolesFactory.setRole('admin');
  rolesFactory.setUsersAreConfigured(false);
  return 'ok';
}
