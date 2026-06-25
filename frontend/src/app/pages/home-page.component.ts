import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { DownloadItem } from '../core/models';
import { AnalyticsService } from '../core/services/analytics.service';

const downloadedDocsKey = 'dgac_downloaded_docs';

interface FeaturedLink {
  id: string | number;
  title: string;
  url: string;
  description: string;
  previewLabel: string;
  previewTone: string;
  imagePath?: string;
}

interface PendingPdfItem {
  id: string;
  title: string;
  description: string;
  area: string;
  filePath: string;
}

interface PublicLinkResponse {
  id: number;
  title: string;
  description: string | null;
  url: string;
}

const featuredLinks: FeaturedLink[] = [
  {
    id: 'portal-interno',
    title: 'Direccion General de Aeronautica Civil',
    url: 'https://dgac.gob.gt/',
    description: 'Portal institucional oficial de la DGAC.',
    previewLabel: 'Sitio DGAC',
    previewTone: 'local',
    imagePath: 'branding/dgac-header.png'
  },
  {
    id: 'tramites-dgac',
    title: 'Portal de tramites DGAC',
    url: 'https://tramites.dgac.gob.gt/auth',
    description: 'Acceso para gestionar y autenticar tramites institucionales.',
    previewLabel: 'Tramites DGAC',
    previewTone: 'tramites',
    imagePath: 'branding/dgac-header.png'
  },
  {
    id: 'sistema-interno-dgac',
    title: 'Sistema interno DGAC',
    url: 'http://172.16.0.126/',
    description: 'Acceso al sistema interno institucional para tramites, oficios y gestiones administrativas.',
    previewLabel: 'Sistema interno DGAC',
    previewTone: 'dgac',
    imagePath: 'branding/dgac-oficial.jpeg'
  },
  {
    id: 'ministerio-civ',
    title: 'Ministerio de Comunicaciones, Infraestructura y Vivienda',
    url: 'https://www.civ.gob.gt/web/guest/inicio',
    description: 'Sitio oficial del ministerio para consultas, informacion y publicaciones.',
    previewLabel: 'Portal CIV',
    previewTone: 'ministry',
    imagePath: 'branding/mciv-oficial.png'
  },
  {
    id: 'radio-tgw',
    title: 'Radio TGW en linea',
    url: 'https://radiotgw.gob.gt/radio-tgw-en-linea/',
    description: 'Acceso directo a la senal en linea de Radio TGW.',
    previewLabel: 'TGW en linea',
    previewTone: 'radio',
    imagePath: 'branding/tgw-linea.png'
  }
];

const linkPresentationMap: Record<string, Pick<FeaturedLink, 'previewLabel' | 'previewTone' | 'imagePath'>> = {
  'https://dgac.gob.gt/': {
    previewLabel: 'Sitio DGAC',
    previewTone: 'local',
    imagePath: 'branding/dgac-header.png'
  },
  'https://tramites.dgac.gob.gt/auth': {
    previewLabel: 'Tramites DGAC',
    previewTone: 'tramites',
    imagePath: 'branding/dgac-header.png'
  },
  'https://www.civ.gob.gt/web/guest/inicio': {
    previewLabel: 'Portal CIV',
    previewTone: 'ministry',
    imagePath: 'branding/mciv-oficial.png'
  },
  'http://172.16.0.126/': {
    previewLabel: 'Intranet DGAC',
    previewTone: 'dgac',
    imagePath: 'branding/dgac-oficial.jpeg'
  },
  'https://radiotgw.gob.gt/radio-tgw-en-linea/': {
    previewLabel: 'TGW en linea',
    previewTone: 'radio',
    imagePath: 'branding/tgw-linea.png'
  }
};

@Component({
  selector: 'app-home-page',
  imports: [CommonModule],
  template: `
    <main class="shell">
      <header class="topbar" id="inicio">
        <div class="logo-single">
          <img src="branding/dgac-header.png" alt="Direccion General de Aeronautica Civil" />
        </div>
      </header>

      <section class="hero">
        <div class="hero-copy">
          <p class="eyebrow">Portal interno institucional</p>
          <h1>Consulta y descarga de documentos</h1>
          <p class="summary">
            Acceda a formularios, documentos operativos y enlaces institucionales de la Direccion
            General de Aeronautica Civil.
          </p>

          <div class="hero-actions">
            <a class="hero-button primary" href="#formularios">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M8 4.75h5.5l3.75 3.75v10.75H8zm5.5 0v3.75h3.75M10 12h4m-4 3h4" />
              </svg>
              <span>Ver formularios</span>
            </a>
            <a class="hero-button secondary" href="#enlaces">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M9.75 14.25 14.25 9.75" />
                <path d="M10.5 7.25h-1.75a4 4 0 1 0 0 8h1.75" />
                <path d="M13.5 7.25h1.75a4 4 0 1 1 0 8H13.5" />
              </svg>
              <span>Accesos directos</span>
            </a>
            <a class="hero-button secondary" href="#documentos-pdf">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M8 4.75h5.5l3.75 3.75v10.75H8zm5.5 0v3.75h3.75M10 12h4m-4 3h4" />
              </svg>
              <span>Ver especificaciones</span>
            </a>
          </div>
        </div>

        <div class="hero-art" aria-hidden="true">
          <div class="hero-art-glow"></div>
          <div class="hero-doc hero-doc-left">
            <span class="hero-doc-badge">DOCX</span>
            <span class="hero-doc-line"></span>
            <span class="hero-doc-line short"></span>
            <span class="hero-doc-line"></span>
          </div>
          <div class="hero-doc hero-doc-right">
            <span class="hero-doc-badge pdf">PDF</span>
            <span class="hero-doc-line"></span>
            <span class="hero-doc-line short"></span>
            <span class="hero-doc-line"></span>
          </div>
          <div class="hero-folder">
            <div class="hero-folder-top"></div>
          </div>
          <div class="hero-cloud">
            <svg viewBox="0 0 64 64" aria-hidden="true">
              <path
                d="M21 48h22a11 11 0 0 0 1.2-22A15 15 0 0 0 15 28a10 10 0 0 0 6 20Z"
                fill="currentColor"
              />
              <path
                d="M32 20v17m0 0 6-6m-6 6-6-6"
                fill="none"
                stroke="#2b63d9"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="3.5"
              />
            </svg>
          </div>
          <div class="hero-dots"></div>
        </div>
      </section>

      <section class="panel downloads-panel" id="formularios">
        <div class="section-header">
          <div class="section-heading">
            <div class="section-icon blue">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M8 4.75h5.5l3.75 3.75v10.75H8zm5.5 0v3.75h3.75M10 12h4m-4 3h4" />
              </svg>
            </div>
            <div>
              <p class="section-tag">Formularios descargables</p>
              <h2>Descarga de Formularios</h2>
            </div>
          </div>

          <button class="section-action blue" type="button" (click)="toggleDownloadHistory()">
            Ver formularios descargados
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M9 6.75 15 12l-6 5.25" />
            </svg>
          </button>
        </div>

        <div class="downloads-rail" (wheel)="onDownloadsWheel($event)" *ngIf="downloads().length; else noForms">
          <a
            class="resource-card"
            *ngFor="let item of downloads()"
            [href]="item.filePath"
            download
            target="_blank"
            rel="noopener noreferrer"
            (click)="registerDownload(item)"
          >
            <div class="resource-card-top">
              <div class="resource-icon blue" [attr.aria-label]="'Icono de ' + item.title">
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
                      *ngSwitchCase="'database'"
                      d="M6 8.25c0-1.8 2.7-3.25 6-3.25s6 1.45 6 3.25-2.7 3.25-6 3.25-6-1.45-6-3.25Zm0 3.75c0 1.8 2.7 3.25 6 3.25s6-1.45 6-3.25m-12 3.75c0 1.8 2.7 3.25 6 3.25s6-1.45 6-3.25"
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
              <span class="file-badge">{{ item.fileType || 'PDF' }}</span>
            </div>

            <div class="resource-copy">
              <strong>{{ item.title }}</strong>
              <p>{{ item.description || 'Formulario institucional disponible para descarga.' }}</p>
            </div>

            <div class="resource-action blue">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 4.75v9.75m0 0 3.75-3.75M12 14.5l-3.75-3.75M6 18.25h12" />
              </svg>
              <span>Descargar archivo</span>
            </div>
          </a>
        </div>

        <ng-template #noForms>
          <div class="history-empty">
            <strong>Sin formularios publicados</strong>
            <p>Agregue documentos activos en la base de datos para habilitar descargas reales.</p>
          </div>
        </ng-template>
      </section>

      <section class="download-history" id="descargados" *ngIf="showDownloadHistory()">
        <div class="history-copy">
          <p class="section-tag">Actividad local</p>
          <h2>Documentos descargados</h2>
          <p>Tus documentos descargados estaran visibles mientras permanezcas dentro del sitio.</p>
        </div>

        <div class="history-list" *ngIf="downloadHistory().length; else emptyHistory">
          <article class="history-item" *ngFor="let item of downloadHistory()">
            <div>
              <strong>{{ item.title }}</strong>
              <p>{{ item.fileType }} descargado {{ item.downloadedAt }}</p>
            </div>
            <a [href]="item.filePath" download target="_blank" rel="noopener noreferrer">
              Descargar nuevamente
            </a>
          </article>
        </div>

        <ng-template #emptyHistory>
          <div class="history-empty">
            <strong>Sin descargas registradas</strong>
            <p>Los documentos descargados apareceran aqui mientras la sesion permanezca activa.</p>
          </div>
        </ng-template>
      </section>

      <section class="panel specs-panel" id="documentos-pdf">
        <div class="section-header">
          <div class="section-heading">
            <div class="section-icon green">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M8 4.75h5.5l3.75 3.75v10.75H8zm5.5 0v3.75h3.75M10 12h4m-4 3h4" />
              </svg>
            </div>
            <div>
              <p class="section-tag green-text">Documentos descargables de especificaciones</p>
              <h2>Especificaciones Tecnicas de Equipos de Computo</h2>
            </div>
          </div>

        </div>

        <div class="card-grid" *ngIf="pendingPdfItems().length; else noSpecs">
          <a
            class="resource-card"
            *ngFor="let item of pendingPdfItems()"
            [href]="item.filePath"
            target="_blank"
            rel="noopener noreferrer"
            (click)="registerPdfOpen(item)"
          >
            <div class="resource-card-top">
              <div class="resource-icon green" [attr.aria-label]="'Icono de ' + item.title">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <ng-container [ngSwitch]="specIconFor(item.id)">
                    <path
                      *ngSwitchCase="'laptop'"
                      d="M6 8.25h12v7.5H6zm-1.25 9h14.5"
                    />
                    <path
                      *ngSwitchCase="'server'"
                      d="M6 6.75h12v4.5H6zm0 6h12v4.5H6zm2.25-3h.01m0 6h.01m7.49-6h.01m0 6h.01"
                    />
                    <path
                      *ngSwitchCase="'clipboard'"
                      d="M9 6.75h6m-5-2h4a1 1 0 0 1 1 1v2H9v-2a1 1 0 0 1 1-1Zm-2 3h8.5v11.5H7.5z"
                    />
                    <path
                      *ngSwitchCase="'shield'"
                      d="M12 5.25 17 7v4.25c0 3.25-2.2 6.2-5 7.5-2.8-1.3-5-4.25-5-7.5V7z"
                    />
                    <path
                      *ngSwitchDefault
                      d="M12 8.25v2.5m0 2.5v2.5m3.03-6.78-1.77 1.02m-2.52 4.54-1.77 1.02m6.06-.01-1.77-1.02m-2.52-4.54-1.77-1.02m6.29 3.29h-2.5m-2.5 0H8.5"
                    />
                  </ng-container>
                </svg>
              </div>
              <span class="file-badge">PDF</span>
            </div>

            <div class="resource-copy">
              <strong>{{ item.title }}</strong>
              <p>{{ item.description }}</p>
            </div>

            <div class="resource-action green">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4.75 12c1.75-3 4.25-4.5 7.25-4.5S17.5 9 19.25 12c-1.75 3-4.25 4.5-7.25 4.5S6.5 15 4.75 12Z" />
                <path d="M12 10.25a1.75 1.75 0 1 1 0 3.5 1.75 1.75 0 0 1 0-3.5Z" />
              </svg>
              <span>Ver especificacion</span>
            </div>
          </a>
        </div>

        <ng-template #noSpecs>
          <div class="history-empty">
            <strong>Sin especificaciones publicadas</strong>
            <p>Las especificaciones apareceran aqui cuando existan documentos PDF activos.</p>
          </div>
        </ng-template>
      </section>

      <section class="panel links-panel" id="enlaces">
        <div class="section-header">
          <div class="section-heading">
            <div class="section-icon violet">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M7 6.75h10v10.5H7zm2.5 3h5m-5 3h5" />
              </svg>
            </div>
            <div>
              <p class="section-tag violet-text">Enlaces institucionales</p>
              <h2>Accesos Directos</h2>
            </div>
          </div>
        </div>

        <div class="card-grid">
          <a class="link-card" *ngFor="let link of links()" [href]="link.url" target="_blank" rel="noopener noreferrer">
            <div class="link-preview" [attr.data-tone]="link.previewTone">
              <img *ngIf="link.imagePath" [src]="link.imagePath" [alt]="link.title" />
              <span class="link-preview-label" *ngIf="!link.imagePath">{{ link.previewLabel }}</span>
            </div>

            <div class="link-body">
              <strong>{{ link.title }}</strong>
              <p>{{ link.description }}</p>
            </div>

            <div class="link-action">
              <span>Ingresar</span>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M8 8h8v8m0-8-9 9" />
              </svg>
            </div>
          </a>
        </div>
      </section>

      <footer class="footer">
        <div class="footer-side">
          <div class="footer-mark">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 4.75 17 7v4.25c0 3.25-2.2 6.2-5 7.5-2.8-1.3-5-4.25-5-7.5V7z" />
            </svg>
          </div>
          <div>
            <strong>Direccion General de Aeronautica Civil</strong>
            <p>Unidad De Tecnologías de la Información</p>
          </div>
        </div>

        <div class="footer-side footer-side-right">
          <strong>Portal Interno Institucional DGAC</strong>
          <p>Version 1.0.0</p>
          <a class="admin-entry" href="/admin/login">Acceso administrativo</a>
        </div>
      </footer>
    </main>
  `
})
export class HomePageComponent {
  private readonly http = inject(HttpClient);
  private readonly analytics = inject(AnalyticsService);
  private readonly railTargets = new WeakMap<HTMLElement, number>();
  private readonly railFrames = new WeakMap<HTMLElement, number>();
  protected readonly downloads = signal<DownloadItem[]>([]);
  protected readonly links = signal(featuredLinks);
  protected readonly pendingPdfItems = signal<PendingPdfItem[]>([]);
  protected readonly showDownloadHistory = signal(false);
  protected readonly downloadHistory = signal<Array<DownloadItem & { downloadedAt: string }>>(this.readDownloadedDocs());

  constructor() {
    this.analytics.trackVisit(window.location.pathname);
    void this.loadPortalData();
  }

  protected async loadPortalData() {
    try {
      const [downloads, specs, links] = await Promise.all([
        firstValueFrom(this.http.get<DownloadItem[]>('/api/public/forms')),
        firstValueFrom(
          this.http.get<Array<Omit<PendingPdfItem, 'area'> & { area?: string | null }>>('/api/public/specs')
        ),
        firstValueFrom(this.http.get<PublicLinkResponse[]>('/api/public/links'))
      ]);

      this.downloads.set(downloads);

      this.pendingPdfItems.set(
        specs.map((item) => ({
          ...item,
          area: item.area || 'General'
        }))
      );

      if (links.length) {
        this.links.set(
          links.map((link) => {
            const presentation = linkPresentationMap[link.url];

            return {
              id: link.id,
              title: link.title,
              url: link.url,
              description: link.description || 'Enlace institucional disponible.',
              previewLabel: presentation?.previewLabel || link.title,
              previewTone: presentation?.previewTone || 'local',
              imagePath: presentation?.imagePath
            };
          })
        );
      }
    } catch {
      this.downloads.set([]);
      this.pendingPdfItems.set([]);
      this.links.set(featuredLinks);
    }
  }

  protected onDownloadsWheel(event: WheelEvent) {
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
      'usuario-sistema-dgac': 'database',
      'solicitud-carpeta-compartida': 'folder'
    };

    return iconMap[itemId] ?? 'document';
  }

  protected specIconFor(itemId: string) {
    const iconMap: Record<string, string> = {
      'computadora-escritorio': 'laptop',
      'computadora-portatil': 'clipboard',
      'escaner': 'server',
      ups: 'shield'
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
    this.analytics.trackDownload({
      documentId: item.id,
      title: item.title,
      filePath: item.filePath,
      fileType: item.fileType || 'FILE',
      area: 'Formularios'
    });
  }

  protected toggleDownloadHistory() {
    this.showDownloadHistory.update((value) => !value);
  }

  protected registerPdfOpen(item: PendingPdfItem) {
    this.analytics.trackDownload({
      documentId: item.id,
      title: item.title,
      filePath: item.filePath,
      fileType: 'PDF',
      area: item.area
    });
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
