import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import type { ManagedContentDocument, ManagedContentLink } from '../core/models';
import { ContentManagementService } from '../core/services/content-management.service';

@Component({
  selector: 'app-admin-content-management-page',
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <main class="content-shell">
      <header class="content-header">
        <div>
          <p class="eyebrow">Panel administrativo</p>
          <h1>Gestionar contenido</h1>
          <p>Publique documentos, especificaciones y enlaces en el portal.</p>
        </div>
        <nav>
          <a routerLink="/admin/dashboard">Volver al dashboard</a>
          <a routerLink="/">Ver portal</a>
        </nav>
      </header>

      <p class="notice success" *ngIf="successMessage()">{{ successMessage() }}</p>
      <p class="notice error" *ngIf="errorMessage()">{{ errorMessage() }}</p>

      <section class="form-grid">
        <article class="panel">
          <div class="panel-heading">
            <div>
              <p class="panel-tag">Archivos</p>
              <h2>Subir contenido</h2>
            </div>
          </div>

          <form (ngSubmit)="uploadDocument()">
            <label>
              <span>Tipo de contenido</span>
              <select name="kind" [(ngModel)]="documentForm.kind" (ngModelChange)="selectedFile.set(null)">
                <option value="form">Documento o formulario</option>
                <option value="spec">Especificacion tecnica</option>
              </select>
            </label>

            <label>
              <span>Titulo</span>
              <input name="documentTitle" [(ngModel)]="documentForm.title" required placeholder="Titulo visible en el portal" />
            </label>

            <label>
              <span>Descripcion</span>
              <textarea name="documentDescription" [(ngModel)]="documentForm.description" rows="3"></textarea>
            </label>

            <label>
              <span>Area o categoria</span>
              <input name="documentArea" [(ngModel)]="documentForm.area" placeholder="Ej. Tecnologia" />
            </label>

            <label class="file-field">
              <span>Archivo (maximo 25 MB)</span>
              <input
                type="file"
                [accept]="documentForm.kind === 'spec' ? '.pdf,application/pdf' : '.pdf,.doc,.docx,.xls,.xlsx'"
                (change)="selectFile($event)"
                required
              />
              <small *ngIf="selectedFile() as file">Seleccionado: {{ file.name }}</small>
            </label>

            <button type="submit" [disabled]="savingDocument() || !selectedFile()">
              {{ savingDocument() ? 'Subiendo...' : 'Publicar archivo' }}
            </button>
          </form>
        </article>

        <article class="panel">
          <div class="panel-heading">
            <div>
              <p class="panel-tag">Accesos externos</p>
              <h2>Agregar enlace</h2>
            </div>
          </div>

          <form (ngSubmit)="createLink()">
            <label>
              <span>Titulo</span>
              <input name="linkTitle" [(ngModel)]="linkForm.title" required placeholder="Nombre del sitio o sistema" />
            </label>

            <label>
              <span>Descripcion</span>
              <textarea name="linkDescription" [(ngModel)]="linkForm.description" rows="3"></textarea>
            </label>

            <label>
              <span>Direccion web</span>
              <input name="linkUrl" type="url" [(ngModel)]="linkForm.url" required placeholder="https://..." />
            </label>

            <button type="submit" [disabled]="savingLink()">
              {{ savingLink() ? 'Guardando...' : 'Publicar enlace' }}
            </button>
          </form>
        </article>
      </section>

      <section class="inventory panel">
        <div class="panel-heading">
          <div>
            <p class="panel-tag">Inventario</p>
            <h2>Contenido publicado</h2>
          </div>
          <button class="secondary" type="button" (click)="loadContent()" [disabled]="loading()">
            Actualizar
          </button>
        </div>

        <p class="empty" *ngIf="loading()">Cargando contenido...</p>
        <div class="inventory-grid" *ngIf="!loading()">
          <div class="inventory-column">
            <h3>PDF ({{ pdfDocuments().length }})</h3>
            <div class="list-scroll">
              <article class="content-item" *ngFor="let item of pdfDocuments()">
                <div class="item-copy">
                  <strong>{{ item.title }}</strong>
                  <p>{{ item.fileName }}<span *ngIf="!item.active"> · Inactivo</span></p>
                  <time>Subido: {{ formatDate(item.createdAt) }}</time>
                </div>
                <div class="item-actions">
                  <a [href]="item.filePath" target="_blank" rel="noopener">Abrir</a>
                  <button class="danger" type="button" (click)="deleteDocument(item)"
                    [disabled]="deletingKey() === 'document-' + item.databaseId">
                    {{ deletingKey() === 'document-' + item.databaseId ? 'Procesando...' : 'Eliminar' }}
                  </button>
                </div>
              </article>
              <p class="empty" *ngIf="!pdfDocuments().length">No hay archivos PDF.</p>
            </div>
          </div>

          <div class="inventory-column">
            <h3>Word / Office ({{ officeDocuments().length }})</h3>
            <div class="list-scroll">
              <article class="content-item" *ngFor="let item of officeDocuments()">
                <div class="item-copy">
                  <strong>{{ item.title }}</strong>
                  <p>{{ item.fileName }} · {{ item.fileType }}<span *ngIf="!item.active"> · Inactivo</span></p>
                  <time>Subido: {{ formatDate(item.createdAt) }}</time>
                </div>
                <div class="item-actions">
                  <a [href]="item.filePath" target="_blank" rel="noopener">Abrir</a>
                  <button class="danger" type="button" (click)="deleteDocument(item)"
                    [disabled]="deletingKey() === 'document-' + item.databaseId">
                    {{ deletingKey() === 'document-' + item.databaseId ? 'Procesando...' : 'Eliminar' }}
                  </button>
                </div>
              </article>
              <p class="empty" *ngIf="!officeDocuments().length">No hay documentos Word u Office.</p>
            </div>
          </div>

          <div class="inventory-column">
            <h3>Enlaces ({{ links().length }})</h3>
            <div class="list-scroll">
              <article class="content-item" *ngFor="let item of links()">
                <div class="item-copy">
                  <strong>{{ item.title }}</strong>
                  <p>{{ item.url }}</p>
                  <time>Agregado: {{ formatDate(item.createdAt) }}</time>
                </div>
                <div class="item-actions">
                  <a [href]="item.url" target="_blank" rel="noopener">Abrir</a>
                  <button class="danger" type="button" (click)="deleteLink(item)"
                    [disabled]="deletingKey() === 'link-' + item.id">
                    {{ deletingKey() === 'link-' + item.id ? 'Procesando...' : 'Eliminar' }}
                  </button>
                </div>
              </article>
              <p class="empty" *ngIf="!links().length">No hay enlaces.</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  `,
  styles: `
    :host { display: block; min-height: 100vh; }
    .content-shell { width: min(1180px, calc(100% - 2rem)); margin: 0 auto; padding: 1.5rem 0 3rem; display: grid; gap: 1rem; }
    .content-header, .panel { border: 1px solid rgba(113, 155, 224, .2); border-radius: 26px; background: rgba(255,255,255,.96); box-shadow: 0 18px 44px rgba(34,82,158,.09); }
    .content-header { padding: 1.4rem 1.6rem; display: flex; justify-content: space-between; align-items: end; gap: 1rem; }
    h1, h2, h3, p { margin-top: 0; } h1 { margin-bottom: .35rem; color: #123f78; } h2 { margin-bottom: 0; color: #174982; }
    .eyebrow, .panel-tag { margin-bottom: .35rem; color: #1888a7; font-size: .72rem; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; }
    nav { display: flex; gap: .6rem; flex-wrap: wrap; } nav a, .secondary { border: 1px solid #b8cceb; border-radius: 12px; padding: .65rem .9rem; color: #174982; background: white; text-decoration: none; font-weight: 700; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .panel { padding: 1.35rem; } .panel-heading { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; }
    form { display: grid; gap: .85rem; } label { display: grid; gap: .35rem; color: #173e70; font-weight: 700; }
    input, select, textarea { width: 100%; box-sizing: border-box; border: 1px solid #c5d5ed; border-radius: 12px; padding: .75rem .85rem; font: inherit; color: #173e70; background: #fbfdff; }
    textarea { resize: vertical; } small { color: #39718e; font-weight: 500; }
    form button { border: 0; border-radius: 13px; padding: .82rem 1rem; color: white; background: linear-gradient(90deg, #174982, #21b8c5); font-weight: 800; cursor: pointer; }
    button:disabled { opacity: .55; cursor: not-allowed; }
    .notice { margin: 0; border-radius: 14px; padding: .8rem 1rem; font-weight: 700; } .success { color: #176c52; background: #e8faf4; } .error { color: #9b2e3b; background: #fff0f2; }
    .inventory { min-width: 0; overflow: hidden; }
    .inventory-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1rem; min-width: 0; }
    .inventory-column { min-width: 0; border: 1px solid #dbe7f5; border-radius: 18px; padding: .9rem; background: #fbfdff; overflow: hidden; }
    .inventory-column h3 { margin-bottom: .7rem; color: #174982; }
    .list-scroll { max-height: 430px; overflow-y: auto; overflow-x: hidden; padding-right: .3rem; scrollbar-gutter: stable; }
    .content-item { display: grid; gap: .65rem; min-width: 0; padding: .8rem 0; border-bottom: 1px solid #e4edf8; }
    .item-copy { min-width: 0; overflow: hidden; }
    .content-item p { margin: .2rem 0; color: #61758d; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .content-item time { display: block; color: #7c8da2; font-size: .78rem; }
    .content-item a { color: #167f9e; font-weight: 800; }
    .item-actions { display: flex; align-items: center; gap: .55rem; flex-shrink: 0; }
    .danger { border: 1px solid #efb7bd; border-radius: 10px; padding: .48rem .65rem; color: #a02e3c; background: #fff5f6; font-weight: 800; cursor: pointer; }
    .empty { color: #61758d; }
    @media (max-width: 950px) { .inventory-grid { grid-template-columns: 1fr; } }
    @media (max-width: 760px) { .content-header { align-items: start; flex-direction: column; } .form-grid { grid-template-columns: 1fr; } }
  `
})
export class AdminContentManagementPageComponent {
  private readonly content = inject(ContentManagementService);

  protected readonly documents = signal<ManagedContentDocument[]>([]);
  protected readonly links = signal<ManagedContentLink[]>([]);
  protected readonly pdfDocuments = computed(() =>
    this.documents().filter((item) => item.fileType?.toUpperCase() === 'PDF')
  );
  protected readonly officeDocuments = computed(() =>
    this.documents().filter((item) => item.fileType?.toUpperCase() !== 'PDF')
  );
  protected readonly selectedFile = signal<File | null>(null);
  protected readonly loading = signal(true);
  protected readonly savingDocument = signal(false);
  protected readonly savingLink = signal(false);
  protected readonly deletingKey = signal('');
  protected readonly successMessage = signal('');
  protected readonly errorMessage = signal('');

  protected documentForm = this.emptyDocumentForm();
  protected linkForm = this.emptyLinkForm();

  constructor() {
    void this.loadContent();
  }

  protected async loadContent() {
    this.loading.set(true);
    try {
      const snapshot = await this.content.list();
      this.documents.set(snapshot.documents);
      this.links.set(snapshot.links);
    } catch (error) {
      this.errorMessage.set(this.extractMessage(error, 'No fue posible cargar el contenido.'));
    } finally {
      this.loading.set(false);
    }
  }

  protected selectFile(event: Event) {
    const input = event.target as HTMLInputElement;
    this.selectedFile.set(input.files?.[0] ?? null);
  }

  protected async uploadDocument() {
    const file = this.selectedFile();
    if (!file) return;

    this.savingDocument.set(true);
    this.clearMessages();
    try {
      await this.content.uploadDocument({ ...this.documentForm, file });
      this.successMessage.set('Archivo publicado correctamente.');
      this.documentForm = this.emptyDocumentForm();
      this.selectedFile.set(null);
      await this.loadContent();
    } catch (error) {
      this.errorMessage.set(this.extractMessage(error, 'No fue posible publicar el archivo.'));
    } finally {
      this.savingDocument.set(false);
    }
  }

  protected async createLink() {
    this.savingLink.set(true);
    this.clearMessages();
    try {
      await this.content.createLink(this.linkForm);
      this.successMessage.set('Enlace publicado correctamente.');
      this.linkForm = this.emptyLinkForm();
      await this.loadContent();
    } catch (error) {
      this.errorMessage.set(this.extractMessage(error, 'No fue posible publicar el enlace.'));
    } finally {
      this.savingLink.set(false);
    }
  }

  protected async deleteDocument(item: ManagedContentDocument) {
    const confirmed = window.confirm(
      `¿Eliminar "${item.title}"? Si tiene historial de descargas, se desactivara para conservar las estadisticas.`
    );
    if (!confirmed) return;

    this.deletingKey.set(`document-${item.databaseId}`);
    this.clearMessages();
    try {
      const result = await this.content.deleteDocument(item.databaseId);
      this.successMessage.set(
        result.mode === 'deleted'
          ? 'Documento eliminado correctamente.'
          : 'El documento tenia historial y fue desactivado para conservar las estadisticas.'
      );
      await this.loadContent();
    } catch (error) {
      this.errorMessage.set(this.extractMessage(error, 'No fue posible eliminar el documento.'));
    } finally {
      this.deletingKey.set('');
    }
  }

  protected async deleteLink(item: ManagedContentLink) {
    const confirmed = window.confirm(`¿Eliminar el enlace "${item.title}"?`);
    if (!confirmed) return;

    this.deletingKey.set(`link-${item.id}`);
    this.clearMessages();
    try {
      await this.content.deleteLink(item.id);
      this.successMessage.set('Enlace eliminado correctamente.');
      await this.loadContent();
    } catch (error) {
      this.errorMessage.set(this.extractMessage(error, 'No fue posible eliminar el enlace.'));
    } finally {
      this.deletingKey.set('');
    }
  }

  protected formatDate(value: string) {
    return new Date(value).toLocaleDateString('es-GT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  private clearMessages() { this.successMessage.set(''); this.errorMessage.set(''); }
  private emptyDocumentForm() { return { kind: 'form' as const as 'form' | 'spec', title: '', description: '', area: '' }; }
  private emptyLinkForm() { return { title: '', description: '', url: '' }; }
  private extractMessage(error: unknown, fallback: string) {
    return typeof error === 'object' && error !== null && 'error' in error &&
      typeof (error as { error?: { message?: string } }).error?.message === 'string'
      ? (error as { error: { message: string } }).error.message : fallback;
  }
}
