import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import type { AdminRole, ManagedAdminUser } from '../core/models';
import { AdminAuthService } from '../core/services/admin-auth.service';
import { AdminManagementService } from '../core/services/admin-management.service';

@Component({
  selector: 'app-admin-access-management-page',
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <main class="access-shell">
      <header class="access-hero">
        <div>
          <p class="access-kicker">Super administrador</p>
          <h1>Control de accesos administrativos</h1>
          <p class="access-summary">
            Autorice, actualice o retire el ingreso al panel usando cuentas del dominio DGAC.
          </p>
        </div>

        <div class="access-actions">
          <a routerLink="/admin/dashboard">Ver dashboard</a>
          <button type="button" (click)="logout()">Cerrar sesion</button>
        </div>
      </header>

      <section class="access-layout">
        <article class="access-card form-card">
          <div class="card-heading">
            <div>
              <p class="card-tag">Alta rapida</p>
              <h2>{{ editingId() ? 'Editar admin' : 'Agregar admin' }}</h2>
            </div>
            <button type="button" class="ghost-button" *ngIf="editingId()" (click)="resetForm()">
              Cancelar
            </button>
          </div>

          <form class="access-form" (ngSubmit)="submitForm()">
            <label>
              <span>Login del dominio</span>
              <input
                type="text"
                name="loginName"
                [(ngModel)]="form.loginName"
                placeholder="gerber.salazar"
                required
              />
            </label>

            <label>
              <span>Nombre visible</span>
              <input
                type="text"
                name="displayName"
                [(ngModel)]="form.displayName"
                placeholder="Gerber Eduardo Salazar Estrada"
              />
            </label>

            <label>
              <span>Correo</span>
              <input
                type="email"
                name="email"
                [(ngModel)]="form.email"
                placeholder="gerber.salazar@dgacgt.local"
              />
            </label>

            <label>
              <span>Rol</span>
              <select name="role" [(ngModel)]="form.role">
                <option value="admin">Admin</option>
                <option value="super_admin">Super admin</option>
              </select>
            </label>

            <label class="inline-toggle" *ngIf="editingId()">
              <input type="checkbox" name="active" [(ngModel)]="form.active" />
              <span>Acceso activo</span>
            </label>

            <p class="form-error" *ngIf="errorMessage()">{{ errorMessage() }}</p>
            <p class="form-success" *ngIf="successMessage()">{{ successMessage() }}</p>

            <button type="submit" [disabled]="submitting()">
              {{
                submitting()
                  ? 'Guardando...'
                  : editingId()
                    ? 'Actualizar acceso'
                    : 'Autorizar admin'
              }}
            </button>
          </form>
        </article>

        <article class="access-card list-card">
          <div class="card-heading">
            <div>
              <p class="card-tag teal">Mantenimiento</p>
              <h2>Admins autorizados</h2>
            </div>
            <div class="toolbar-actions">
              <select
                class="filter-select"
                name="statusFilter"
                [ngModel]="statusFilter()"
                (ngModelChange)="statusFilter.set($event)"
              >
                <option value="active">Activos</option>
                <option value="inactive">Inactivos</option>
                <option value="all">Todos</option>
              </select>
              <button type="button" class="ghost-button" (click)="loadAdmins()" [disabled]="loading()">
                Recargar
              </button>
            </div>
          </div>

          <section class="state-block" *ngIf="loading()">Cargando accesos...</section>
          <section class="state-block error" *ngIf="loadError()">{{ loadError() }}</section>

          <div class="admin-list" *ngIf="!loading() && filteredAdmins().length">
            <article class="admin-item" *ngFor="let admin of filteredAdmins()">
              <div class="admin-main">
                <div class="identity">
                  <strong>{{ admin.displayName || admin.loginName }}</strong>
                  <p>{{ admin.loginName }} <span *ngIf="admin.email">- {{ admin.email }}</span></p>
                </div>

                <div class="chips">
                  <span class="chip role">{{ admin.role === 'super_admin' ? 'Super admin' : 'Admin' }}</span>
                  <span class="chip" [class.inactive]="!admin.active">
                    {{ admin.active ? 'Activo' : 'Inactivo' }}
                  </span>
                </div>
              </div>

              <div class="admin-meta">
                <span>Ultimo acceso: {{ formatLastLogin(admin.lastLoginAt) }}</span>
                <span>Actualizado: {{ shortDateTime(admin.updatedAt) }}</span>
              </div>

              <div class="admin-actions">
                <button type="button" class="secondary-button" (click)="startEdit(admin)">Editar</button>
                <button
                  type="button"
                  class="danger-button"
                  (click)="deleteAdmin(admin)"
                  [disabled]="deletingId() === admin.id || isCurrentUser(admin)"
                >
                  {{ deletingId() === admin.id ? 'Eliminando...' : 'Eliminar' }}
                </button>
              </div>
            </article>
          </div>

          <section class="state-block" *ngIf="!loading() && !filteredAdmins().length">
            No hay admins registrados para el filtro seleccionado.
          </section>
        </article>
      </section>
    </main>
  `,
  styles: `
    .access-shell {
      width: min(100%, 1460px);
      min-height: 100vh;
      margin: 0 auto;
      padding: 1.5rem 1.2rem 2rem;
      display: grid;
      gap: 1.2rem;
    }

    .access-hero,
    .access-card,
    .state-block {
      border: 1px solid rgba(113, 155, 224, 0.18);
      border-radius: 28px;
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(246, 250, 255, 0.92));
      box-shadow: 0 16px 42px rgba(34, 82, 158, 0.1);
    }

    .access-hero {
      padding: 1.8rem;
      display: flex;
      align-items: end;
      justify-content: space-between;
      gap: 1rem;
      background:
        radial-gradient(circle at top right, rgba(27, 161, 147, 0.12), transparent 28%),
        linear-gradient(180deg, rgba(255, 255, 255, 0.99), rgba(239, 247, 255, 0.96));
    }

    .access-kicker,
    .card-tag {
      margin: 0 0 0.35rem;
      text-transform: uppercase;
      letter-spacing: 0.16em;
      font-size: 0.8rem;
      font-weight: 800;
      color: #1d7a93;
    }

    .card-tag.teal {
      color: #1ba193;
    }

    h1,
    h2 {
      margin: 0;
      color: #173f79;
    }

    h1 {
      font-size: clamp(2rem, 3.8vw, 3.35rem);
      line-height: 0.98;
    }

    h2 {
      font-size: 1.35rem;
    }

    .access-summary {
      margin: 0.9rem 0 0;
      max-width: 42rem;
      line-height: 1.7;
      color: #51709e;
    }

    .access-actions,
    .admin-actions,
    .toolbar-actions {
      display: flex;
      gap: 0.8rem;
      flex-wrap: wrap;
    }

    .access-actions a,
    .access-actions button,
    .access-form button,
    .ghost-button,
    .secondary-button,
    .danger-button {
      min-height: 3rem;
      padding: 0.8rem 1.1rem;
      border-radius: 14px;
      border: 1px solid transparent;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      line-height: 1;
      white-space: nowrap;
    }

    .access-actions a,
    .ghost-button,
    .secondary-button {
      background: rgba(255, 255, 255, 0.9);
      color: #235fdb;
      border: 1px solid rgba(113, 155, 224, 0.22);
    }

    .access-actions button,
    .access-form button {
      background: linear-gradient(180deg, #173f79, #102f5b);
      color: #fff;
    }

    .danger-button {
      background: linear-gradient(180deg, #d94f5c, #b63844);
      color: #fff;
    }

    .access-layout {
      display: grid;
      grid-template-columns: minmax(320px, 420px) minmax(0, 1fr);
      gap: 1rem;
      align-items: start;
    }

    .access-card {
      padding: 1.3rem;
      display: grid;
      gap: 1rem;
    }

    .card-heading,
    .admin-main,
    .admin-meta {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      align-items: center;
    }

    .access-form {
      display: grid;
      gap: 0.9rem;
    }

    label {
      display: grid;
      gap: 0.4rem;
      color: #244677;
      font-weight: 600;
    }

    input,
    select {
      min-height: 3.15rem;
      padding: 0.8rem 0.95rem;
      border: 1px solid rgba(118, 149, 209, 0.3);
      border-radius: 14px;
      background: #fff;
    }

    .filter-select {
      min-width: 10.5rem;
      color: #244677;
      font-weight: 700;
    }

    .inline-toggle {
      grid-auto-flow: column;
      justify-content: start;
      align-items: center;
      gap: 0.7rem;
    }

    .inline-toggle input {
      min-height: auto;
      width: 1rem;
      height: 1rem;
      margin: 0;
    }

    .form-error,
    .state-block.error {
      color: #b42318;
    }

    .form-success {
      color: #117a65;
    }

    .form-error,
    .form-success,
    .state-block {
      margin: 0;
      padding: 1rem 1.1rem;
      border-radius: 18px;
      background: rgba(255, 255, 255, 0.84);
    }

    .admin-list {
      display: grid;
      gap: 0.85rem;
    }

    .admin-item {
      display: grid;
      gap: 0.8rem;
      padding: 1rem;
      border: 1px solid rgba(119, 153, 214, 0.16);
      border-radius: 20px;
      background: rgba(255, 255, 255, 0.86);
    }

    .identity,
    .chips {
      display: flex;
      gap: 0.65rem;
      align-items: center;
      flex-wrap: wrap;
    }

    .identity {
      display: grid;
      gap: 0.25rem;
    }

    .identity p,
    .admin-meta span {
      margin: 0;
      color: #5a749f;
    }

    .chip {
      padding: 0.35rem 0.7rem;
      border-radius: 999px;
      background: #eaf2ff;
      color: #245fdb;
      font-weight: 700;
      font-size: 0.86rem;
    }

    .chip.role {
      background: #e8fbf8;
      color: #127a6f;
    }

    .chip.inactive {
      background: #f8e7ea;
      color: #b63844;
    }

    .toolbar-actions,
    .admin-actions {
      align-items: stretch;
    }

    .toolbar-actions .ghost-button {
      min-width: 7rem;
      flex: 0 0 7rem;
    }

    .toolbar-actions .filter-select {
      min-height: 3rem;
      flex: 0 0 10.5rem;
    }

    .admin-actions button {
      min-width: 6.6rem;
      flex: 0 0 6.6rem;
    }

    @media (max-width: 1080px) {
      .access-layout {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 760px) {
      .access-hero,
      .card-heading,
      .admin-main,
      .admin-meta {
        display: grid;
      }

      .toolbar-actions,
      .admin-actions {
        width: 100%;
      }

      .toolbar-actions .ghost-button,
      .toolbar-actions .filter-select,
      .admin-actions button {
        flex: 1 1 0;
        min-width: 0;
      }
    }
  `
})
export class AdminAccessManagementPageComponent {
  private readonly auth = inject(AdminAuthService);
  private readonly adminManagement = inject(AdminManagementService);
  private readonly router = inject(Router);

  protected readonly admins = signal<ManagedAdminUser[]>([]);
  protected readonly statusFilter = signal<'all' | 'active' | 'inactive'>('active');
  protected readonly loading = signal(true);
  protected readonly loadError = signal('');
  protected readonly submitting = signal(false);
  protected readonly deletingId = signal<number | null>(null);
  protected readonly editingId = signal<number | null>(null);
  protected readonly errorMessage = signal('');
  protected readonly successMessage = signal('');
  protected readonly currentUser = computed(() => this.auth.currentUser());
  protected readonly filteredAdmins = computed(() => {
    const filter = this.statusFilter();
    const admins = this.admins();

    if (filter === 'active') {
      return admins.filter((admin) => admin.active);
    }

    if (filter === 'inactive') {
      return admins.filter((admin) => !admin.active);
    }

    return admins;
  });
  protected form: {
    loginName: string;
    email: string;
    displayName: string;
    role: AdminRole;
    active: boolean;
  } = this.emptyForm();

  constructor() {
    void this.loadAdmins();
  }

  protected async loadAdmins() {
    this.loading.set(true);
    this.loadError.set('');

    try {
      this.admins.set(await this.adminManagement.listAdmins());
    } catch {
      this.loadError.set('No fue posible cargar la lista de accesos administrativos.');
    } finally {
      this.loading.set(false);
    }
  }

  protected async submitForm() {
    this.submitting.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    try {
      const payload = {
        username: this.form.loginName.trim().toLowerCase(),
        loginName: this.form.loginName.trim().toLowerCase(),
        email: this.form.email.trim() || null,
        displayName: this.form.displayName.trim() || null,
        role: this.form.role,
        active: this.form.active
      };

      if (this.editingId()) {
        const updated = await this.adminManagement.updateAdmin(this.editingId()!, payload);
        this.admins.update((items) => items.map((item) => (item.id === updated.id ? updated : item)));
        this.successMessage.set('Acceso actualizado correctamente.');
      } else {
        const created = await this.adminManagement.createAdmin(payload);
        this.admins.update((items) => this.sortAdmins([created, ...items]));
        this.successMessage.set('Admin autorizado correctamente.');
      }

      this.resetForm();
    } catch (error) {
      this.errorMessage.set(this.extractMessage(error, 'No fue posible guardar el acceso.'));
    } finally {
      this.submitting.set(false);
    }
  }

  protected startEdit(admin: ManagedAdminUser) {
    this.editingId.set(admin.id);
    this.errorMessage.set('');
    this.successMessage.set('');
    this.form = {
      loginName: admin.loginName,
      email: admin.email ?? '',
      displayName: admin.displayName ?? '',
      role: admin.role,
      active: admin.active
    };
  }

  protected async deleteAdmin(admin: ManagedAdminUser) {
    const confirmed = window.confirm(`Se eliminara el acceso administrativo para ${admin.loginName}.`);

    if (!confirmed) {
      return;
    }

    this.deletingId.set(admin.id);
    this.errorMessage.set('');
    this.successMessage.set('');

    try {
      const result = await this.adminManagement.deleteAdmin(admin.id);

      if (result.mode === 'deleted') {
        this.admins.update((items) => items.filter((item) => item.id !== admin.id));
        this.successMessage.set('Acceso eliminado correctamente.');
      } else {
        this.admins.update((items) =>
          this.sortAdmins(items.map((item) => (item.id === result.admin.id ? result.admin : item)))
        );
        this.successMessage.set(
          'El admin tenia historial de actividad, por lo que su acceso fue desactivado.'
        );
      }

      if (this.editingId() === admin.id) {
        this.resetForm();
      }
    } catch (error) {
      this.errorMessage.set(this.extractMessage(error, 'No fue posible eliminar el acceso.'));
    } finally {
      this.deletingId.set(null);
    }
  }

  protected resetForm() {
    this.editingId.set(null);
    this.form = this.emptyForm();
  }

  protected isCurrentUser(admin: ManagedAdminUser) {
    return this.currentUser()?.username === admin.loginName;
  }

  protected formatLastLogin(value: string | null) {
    return value ? this.shortDateTime(value) : 'Sin ingresos';
  }

  protected shortDateTime(value: string) {
    return new Date(value).toLocaleString('es-GT', {
      dateStyle: 'short',
      timeStyle: 'short'
    });
  }

  protected logout() {
    this.auth.logout();
    void this.router.navigateByUrl('/admin/login');
  }

  private emptyForm() {
    return {
      loginName: '',
      email: '',
      displayName: '',
      role: 'admin' as AdminRole,
      active: true
    };
  }

  private extractMessage(error: unknown, fallback: string) {
    return typeof error === 'object' &&
      error !== null &&
      'error' in error &&
      typeof (error as { error?: { message?: string } }).error?.message === 'string'
      ? (error as { error: { message: string } }).error.message
      : fallback;
  }

  private sortAdmins(items: ManagedAdminUser[]) {
    return [...items].sort((left, right) => {
      if (left.role !== right.role) {
        return left.role === 'super_admin' ? -1 : 1;
      }

      if (left.active !== right.active) {
        return left.active ? -1 : 1;
      }

      return left.loginName.localeCompare(right.loginName);
    });
  }
}
