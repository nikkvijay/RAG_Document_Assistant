import { Component, signal, computed, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';

import { DocumentUploadComponent } from './components/document-upload/document-upload.component';
import { ChatComponent } from './components/chat/chat.component';
import { InsightsComponent } from './components/insights/insights.component';
import { CommandPaletteComponent } from './components/command-palette/command-palette.component';
import { ApiService } from './services/api.service';

export type AppView = 'chat' | 'upload' | 'insights';

export interface UploadedDocument {
  id: string;
  name: string;
  type: string;
  chunksCount: number;
  sizeKB?: number;
  uploadedAt: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    HttpClientModule,
    DocumentUploadComponent,
    ChatComponent,
    InsightsComponent,
    CommandPaletteComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
  providers: [ApiService]
})
export class App implements OnInit {
  currentView = signal<AppView>('chat');
  documents = signal<UploadedDocument[]>([]);
  activeDocumentId = signal<string | null>(null);
  isIndexReady = signal(false);

  showSearch        = signal(false);
  showNotifications = signal(false);
  newThreadTrigger  = signal(0);
  uploadMode        = signal<'replace' | 'append'>('append');
  sidebarCollapsed  = signal(false);

  toggleSidebar(): void { this.sidebarCollapsed.update(v => !v); }

  totalChunks = computed(() => this.documents().reduce((s, d) => s + d.chunksCount, 0));
  docCount    = computed(() => this.documents().length);

  statusLabel = computed(() => {
    switch (this.currentView()) {
      case 'chat':     return this.isIndexReady() ? 'Index Ready' : 'No Index';
      case 'upload':   return 'Awaiting Input';
      case 'insights': return `${this.docCount()} Sources Synced`;
    }
  });
  statusAmber = computed(() => this.currentView() === 'upload' || !this.isIndexReady());

  activeDocument = computed(() =>
    this.documents().find(d => d.id === this.activeDocumentId()) ?? this.documents()[0] ?? null
  );

  readonly notifications = [
    { dot: 'emerald', text: 'Index rebuilt successfully',     ago: '1h ago' },
    { dot: 'indigo',  text: 'New thread started',             ago: '14m ago' },
    { dot: 'amber',   text: 'Rate limit: 89/100 req used',    ago: '3h ago' },
    { dot: 'emerald', text: 'Document indexed successfully',   ago: '5h ago' },
  ];

  constructor(private apiService: ApiService) {}

  ngOnInit(): void { this.loadDocuments(); }

  // ── Global keyboard shortcuts ──────────────────────────────────────────────
  @HostListener('document:keydown', ['$event'])
  onGlobalKey(e: KeyboardEvent): void {
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key === 'k') { e.preventDefault(); this.showSearch.set(true); }
    if (mod && e.key === 'n') { e.preventDefault(); this.newThread(); }
    if (e.key === 'Escape')   { this.showSearch.set(false); this.showNotifications.set(false); }
  }

  // ── View ───────────────────────────────────────────────────────────────────
  switchView(view: AppView): void {
    this.currentView.set(view);
    this.showNotifications.set(false);
  }

  // ── Search / command palette ───────────────────────────────────────────────
  openSearch(): void  { this.showSearch.set(true); }
  closeSearch(): void { this.showSearch.set(false); }

  handlePaletteAction(id: string): void {
    if (id === 'new-chat')   { this.newThread(); }
    else if (id === 'upload'   ) { this.switchView('upload'); }
    else if (id === 'insights' ) { this.switchView('insights'); }
    else if (id === 'export'   ) { this.switchView('chat'); }   // chat component handles export
    else if (id === 'reset'    ) { this.resetIndex(); }
    else if (id.startsWith('doc:')) {
      const docId = id.slice(4);
      this.setActiveDocument(docId);
      this.switchView('chat');
    }
  }

  // ── Threads ────────────────────────────────────────────────────────────────
  newThread(): void {
    this.currentView.set('chat');
    this.newThreadTrigger.update(n => n + 1);
  }

  // ── Documents ─────────────────────────────────────────────────────────────
  onDocumentUploaded(response: any): void {
    const doc: UploadedDocument = {
      id: Date.now().toString(),
      name: response.file_name || response.filename || 'Document',
      type: 'pdf',
      chunksCount: response.chunks_count || 0,
      uploadedAt: new Date().toISOString(),
    };
    this.documents.update(docs => [doc, ...docs]);
    this.activeDocumentId.set(doc.id);
    this.isIndexReady.set(true);
    this.currentView.set('chat');
    setTimeout(() => this.loadDocuments(), 1200);
  }

  setActiveDocument(id: string): void { this.activeDocumentId.set(id); }

  addSourceClicked(): void {
    this.uploadMode.set('append');
    this.currentView.set('upload');
  }

  replaceDocument(): void {
    this.uploadMode.set('replace');
    this.currentView.set('upload');
  }

  private resetIndex(): void {
    this.apiService.resetSystem().subscribe({
      next: () => {
        this.documents.set([]);
        this.activeDocumentId.set(null);
        this.isIndexReady.set(false);
        this.newThreadTrigger.update(n => n + 1);
      },
      error: () => {}
    });
  }

  private loadDocuments(): void {
    this.apiService.getDocuments().subscribe({
      next: (response) => {
        if (response?.documents?.length) {
          const mapped = response.documents.map((d: any, i: number) => ({
            id: d.id ?? String(i),
            name: d.file_name ?? d.fileName ?? 'Document',
            type: 'pdf',
            chunksCount: d.chunks_count ?? d.chunksCount ?? 0,
            uploadedAt: d.uploaded_at ?? d.uploadedAt ?? new Date().toISOString(),
          }));
          this.documents.set(mapped);
          this.isIndexReady.set(true);
          if (!this.activeDocumentId() && mapped.length) {
            this.activeDocumentId.set(mapped[0].id);
          }
        }
      },
      error: () => {}
    });
  }

  trackByDoc(_: number, doc: UploadedDocument): string { return doc.id; }

  readonly healthBars = [
    ...Array.from({length: 8},  (_, i) => ({ cls: 'high', h: 12 + (i % 3) * 3 })),
    ...Array.from({length: 8},  (_, i) => ({ cls: 'med',  h: 8  + (i % 4) * 2 })),
    ...Array.from({length: 8},  (_, i) => ({ cls: 'low',  h: 4  + (i % 3) * 2 })),
  ];
}
