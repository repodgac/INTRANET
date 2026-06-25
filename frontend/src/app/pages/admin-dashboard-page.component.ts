import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import type { AdminDashboardSnapshot, DashboardTrendPoint, TopDocument } from '../core/models';
import { AdminAuthService } from '../core/services/admin-auth.service';
import { AnalyticsService } from '../core/services/analytics.service';

interface MetricCard {
  label: string;
  value: string;
  detail: string;
  accent: 'blue' | 'teal' | 'violet' | 'amber';
}

interface ActivityRow {
  icon: string;
  title: string;
  subtitle: string;
  timestamp: string;
  orderValue: number;
}

@Component({
  selector: 'app-admin-dashboard-page',
  imports: [CommonModule, RouterLink],
  template: `
    <main class="dashboard-shell">
      <header class="dashboard-topbar">
        <div>
          <p class="eyebrow">Resumen del portal</p>
          <h1>Monitoreo general del sitio en tiempo real</h1>
          <p class="subtitle">
            Vista ejecutiva de visitas, descargas y actividad institucional reciente.
          </p>
        </div>

        <div class="topbar-actions">
          <a *ngIf="isSuperAdmin()" class="secondary-link" routerLink="/admin/access">
            Gestionar accesos
          </a>
          <a class="secondary-link" routerLink="/">Volver al portal</a>
          <button type="button" class="primary-button" (click)="logout()">Cerrar sesion</button>
        </div>
      </header>

      <section class="state-card" *ngIf="loading()">Cargando indicadores del portal...</section>
      <section class="state-card error" *ngIf="errorMessage()">{{ errorMessage() }}</section>

      <ng-container *ngIf="snapshot() as data">
        <section class="metrics-grid">
          <article class="metric-card" *ngFor="let metric of metricCards()">
            <div class="metric-icon" [class]="metric.accent">{{ metricIcon(metric.accent) }}</div>
            <div class="metric-copy">
              <span>{{ metric.label }}</span>
              <strong>{{ metric.value }}</strong>
              <p>{{ metric.detail }}</p>
            </div>
          </article>
        </section>

        <section class="hero-grid">
          <article class="panel trend-panel">
            <div class="panel-heading">
              <div>
                <p class="panel-tag">Actividad en el tiempo</p>
                <h2>Ultimos 7 dias</h2>
              </div>
              <div class="trend-legend">
                <span><i class="dot blue"></i>Visitas</span>
                <span><i class="dot teal"></i>Descargas</span>
              </div>
            </div>

            <svg class="trend-chart" viewBox="0 0 720 280" preserveAspectRatio="none" aria-hidden="true">
              <g class="grid">
                <line *ngFor="let row of gridRows" x1="0" [attr.y1]="row" x2="720" [attr.y2]="row"></line>
              </g>
              <polyline
                class="trend-line visits-line"
                [attr.points]="linePoints(data.trends.visitsByDay, trendMax())"
              ></polyline>
              <polyline
                class="trend-line downloads-line"
                [attr.points]="linePoints(data.trends.downloadsByDay, trendMax())"
              ></polyline>
              <g>
                <circle
                  *ngFor="let point of chartPoints(data.trends.visitsByDay, trendMax())"
                  class="point visits-point"
                  [attr.cx]="point.x"
                  [attr.cy]="point.y"
                  r="4"
                ></circle>
              </g>
              <g>
                <circle
                  *ngFor="let point of chartPoints(data.trends.downloadsByDay, trendMax())"
                  class="point downloads-point"
                  [attr.cx]="point.x"
                  [attr.cy]="point.y"
                  r="4"
                ></circle>
              </g>
            </svg>

            <div class="trend-labels">
              <span *ngFor="let point of data.trends.visitsByDay">{{ shortDate(point.date) }}</span>
            </div>
          </article>

          <article class="panel breakdown-panel">
            <div class="panel-heading">
              <div>
                <p class="panel-tag">Descargas por tipo</p>
                <h2>Composicion documental</h2>
              </div>
            </div>

            <div class="breakdown-layout" *ngIf="downloadBreakdown().length; else noBreakdown">
              <div
                class="donut-chart"
                [style.background]="donutBackground()"
                aria-hidden="true"
              >
                <div>
                  <strong>{{ data.summary.totalDownloads }}</strong>
                  <span>Total</span>
                </div>
              </div>

              <div class="breakdown-list">
                <article class="breakdown-item" *ngFor="let item of downloadBreakdown()">
                  <div class="breakdown-label">
                    <i class="swatch" [style.background]="item.color"></i>
                    <span>{{ item.label }}</span>
                  </div>
                  <strong>{{ item.value }}</strong>
                </article>
              </div>
            </div>
          </article>
        </section>

        <section class="details-grid">
          <article class="panel table-panel">
            <div class="panel-heading">
              <div>
                <p class="panel-tag">Ranking</p>
                <h2>Documentos mas descargados</h2>
              </div>
            </div>

            <div class="table-wrapper" *ngIf="data.topDocuments.length; else noDocuments">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Documento</th>
                    <th>Tipo</th>
                    <th>Descargas</th>
                    <th>Ultima descarga</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let item of data.topDocuments; let index = index">
                    <td>{{ index + 1 }}</td>
                    <td>{{ item.title }}</td>
                    <td>{{ item.fileType }}</td>
                    <td>{{ item.totalDownloads }}</td>
                    <td>{{ shortDateTime(item.lastDownloadedAt) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </article>

          <article class="panel activity-panel">
            <div class="panel-heading">
              <div>
                <p class="panel-tag">Actividad reciente</p>
                <h2>Eventos destacados</h2>
              </div>
            </div>

            <div class="activity-list" *ngIf="activityFeed().length; else noActivity">
              <article class="activity-item" *ngFor="let item of activityFeed()">
                <div class="activity-icon">{{ item.icon }}</div>
                <div class="activity-copy">
                  <strong>{{ item.title }}</strong>
                  <p>{{ item.subtitle }}</p>
                </div>
                <span>{{ item.timestamp }}</span>
              </article>
            </div>
          </article>
        </section>
      </ng-container>

      <ng-template #noBreakdown>
        <div class="empty-state">Sin suficientes descargas para construir la distribucion.</div>
      </ng-template>

      <ng-template #noDocuments>
        <div class="empty-state">Aun no hay documentos descargados para generar el ranking.</div>
      </ng-template>

      <ng-template #noActivity>
        <div class="empty-state">Todavia no hay actividad reciente almacenada.</div>
      </ng-template>
    </main>
  `,
  styles: `
    .dashboard-shell {
      width: min(100%, 1460px);
      min-height: 100vh;
      margin: 0 auto;
      padding: 1.4rem 1.2rem 2rem;
      display: grid;
      gap: 1rem;
    }

    .dashboard-topbar,
    .metric-card,
    .panel,
    .state-card {
      border: 1px solid rgba(113, 155, 224, 0.16);
      border-radius: 28px;
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(246, 250, 255, 0.94));
      box-shadow: 0 16px 42px rgba(34, 82, 158, 0.08);
    }

    .dashboard-topbar {
      padding: 1.2rem 1.4rem;
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      align-items: end;
    }

    .eyebrow,
    .panel-tag {
      margin: 0 0 0.2rem;
      text-transform: uppercase;
      letter-spacing: 0.16em;
      font-size: 0.74rem;
      font-weight: 800;
      color: #1d7a93;
    }

    h1,
    h2 {
      margin: 0;
      color: #173f79;
    }

    h1 {
      font-size: clamp(1.75rem, 3vw, 2.55rem);
      line-height: 1;
    }

    h2 {
      font-size: 1.25rem;
    }

    .subtitle {
      margin: 0.5rem 0 0;
      color: #55739f;
      line-height: 1.55;
      max-width: 42rem;
    }

    .topbar-actions {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
      align-items: center;
    }

    .secondary-link,
    .primary-button {
      min-height: 3rem;
      padding: 0.8rem 1.15rem;
      border-radius: 14px;
      border: 1px solid rgba(113, 155, 224, 0.2);
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      text-align: center;
    }

    .secondary-link {
      background: rgba(255, 255, 255, 0.9);
      color: #245fdb;
    }

    .primary-button {
      background: linear-gradient(180deg, #173f79, #102f5b);
      color: #fff;
      cursor: pointer;
    }

    .state-card {
      padding: 1rem 1.15rem;
      color: #48658f;
    }

    .state-card.error {
      color: #b42318;
    }

    .metrics-grid,
    .hero-grid,
    .details-grid {
      display: grid;
      gap: 1rem;
      align-items: stretch;
    }

    .metrics-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
      justify-content: center;
    }

    .hero-grid {
      grid-template-columns: minmax(0, 1.4fr) minmax(330px, 0.8fr);
    }

    .details-grid {
      grid-template-columns: minmax(0, 1.25fr) minmax(320px, 0.75fr);
    }

    .metric-card,
    .panel {
      padding: 1.2rem;
    }

    .metric-card {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 0.9rem;
      align-items: center;
      min-height: 8.9rem;
      height: 100%;
    }

    .metric-icon {
      width: 2.9rem;
      height: 2.9rem;
      border-radius: 16px;
      display: grid;
      place-items: center;
      color: #fff;
      font-size: 1.1rem;
      font-weight: 800;
      box-shadow: 0 12px 26px rgba(32, 86, 169, 0.16);
    }

    .metric-icon.blue {
      background: linear-gradient(180deg, #418dff, #2b63d9);
    }

    .metric-icon.teal {
      background: linear-gradient(180deg, #31c8b4, #199a8c);
    }

    .metric-icon.violet {
      background: linear-gradient(180deg, #8c7bff, #685ae8);
    }

    .metric-icon.amber {
      background: linear-gradient(180deg, #ffb24b, #f28b1a);
    }

    .metric-copy {
      display: grid;
      gap: 0.2rem;
      align-content: center;
      min-height: 100%;
    }

    .metric-copy span {
      color: #56729c;
      font-weight: 700;
      font-size: 0.92rem;
    }

    .metric-copy strong {
      color: #173f79;
      font-size: clamp(1.8rem, 3vw, 2.6rem);
      line-height: 1;
    }

    .metric-copy p,
    .activity-copy p {
      margin: 0;
      color: #5d789f;
      line-height: 1.6;
    }

    .metric-copy p {
      min-height: 3rem;
    }

    .panel-heading {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      align-items: start;
      margin-bottom: 1rem;
    }

    .trend-legend {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
      color: #5e769f;
      font-weight: 700;
      font-size: 0.9rem;
    }

    .trend-legend span {
      display: inline-flex;
      gap: 0.4rem;
      align-items: center;
    }

    .dot {
      width: 0.8rem;
      height: 0.8rem;
      border-radius: 999px;
      display: inline-block;
    }

    .dot.blue {
      background: #3476f5;
    }

    .dot.teal {
      background: #22b09d;
    }

    .trend-chart {
      width: 100%;
      height: 280px;
      overflow: visible;
    }

    .grid line {
      stroke: rgba(122, 153, 211, 0.18);
      stroke-width: 1;
    }

    .trend-line {
      fill: none;
      stroke-width: 4;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .visits-line {
      stroke: #3476f5;
    }

    .downloads-line {
      stroke: #22b09d;
    }

    .point {
      stroke: #fff;
      stroke-width: 3;
    }

    .visits-point {
      fill: #3476f5;
    }

    .downloads-point {
      fill: #22b09d;
    }

    .trend-labels {
      display: grid;
      grid-template-columns: repeat(7, minmax(0, 1fr));
      gap: 0.5rem;
      margin-top: 0.4rem;
      color: #60789f;
      font-size: 0.9rem;
      text-align: center;
    }

    .breakdown-layout {
      display: grid;
      grid-template-columns: minmax(180px, 210px) 1fr;
      gap: 1rem;
      align-items: center;
      min-height: 320px;
    }

    .donut-chart {
      width: 210px;
      height: 210px;
      border-radius: 999px;
      display: grid;
      place-items: center;
      margin: 0 auto;
      position: relative;
    }

    .donut-chart::after {
      content: '';
      position: absolute;
      inset: 24px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.98);
      box-shadow: inset 0 0 0 1px rgba(113, 155, 224, 0.1);
    }

    .donut-chart div {
      position: relative;
      z-index: 1;
      display: grid;
      justify-items: center;
      gap: 0.2rem;
    }

    .donut-chart strong {
      font-size: 2rem;
      color: #173f79;
      line-height: 1;
    }

    .donut-chart span {
      color: #5f789e;
      font-weight: 700;
    }

    .breakdown-list {
      display: grid;
      gap: 0.8rem;
    }

    .breakdown-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.8rem 0.9rem;
      border-radius: 16px;
      background: rgba(255, 255, 255, 0.78);
      border: 1px solid rgba(119, 153, 214, 0.14);
    }

    .breakdown-label {
      display: inline-flex;
      align-items: center;
      gap: 0.55rem;
      color: #244677;
      font-weight: 700;
    }

    .swatch {
      width: 0.82rem;
      height: 0.82rem;
      border-radius: 999px;
      display: inline-block;
    }

    .breakdown-item strong {
      color: #173f79;
    }

    .table-wrapper {
      overflow-x: auto;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    th,
    td {
      padding: 0.9rem 0.75rem;
      border-bottom: 1px solid rgba(122, 153, 211, 0.14);
      text-align: left;
      white-space: nowrap;
    }

    th {
      color: #5d789f;
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    td {
      color: #244677;
    }

    .activity-list {
      display: grid;
      gap: 0.8rem;
    }

    .activity-item {
      display: grid;
      grid-template-columns: auto 1fr auto;
      align-items: center;
      gap: 0.9rem;
      padding: 0.95rem 1rem;
      border-radius: 18px;
      border: 1px solid rgba(119, 153, 214, 0.14);
      background: rgba(255, 255, 255, 0.82);
    }

    .activity-icon {
      width: 2.5rem;
      height: 2.5rem;
      border-radius: 14px;
      display: grid;
      place-items: center;
      background: linear-gradient(180deg, #eef4ff, #dfeaff);
      color: #2d66dd;
      font-size: 1.05rem;
    }

    .activity-copy {
      display: grid;
      gap: 0.2rem;
    }

    .activity-copy strong {
      color: #173f79;
    }

    .activity-item span {
      color: #5d789f;
      font-size: 0.9rem;
      text-align: right;
    }

    .empty-state {
      padding: 1rem 1.1rem;
      border-radius: 18px;
      color: #56729c;
      background: rgba(255, 255, 255, 0.8);
    }

    @media (max-width: 1200px) {
      .metrics-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .hero-grid,
      .details-grid {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 860px) {
      .dashboard-topbar,
      .panel-heading,
      .activity-item {
        display: grid;
      }

      .breakdown-layout {
        grid-template-columns: 1fr;
      }

      .metrics-grid {
        grid-template-columns: 1fr;
      }

      .topbar-actions {
        width: 100%;
      }

      .secondary-link,
      .primary-button {
        flex: 1 1 0;
      }

      .activity-item {
        grid-template-columns: auto 1fr;
      }

      .activity-item span {
        text-align: left;
      }
    }
  `
})
export class AdminDashboardPageComponent {
  private readonly analytics = inject(AnalyticsService);
  private readonly auth = inject(AdminAuthService);
  private readonly router = inject(Router);

  protected readonly snapshot = signal<AdminDashboardSnapshot | null>(null);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly isSuperAdmin = this.auth.isSuperAdmin;
  protected readonly gridRows = [30, 90, 150, 210, 270];
  protected readonly trendMax = computed(() => {
    const snapshot = this.snapshot();

    if (!snapshot) {
      return 1;
    }

    return Math.max(
      ...snapshot.trends.visitsByDay.map((item) => item.total),
      ...snapshot.trends.downloadsByDay.map((item) => item.total),
      1
    );
  });
  protected readonly metricCards = computed(() => {
    const snapshot = this.snapshot();

    if (!snapshot) {
      return [] as MetricCard[];
    }

      return [
        {
          label: 'Visitas totales',
          value: this.formatCompact(snapshot.summary.totalVisits),
          detail: this.formatDate(snapshot.summary.lastVisitAt, 'Ultima visita'),
          accent: 'blue'
        },
        {
          label: 'Descargas totales',
          value: this.formatCompact(snapshot.summary.totalDownloads),
        detail: this.formatDate(snapshot.summary.lastDownloadAt, 'Ultima descarga'),
        accent: 'violet'
      },
      {
        label: 'Documentos activos',
        value: this.formatCompact(snapshot.summary.documentsTracked),
        detail: 'Formularios y especificaciones trazadas',
        accent: 'amber'
      }
    ] satisfies MetricCard[];
  });
  protected readonly downloadBreakdown = computed(() => {
    const snapshot = this.snapshot();

    if (!snapshot?.topDocuments.length) {
      return [] as Array<{ label: string; value: string; color: string; total: number }>;
    }

    const palette = ['#3476f5', '#22b09d', '#f59f2f', '#8c7bff', '#9da9bc'];
    const grouped = new Map<string, number>();

    for (const document of snapshot.topDocuments) {
      grouped.set(
        document.fileType,
        (grouped.get(document.fileType) ?? 0) + document.totalDownloads
      );
    }

    const total = [...grouped.values()].reduce((sum, value) => sum + value, 0);

    return [...grouped.entries()].map(([label, downloads], index) => ({
      label,
      total: downloads,
      value: `${downloads} (${this.percent(downloads, total)}%)`,
      color: palette[index % palette.length]
    }));
  });
  protected readonly donutBackground = computed(() => {
    const items = this.downloadBreakdown();

    if (!items.length) {
      return 'conic-gradient(#dfe8fb 0deg 360deg)';
    }

    const total = items.reduce((sum, item) => sum + item.total, 0);
    let current = 0;
    const segments = items.map((item) => {
      const start = current;
      const arc = (item.total / total) * 360;
      current += arc;
      return `${item.color} ${start}deg ${current}deg`;
    });

    return `conic-gradient(${segments.join(', ')})`;
  });
  protected readonly activityFeed = computed(() => {
    const snapshot = this.snapshot();

    if (!snapshot) {
      return [] as ActivityRow[];
    }

    const downloadRows = snapshot.recentDownloads.slice(0, 3).map((item) => ({
      icon: '↓',
      title: 'Documento descargado',
      subtitle: item.title,
      timestamp: this.shortDateTime(item.downloadedAt),
      orderValue: new Date(item.downloadedAt).getTime()
    }));

    const visitRows = snapshot.recentVisits.slice(0, 3).map((item) => ({
      icon: '↗',
      title: 'Pagina visitada',
      subtitle: item.path,
      timestamp: this.shortDateTime(item.visitedAt),
      orderValue: new Date(item.visitedAt).getTime()
    }));

    return [...downloadRows, ...visitRows]
      .sort((left, right) => right.orderValue - left.orderValue)
      .slice(0, 6);
  });

  constructor() {
    void this.loadDashboard();
  }

  protected async loadDashboard() {
    this.loading.set(true);
    this.errorMessage.set('');

    try {
      this.snapshot.set(await this.analytics.getDashboard());
    } catch {
      this.errorMessage.set(
        'No fue posible cargar el dashboard. Revise la sesion del administrador o la API.'
      );
    } finally {
      this.loading.set(false);
    }
  }

  protected logout() {
    this.auth.logout();
    void this.router.navigateByUrl('/admin/login');
  }

  protected metricIcon(accent: MetricCard['accent']) {
    return (
      {
        blue: '◉',
        teal: '◎',
        violet: '↓',
        amber: '▣'
      } as const
    )[accent];
  }

  protected linePoints(points: DashboardTrendPoint[], max: number) {
    return this.chartPoints(points, max)
      .map((point) => `${point.x},${point.y}`)
      .join(' ');
  }

  protected chartPoints(points: DashboardTrendPoint[], max: number) {
    const width = 720;
    const height = 280;
    const leftPadding = 16;
    const rightPadding = 16;
    const topPadding = 18;
    const bottomPadding = 22;
    const usableWidth = width - leftPadding - rightPadding;
    const usableHeight = height - topPadding - bottomPadding;

    return points.map((point, index) => ({
      x: leftPadding + (usableWidth / Math.max(points.length - 1, 1)) * index,
      y: topPadding + usableHeight - (point.total / Math.max(max, 1)) * usableHeight
    }));
  }

  protected shortDate(value: string) {
    return new Date(`${value}T00:00:00`).toLocaleDateString('es-GT', {
      month: 'short',
      day: 'numeric'
    });
  }

  protected shortDateTime(value: string) {
    return new Date(value).toLocaleString('es-GT', {
      dateStyle: 'short',
      timeStyle: 'short'
    });
  }

  protected formatDate(value: string | null, label: string) {
    return value ? `${label}: ${this.shortDateTime(value)}` : `${label}: sin registros`;
  }

  private formatCompact(value: number) {
    return new Intl.NumberFormat('es-GT').format(value);
  }

  private percent(value: number, total: number) {
    if (!total) {
      return '0.0';
    }

    return ((value / total) * 100).toFixed(1);
  }
}
