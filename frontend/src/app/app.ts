import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';

import { DocumentUploadComponent } from './components/document-upload/document-upload.component';
import { ChatComponent } from './components/chat/chat.component';
import { ApiService } from './services/api.service';

interface UploadedDocument {
  name: string;
  chunksCount: number;
  uploadedAt: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    HttpClientModule,
    DocumentUploadComponent,
    ChatComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
  providers: [ApiService]
})

export class App {
  protected readonly title = signal('RAG Assistant');

  // State management
  documentsUploaded = signal(false);
  uploadedDocuments = signal<UploadedDocument[]>([]);
  documentCount = signal(0);

  constructor(private apiService: ApiService) {
    // Load existing documents on startup
    this.loadDocuments();
  }

  onDocumentUploaded(response: any) {
    this.documentsUploaded.set(true);

    // Add new document to the list
    if (response.fileName) {
      const newDoc: UploadedDocument = {
        name: response.fileName,
        chunksCount: response.chunksCount,
        uploadedAt: new Date().toISOString()
      };

      this.uploadedDocuments.update(docs => [...docs, newDoc]);
      this.documentCount.update(count => count + 1);
    }

    // Refresh document list from backend
    setTimeout(() => this.loadDocuments(), 1000);
  }

  private loadDocuments() {
    this.apiService.getDocuments().subscribe({
      next: (response) => {
        if (response.documents) {
          this.uploadedDocuments.set(response.documents.map((doc: any) => ({
            name: doc.fileName,
            chunksCount: doc.chunksCount,
            uploadedAt: doc.uploadedAt
          })));
          this.documentCount.set(response.totalDocuments);
          this.documentsUploaded.set(response.totalDocuments > 0);
        }
      },
      error: (error) => {
        console.warn('Could not load documents:', error);
      }
    });
  }

  trackByDocument(index: number, doc: UploadedDocument): string {
    return doc.name + doc.uploadedAt;
  }
}
