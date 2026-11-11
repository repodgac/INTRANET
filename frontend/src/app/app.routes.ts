import { Routes } from '@angular/router';
import { adminAuthGuard } from './core/guards/admin-auth.guard';
import { adminRoleGuard } from './core/guards/admin-role.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home-page.component').then((m) => m.HomePageComponent)
  },
  {
    path: 'afiche-civ',
    loadComponent: () =>
      import('./pages/civ-poster-page.component').then((m) => m.CivPosterPageComponent)
  },
  {
    path: 'admin/login',
    loadComponent: () =>
      import('./pages/admin-login-page.component').then((m) => m.AdminLoginPageComponent)
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
    path: 'admin',
    canActivate: [adminAuthGuard],
    loadComponent: () =>
      import('./layouts/admin-layout.component').then((m) => m.AdminLayoutComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        canActivate: [adminRoleGuard],
        data: { roles: ['admin', 'super_admin'] },
        loadComponent: () =>
          import('./pages/admin-dashboard-page.component').then((m) => m.AdminDashboardPageComponent)
      },
      {
        path: 'content',
        canActivate: [adminRoleGuard],
        data: { roles: ['admin', 'super_admin'] },
        loadComponent: () =>
          import('./pages/admin-content-management-page.component').then(
            (m) => m.AdminContentManagementPageComponent
          )
      },
      {
        path: 'access',
        canActivate: [adminRoleGuard],
        data: { roles: ['super_admin'] },
        loadComponent: () =>
          import('./pages/admin-access-management-page.component').then(
            (m) => m.AdminAccessManagementPageComponent
          )
      },
      {
        path: 'circulares',
        canActivate: [adminRoleGuard],
        data: { roles: ['hr_admin', 'super_admin'] },
        loadComponent: () =>
          import('./pages/admin-circulars-page.component').then((m) => m.AdminCircularsPageComponent)
      }
    ]
  },
  {
    path: '**',
    redirectTo: ''
  }
];
