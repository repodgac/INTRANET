import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import type { AdminSection } from '../core/auth/role-access';
import { canAccessSection, roleLabel } from '../core/auth/role-access';
import { AdminAuthService } from '../core/services/admin-auth.service';

interface NavigationItem {
  section: AdminSection;
  label: string;
  route: string;
}

@Component({
  selector: 'app-admin-layout',
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="admin-layout" [class.menu-open]="menuOpen()">
      <aside class="sidebar" [attr.aria-hidden]="!menuOpen() && isCompact() ? true : null">
        <div class="brand">
          <img src="branding/dgac-header.png" alt="DGAC" />
        </div>

        <nav aria-label="Navegacion administrativa">
          <ng-container *ngFor="let item of navigation">
            <a
              *ngIf="canAccess(item.section); else disabledItem"
              class="nav-item"
              [routerLink]="item.route"
              routerLinkActive="active"
              (click)="closeMenu()"
            >
              <span class="nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path *ngIf="item.section === 'dashboard'" d="M3 11 12 3l9 8v9a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/><path *ngIf="item.section === 'content'" d="M6 2h8l4 4v16H6zM14 2v5h5M9 12h6M9 16h6"/><path *ngIf="item.section === 'access'" d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M16 11l2 2 4-4"/><path *ngIf="item.section === 'circulars'" d="M5 3h14v18H5zM8 7h8M8 11h8M8 15h5"/></svg></span>
              <span>{{ item.label }}</span>
            </a>
            <ng-template #disabledItem>
              <div class="nav-disabled" aria-disabled="true">
                <div class="nav-item disabled">
                  <span class="nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path *ngIf="item.section === 'dashboard'" d="M3 11 12 3l9 8v9a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/><path *ngIf="item.section === 'content'" d="M6 2h8l4 4v16H6zM14 2v5h5M9 12h6M9 16h6"/><path *ngIf="item.section === 'access'" d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M16 11l2 2 4-4"/><path *ngIf="item.section === 'circulars'" d="M5 3h14v18H5zM8 7h8M8 11h8M8 15h5"/></svg></span>
                  <span>{{ item.label }}</span>
                </div>
                <span class="nav-reason">{{ disabledReason(item.section) }}</span>
              </div>
            </ng-template>
          </ng-container>
        </nav>

        <div class="sidebar-footer">
          <a class="nav-item" routerLink="/" (click)="closeMenu()"><span class="nav-icon" aria-hidden="true">&#8599;</span><span>Ver portal</span></a>
          <button class="nav-item logout" type="button" (click)="logout()"><span class="nav-icon" aria-hidden="true">&#8680;</span><span>Cerrar sesi&oacute;n</span></button>
        </div>
      </aside>

      <div class="workspace">
        <header class="admin-topbar">
          <button class="menu-toggle" type="button" (click)="toggleMenu()" [attr.aria-expanded]="menuOpen()" aria-label="Abrir men&uacute; administrativo">&#9776;</button>
          <div class="account">
            <span class="account-icon" aria-hidden="true">&#9786;</span>
            <div><strong>{{ roleName() }}</strong><small>{{ currentUser()?.username }}</small></div>
          </div>
        </header>
        <main class="admin-content"><router-outlet /></main>
      </div>

      <button *ngIf="menuOpen()" class="backdrop" type="button" aria-label="Cerrar menu" (click)="closeMenu()"></button>
    </div>
  `,
  styles: `
    :host { display: block; min-height: 100vh; color: #10284a; font-size: 13px; }
    .admin-layout { min-height: 100vh; background: #eef4fb; }
    .sidebar { position: fixed; inset: 0 auto 0 0; z-index: 30; width: 264px; padding: 1.25rem .9rem 1rem; display: flex; flex-direction: column; background: linear-gradient(180deg, #102c50, #0a2341); color: white; box-shadow: 8px 0 24px rgba(16,48,88,.12); }
    .brand { height: 82px; display: flex; align-items: center; padding: 0 .5rem 1.1rem; border-bottom: 1px solid rgba(255,255,255,.15); }
    .brand img { display: block; width: 214px; height: auto; max-width: 100%; filter: brightness(0) invert(1); object-fit: contain; }
    nav { display: grid; gap: .4rem; padding-top: 1.25rem; }
    .nav-item { width: 100%; min-height: 40px; display: flex; align-items: center; gap: .7rem; padding: .58rem .75rem; border: 0; border-radius: 8px; color: rgba(255,255,255,.92); background: transparent; font: inherit; font-size: .82rem; font-weight: 650; line-height: 1.25; text-align: left; text-decoration: none; cursor: pointer; }
    .nav-item:hover, .nav-item.active { background: #1461d8; color: white; }
    .nav-icon { width: 1.1rem; height: 1.1rem; display: grid; place-items: center; flex: 0 0 1.1rem; } .nav-icon svg { width: 100%; height: 100%; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
    .nav-disabled { border-radius: 9px; background: rgba(255,255,255,.035); }
    .nav-item.disabled { min-height: 38px; color: rgba(255,255,255,.4); cursor: not-allowed; }
    .nav-reason { display: block; padding: 0 .8rem .55rem 3rem; color: rgba(255,255,255,.58); font-size: .7rem; line-height: 1.3; }
    .sidebar-footer { margin-top: auto; padding-top: .8rem; border-top: 1px solid rgba(255,255,255,.2); display: grid; gap: .25rem; }
    .logout { color: white; }
    .workspace { min-height: 100vh; margin-left: 264px; }
    .admin-topbar { height: 64px; padding: 0 2rem; display: flex; align-items: center; justify-content: flex-end; background: rgba(255,255,255,.97); border-bottom: 1px solid #d9e3f0; position: sticky; top: 0; z-index: 20; backdrop-filter: blur(12px); }
    .account { display: flex; align-items: center; gap: .65rem; }
    .account-icon { width: 34px; height: 34px; display: grid; place-items: center; border-radius: 50%; background: #e9f1ff; color: #145bc7; }
    .account div { display: grid; } .account strong { font-size: .86rem; } .account small { color: #6c7e96; font-size: .72rem; }
    .admin-content { width: 100%; margin: 0; padding: 1.75rem 2rem 2.75rem; }
    .menu-toggle { display: none; margin-right: auto; border: 1px solid #c8d7eb; border-radius: 9px; background: white; color: #123c70; padding: .55rem .7rem; font-size: 1.1rem; }
    .backdrop { display: none; }
    @media (max-width: 820px) {
      .workspace { margin-left: 0; }
      .admin-topbar { justify-content: space-between; padding: 0 .9rem; }
      .menu-toggle { display: block; }
      .sidebar { transform: translateX(-105%); transition: transform .22s ease; width: min(286px, 86vw); }
      .menu-open .sidebar { transform: translateX(0); }
      .backdrop { display: block; position: fixed; inset: 0; z-index: 25; border: 0; background: rgba(5,20,40,.48); }
      .admin-content { padding: 1rem .9rem 2rem; }
      .account small { display: none; }
    }
  `
})
export class AdminLayoutComponent {
  private readonly auth = inject(AdminAuthService);
  private readonly router = inject(Router);
  protected readonly menuOpen = signal(false);
  protected readonly isCompact = signal(typeof window !== 'undefined' && window.innerWidth <= 820);
  protected readonly currentUser = this.auth.currentUser;
  protected readonly roleName = computed(() => this.currentUser() ? roleLabel(this.currentUser()!.role) : 'Administracion');
  protected readonly navigation: NavigationItem[] = [
    { section: 'dashboard', label: 'Resumen', route: '/admin/dashboard' },
    { section: 'content', label: 'Contenido', route: '/admin/content' },
    { section: 'access', label: 'Accesos', route: '/admin/access' },
    { section: 'circulars', label: 'Circulares de RR. HH.', route: '/admin/circulares' }
  ];

  protected canAccess(section: AdminSection) { return !!this.currentUser() && canAccessSection(this.currentUser()!.role, section); }
  protected disabledReason(section: AdminSection) {
    if (this.currentUser()?.role === 'hr_admin') return 'Disponible para administradores del portal.';
    if (section === 'access') return 'Disponible solo para superadministracion.';
    return 'Disponible para RR. HH. y superadministracion.';
  }
  protected toggleMenu() { this.menuOpen.update((value) => !value); }
  protected closeMenu() { this.menuOpen.set(false); }
  protected logout() { this.auth.logout(); void this.router.navigateByUrl('/admin/login'); }
}
