import { Injectable } from '@angular/core';
import { HttpClient, HttpEvent, HttpRequest } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';

export interface DocumentUploadResponse {
  success: boolean;
  chunks_count: number;   // snake_case from FastAPI
  message: string;
  file_name?: string;
  filename?: string;      // original multipart filename
}

export interface QueryResponse {
  success: boolean;
  answer: string;
  source_documents: SourceDoc[];
  metadata: {
    question: string;
    timestamp: string;
    sources_count: number;
    documents_used: number;
    document_sources: string[];
    total_documents_available: number;
    // Self-healing loop fields
    critique_verdict?: 'grounded' | 'hallucinated' | 'insufficient';
    critique_reason?: string;
    iterations_used?: number;
    is_safe_fallback?: boolean;
  };
}

export interface SourceDoc {
  page_content: string;
  metadata: {
    source?: string;
    page?: number;
    chunk_index?: number;
    relevance?: number;
    [key: string]: any;
  };
}

export interface HealthResponse {
  success: boolean;
  status: string;
  timestamp: string;
  uptime_seconds: number;
  rag_status: {
    is_ready: boolean;
    documents_count: number;
    has_retriever: boolean;
    has_model: boolean;
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

  // Get insights dashboard data
  getInsights(): Observable<InsightsResponse> {
    return this.http.get<InsightsResponse>(`${this.apiUrl}/insights`);
  }
}

export interface InsightsResponse {
  success: boolean;
  documents_count: number;
  total_chunks: number;
  documents: { file_name: string; chunks_count: number; uploaded_at: string }[];
  query_stats: {
    total_7d: number;
    total_30d: number;
    total_all: number;
    daily_counts: number[];         // 7 values, oldest → newest
    avg_chunks_per_query: number;
  };
  top_topics: { name: string; count: number; pct: number }[];
  activity: { level: string; message: string; ago: string; timestamp: string }[];
}