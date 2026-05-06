import {
  Component, Output, EventEmitter, Input,
  ElementRef, ViewChild, AfterViewInit, HostListener, OnChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UploadedDocument } from '../../app';

export interface PaletteAction {
  id: string;
  icon: string;      // SVG path d string OR emoji
  label: string;
  sub?: string;
  kbd?: string;
  type: 'action' | 'document' | 'thread';
}

@Component({
  selector: 'app-command-palette',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
<div class="palette-backdrop" (click)="close.emit()" (keydown.escape)="close.emit()">
  <div class="palette-dialog" (click)="$event.stopPropagation()" role="dialog" aria-label="Command palette" aria-modal="true">

    <!-- Search input -->
    <div class="palette-search-row">
      <svg class="palette-search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
      </svg>
      <input
        #searchInput
        class="palette-input"
        [(ngModel)]="query"
        (ngModelChange)="onQuery()"
        placeholder="Search documents, actions…"
        aria-label="Search"
        autocomplete="off"
        spellcheck="false"
      >
      <kbd class="palette-esc-hint">ESC</kbd>
    </div>

    <!-- Results -->
    <div class="palette-results" *ngIf="results.length > 0">
      <div
        *ngFor="let r of results; let i = index"
        class="palette-item"
        [class.selected]="i === selectedIdx"
        (mouseenter)="selectedIdx = i"
        (click)="pick(r)">
        <span class="pi-icon">
          <ng-container *ngIf="r.type === 'document'">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
          </ng-container>
          <ng-container *ngIf="r.type === 'action'">{{ r.icon }}</ng-container>
          <ng-container *ngIf="r.type === 'thread'">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"/></svg>
          </ng-container>
        </span>
        <span class="pi-label">{{ r.label }}</span>
        <span class="pi-sub" *ngIf="r.sub">{{ r.sub }}</span>
        <kbd class="pi-kbd" *ngIf="r.kbd">{{ r.kbd }}</kbd>
        <svg class="pi-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 18l6-6-6-6"/>
        </svg>
      </div>
    </div>

    <!-- Empty -->
    <div *ngIf="results.length === 0 && query.length > 0" class="palette-empty">
      No results for "{{ query }}"
    </div>

    <!-- Footer -->
    <div class="palette-footer">
      <span><kbd>↑↓</kbd> navigate</span>
      <span><kbd>↵</kbd> select</span>
      <span><kbd>ESC</kbd> close</span>
    </div>
  </div>
</div>
  `,
  styles: [`
    .palette-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.6);
      backdrop-filter: blur(6px);
      z-index: 1000;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding-top: 80px;
    }
    .palette-dialog {
      width: 100%;
      max-width: 560px;
      background: var(--surface-2);
      border: 1px solid var(--line-strong);
      border-radius: 16px;
      box-shadow: 0 24px 64px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04) inset;
      overflow: hidden;
    }
    .palette-search-row {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 14px 16px;
      border-bottom: 1px solid var(--line);
    }
    .palette-search-icon {
      width: 18px; height: 18px;
      color: var(--ink-3);
      flex-shrink: 0;
      stroke-width: 1.6;
    }
    .palette-input {
      flex: 1;
      background: transparent;
      border: none;
      outline: none;
      font-family: var(--font-ui);
      font-size: 15px;
      color: var(--ink);
    }
    .palette-input::placeholder { color: var(--ink-4); }
    .palette-esc-hint {
      font-family: var(--font-mono);
      font-size: 10px;
      color: var(--ink-4);
      background: var(--surface-4);
      border: 1px solid var(--line-2);
      padding: 2px 6px;
      border-radius: 4px;
    }
    .palette-results { padding: 6px; max-height: 320px; overflow-y: auto; }
    .palette-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 9px 10px;
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.1s;
    }
    .palette-item.selected { background: var(--indigo-bg); }
    .pi-icon {
      width: 28px; height: 28px;
      background: var(--surface-3);
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--ink-2);
      font-size: 14px;
      flex-shrink: 0;
    }
    .pi-icon svg { width: 15px; height: 15px; stroke-width: 1.6; }
    .pi-label { flex: 1; font-size: 13.5px; color: var(--ink); }
    .pi-sub { font-family: var(--font-mono); font-size: 10.5px; color: var(--ink-4); }
    .pi-kbd {
      font-family: var(--font-mono);
      font-size: 10px;
      color: var(--ink-4);
      background: var(--surface-4);
      border: 1px solid var(--line-2);
      padding: 2px 6px;
      border-radius: 4px;
    }
    .pi-arrow { width: 14px; height: 14px; color: var(--ink-4); stroke-width: 2; opacity: 0; }
    .palette-item.selected .pi-arrow { opacity: 1; }
    .palette-empty {
      padding: 24px;
      text-align: center;
      font-size: 13px;
      color: var(--ink-3);
    }
    .palette-footer {
      display: flex;
      gap: 16px;
      padding: 8px 16px;
      border-top: 1px solid var(--line);
      font-family: var(--font-mono);
      font-size: 10.5px;
      color: var(--ink-4);
    }
    .palette-footer kbd {
      background: var(--surface-4);
      border: 1px solid var(--line-2);
      border-radius: 3px;
      padding: 1px 5px;
      margin-right: 4px;
    }
  `]
})
export class CommandPaletteComponent implements AfterViewInit, OnChanges {
  @Input() documents: UploadedDocument[] = [];
  @Output() close = new EventEmitter<void>();
  @Output() action = new EventEmitter<string>();

  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

  query = '';
  selectedIdx = 0;
  results: PaletteAction[] = [];

  private readonly defaultActions: PaletteAction[] = [
    { id: 'new-chat',   icon: '💬', label: 'New Chat Thread',       kbd: '⌘N', type: 'action' },
    { id: 'upload',     icon: '📤', label: 'Upload Document',        sub: 'Add a new source', type: 'action' },
    { id: 'insights',   icon: '📊', label: 'Open Insights',          type: 'action' },
    { id: 'export',     icon: '⬇️', label: 'Export Current Thread',  type: 'action' },
    { id: 'reset',      icon: '🔄', label: 'Reset Index',            sub: 'Clear all documents', type: 'action' },
  ];

  ngAfterViewInit(): void {
    setTimeout(() => this.searchInput?.nativeElement.focus(), 0);
    this.onQuery();
  }

  ngOnChanges(): void { this.onQuery(); }

  onQuery(): void {
    const q = this.query.trim().toLowerCase();
    const docResults: PaletteAction[] = this.documents
      .filter(d => !q || d.name.toLowerCase().includes(q))
      .map(d => ({
        id: 'doc:' + d.id,
        icon: '📄',
        label: d.name,
        sub: `${d.chunksCount} chunks`,
        type: 'document' as const,
      }));

    const actionResults = this.defaultActions.filter(a =>
      !q || a.label.toLowerCase().includes(q) || (a.sub ?? '').toLowerCase().includes(q)
    );

    this.results = [...actionResults, ...docResults].slice(0, 10);
    this.selectedIdx = 0;
  }

  pick(item: PaletteAction): void {
    this.action.emit(item.id);
    this.close.emit();
  }

  @HostListener('keydown', ['$event'])
  onKey(e: KeyboardEvent): void {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.selectedIdx = Math.min(this.selectedIdx + 1, this.results.length - 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.selectedIdx = Math.max(this.selectedIdx - 1, 0);
    } else if (e.key === 'Enter' && this.results[this.selectedIdx]) {
      e.preventDefault();
      this.pick(this.results[this.selectedIdx]);
    } else if (e.key === 'Escape') {
      this.close.emit();
    }
  }
}
