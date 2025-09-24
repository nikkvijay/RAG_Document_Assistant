export interface Document {
  id: string;
  filename: string;
  originalName: string;
  size: number;
  uploadedAt: Date;
  chunksCount: number;
  status: DocumentStatus;
  processingProgress?: number;
}

export enum DocumentStatus {
  UPLOADING = 'uploading',
  PROCESSING = 'processing',
  READY = 'ready',
  ERROR = 'error'
}

export interface UploadProgress {
  filename: string;
  progress: number;
  status: DocumentStatus;
  error?: string;
}

export interface DocumentUploadResponse {
  success: boolean;
  chunksCount: number;
  message: string;
  filename?: string;
  documentId?: string;
}