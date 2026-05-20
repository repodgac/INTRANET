import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { DownloadItem } from '../core/models';

const downloadedDocsKey = 'dgac_downloaded_docs';

interface FeaturedLink {
  id: string;
  title: string;
  url: string;
  description: string;
  previewLabel: string;
  previewTone: string;
  imagePath?: string;
}

const fallbackDownloads: DownloadItem[] = [
  {
    id: 'solicitud-usuario',
    title: 'Solicitud de usuario',
    description: 'Formulario de alta o habilitación de usuario institucional.',
    filePath: 'forms/solicitud-usuario.docx',
    fileType: 'DOCX'
  },
  {
    id: 'correo-institucional',
    title: 'Solicitud de correo institucional',
    description: 'Formulario para la asignación de cuenta de correo institucional.',
    filePath: 'forms/correo-institucional.docx',
    fileType: 'DOCX'
  },
  {
    id: 'acceso-internet',
    title: 'Solicitud de acceso a internet',
    description: 'Formulario para la gestión de accesos a internet.',
    filePath: 'forms/acceso-internet.docx',
    fileType: 'DOCX'
  },
  {
    id: 'tv-proyector',
    title: 'Solicitud de TV y proyector',
    description: 'Solicitud de equipo audiovisual para actividades institucionales.',
    filePath: 'forms/tv-proyector.xlsx',
    fileType: 'XLSX'
  },
  {
    id: 'usuario-sistema-dgac',
    title: 'Solicitud de usuario del sistema DGAC',
    description: 'Formulario para la asignación de acceso a sistemas institucionales.',
    filePath: 'forms/usuario-sistema-dgac.docx',
    fileType: 'DOCX'
  },
  {
    id: 'solicitud-carpeta-compartida',
    title: 'Solicitud de carpeta compartida',
    description: 'Solicitud para la habilitación de acceso a carpeta compartida institucional.',
    filePath: 'forms/solicitud-carpeta-compartida.docx',
    fileType: 'DOCX'
  }
];

const featuredLinks: FeaturedLink[] = [
  {
    id: 'portal-interno',
    title: 'Sistema DGAC',
    url: 'http://172.16.0.126/',
    description: 'Acceso al entorno interno institucional disponible en la red local.',
    previewLabel: 'Intranet DGAC',
    previewTone: 'local',
    imagePath: 'branding/dgac-header.png'
  },
  {
    id: 'tramites-dgac',
    title: 'Portal de tramites DGAC',
    url: 'http://prueba_tramites.dgacgt.local/auth',
    description: 'Acceso para gestion y autenticacion de tramites institucionales.',
    previewLabel: 'Tramites DGAC',
    previewTone: 'tramites',
    imagePath: 'branding/dgac-header.png'
  },
  {
    id: 'ministerio-civ',
    title: 'Ministerio de Comunicaciones, Infraestructura y Vivienda',
    url: 'https://www.civ.gob.gt/web/guest/inicio',
    description: 'Sitio oficial del ministerio para consulta institucional y publicaciones.',
    previewLabel: 'Portal CIV',
    previewTone: 'ministry',
    imagePath: 'branding/mciv-oficial.png'
  },
  {
    id: 'portal-dgac',
    title: 'Dirección General de Aeronáutica Civil',
    url: 'https://www.dgac.gob.gt/',
    description: 'Portal institucional oficial de la Dirección General de Aeronáutica Civil.',
    previewLabel: 'Sitio DGAC',
    previewTone: 'dgac',
    imagePath: 'branding/dgac-oficial.jpeg'
  },
  {
    id: 'radio-tgw',
    title: 'Radio TGW en línea',
    url: 'https://radiotgw.gob.gt/radio-tgw-en-linea/',
    description: 'Acceso directo a la señal en línea de Radio TGW.',
    previewLabel: 'TGW en línea',
    previewTone: 'radio',
    imagePath: 'branding/tgw-linea.png'
  }
];

@Component({
  selector: 'app-home-page',
  imports: [CommonModule],
  template: `
    <main class="shell">
      <header class="topbar">
        <div class="brand-lockup">
          <div class="logo-single">
            <img src="branding/dgac-header.png" alt="Dirección General de Aeronáutica Civil" />
          </div>
        </div>

      </header>

      <section class="hero" id="inicio">
        <div class="hero-copy">
          <div class="hero-intro">
            <p class="eyebrow">Portal interno institucional</p>
          </div>

          <h1>Consulta y descarga de formularios</h1>

          <p class="summary">
            Acceso directo a formularios, documentos operativos y archivos institucionales de la
            Dirección General de Aeronáutica Civil.
          </p>

        </div>

      </section>

      <section class="downloads-section" id="formularios">
        <div class="downloads-header">
          <div class="downloads-heading">
            <p class="section-tag">Formatos descargables</p>
            <h2>Repositorio documental</h2>
          </div>

          <div class="downloads-summary">
            <button class="primary downloads-action" type="button" (click)="toggleDownloadHistory()">
              Documentos descargados
            </button>
          </div>
        </div>

        <div class="downloads-rail" (wheel)="onDownloadsWheel($event)">
          <a
            class="download-card"
            *ngFor="let item of downloads()"
            [href]="item.filePath"
            download
            target="_blank"
            rel="noopener noreferrer"
            (click)="registerDownload(item)"
          >
            <div class="download-card-top">
              <div class="download-icon" [attr.aria-label]="'Icono de ' + item.title">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <ng-container [ngSwitch]="iconFor(item.id)">
                    <path
                      *ngSwitchCase="'user'"
                      d="M12 12a3.75 3.75 0 1 0 0-7.5 3.75 3.75 0 0 0 0 7.5Zm-6.25 7.5a6.25 6.25 0 1 1 12.5 0"
                    />
                    <path
                      *ngSwitchCase="'mail'"
                      d="M4.75 7.25h14.5v9.5H4.75zm0 .5 7.25 5 7.25-5"
                    />
                    <path
                      *ngSwitchCase="'wifi'"
                      d="M4.75 9.5a11 11 0 0 1 14.5 0M7.5 12.25a7 7 0 0 1 9 0M10 15a3.2 3.2 0 0 1 4 0M12 18.25h.01"
                    />
                    <path
                      *ngSwitchCase="'display'"
                      d="M4.75 6.75h14.5v8.5H4.75zm4.5 12.5h5.5M12 15.25v4"
                    />
                    <path
                      *ngSwitchCase="'folder'"
                      d="M4.75 8.25h5l1.5 1.75h8v6.75H4.75z"
                    />
                    <path
                      *ngSwitchDefault
                      d="M8 4.75h5.5l3.75 3.75v10.75H8zm5.5 0v3.75h3.75M10 12h4m-4 3h4"
                    />
                  </ng-container>
                </svg>
              </div>
              <span>{{ item.fileType || 'PDF' }}</span>
            </div>

            <div class="download-copy">
              <strong>{{ item.title }}</strong>
              <p>{{ item.description || 'Formulario institucional disponible para descarga.' }}</p>
            </div>

            <div class="download-link">
              <span>Descargar archivo</span>
            </div>
          </a>
        </div>

        <p class="downloads-footnote" *ngIf="usingFallback()">
          Listado provisional de formularios institucionales.
        </p>
      </section>

      <section class="download-history" id="descargados" *ngIf="showDownloadHistory()">
        <div class="history-copy">
          <p class="section-tag">Actividad local</p>
          <h2>Documentos descargados</h2>
          <p>
            Tus documentos descargados estarán visibles mientras permanezcas dentro del sitio.
          </p>
        </div>

        <div class="history-list" *ngIf="downloadHistory().length; else emptyHistory">
          <article class="history-item" *ngFor="let item of downloadHistory()">
            <div>
              <strong>{{ item.title }}</strong>
              <p>{{ item.fileType }} descargado {{ item.downloadedAt }}</p>
            </div>
            <a [href]="item.filePath" download target="_blank" rel="noopener noreferrer">Descargar nuevamente</a>
          </article>
        </div>

        <ng-template #emptyHistory>
          <div class="history-empty">
            <strong>Sin descargas registradas</strong>
            <p>Los documentos descargados aparecerán aquí mientras la sesión permanezca activa.</p>
          </div>
        </ng-template>
      </section>

      <section class="links-section" id="enlaces">
        <div class="links-copy">
          <p class="section-tag">Enlaces institucionales</p>
          <h2>Accesos directos</h2>
          <p>
            Recursos institucionales y portales de consulta frecuente disponibles desde la pantalla principal.
          </p>
        </div>

        <div class="links-rail" (wheel)="onLinksWheel($event)">
          <a class="link-card" *ngFor="let link of links()" [href]="link.url" target="_blank" rel="noopener noreferrer">
            <div class="link-preview" [attr.data-tone]="link.previewTone" [class.has-image]="!!link.imagePath">
              <span class="link-preview-label" *ngIf="!link.imagePath">{{ link.previewLabel }}</span>
              <img *ngIf="link.imagePath" [src]="link.imagePath" [alt]="link.title" />
            </div>

            <div class="link-body">
              <strong>{{ link.title }}</strong>
              <p>{{ link.description }}</p>
            </div>
          </a>
        </div>
      </section>
    </main>
  `,
  styles: [`
    .shell { min-height: 100vh; width: min(100%, 1520px); padding: 2rem 1.25rem 4rem; display: grid; gap: 1.5rem; margin: 0 auto; }
    .topbar, .hero, .downloads-section, .download-history, .links-section {
      position: relative;
      overflow: hidden;
      border: 1px solid var(--line);
      border-radius: var(--radius-xl);
      background: linear-gradient(180deg, rgba(255,255,255,0.92), rgba(255,255,255,0.76));
      box-shadow: var(--shadow);
      backdrop-filter: blur(12px);
    }
    .brand-lockup, .hero-copy, .downloads-header, .downloads-rail, .history-copy, .history-list, .links-copy, .links-rail {
      position: relative;
      z-index: 1;
    }
    .topbar {
      display: flex;
      align-items: center;
      justify-content: flex-start;
      padding: 1.2rem 1.5rem;
      background: linear-gradient(135deg, rgba(255,255,255,0.96), rgba(244,249,254,0.82));
    }
    .logo-single img { width: min(100%, 380px); height: auto; display: block; object-fit: contain; }
    .hero {
      display: block;
      padding: 1.8rem;
      background: linear-gradient(135deg, rgba(255,255,255,0.96), rgba(244,249,254,0.82));
    }
    .hero-copy {
      display: grid;
      align-content: start;
      min-height: 14.5rem;
      padding: 1.35rem 1.5rem;
      border-radius: calc(var(--radius-xl) - 8px);
      background:
        linear-gradient(180deg, rgba(255,255,255,0.56), rgba(255,255,255,0.22)),
        radial-gradient(circle at right top, rgba(36,149,219,0.09), transparent 30%);
    }
    .hero-intro {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
    }
    .eyebrow, .section-tag {
      margin: 0;
      color: var(--brand);
      text-transform: uppercase;
      letter-spacing: 0.18em;
      font-weight: 700;
    }
    h1, h2 {
      margin: 0;
      font-family: 'Space Grotesk', sans-serif;
    }
    h1 {
      max-width: none;
      margin-top: 0.5rem;
      font-size: clamp(2.6rem, 3.8vw, 4.6rem);
      line-height: 0.9;
      text-align: center;
      white-space: nowrap;
    }
    .summary {
      max-width: 56ch;
      margin-top: 0.9rem;
      margin-inline: auto;
      color: var(--muted);
      font-size: 1rem;
      line-height: 1.6;
      text-align: center;
    }
    .primary, .history-item a {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.95rem 1.25rem;
      border-radius: 999px;
      font-weight: 700;
    }
    .primary {
      border: 1px solid transparent;
      background: linear-gradient(90deg, var(--brand), #45a8e5);
      color: #fff;
      cursor: pointer;
      box-shadow: 0 14px 28px rgba(36,149,219,0.18);
    }
    .history-item a { border: 1px solid rgba(79,132,184,0.18); background: rgba(255,255,255,0.88); color: var(--brand-deep); }
    .downloads-section {
      padding: 1.25rem 1.5rem 1.35rem;
      background: linear-gradient(135deg, rgba(255,255,255,0.96), rgba(244,249,254,0.82));
    }
    .downloads-header {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: end;
      gap: 1rem;
      margin-bottom: 0.9rem;
    }
    .downloads-heading { display: grid; gap: 0.2rem; justify-items: start; text-align: left; }
    .downloads-header h2, .links-copy h2, .history-copy h2 {
      margin-top: 0.2rem;
      font-size: clamp(2rem, 3vw, 2.8rem);
    }
    .downloads-summary { display: grid; justify-items: end; }
    .downloads-rail {
      display: grid;
      grid-auto-flow: column;
      grid-auto-columns: minmax(320px, 23vw);
      gap: 1rem;
      overflow-x: auto;
      overflow-y: hidden;
      padding: 0.2rem 0 0.65rem;
      scrollbar-width: thin;
      scrollbar-color: rgba(36,149,219,0.72) rgba(202,223,239,0.45);
    }
    .downloads-rail::-webkit-scrollbar { height: 9px; }
    .downloads-rail::-webkit-scrollbar-track { background: rgba(202,223,239,0.45); border-radius: 999px; }
    .downloads-rail::-webkit-scrollbar-thumb { background: rgba(36,149,219,0.72); border-radius: 999px; }
    .download-card {
      display: grid;
      gap: 1rem;
      min-height: 16rem;
      padding: 1.2rem;
      border-radius: var(--radius-lg);
      border: 1px solid rgba(72,119,171,0.18);
      background:
        linear-gradient(180deg, rgba(255,255,255,0.98), rgba(239,247,252,0.94)),
        radial-gradient(circle at top right, rgba(36,149,219,0.12), transparent 34%);
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.54);
      transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
    }
    .download-card:hover, .link-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 20px 34px rgba(48,91,144,0.14);
      border-color: rgba(36,149,219,0.28);
    }
    .download-card-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.8rem;
    }
    .download-icon {
      width: 3.4rem;
      height: 3.4rem;
      display: grid;
      place-items: center;
      border-radius: 18px;
      background: linear-gradient(180deg, rgba(36,149,219,0.2), rgba(23,63,121,0.12));
      color: var(--brand-deep);
    }
    .download-icon svg {
      width: 1.55rem;
      height: 1.55rem;
      stroke: currentColor;
      stroke-width: 1.8;
      stroke-linecap: round;
      stroke-linejoin: round;
      fill: none;
    }
    .download-card-top span {
      padding: 0.28rem 0.6rem;
      border-radius: 999px;
      border: 1px solid rgba(72,119,171,0.18);
      background: rgba(255,255,255,0.92);
      color: var(--brand-deep);
      font-size: 0.75rem;
      font-weight: 700;
    }
    .download-copy {
      display: grid;
      gap: 0.6rem;
      align-content: start;
    }
    .download-copy strong {
      font-size: 1.08rem;
      line-height: 1.35;
    }
    .download-copy p {
      margin: 0;
      color: #54729c;
      line-height: 1.55;
    }
    .download-link {
      display: flex;
      align-items: end;
      margin-top: auto;
      color: var(--brand-deep);
      font-weight: 700;
    }
    .downloads-footnote {
      margin: 1rem 0 0;
      color: var(--muted);
      font-size: 0.92rem;
    }
    .download-history, .links-section {
      display: grid;
      gap: 1rem;
      padding: 1.5rem;
    }
    .download-history {
      background: linear-gradient(135deg, rgba(255,255,255,0.96), rgba(244,249,254,0.82));
    }
    .links-section {
      background: linear-gradient(135deg, rgba(255,255,255,0.96), rgba(244,249,254,0.82));
    }
    .download-history {
      grid-template-columns: minmax(280px, 0.9fr) minmax(0, 1.1fr);
    }
    .history-copy p:last-child, .links-copy p:last-child {
      color: var(--muted);
      line-height: 1.6;
    }
    .history-list {
      display: grid;
      gap: 0.8rem;
    }
    .history-item, .history-empty, .link-card {
      border-radius: var(--radius-lg);
      border: 1px solid rgba(79,132,184,0.14);
      background: rgba(246,250,253,0.9);
    }
    .history-item, .history-empty {
      padding: 1rem 1.1rem;
    }
    .history-item {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      align-items: center;
    }
    .history-item strong, .history-empty strong {
      display: block;
    }
    .history-item p, .history-empty p {
      margin: 0.3rem 0 0;
      color: var(--muted);
    }
    .links-rail {
      display: grid;
      grid-auto-flow: column;
      grid-auto-columns: minmax(300px, 24vw);
      gap: 1rem;
      overflow-x: auto;
      overflow-y: hidden;
      padding: 0.2rem 0 0.65rem;
      scrollbar-width: thin;
      scrollbar-color: rgba(36,149,219,0.72) rgba(202,223,239,0.45);
    }
    .links-rail::-webkit-scrollbar { height: 9px; }
    .links-rail::-webkit-scrollbar-track { background: rgba(202,223,239,0.45); border-radius: 999px; }
    .links-rail::-webkit-scrollbar-thumb { background: rgba(36,149,219,0.72); border-radius: 999px; }
    .link-card {
      overflow: hidden;
      display: grid;
      grid-template-rows: 8.75rem 1fr;
      transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
    }
    .link-preview {
      position: relative;
      display: grid;
      place-items: end start;
      padding: 1.2rem;
      color: #fff;
      font-family: 'Space Grotesk', sans-serif;
      font-size: 1.25rem;
      text-align: left;
    }
    .link-preview.has-image {
      place-items: end start;
      background: linear-gradient(135deg, #214b86, #3d93d4);
    }
    .link-preview[data-tone='tramites'].has-image {
      background: linear-gradient(180deg, rgba(255,255,255,0.98), rgba(244,248,252,0.96));
    }
    .link-preview-label {
      position: relative;
      z-index: 1;
      display: inline-flex;
      align-items: center;
      padding: 0.42rem 0.7rem;
      border-radius: 999px;
      background: rgba(255,255,255,0.14);
      border: 1px solid rgba(255,255,255,0.2);
      backdrop-filter: blur(10px);
      font-size: 0.92rem;
      font-weight: 700;
      letter-spacing: 0.04em;
    }
    .link-preview img {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: contain;
      object-position: center;
      padding: 0.9rem 1rem;
      filter: none;
      mix-blend-mode: normal;
    }
    .link-preview::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(180deg, rgba(8,24,48,0.08), rgba(6,23,48,0.34));
    }
    .link-preview.has-image::after {
      background:
        linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.04)),
        linear-gradient(180deg, transparent 58%, rgba(255,255,255,0.3) 100%);
    }
    .link-preview[data-tone='local'] { background: linear-gradient(135deg, #123963, #2c7fc2); }
    .link-preview[data-tone='ministry'] { background: linear-gradient(135deg, #1d2f59, #456eb0); }
    .link-preview[data-tone='dgac'] { background: linear-gradient(135deg, #1f3f78, #2f8fd3); }
    .link-preview[data-tone='radio'] { background: linear-gradient(135deg, #3a4f7f, #6a8fc8); }
    .link-body {
      display: grid;
      gap: 0.6rem;
      padding: 1.1rem 1.15rem 1.2rem;
    }
    .link-body strong { font-size: 1.05rem; }
    .link-body p {
      margin: 0;
      color: var(--muted);
      line-height: 1.55;
    }
    @media (max-width: 1200px) {
      .downloads-rail { grid-auto-columns: minmax(300px, 32vw); }
      .links-rail { grid-auto-columns: minmax(290px, 38vw); }
    }
    @media (max-width: 980px) {
      .topbar, .hero, .downloads-header, .download-history { grid-template-columns: 1fr; }
      .downloads-summary { justify-items: start; text-align: left; max-width: none; }
      .hero-copy { min-height: auto; }
    }
    @media (max-width: 720px) {
      .shell { padding-inline: 1rem; }
      h1 { max-width: 11ch; font-size: clamp(2.6rem, 12vw, 4rem); white-space: normal; }
      .hero-copy { padding: 1.35rem; }
      .hero-intro, .history-item { align-items: start; }
      .hero-intro, .history-item { flex-direction: column; }
      .downloads-rail { grid-auto-columns: minmax(280px, 86vw); }
      .links-rail { grid-auto-columns: minmax(280px, 86vw); }
    }
  `]
})
export class HomePageComponent {
  private readonly http = inject(HttpClient);
  private readonly railTargets = new WeakMap<HTMLElement, number>();
  private readonly railFrames = new WeakMap<HTMLElement, number>();
  protected readonly downloads = signal<DownloadItem[]>(fallbackDownloads);
  protected readonly links = signal(featuredLinks);
  protected readonly usingFallback = signal(true);
  protected readonly showDownloadHistory = signal(false);
  protected readonly downloadHistory = signal<Array<DownloadItem & { downloadedAt: string }>>(this.readDownloadedDocs());

  constructor() {
    void this.loadDownloads();
  }

  protected async loadDownloads() {
    try {
      const items = await firstValueFrom(this.http.get<DownloadItem[]>('forms/forms.json'));

      if (items.length) {
        this.downloads.set(items);
        this.usingFallback.set(false);
      }
    } catch {
      this.downloads.set(fallbackDownloads);
      this.usingFallback.set(true);
    }
  }

  protected onDownloadsWheel(event: WheelEvent) {
    this.handleHorizontalWheel(event);
  }

  protected onLinksWheel(event: WheelEvent) {
    this.handleHorizontalWheel(event);
  }

  private handleHorizontalWheel(event: WheelEvent) {
    const rail = event.currentTarget as HTMLElement | null;
    if (!rail) {
      return;
    }

    event.preventDefault();
    const nextTarget = (this.railTargets.get(rail) ?? rail.scrollLeft) + event.deltaY * 1.15;
    const maxScroll = Math.max(0, rail.scrollWidth - rail.clientWidth);

    this.railTargets.set(rail, Math.max(0, Math.min(nextTarget, maxScroll)));

    if (this.railFrames.has(rail)) {
      return;
    }

    const animate = () => {
      const target = this.railTargets.get(rail) ?? rail.scrollLeft;
      const distance = target - rail.scrollLeft;

      if (Math.abs(distance) < 0.8) {
        rail.scrollLeft = target;
        this.railFrames.delete(rail);
        return;
      }

      rail.scrollLeft += distance * 0.18;
      this.railFrames.set(rail, requestAnimationFrame(animate));
    };

    this.railFrames.set(rail, requestAnimationFrame(animate));
  }

  protected iconFor(itemId: string) {
    const iconMap: Record<string, string> = {
      'solicitud-usuario': 'user',
      'correo-institucional': 'mail',
      'acceso-internet': 'wifi',
      'tv-proyector': 'display',
      'solicitud-carpeta-compartida': 'folder'
    };

    return iconMap[itemId] ?? 'document';
  }

  protected registerDownload(item: DownloadItem) {
    const downloadedAt = new Date().toLocaleString('es-GT', {
      dateStyle: 'short',
      timeStyle: 'short'
    });

    const next = [
      { ...item, downloadedAt },
      ...this.downloadHistory().filter((entry) => entry.filePath !== item.filePath)
    ].slice(0, 8);

    this.downloadHistory.set(next);
    sessionStorage.setItem(downloadedDocsKey, JSON.stringify(next));
  }

  protected toggleDownloadHistory() {
    this.showDownloadHistory.update((value) => !value);
  }

  private readDownloadedDocs(): Array<DownloadItem & { downloadedAt: string }> {
    const raw = sessionStorage.getItem(downloadedDocsKey);

    if (!raw) {
      return [];
    }

    try {
      return JSON.parse(raw) as Array<DownloadItem & { downloadedAt: string }>;
    } catch {
      return [];
    }
  }
}
