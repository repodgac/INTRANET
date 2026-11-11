import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import type { AdminRole } from '../models';
import { landingPageForRole } from '../auth/role-access';
import { AdminAuthService } from '../services/admin-auth.service';

export const adminRoleGuard: CanActivateFn = async (route) => {
  const auth = inject(AdminAuthService);
  const router = inject(Router);
  const user = await auth.verifySession();
  const allowedRoles = (route.data?.['roles'] ?? []) as AdminRole[];

  if (user && allowedRoles.includes(user.role)) {
    return true;
  }

  return user
    ? router.createUrlTree([landingPageForRole(user.role)])
    : router.createUrlTree(['/admin/login']);
};
