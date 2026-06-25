import { Routes } from '@angular/router';
import { adminAuthGuard } from './core/guards/admin-auth.guard';
import { superAdminGuard } from './core/guards/super-admin.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home-page.component').then((m) => m.HomePageComponent)
  },
  {
    path: 'admin/login',
    loadComponent: () =>
      import('./pages/admin-login-page.component').then((m) => m.AdminLoginPageComponent)
  },
  {
    path: 'admin/dashboard',
    canActivate: [adminAuthGuard],
    loadComponent: () =>
      import('./pages/admin-dashboard-page.component').then((m) => m.AdminDashboardPageComponent)
  },
  {
    path: 'admin/access',
    canActivate: [adminAuthGuard, superAdminGuard],
    loadComponent: () =>
      import('./pages/admin-access-management-page.component').then(
        (m) => m.AdminAccessManagementPageComponent
      )
  },
  {
    path: 'admin/change-password',
    canActivate: [adminAuthGuard],
    loadComponent: () =>
      import('./pages/admin-change-password-page.component').then(
        (m) => m.AdminChangePasswordPageComponent
      )
  },
  {
    path: '**',
    redirectTo: ''
  }
];
