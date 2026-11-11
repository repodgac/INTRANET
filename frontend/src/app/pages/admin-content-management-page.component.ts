import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { ManagedContentDocument, ManagedContentLink } from '../core/models';
import { ContentManagementService } from '../core/services/content-management.service';

@Component({
  selector: 'app-admin-content-management-page',
  imports: [CommonModule, FormsModule],
  template: `
    <main class="content-shell">
      <header class="content-header page-heading">
        <div>
          <h1>Gestion de contenido</h1>
          <p>Publique documentos, especificaciones y enlaces en el portal.</p>
        </div>
        <button class="new-content" type="button" (click)="showCreatePanel.set(true)">＋ Nuevo contenido</button>
      </header>

      <p class="notice success" *ngIf="successMessage()">{{ successMessage() }}</p>
      <p class="notice error" *ngIf="errorMessage()">{{ errorMessage() }}</p>

      <section class="form-grid" *ngIf="showCreatePanel()" aria-label="Nuevo contenido">
        <button class="modal-close" type="button" (click)="showCreatePanel.set(false)" aria-label="Cerrar formulario">×</button>
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
            <h2>Contenido publicado</h2>
          </div>
          <button class="secondary" type="button" (click)="loadContent()" [disabled]="loading()">
            Actualizar
          </button>
        </div>

        <p class="empty" *ngIf="loading()">Cargando contenido...</p>
        <div class="content-table-wrap" *ngIf="!loading()">
          <table class="content-table">
            <thead><tr><th>T&iacute;tulo</th><th>Tipo</th><th>Estado</th><th>Publicaci&oacute;n</th><th>Acciones</th></tr></thead>
            <tbody>
              <tr class="group-row"><th colspan="5">PDF ({{ pdfDocuments().length }})</th></tr>
              <tr *ngFor="let item of pdfDocuments()">
                <td><strong>{{ item.title }}</strong><small>{{ item.fileName }}</small></td>
                <td><span class="type-badge pdf">PDF</span></td>
                <td><span class="status" [class.inactive]="!item.active">{{ item.active ? 'Publicado' : 'Inactivo' }}</span></td>
                <td>{{ formatDate(item.createdAt) }}</td>
                <td class="table-actions"><a [href]="item.filePath" target="_blank" rel="noopener">Abrir</a><button class="danger" type="button" (click)="deleteDocument(item)" [disabled]="deletingKey() === 'document-' + item.databaseId">Eliminar</button></td>
              </tr>
              <tr class="empty-row" *ngIf="!pdfDocuments().length"><td colspan="5">No hay archivos PDF.</td></tr>
              <tr class="group-row"><th colspan="5">Word / Office ({{ officeDocuments().length }})</th></tr>
              <tr *ngFor="let item of officeDocuments()">
                <td><strong>{{ item.title }}</strong><small>{{ item.fileName }}</small></td>
                <td><span class="type-badge office">{{ item.fileType || 'DOC' }}</span></td>
                <td><span class="status" [class.inactive]="!item.active">{{ item.active ? 'Publicado' : 'Inactivo' }}</span></td>
                <td>{{ formatDate(item.createdAt) }}</td>
                <td class="table-actions"><a [href]="item.filePath" target="_blank" rel="noopener">Abrir</a><button class="danger" type="button" (click)="deleteDocument(item)" [disabled]="deletingKey() === 'document-' + item.databaseId">Eliminar</button></td>
              </tr>
              <tr class="empty-row" *ngIf="!officeDocuments().length"><td colspan="5">No hay documentos Word u Office.</td></tr>
              <tr class="group-row"><th colspan="5">Enlaces ({{ links().length }})</th></tr>
              <tr *ngFor="let item of links()">
                <td><strong>{{ item.title }}</strong><small>{{ item.url }}</small></td>
                <td><span class="type-badge link">Enlace</span></td>
                <td><span class="status" [class.inactive]="!item.active">{{ item.active ? 'Publicado' : 'Inactivo' }}</span></td>
                <td>{{ formatDate(item.createdAt) }}</td>
                <td class="table-actions"><a [href]="item.url" target="_blank" rel="noopener">Abrir</a><button class="danger" type="button" (click)="deleteLink(item)" [disabled]="deletingKey() === 'link-' + item.id">Eliminar</button></td>
              </tr>
              <tr class="empty-row" *ngIf="!links().length"><td colspan="5">No hay enlaces.</td></tr>
            </tbody>
          </table>
        </div>
      </section>
    </main>
  `,
  styles: `
    :host { display: block; min-height: 100vh; }
    .content-shell { width: 100%; margin: 0; padding: 0; display: grid; gap: 1rem; font-size: 13px; }
    .content-header, .panel { border: 1px solid rgba(113, 155, 224, .2); border-radius: 14px; background: rgba(255,255,255,.96); box-shadow: 0 18px 44px rgba(34,82,158,.09); }
    .content-header { padding: 0 0 .35rem; display: flex; justify-content: space-between; align-items: center; gap: 1.5rem; border: 0; border-radius: 0; background: transparent; box-shadow: none; }
    h1, h2, h3, p { margin-top: 0; } h1 { max-width: none; margin-bottom: .35rem; color: #123f78; font-size: 1.75rem; line-height: 1.08; } h2 { margin-bottom: 0; color: #174982; font-size: 1.125rem; }
    .eyebrow, .panel-tag { margin-bottom: .35rem; color: #1888a7; font-size: .72rem; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; }
    .new-content { min-height: 42px; border: 0; border-radius: 8px; padding: .65rem 1rem; color: white; background: #125fd4; font-weight: 800; cursor: pointer; }
    .form-grid { position: fixed; inset: 0; z-index: 60; display: grid; grid-template-columns: minmax(0, 520px) minmax(0, 520px); align-content: center; justify-content: center; gap: 1rem; padding: 4rem 1rem 1rem; background: rgba(5,22,45,.58); overflow-y: auto; }
    .modal-close { position: fixed; top: 1rem; right: 1rem; width: 42px; height: 42px; border: 0; border-radius: 50%; background: white; color: #123c70; font-size: 1.5rem; cursor: pointer; }
    .panel { padding: 1.1rem; } .panel-heading { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: .9rem; }
    .secondary { min-height: 40px; padding: .55rem .9rem; border: 1px solid #cbd9eb; border-radius: 8px; color: #185bc0; background: white; font-weight: 700; cursor: pointer; }
    form { display: grid; gap: .85rem; } label { display: grid; gap: .35rem; color: #173e70; font-weight: 700; }
    input, select, textarea { width: 100%; box-sizing: border-box; border: 1px solid #c5d5ed; border-radius: 12px; padding: .75rem .85rem; font: inherit; color: #173e70; background: #fbfdff; }
    textarea { resize: vertical; } small { color: #39718e; font-weight: 500; }
    form button { border: 0; border-radius: 13px; padding: .82rem 1rem; color: white; background: linear-gradient(90deg, #174982, #21b8c5); font-weight: 800; cursor: pointer; }
    button:disabled { opacity: .55; cursor: not-allowed; }
    .notice { margin: 0; border-radius: 14px; padding: .8rem 1rem; font-weight: 700; } .success { color: #176c52; background: #e8faf4; } .error { color: #9b2e3b; background: #fff0f2; }
    .inventory { min-width: 0; overflow: hidden; }
    .content-table-wrap { overflow-x: auto; border: 1px solid #dce6f3; border-radius: 10px; }
    .content-table { width: 100%; min-width: 820px; border-collapse: collapse; table-layout: fixed; }
    .content-table th:nth-child(1) { width: 42%; } .content-table th:nth-child(2) { width: 12%; } .content-table th:nth-child(3) { width: 13%; } .content-table th:nth-child(4) { width: 15%; } .content-table th:nth-child(5) { width: 18%; }
    th, td { padding: .85rem 1rem; text-align: left; border-bottom: 1px solid #e4ebf4; }
    thead { background: #edf3fb; color: #142d50; }
    thead th { font-size: .78rem; }
    td { color: #526b8a; } td strong, td small { display: block; } td strong { color: #142d50; } td small { max-width: 430px; margin-top: .2rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #71839a; }
    .group-row th { padding: .55rem 1rem; background: #f7faff; color: #31547f; font-size: .75rem; text-transform: uppercase; letter-spacing: .08em; }
    .type-badge, .status { display: inline-flex; padding: .3rem .6rem; border-radius: 7px; font-size: .75rem; font-weight: 800; }
    .type-badge.pdf { color: #ba3037; background: #ffe8e9; } .type-badge.office { color: #145ac7; background: #e7f1ff; } .type-badge.link { color: #17639e; background: #e4f4ff; }
    .status { color: #19743c; background: #ddf7e5; } .status.inactive { color: #687180; background: #edf0f4; }
    .table-actions { display: flex; align-items: center; justify-content: flex-start; gap: .55rem; white-space: nowrap; } .table-actions a { min-height: 36px; display: inline-flex; align-items: center; padding: .4rem .7rem; border: 1px solid #c7d9ef; border-radius: 7px; color: #145fd1; background: white; font-weight: 800; }
    .danger { border: 1px solid #efb7bd; border-radius: 10px; padding: .48rem .65rem; color: #a02e3c; background: #fff5f6; font-weight: 800; cursor: pointer; }
    .empty { color: #61758d; }
    @media (max-width: 760px) { .content-header { align-items: start; flex-direction: column; } .new-content { width: 100%; } .form-grid { grid-template-columns: 1fr; align-content: start; } }
  `
})
export class AdminContentManagementPageComponent {
  private readonly content = inject(ContentManagementService);

  protected readonly documents = signal<ManagedContentDocument[]>([]);
  protected readonly links = signal<ManagedContentLink[]>([]);
  protected readonly showCreatePanel = signal(false);
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
      this.showCreatePanel.set(false);
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
      this.showCreatePanel.set(false);
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
