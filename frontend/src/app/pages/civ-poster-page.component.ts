import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-civ-poster-page',
  imports: [RouterLink],
  template: `
    <main class="poster-viewer">
      <header class="viewer-toolbar">
        <a class="back-button" routerLink="/">
          <span aria-hidden="true">&#8592;</span> Volver a la intranet
        </a>
      </header>

      <figure>
        <img
          src="branding/civ-denuncias.png"
          alt="Afiche informativo: cómo presentar una denuncia en el CIV"
        />
      </figure>
    </main>
  `,
  styles: `
    :host { display: block; min-height: 100vh; background: #eaf1fa; }
    .poster-viewer { width: min(100%, 900px); min-height: 100vh; margin: 0 auto; padding: 1rem; }
    .viewer-toolbar { position: sticky; top: 0; z-index: 2; display: flex; align-items: center; justify-content: flex-start; margin-bottom: 1rem; padding: .75rem; border: 1px solid #d4e0ef; border-radius: 12px; background: rgba(255,255,255,.94); box-shadow: 0 8px 24px rgba(21,58,105,.1); backdrop-filter: blur(10px); }
    .back-button { min-height: 42px; display: inline-flex; align-items: center; justify-content: center; gap: .5rem; padding: .65rem 1rem; border-radius: 9px; color: white; background: #1763d5; font: inherit; font-weight: 750; text-decoration: none; }
    figure { margin: 0 auto; width: min(100%, 520px); overflow: hidden; border-radius: 12px; background: #082d64; box-shadow: 0 20px 45px rgba(7,38,82,.22); }
    img { display: block; width: 100%; height: auto; }
    @media (max-width: 560px) { .poster-viewer { padding: .65rem; } .back-button { width: 100%; } figure { border-radius: 8px; } }
  `
})
export class CivPosterPageComponent {}
