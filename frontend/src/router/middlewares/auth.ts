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
      // Only carry returnState when there actually is one. On a cold boot the
      // hash is empty, so `.at(1)` is undefined and URLSearchParams would
      // serialise it as the literal string "undefined" — which then leaks into
      // the URL and into navigate(returnState) on the login page.
      const returnState = location.hash?.split('#')?.at(1);
      const query = returnState ? `?${new URLSearchParams({ returnState })}` : '';
      throw redirect(`/login${query}`);
    }
  }
};
