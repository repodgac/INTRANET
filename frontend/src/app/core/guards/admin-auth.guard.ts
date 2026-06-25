import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AdminAuthService } from '../services/admin-auth.service';

export const adminAuthGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AdminAuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    const user = await auth.verifySession();

    if (user) {
      if (user.mustChangePassword && state.url !== '/admin/change-password') {
        return router.createUrlTree(['/admin/change-password']);
      }

      if (!user.mustChangePassword && state.url === '/admin/change-password') {
        return router.createUrlTree(['/admin/dashboard']);
      }

      return true;
    }
  }

  return router.createUrlTree(['/admin/login'], {
    queryParams: { redirectTo: state.url }
  });
};
