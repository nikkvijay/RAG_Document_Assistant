import { Injectable } from '@angular/core';
import { HttpClient, HttpEvent, HttpRequest } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';

export interface DocumentUploadResponse {
  success: boolean;
  chunksCount: number;
  message: string;
  filename?: string;
}

export interface QueryResponse {
  success: boolean;
  answer: string;
  sourceDocuments: any[];
  metadata: {
    question: string;
    timestamp: string;
    sourcesCount: number;
  };
}

export interface HealthResponse {
  success: boolean;
  status: string;
  timestamp: string;
  uptime: number;
  ragStatus: {
    isReady: boolean;
    documentsCount: number;
    hasRetriever: boolean;
    hasChain: boolean;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly apiUrl = environment.apiUrl;
  private uploadProgressSubject = new BehaviorSubject<number>(0);

  uploadProgress$ = this.uploadProgressSubject.asObservable();

  constructor(private http: HttpClient) {}

  // Health check
  checkHealth(): Observable<HealthResponse> {
    return this.http.get<HealthResponse>(`${this.apiUrl}/health`);
  }

  // Document upload with progress tracking
  uploadDocument(file: File, mode: 'replace' | 'append' = 'replace'): Observable<HttpEvent<DocumentUploadResponse>> {
    const formData = new FormData();
    formData.append('document', file);
    formData.append('mode', mode);

    const request = new HttpRequest('POST', `${this.apiUrl}/documents/upload`, formData, {
      reportProgress: true
    });

    return this.http.request<DocumentUploadResponse>(request);
  }

  // Simple document upload
  uploadDocumentSimple(file: File, mode: 'replace' | 'append' = 'replace'): Observable<DocumentUploadResponse> {
    const formData = new FormData();
    formData.append('document', file);
    formData.append('mode', mode);

    return this.http.post<DocumentUploadResponse>(`${this.apiUrl}/documents/upload`, formData);
  }

  // Query documents
  queryDocuments(question: string): Observable<QueryResponse> {
    return this.http.post<QueryResponse>(`${this.apiUrl}/chat/query`, { question });
  }

  // Get uploaded documents list
  getDocuments(): Observable<any> {
    return this.http.get(`${this.apiUrl}/documents`);
  }

  // Reset RAG system
  resetSystem(): Observable<any> {
    return this.http.post(`${this.apiUrl}/documents/reset`, {});
  }

  // Get system status
  getSystemStatus(): Observable<any> {
    return this.http.get(`${this.apiUrl}/documents/status`);
  }
}