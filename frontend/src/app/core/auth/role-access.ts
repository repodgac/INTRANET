import type { AdminRole } from '../models';

export type AdminSection = 'dashboard' | 'content' | 'access' | 'circulars';

const roleSections: Record<AdminRole, readonly AdminSection[]> = {
  super_admin: ['dashboard', 'content', 'access', 'circulars'],
  admin: ['dashboard', 'content'],
  hr_admin: ['circulars']
};

export function canAccessSection(role: AdminRole, section: AdminSection) {
  return roleSections[role].includes(section);
}

export function landingPageForRole(role: AdminRole) {
  return role === 'hr_admin' ? '/admin/circulares' : '/admin/dashboard';
}

export function roleLabel(role: AdminRole) {
  if (role === 'super_admin') return 'Superadministrador';
  if (role === 'hr_admin') return 'Administrador de RR. HH.';
  return 'Administrador';
}
