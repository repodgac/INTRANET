import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AdminAuthService } from '../core/services/admin-auth.service';

@Component({
  selector: 'app-admin-login-page',
  imports: [CommonModule, FormsModule],
  template: `
  <main class="login-shell">
    <section class="login-card">
      <p class="login-kicker">Acceso administrativo</p>
      <h1>Login</h1>

      <form class="login-form" (ngSubmit)="submitLogin()">
        <label class="field">
          <span class="field-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M12 12a3.75 3.75 0 1 0 0-7.5 3.75 3.75 0 0 0 0 7.5Zm-6.25 7.5a6.25 6.25 0 1 1 12.5 0" />
            </svg>
          </span>

          <input
            type="text"
            name="username"
            [(ngModel)]="username"
            autocomplete="username"
            placeholder="Usuario"
            required
          />
        </label>

        <label class="field">
          <span class="field-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M8.75 10V8.75a3.25 3.25 0 1 1 6.5 0V10m-7 0h8a1 1 0 0 1 1 1v6.25a1 1 0 0 1-1 1h-8a1 1 0 0 1-1-1V11a1 1 0 0 1 1-1Z" />
            </svg>
          </span>

          <input
            type="password"
            name="password"
            [(ngModel)]="password"
            autocomplete="current-password"
            placeholder="Contrasena"
            required
          />
        </label>

        <p class="login-error" *ngIf="errorMessage()">
          {{ errorMessage() }}
        </p>

        <button class="login-button" type="submit" [disabled]="submitting()">
          {{ submitting() ? 'Ingresando...' : 'Login' }}
        </button>
      </form>
    </section>
  </main>
`,
styles: `
  .login-shell {
    min-height: 100vh;
    display: grid;
    place-items: center;
    padding: 1.5rem;
    position: relative;
    overflow: hidden;
    background:
      radial-gradient(circle at 82% 72%, rgba(48, 222, 222, 0.46), transparent 30%),
      radial-gradient(circle at 18% 18%, rgba(205, 228, 255, 0.92), transparent 34%),
      linear-gradient(135deg, #eef8ff 0%, #dcecff 42%, #e2fbf8 100%);
  }

  .login-shell::before {
    content: '';
    position: absolute;
    inset: 0;
    background:
      linear-gradient(115deg, transparent 0 46%, rgba(255,255,255,0.36) 46% 47%, transparent 47%),
      repeating-linear-gradient(
        155deg,
        rgba(255,255,255,0.16) 0,
        rgba(255,255,255,0.16) 1px,
        transparent 1px,
        transparent 24px
      );
    opacity: 0.48;
    pointer-events: none;
  }

  .login-shell::after {
    content: '';
    position: absolute;
    width: 38rem;
    height: 38rem;
    right: -12rem;
    bottom: -14rem;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(54, 224, 224, 0.32), transparent 68%);
    filter: blur(10px);
    pointer-events: none;
  }

  .login-card {
    width: min(100%, 470px);
    min-height: 560px;
    padding: 4.4rem 3rem 3rem;
    position: relative;
    z-index: 1;
    display: grid;
    align-content: center;
    border-radius: 34px;
    background:
      linear-gradient(145deg, rgba(255,255,255,0.68), rgba(255,255,255,0.24)),
      rgba(220, 247, 250, 0.34);
    border: 1px solid rgba(255, 255, 255, 0.78);
    box-shadow:
      0 38px 85px rgba(74, 128, 174, 0.22),
      inset 0 1px 1px rgba(255,255,255,0.88),
      inset 0 -1px 1px rgba(45, 210, 220, 0.16);
    backdrop-filter: blur(26px);
    -webkit-backdrop-filter: blur(26px);
  }

  .login-card::before {
    content: '';
    position: absolute;
    inset: 1px;
    border-radius: 33px;
    background: linear-gradient(135deg, rgba(255,255,255,0.48), transparent 58%);
    pointer-events: none;
  }

  .login-kicker {
    position: relative;
    z-index: 1;
    margin: 0 0 0.9rem;
    text-align: center;
    color: #7d98b2;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.2em;
    text-transform: uppercase;
  }

  h1 {
    display: block;
    position: relative;
    z-index: 1;
    margin: 0 0 2.2rem;
    width: 100%;
    place-self: center;
    text-align: center;
    color: #1c456f;
    font-size: clamp(2.1rem, 3.8vw, 2.55rem);
    font-weight: 700;
    line-height: 1;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    text-shadow: 0 6px 14px rgba(39, 98, 150, 0.12);
  }

  .login-form {
    position: relative;
    z-index: 1;
    width: 100%;
    display: grid;
    gap: 1.25rem;
  }

  .field {
    position: relative;
    display: block;
  }

  .field input {
    width: 100%;
    height: 3.45rem;
    padding: 0.85rem 1.15rem 0.85rem 4rem;
    border-radius: 999px;
    border: 1px solid rgba(255,255,255,0.76);
    background: rgba(255,255,255,0.34);
    color: #41627f;
    font-size: 0.88rem;
    font-weight: 500;
    box-shadow:
      inset 0 1px 1px rgba(255,255,255,0.74),
      0 12px 28px rgba(91, 147, 190, 0.13);
    transition: 0.2s ease;
  }

  .field input::placeholder {
    color: #7c97af;
    font-weight: 400;
  }

  .field input:focus {
    outline: none;
    border-color: rgba(58, 219, 228, 0.86);
    background: rgba(255,255,255,0.5);
    box-shadow:
      0 0 0 4px rgba(67, 225, 232, 0.2),
      0 16px 34px rgba(71, 177, 210, 0.2);
  }

  .field-icon {
    position: absolute;
    top: 50%;
    left: 0.43rem;
    transform: translateY(-50%);
    width: 2.55rem;
    height: 2.55rem;
    display: grid;
    place-items: center;
    border-radius: 999px;
    background: rgba(255,255,255,0.78);
    color: #1db8df;
    box-shadow:
      inset 0 1px 1px rgba(255,255,255,0.92),
      0 10px 18px rgba(87, 153, 204, 0.18);
  }

  .field-icon.trailing {
    left: 0.43rem;
    right: auto;
  }

  .field-icon svg {
    width: 1.05rem;
    height: 1.05rem;
    stroke: currentColor;
    stroke-width: 1.9;
    stroke-linecap: round;
    stroke-linejoin: round;
    fill: none;
  }

  button {
    font-family: inherit;
  }

  .login-form > button[type='submit'],
  .login-button {
    width: 100%;
    height: 3.45rem;
    margin-top: 0.7rem;
    border: 1px solid rgba(255,255,255,0.82);
    border-radius: 999px;
    background: linear-gradient(90deg, #f7fbff 0%, #dff7fb 42%, #55e3e2 72%, #31d3d8 100%);
    color: #173f72;
    font-size: 0.94rem;
    font-weight: 800;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    cursor: pointer;
    box-shadow:
      0 20px 36px rgba(50, 198, 218, 0.3),
      inset 0 1px 1px rgba(255,255,255,0.88);
    transition: 0.2s ease;
  }

  .login-form > button[type='submit']:hover:not(:disabled),
  .login-button:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow:
      0 24px 44px rgba(50, 198, 218, 0.36),
      inset 0 1px 1px rgba(255,255,255,0.92);
  }

  .login-form > button[type='submit']:disabled,
  .login-button:disabled {
    cursor: wait;
    opacity: 0.78;
  }

  .login-error {
    margin: 0;
    padding: 0.75rem 0.9rem;
    border-radius: 16px;
    background: rgba(185, 48, 48, 0.12);
    color: #a73535;
    text-align: center;
    font-size: 0.82rem;
    font-weight: 700;
  }

  @media (max-width: 640px) {
    .login-card {
      width: min(100%, 390px);
      min-height: auto;
      padding: 3.2rem 1.5rem 2.2rem;
      border-radius: 28px;
    }

    h1 {
      margin-bottom: 1.9rem;
      font-size: 2rem;
    }

    .login-kicker {
      font-size: 0.64rem;
    }
  }
`
})
export class AdminLoginPageComponent {
  private readonly auth = inject(AdminAuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected username = '';
  protected password = '';
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal('');

  protected async submitLogin() {
    this.submitting.set(true);
    this.errorMessage.set('');

    try {
      const session = await this.auth.login(this.username.trim(), this.password);
      const redirectTo = session.user.mustChangePassword
        ? '/admin/change-password'
        : this.route.snapshot.queryParamMap.get('redirectTo') || '/admin/dashboard';

      await this.router.navigateByUrl(redirectTo);
    } catch {
      this.errorMessage.set('No fue posible iniciar sesion.');
    } finally {
      this.submitting.set(false);
    }
  }
}
