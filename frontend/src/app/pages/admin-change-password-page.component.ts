import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminAuthService } from '../core/services/admin-auth.service';

@Component({
  selector: 'app-admin-change-password-page',
  imports: [CommonModule, FormsModule],
  template: `
    <main class="password-shell">
      <section class="password-card">
        <div class="password-copy">
          <p class="password-kicker">Seguridad inicial</p>
          <h1>Cambie su contrasena temporal</h1>
          <p class="password-intro">
            Para proteger el acceso administrativo, debe definir una nueva contrasena antes de
            entrar al dashboard.
          </p>

          <div class="password-rules">
            <strong>La nueva contrasena debe incluir:</strong>
            <ul>
              <li>Al menos 10 caracteres</li>
              <li>Una letra mayuscula</li>
              <li>Una letra minuscula</li>
              <li>Un caracter especial</li>
            </ul>
          </div>
        </div>

        <form class="password-form" (ngSubmit)="submit()">
          <label>
            <span>Nueva contrasena</span>
            <input
              type="password"
              name="newPassword"
              [(ngModel)]="newPassword"
              autocomplete="new-password"
              required
            />
          </label>

          <label>
            <span>Confirmar contrasena</span>
            <input
              type="password"
              name="confirmPassword"
              [(ngModel)]="confirmPassword"
              autocomplete="new-password"
              required
            />
          </label>

          <p class="password-error" *ngIf="errorMessage()">{{ errorMessage() }}</p>
          <p class="password-success" *ngIf="successMessage()">{{ successMessage() }}</p>

          <button type="submit" [disabled]="submitting()">
            {{ submitting() ? 'Guardando...' : 'Actualizar contrasena' }}
          </button>
        </form>
      </section>
    </main>
  `,
  styles: `
    .password-shell {
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 1.5rem;
    }

    .password-card {
      width: min(100%, 1020px);
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(320px, 0.9fr);
      gap: 1.2rem;
      padding: 1.2rem;
      border: 1px solid rgba(111, 148, 216, 0.2);
      border-radius: 32px;
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(244, 249, 255, 0.94));
      box-shadow: 0 24px 60px rgba(28, 72, 141, 0.12);
    }

    .password-copy,
    .password-form {
      border-radius: 24px;
    }

    .password-copy {
      padding: 2.2rem;
      background:
        radial-gradient(circle at top right, rgba(37, 95, 219, 0.2), transparent 30%),
        linear-gradient(135deg, #102f5b, #173f79);
      color: #fff;
      display: grid;
      align-content: center;
      gap: 1rem;
    }

    .password-kicker {
      margin: 0;
      text-transform: uppercase;
      letter-spacing: 0.18em;
      font-size: 0.82rem;
      font-weight: 800;
      color: rgba(255, 255, 255, 0.8);
    }

    h1 {
      margin: 0;
      font-size: clamp(2.1rem, 4vw, 3.2rem);
      line-height: 0.98;
    }

    .password-intro {
      margin: 0;
      line-height: 1.7;
      color: rgba(255, 255, 255, 0.84);
    }

    .password-rules {
      padding: 1rem 1.1rem;
      border-radius: 18px;
      background: rgba(255, 255, 255, 0.12);
      border: 1px solid rgba(255, 255, 255, 0.16);
    }

    .password-rules strong {
      display: block;
      margin-bottom: 0.6rem;
    }

    .password-rules ul {
      margin: 0;
      padding-left: 1.1rem;
      line-height: 1.7;
    }

    .password-form {
      padding: 2rem;
      display: grid;
      align-content: center;
      gap: 1rem;
      background: rgba(255, 255, 255, 0.92);
    }

    label {
      display: grid;
      gap: 0.45rem;
      color: #244677;
      font-weight: 600;
    }

    input {
      min-height: 3.35rem;
      padding: 0.85rem 1rem;
      border: 1px solid rgba(118, 149, 209, 0.3);
      border-radius: 14px;
      background: #fff;
    }

    button {
      min-height: 3.35rem;
      border: 0;
      border-radius: 14px;
      background: linear-gradient(180deg, #173f79, #102f5b);
      color: #fff;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 18px 30px rgba(16, 47, 91, 0.22);
    }

    .password-error,
    .password-success {
      margin: 0;
      font-weight: 600;
    }

    .password-error {
      color: #b42318;
    }

    .password-success {
      color: #157347;
    }

    @media (max-width: 860px) {
      .password-card {
        grid-template-columns: 1fr;
      }
    }
  `
})
export class AdminChangePasswordPageComponent {
  private readonly auth = inject(AdminAuthService);
  private readonly router = inject(Router);

  protected newPassword = '';
  protected confirmPassword = '';
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly successMessage = signal('');

  protected async submit() {
    this.errorMessage.set('');
    this.successMessage.set('');

    if (this.newPassword !== this.confirmPassword) {
      this.errorMessage.set('Las contrasenas no coinciden.');
      return;
    }

    this.submitting.set(true);

    try {
      await this.auth.changePassword(this.newPassword);
      this.successMessage.set('Contrasena actualizada. Redirigiendo al dashboard...');
      setTimeout(() => void this.router.navigateByUrl('/admin/dashboard'), 900);
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : 'No fue posible actualizar la contrasena.'
      );
    } finally {
      this.submitting.set(false);
    }
  }
}
