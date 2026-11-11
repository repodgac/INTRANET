import { Component } from '@angular/core';

@Component({
  selector: 'app-admin-circulars-page',
  template: `
    <section class="circulars-page">
      <header class="page-heading">
        <div><h1>Circulares de RR. HH.</h1></div>
      </header>
      <article class="empty-state">
        <div class="empty-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M6 2h8l4 4v16H6zM14 2v5h5M9 12h6M9 16h6"/></svg></div>
        <div><h2>M&oacute;dulo en preparaci&oacute;n</h2><p>La publicaci&oacute;n de circulares se habilitar&aacute; en una pr&oacute;xima fase.</p></div>
      </article>
    </section>
  `,
  styles: `
    .circulars-page { display: grid; gap: 1rem; font-size: 13px; }
    h1 { max-width: none; margin: 0; color: #10284a; font-size: 1.75rem; }
    .empty-state { min-height: 0; display: flex; align-items: center; gap: 1rem; padding: 1.35rem 1.5rem; border: 1px solid #d7e2ef; border-radius: 12px; background: white; box-shadow: 0 8px 24px rgba(35,67,105,.06); }
    .empty-icon { width: 52px; height: 52px; flex: 0 0 52px; display: grid; place-items: center; border-radius: 12px; background: #e9f2ff; color: #1763d5; } .empty-icon svg { width: 25px; height: 25px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
    h2 { margin: 0 0 .25rem; color: #183554; font-size: 1.125rem; } .empty-state p { margin: 0; color: #667b91; font-size: .9rem; }
  `
})
export class AdminCircularsPageComponent {}
