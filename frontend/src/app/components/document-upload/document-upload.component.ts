import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpEventType } from '@angular/common/http';

import { ApiService } from '../../services/api.service';
import { DocumentUploadResponse } from '../../models/document.model';

@Component({
  selector: 'app-document-upload',
  standalone: true,
  imports: [CommonModule],
  template: `
<div class="upload-view">

  <!-- Hero area -->
  <div class="upload-hero">
    <div class="upload-eyebrow">SOURCE MANAGEMENT</div>
    <h1 class="upload-title">Bring your documents <em>into focus.</em></h1>
    <p class="upload-sub">Upload PDFs, Word docs, or markdown files. Your documents are chunked, embedded, and indexed so you can ask precise questions grounded in the actual text.</p>
  </div>

  <!-- Drop zone -->
  <div
    class="drop-zone"
    [class.dragover]="isDragOver"
    [class.uploading]="isUploading"
    (dragover)="onDragOver($event)"
    (dragenter)="onDragEnter($event)"
    (dragleave)="onDragLeave($event)"
    (drop)="onDrop($event)"
    (click)="triggerFileInput()"
    role="button"
    tabindex="0"
    aria-label="Upload area — drag and drop files here or click to browse"
    (keydown.enter)="triggerFileInput()"
    (keydown.space)="triggerFileInput()">

    <div class="drop-icon-tile">
      <svg *ngIf="!isUploading" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
      </svg>
      <div *ngIf="isUploading" class="upload-spin"></div>
    </div>

    <div class="drop-primary">
      {{ isDragOver ? 'Drop to upload' : (isUploading ? 'Processing…' : 'Drag & drop files, or browse local') }}
    </div>
    <div class="drop-secondary" *ngIf="!isUploading">
      Your document will be chunked and embedded automatically
    </div>

    <div class="drop-spec-pills">
      <span class="spec-pill">PDF · DOCX · MD · TXT</span>
      <span class="spec-pill">Max 10 MB</span>
      <span class="spec-pill">OCR available</span>
    </div>
  </div>

  <!-- Hidden input -->
  <input
    #fileInput
    type="file"
    accept=".pdf,.docx,.md,.txt"
    multiple
    style="display:none"
    (change)="onFileSelected($event)"
  >

  <!-- Upload progress widget -->
  <div class="progress-widget" *ngIf="isUploading && uploadFile">
    <div class="pw-icon">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
      </svg>
    </div>
    <div class="pw-body">
      <div class="pw-name">{{ uploadFile.name }}</div>
      <div class="pw-bar-row">
        <div class="pw-bar">
          <div class="pw-fill" [style.width.%]="uploadProgress"></div>
        </div>
        <span class="pw-pct">{{ uploadProgress }}%</span>
      </div>
      <div class="pw-stage">
        <span class="pw-dot" [class.pulse]="isUploading"></span>
        {{ uploadStage }}
      </div>
    </div>
  </div>

  <!-- Error -->
  <div class="upload-error" *ngIf="errorMessage">
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
    </svg>
    {{ errorMessage }}
  </div>

  <!-- Success -->
  <div class="upload-success" *ngIf="successMessage">
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
    </svg>
    {{ successMessage }}
  </div>

  <!-- Quick prompt chips -->
  <div class="quick-section">
    <div class="quick-label">SUGGESTED ACTIONS</div>
    <div class="quick-chips">
      <span class="qp-chip">📄 Summarize a 10-K</span>
      <span class="qp-chip">⚖️ Check policy compliance</span>
      <span class="qp-chip">📊 Extract key metrics</span>
      <span class="qp-chip">🔗 Cross-document Q&amp;A</span>
    </div>
  </div>

</div>
  `,
  styles: [`
    .upload-view {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 48px 40px 32px;
      gap: 24px;
      overflow-y: auto;
      height: 100%;
    }

    /* Hero */
    .upload-hero {
      text-align: center;
      max-width: 540px;
    }
    .upload-eyebrow {
      font-family: var(--font-mono);
      font-size: 10.5px;
      font-weight: 500;
      letter-spacing: 0.16em;
      color: var(--indigo);
      margin-bottom: 12px;
    }
    .upload-title {
      font-family: var(--font-serif);
      font-size: 44px;
      line-height: 1.05;
      letter-spacing: -0.02em;
      color: var(--ink);
      margin-bottom: 14px;
    }
    .upload-title em {
      font-style: italic;
      color: var(--indigo);
    }
    .upload-sub {
      font-size: 15px;
      color: var(--ink-2);
      line-height: 1.6;
      max-width: 480px;
      margin: 0 auto;
    }

    /* Drop zone */
    .drop-zone {
      width: 100%;
      max-width: 540px;
      border: 1px dashed var(--line-strong);
      border-radius: 16px;
      padding: 36px 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      transition: border-color 0.15s, background 0.15s;
      text-align: center;
    }
    .drop-zone:hover, .drop-zone:focus-visible {
      border-color: rgba(192,193,255,0.4);
      background: var(--indigo-bg);
      outline: none;
    }
    .drop-zone.dragover {
      border-color: var(--indigo);
      background: var(--indigo-bg-2);
    }
    .drop-zone.uploading { cursor: default; pointer-events: none; }

    .drop-icon-tile {
      width: 44px; height: 44px;
      background: var(--surface-3);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--ink-3);
      margin-bottom: 4px;
    }
    .drop-icon-tile svg { width: 22px; height: 22px; stroke-width: 1.6; }

    .upload-spin {
      width: 22px; height: 22px;
      border: 2px solid var(--indigo-bg-2);
      border-top-color: var(--indigo-2);
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }

    .drop-primary {
      font-size: 16px;
      font-weight: 500;
      color: var(--ink);
    }
    .drop-secondary {
      font-size: 13px;
      color: var(--ink-3);
    }
    .drop-spec-pills {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      justify-content: center;
      margin-top: 4px;
    }
    .spec-pill {
      font-family: var(--font-mono);
      font-size: 10.5px;
      color: var(--ink-3);
      background: var(--surface-3);
      border: 1px solid var(--line);
      padding: 3px 8px;
      border-radius: var(--r-pill);
    }

    /* Progress widget */
    .progress-widget {
      width: 100%;
      max-width: 540px;
      background: var(--surface-2);
      border: 1px solid var(--line-2);
      border-radius: var(--r-lg);
      padding: 12px 14px;
      display: flex;
      gap: 12px;
      align-items: flex-start;
    }
    .pw-icon {
      width: 36px; height: 36px;
      background: var(--surface-3);
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--rose);
      flex-shrink: 0;
    }
    .pw-icon svg { width: 18px; height: 18px; stroke-width: 1.6; }
    .pw-body { flex: 1; min-width: 0; }
    .pw-name { font-size: 12.5px; font-weight: 500; color: var(--ink); margin-bottom: 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .pw-bar-row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
    .pw-bar { flex: 1; height: 4px; background: var(--surface-4); border-radius: 2px; overflow: hidden; }
    .pw-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--indigo-2), var(--violet));
      border-radius: 2px;
      transition: width 0.4s ease;
      box-shadow: 0 0 8px rgba(128,131,255,0.4);
    }
    .pw-pct { font-family: var(--font-mono); font-size: 13px; font-weight: 600; color: var(--indigo); min-width: 36px; text-align: right; }
    .pw-stage { display: flex; align-items: center; gap: 6px; font-family: var(--font-mono); font-size: 10.5px; color: var(--indigo); }
    .pw-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--indigo-2); }
    .pw-dot.pulse { animation: pulse-dot 1.6s ease-in-out infinite; }

    /* Messages */
    .upload-error {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 14px;
      background: rgba(255,154,162,0.08);
      border: 1px solid rgba(255,154,162,0.2);
      border-radius: var(--r-md);
      font-size: 13px;
      color: var(--rose);
      max-width: 540px;
      width: 100%;
    }
    .upload-error svg { width: 16px; height: 16px; flex-shrink: 0; }
    .upload-success {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 14px;
      background: rgba(110,231,183,0.08);
      border: 1px solid rgba(110,231,183,0.2);
      border-radius: var(--r-md);
      font-size: 13px;
      color: var(--emerald);
      max-width: 540px;
      width: 100%;
    }
    .upload-success svg { width: 16px; height: 16px; flex-shrink: 0; }

    /* Quick prompts */
    .quick-section { width: 100%; max-width: 540px; }
    .quick-label {
      font-family: var(--font-mono);
      font-size: 10px;
      letter-spacing: 0.12em;
      color: var(--ink-4);
      margin-bottom: 8px;
    }
    .quick-chips { display: flex; flex-wrap: wrap; gap: 8px; }
    .qp-chip {
      padding: 7px 14px;
      border-radius: var(--r-pill);
      background: var(--surface-2);
      border: 1px solid var(--line-2);
      font-size: 13px;
      color: var(--ink-2);
      cursor: default;
    }
  `]
})
export class DocumentUploadComponent {
  @Input()  uploadMode: 'replace' | 'append' = 'append';
  @Output() uploadComplete = new EventEmitter<DocumentUploadResponse>();

  isDragOver = false;
  isUploading = false;
  uploadProgress = 0;
  uploadFile: File | null = null;
  uploadStage = 'UPLOADING';
  successMessage = '';
  errorMessage = '';

  constructor(private apiService: ApiService) {}

  onDragOver(event: DragEvent): void { event.preventDefault(); event.stopPropagation(); }

  onDragEnter(event: DragEvent): void {
    event.preventDefault(); event.stopPropagation();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault(); event.stopPropagation();
    const ct = event.currentTarget as HTMLElement;
    if (!ct.contains(event.relatedTarget as Node)) this.isDragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault(); event.stopPropagation();
    this.isDragOver = false;
    const files = event.dataTransfer?.files;
    if (files?.length) this.handleFiles(files);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) this.handleFiles(input.files);
    input.value = '';
  }

  triggerFileInput(): void {
    const el = document.querySelector('input[type="file"]') as HTMLInputElement;
    el?.click();
  }

  private handleFiles(files: FileList): void {
    const file = files[0];
    if (this.validateFile(file)) this.doUpload(file);
  }

  private validateFile(file: File): boolean {
    this.errorMessage = '';
    const allowed = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/markdown', 'text/plain'];
    if (!allowed.includes(file.type) && !file.name.match(/\.(pdf|docx|md|txt)$/i)) {
      this.errorMessage = 'Unsupported file type. Use PDF, DOCX, MD, or TXT.';
      return false;
    }
    if (file.size > 10 * 1024 * 1024) {
      this.errorMessage = 'File must be under 10 MB.';
      return false;
    }
    return true;
  }

  private doUpload(file: File): void {
    this.isUploading = true;
    this.uploadFile = file;
    this.uploadProgress = 0;
    this.successMessage = '';
    this.errorMessage = '';
    this.uploadStage = 'UPLOADING · PARSING';

    const stages = ['PARSING · CHUNKING', 'CHUNKING · EMBEDDING', 'VECTORIZING CHUNKS', 'INDEXING'];
    let stageIdx = 0;
    const stageTimer = setInterval(() => {
      if (stageIdx < stages.length) {
        this.uploadStage = stages[stageIdx++];
      }
    }, 800);

    this.apiService.uploadDocument(file, this.uploadMode).subscribe({
      next: (event) => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          this.uploadProgress = Math.round(80 * event.loaded / event.total);
        } else if (event.type === HttpEventType.Response) {
          clearInterval(stageTimer);
          this.uploadProgress = 100;
          this.isUploading = false;

          if (event.body?.success) {
            this.successMessage = `Indexed ${event.body.chunks_count} chunks from "${file.name}".`;
            this.uploadComplete.emit(event.body);
          } else {
            this.errorMessage = event.body?.message ?? 'Upload failed';
          }
        }
      },
      error: (err) => {
        clearInterval(stageTimer);
        this.isUploading = false;
        this.uploadProgress = 0;
        this.errorMessage = err.error?.error?.message ?? 'Upload failed. Please try again.';
      }
    });
  }
}
