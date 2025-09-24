import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpEventType } from '@angular/common/http';

import { ApiService } from '../../services/api.service';
import { DocumentUploadResponse } from '../../models/document.model';

@Component({
  selector: 'app-document-upload',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="upload-container">
      <!-- Main Upload Area -->
      <div
        class="upload-area"
        [class.dragover]="isDragOver"
        [class.uploading]="isUploading"
        [class.success]="successMessage"
        (dragover)="onDragOver($event)"
        (dragenter)="onDragEnter($event)"
        (dragleave)="onDragLeave($event)"
        (drop)="onDrop($event)"
        (click)="triggerFileInput()"
      >
        <!-- Upload Content -->
        <div class="upload-content">
          <!-- Icon -->
          <div class="upload-icon mb-4">
            <!-- Default Upload Icon -->
            <svg *ngIf="!isUploading && !successMessage"
                 class="w-12 h-12 text-gray-400"
                 fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
            </svg>

            <!-- Loading Spinner -->
            <div *ngIf="isUploading" class="upload-spinner">
              <div class="spinner-ring"></div>
              <svg class="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
            </div>

            <!-- Success Icon -->
            <svg *ngIf="successMessage && !isUploading"
                 class="w-16 h-16 text-green-500"
                 fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>

          <!-- Text Content -->
          <div class="upload-text text-center">
            <h3 class="text-lg font-semibold text-gray-900 mb-2">
              <span *ngIf="!isUploading && !successMessage">Drop PDF files here</span>
              <span *ngIf="isUploading">Processing...</span>
              <span *ngIf="successMessage && !isUploading">Upload Complete!</span>
            </h3>

            <p class="text-gray-600 mb-4">
              <span *ngIf="!isUploading && !successMessage">
                Drag and drop your PDF files here, or
                <span class="text-indigo-600 cursor-pointer">click to browse</span>
              </span>
              <span *ngIf="isUploading">Processing document...</span>
              <span *ngIf="successMessage && !isUploading">Document ready!</span>
            </p>

            <!-- Progress Bar -->
            <div *ngIf="isUploading" class="progress-container mb-6">
              <div class="progress-bar">
                <div class="progress-fill" [style.width.%]="uploadProgress"></div>
              </div>
              <div class="flex justify-between text-sm text-gray-600 mt-2">
                <span>Uploading & Processing...</span>
                <span>{{ uploadProgress }}%</span>
              </div>
            </div>

            <!-- Upload Button -->
            <button
              *ngIf="!isUploading && !successMessage"
              type="button"
              class="upload-btn"
              (click)="triggerFileInput(); $event.stopPropagation()"
            >
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
              Choose PDF Files
            </button>

            <!-- Upload Another Button -->
            <button
              *ngIf="successMessage && !isUploading"
              type="button"
              class="upload-btn-secondary"
              (click)="resetUpload(); triggerFileInput(); $event.stopPropagation()"
            >
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
              </svg>
              Upload Another
            </button>
          </div>
        </div>

        <!-- Drag Overlay -->
        <div *ngIf="isDragOver" class="drag-overlay">
          <div class="drag-content">
            <svg class="w-20 h-20 text-indigo-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
            </svg>
            <p class="text-xl font-semibold text-indigo-600">Drop files to upload</p>
          </div>
        </div>
      </div>

      <!-- Hidden File Input -->
      <input
        #fileInput
        type="file"
        accept=".pdf"
        multiple
        style="display: none"
        (change)="onFileSelected($event)"
      >

      <!-- Messages -->
      <div class="mt-4 space-y-3">
        <!-- Success Message -->
        <div *ngIf="successMessage" class="success-message">
          <div class="flex items-start">
            <svg class="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
            <div>
              <p class="font-medium text-green-800">{{ successMessage }}</p>
              <p class="text-sm text-green-600 mt-1">You can now start asking questions about your document.</p>
            </div>
          </div>
        </div>

        <!-- Error Message -->
        <div *ngIf="errorMessage" class="error-message">
          <div class="flex items-start">
            <svg class="w-5 h-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <div>
              <p class="font-medium text-red-800">Upload Failed</p>
              <p class="text-sm text-red-600 mt-1">{{ errorMessage }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- File Requirements -->
      <div class="upload-info mt-6">
        <div class="bg-gray-50 rounded-lg p-4">
          <h4 class="text-sm font-medium text-gray-900 mb-2">File Requirements:</h4>
          <ul class="text-sm text-gray-600 space-y-1">
            <li class="flex items-center">
              <svg class="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
              PDF files only
            </li>
            <li class="flex items-center">
              <svg class="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
              Maximum size: 10MB per file
            </li>
            <li class="flex items-center">
              <svg class="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
              Text-based PDFs work best
            </li>
          </ul>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .upload-container {
      @apply w-full;
    }

    .upload-area {
      @apply relative border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer transition-colors;
      min-height: 200px;
    }

    .upload-area:hover {
      @apply border-indigo-400 bg-indigo-50;
    }

    .upload-area.dragover {
      @apply border-indigo-500 bg-indigo-100;
    }

    .upload-area.uploading {
      @apply cursor-not-allowed border-blue-400 bg-blue-50;
    }

    .upload-area.success {
      @apply border-green-400 bg-green-50;
    }

    .upload-content {
      @apply flex flex-col items-center justify-center h-full relative z-10;
    }

    .upload-spinner {
      @apply relative w-16 h-16 flex items-center justify-center;
    }

    .spinner-ring {
      @apply absolute w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin;
    }

    .upload-btn {
      @apply inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all duration-200 font-medium shadow-sm hover:shadow-md;
    }

    .upload-btn-secondary {
      @apply inline-flex items-center px-6 py-3 bg-white text-indigo-600 border-2 border-indigo-600 rounded-lg hover:bg-indigo-50 transition-all duration-200 font-medium;
    }

    .progress-container {
      @apply w-full max-w-sm;
    }

    .progress-bar {
      @apply w-full bg-gray-200 rounded-full h-3 overflow-hidden;
    }

    .progress-fill {
      @apply bg-gradient-to-r from-indigo-500 to-blue-600 h-3 rounded-full transition-all duration-500 ease-out;
    }

    .success-message {
      @apply p-4 bg-green-50 border border-green-200 rounded-lg;
    }

    .error-message {
      @apply p-4 bg-red-50 border border-red-200 rounded-lg;
    }

    .drag-overlay {
      @apply absolute inset-0 bg-indigo-600 bg-opacity-90 rounded-xl flex items-center justify-center z-20;
    }

    .drag-content {
      @apply text-center text-white;
    }

    /* Animation for drag over */
    .upload-area.dragover .upload-icon svg {
      @apply text-indigo-500;
      animation: bounce 1s infinite;
    }

    @keyframes bounce {
      0%, 20%, 50%, 80%, 100% {
        transform: translateY(0);
      }
      40% {
        transform: translateY(-10px);
      }
      60% {
        transform: translateY(-5px);
      }
    }
  `]
})
export class DocumentUploadComponent {
  @Output() uploadComplete = new EventEmitter<DocumentUploadResponse>();

  isDragOver = false;
  isUploading = false;
  uploadProgress = 0;
  successMessage = '';
  errorMessage = '';

  constructor(private apiService: ApiService) {}

  // Enhanced drag & drop methods
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  onDragEnter(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();

    // Only set isDragOver to false if we're leaving the upload area entirely
    const target = event.target as HTMLElement;
    const currentTarget = event.currentTarget as HTMLElement;

    if (!currentTarget.contains(event.relatedTarget as Node)) {
      this.isDragOver = false;
    }
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFiles(files);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (files && files.length > 0) {
      this.handleFiles(files);
    }
    // Reset input value to allow selecting the same file again
    input.value = '';
  }

  triggerFileInput(): void {
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  resetUpload(): void {
    this.successMessage = '';
    this.errorMessage = '';
    this.uploadProgress = 0;
  }

  private handleFiles(files: FileList): void {
    // For now, handle one file at a time
    if (files.length > 0) {
      const file = files[0];
      if (this.validateFile(file)) {
        this.uploadFile(file);
      }
    }
  }

  private validateFile(file: File): boolean {
    this.errorMessage = '';

    if (file.type !== 'application/pdf') {
      this.errorMessage = 'Only PDF files are allowed';
      return false;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB
      this.errorMessage = 'File size must be less than 10MB';
      return false;
    }

    return true;
  }

  private uploadFile(file: File): void {
    this.isUploading = true;
    this.uploadProgress = 0;
    this.successMessage = '';
    this.errorMessage = '';

    this.apiService.uploadDocument(file).subscribe({
      next: (event) => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          this.uploadProgress = Math.round(100 * event.loaded / event.total);
        } else if (event.type === HttpEventType.Response) {
          this.isUploading = false;
          this.uploadProgress = 100;

          if (event.body?.success) {
            this.successMessage = `Document uploaded successfully! Processed ${event.body.chunksCount} chunks.`;
            this.uploadComplete.emit(event.body);
          } else {
            this.errorMessage = event.body?.message || 'Upload failed';
          }
        }
      },
      error: (error) => {
        this.isUploading = false;
        this.uploadProgress = 0;
        this.errorMessage = error.error?.error?.message || 'Upload failed. Please try again.';
      }
    });
  }
}