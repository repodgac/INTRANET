import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AdminAuthService } from '../services/admin-auth.service';

export const superAdminGuard: CanActivateFn = async () => {
  const auth = inject(AdminAuthService);
  const router = inject(Router);

  const user = auth.currentUser() ?? (await auth.verifySession());

  if (user?.role === 'super_admin') {
    return true;
  }

  return router.createUrlTree(['/admin/dashboard']);
};
