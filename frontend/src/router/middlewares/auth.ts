import { redirect, type MiddlewareFunction } from 'react-router';
import { authStore } from '@/stores/auth';
import { ApiError, ErrorCode } from '@/utils/request';

export const authGuard: MiddlewareFunction = async (_, next) => {
  if (authStore.isAuthenticated || authStore.isAutologin) {
    return next();
  }

  try {
    await authStore.checkAuth();
    return next();
  } catch (err) {
    if (err instanceof ApiError && err.code === ErrorCode.HTMLResponse) {
      console.error('app.errors.nginx', err);
    } else if (err.status === 401) {
      const params = new URLSearchParams({
        returnState: location.hash?.split('#')?.at(1),
      });
      throw redirect(`/login?${params}`);
    }
  }
};
