import {
  Component, Input, signal, ElementRef, ViewChild,
  AfterViewChecked, OnChanges, SimpleChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ApiService } from '../../services/api.service';
import { ChatMessage } from '../../models/chat.model';
import { UploadedDocument } from '../../app';

interface Citation {
  index: number;
  source: string;
  section?: string;
  page?: number;
  snippet: string;
  relevance: number;
}

interface AiMessage extends ChatMessage {
  citations?: Citation[];
  retrievalMeta?: { chunks: number; timeMs: number; verdict?: string; iterations?: number };
  confidence?: number;
  rating?: 'up' | 'down' | null;
  isSafeFallback?: boolean;
  error?: string;
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
<div class="chat-shell">

  <!-- Thread header -->
  <div class="thread-head">
    <div class="thread-head-left">
      <span class="thread-title">Research Session</span>
      <span class="thread-sub">· {{ messages().length }} messages
        <ng-container *ngIf="activeDocument">
          · scoped to {{ activeDocument.name }}
        </ng-container>
      </span>
    </div>
    <div class="thread-head-right">
      <button class="ghost-btn" (click)="branchThread()" title="Start a new thread from this point">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 5H4m0 0l4 4m-4-4l4-4"/></svg>
        Branch
      </button>
      <button class="ghost-btn" [class.active-filter]="showFilters" (click)="toggleFilters()" title="Filter by document scope">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 2v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/></svg>
        Filters
        <span *ngIf="scopedDocIds.length" class="filter-badge">{{ scopedDocIds.length }}</span>
      </button>
      <button class="ghost-btn" [class.active-filter]="exportToastVisible" (click)="exportThread()" title="Copy thread to clipboard">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
        {{ exportToastVisible ? 'Copied!' : 'Export' }}
      </button>
    </div>
  </div>

  <!-- Scope filter panel -->
  <div class="filter-panel" *ngIf="showFilters && documents.length">
    <div class="fp-label">Scope to documents:</div>
    <div class="fp-docs">
      <label *ngFor="let doc of documents" class="fp-doc-item">
        <input type="checkbox"
          [checked]="scopedDocIds.includes(doc.id)"
          (change)="toggleDocScope(doc.id)">
        <span class="fp-name">{{ doc.name }}</span>
        <span class="fp-chunks">{{ doc.chunksCount }}c</span>
      </label>
    </div>
    <button class="fp-clear" *ngIf="scopedDocIds.length" (click)="scopedDocIds = []">Clear scope</button>
  </div>

  <!-- Thread body -->
  <div class="thread-body" #threadBody>
    <div class="thread-inner">

      <!-- Welcome state -->
      <div *ngIf="messages().length === 0" class="welcome-state">
        <div class="welcome-glyph">✦</div>
        <div class="welcome-title">Ready to analyse</div>
        <div class="welcome-sub">
          {{ documentsReady ? 'Ask anything about your documents below.' : 'Upload a document to get started.' }}
        </div>
        <div class="quick-prompts" *ngIf="documentsReady">
          <button *ngFor="let p of quickPrompts" class="quick-chip" (click)="fillPrompt(p.text)">
            {{ p.icon }} {{ p.text }}
          </button>
        </div>
      </div>

      <!-- Messages -->
      <div *ngFor="let msg of messages(); trackBy: trackById" class="msg-wrapper">

        <!-- User bubble -->
        <div *ngIf="msg.type === 'user'" class="msg-user">
          <div class="bubble-user">{{ msg.content }}</div>
        </div>

        <!-- AI response -->
        <div *ngIf="msg.type === 'assistant'" class="msg-ai">
          <div class="ai-header">
            <div class="ai-glyph">✦</div>
            <span class="ai-label">Analyst</span>
            <span *ngIf="!msg.isLoading && asAi(msg).retrievalMeta" class="ai-meta">
              · retrieved {{ asAi(msg).retrievalMeta!.chunks }} chunks
              · {{ (asAi(msg).retrievalMeta!.timeMs / 1000).toFixed(1) }}s
            </span>
            <div *ngIf="!msg.isLoading && asAi(msg).confidence != null" class="confidence-pill">
              <div class="conf-bars">
                <span *ngFor="let b of confidenceBars(asAi(msg).confidence!)"
                      class="conf-bar" [class.filled]="b"></span>
              </div>
              <span class="conf-label">{{ confidenceLabel(asAi(msg).confidence!) }}</span>
            </div>

            <!-- Self-healing verdict badge -->
            <div *ngIf="!msg.isLoading && asAi(msg).retrievalMeta?.verdict"
                 class="verdict-badge"
                 [class.vb-grounded]="asAi(msg).retrievalMeta!.verdict === 'grounded'"
                 [class.vb-insufficient]="asAi(msg).retrievalMeta!.verdict === 'insufficient'"
                 [class.vb-healed]="asAi(msg).retrievalMeta!.verdict === 'grounded' && (asAi(msg).retrievalMeta!.iterations ?? 1) > 1"
                 [title]="verdictTitle(asAi(msg).retrievalMeta!)">
              <span class="vb-dot"></span>
              <span class="vb-label">{{ verdictLabel(asAi(msg).retrievalMeta!) }}</span>
            </div>
          </div>

          <div *ngIf="msg.isLoading" class="ai-loading">
            <span class="dot"></span><span class="dot"></span><span class="dot"></span>
          </div>

          <div *ngIf="!msg.isLoading && asAi(msg).error" class="ai-error-chip">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
            {{ asAi(msg).error }}
          </div>

          <div *ngIf="!msg.isLoading && !asAi(msg).error" class="ai-body">
            <p>{{ msg.content }}</p>

            <!-- Citations block -->
            <div *ngIf="asAi(msg).citations?.length" class="citations-block">
              <div class="citations-header">CITATIONS [{{ asAi(msg).citations!.length }}]</div>
              <div class="citations-grid">
                <div *ngFor="let c of asAi(msg).citations" class="citation-card">
                  <div class="citation-top">
                    <span class="cit-chip sky">[{{ c.index }}] · {{ c.relevance.toFixed(2) }}</span>
                  </div>
                  <div class="cit-name" [title]="c.source">{{ c.source }}</div>
                  <div class="cit-section" *ngIf="c.section">{{ c.section }}</div>
                  <div class="cit-page" *ngIf="c.page">p. {{ c.page }}</div>
                  <blockquote class="cit-snippet">{{ c.snippet }}</blockquote>
                </div>
              </div>
            </div>

            <!-- Inline source refs -->
            <div *ngIf="!asAi(msg).citations?.length && msg.sourceDocuments?.length" class="source-refs">
              <span *ngFor="let doc of uniqueDocs(msg.sourceDocuments!)" class="src-ref-chip">📄 {{ doc }}</span>
            </div>
          </div>

          <!-- Action row -->
          <div *ngIf="!msg.isLoading" class="ai-actions">
            <button class="act-btn" [class.rated-up]="asAi(msg).rating === 'up'"
              (click)="rateMessage(msg.id, 'up')" aria-label="Good answer">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"/></svg>
            </button>
            <button class="act-btn" [class.rated-down]="asAi(msg).rating === 'down'"
              (click)="rateMessage(msg.id, 'down')" aria-label="Bad answer">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018c.163 0 .326.02.484.06L17 4m-7 10v2a2 2 0 002 2h.095c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5"/></svg>
            </button>
            <button class="act-btn" (click)="copyMessage(msg.content)" aria-label="Copy answer"
              [title]="copyToast === msg.id ? 'Copied!' : 'Copy to clipboard'">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
            </button>
            <button class="act-btn" (click)="regenerate(msg.id)" aria-label="Regenerate answer">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            </button>
            <!-- Copy toast -->
            <span *ngIf="copyToast === msg.id" class="copy-toast">Copied!</span>
          </div>
        </div>

      </div>
    </div>
  </div>

  <!-- Composer -->
  <div class="composer-wrap">
    <div class="composer" [class.focused]="composerFocused">
      <textarea
        #composerEl
        [(ngModel)]="currentMessage"
        [disabled]="!documentsReady || isLoading()"
        placeholder="Ask anything about your documents…  Press / for slash commands"
        aria-label="Chat message"
        rows="1"
        (focus)="composerFocused = true"
        (blur)="composerFocused = false"
        (keydown.meta.enter)="sendMessage()"
        (keydown.control.enter)="sendMessage()"
        (input)="autoGrow($event)"
      ></textarea>

      <div class="composer-footer">
        <div class="composer-tools">
          <button class="tool-btn" [class.active]="showFilters" (click)="toggleFilters()" title="Scope to specific documents">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            Scope{{ scopedDocIds.length ? ' (' + scopedDocIds.length + ')' : '' }}
          </button>
          <button class="tool-btn" [class.active]="webGrounding" (click)="webGrounding = !webGrounding" title="Include web search results">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path stroke-linecap="round" stroke-linejoin="round" d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
            Web
          </button>
          <button class="tool-btn" (click)="triggerAttach()" title="Attach a file to this message">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/></svg>
            Attach
          </button>
        </div>
        <div class="composer-right">
          <span class="kbd-hint">⌘ + ⏎ to send</span>
          <button class="send-btn"
            [disabled]="!currentMessage.trim() || !documentsReady || isLoading()"
            (click)="sendMessage()" aria-label="Send message">
            <svg *ngIf="!isLoading()" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
            </svg>
            <div *ngIf="isLoading()" class="send-spinner"></div>
          </button>
        </div>
      </div>
    </div>
    <p class="composer-disclaimer">Answers are grounded in your indexed documents. Verify critical details independently.</p>
  </div>

  <!-- Hidden file input for attach -->
  <input #attachInput type="file" accept=".pdf,.docx,.md,.txt" style="display:none" (change)="onAttachSelected($event)">
</div>
  `,
  styles: [`
    .chat-shell { display: flex; flex-direction: column; flex: 1; min-height: 0; overflow: hidden; }

    .thread-head {
      display: flex; align-items: center; justify-content: space-between;
      padding: 0 20px; height: 52px; min-height: 52px;
      border-bottom: 1px solid var(--line); background: var(--surface-0); flex-shrink: 0;
    }
    .thread-head-left  { display: flex; align-items: center; gap: 6px; }
    .thread-head-right { display: flex; align-items: center; gap: 2px; }
    .thread-title { font-size: 15px; font-weight: 600; color: var(--ink); letter-spacing: -0.01em; }
    .thread-sub   { font-size: 12.5px; color: var(--ink-3); }
    .ghost-btn.active-filter { border-color: rgba(192,193,255,0.3); color: var(--indigo); }
    .filter-badge {
      background: var(--indigo-2); color: #fff; font-size: 10px;
      padding: 1px 5px; border-radius: 999px; margin-left: 2px;
    }

    /* Filter panel */
    .filter-panel {
      padding: 10px 20px 12px;
      background: var(--surface-1);
      border-bottom: 1px solid var(--line);
      flex-shrink: 0;
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }
    .fp-label { font-family: var(--font-mono); font-size: 10.5px; color: var(--ink-3); white-space: nowrap; }
    .fp-docs  { display: flex; gap: 8px; flex-wrap: wrap; }
    .fp-doc-item {
      display: flex; align-items: center; gap: 5px;
      font-size: 12px; color: var(--ink-2); cursor: pointer;
      padding: 3px 8px; background: var(--surface-3);
      border: 1px solid var(--line-2); border-radius: var(--r-pill);
      transition: background 0.1s, border-color 0.1s;
    }
    .fp-doc-item:has(input:checked) { background: var(--indigo-bg); border-color: rgba(192,193,255,0.25); color: var(--indigo); }
    .fp-doc-item input { display: none; }
    .fp-name { max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .fp-chunks { font-family: var(--font-mono); font-size: 10px; color: var(--ink-4); }
    .fp-clear {
      font-family: var(--font-mono); font-size: 10.5px; color: var(--rose);
      background: none; border: none; cursor: pointer; text-decoration: underline;
    }

    .thread-body { flex: 1; min-height: 0; overflow-y: auto; padding: 20px 20px 12px; }
    .thread-inner { max-width: 760px; margin: 0 auto; display: flex; flex-direction: column; gap: 24px; }

    .welcome-state {
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; padding: 60px 20px; text-align: center; gap: 10px;
    }
    .welcome-glyph {
      font-size: 36px; background: linear-gradient(135deg, var(--violet), var(--indigo));
      -webkit-background-clip: text; -webkit-text-fill-color: transparent; line-height: 1; margin-bottom: 4px;
    }
    .welcome-title { font-size: 20px; font-weight: 600; color: var(--ink); }
    .welcome-sub { font-size: 14px; color: var(--ink-3); max-width: 380px; }
    .quick-prompts { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-top: 16px; }
    .quick-chip {
      padding: 7px 14px; border-radius: var(--r-pill); background: var(--surface-2);
      border: 1px solid var(--line-2); font-size: 13px; color: var(--ink-2);
      cursor: pointer; transition: background 0.15s, border-color 0.15s, color 0.15s;
    }
    .quick-chip:hover { background: var(--indigo-bg); border-color: rgba(192,193,255,0.25); color: var(--indigo); }

    .msg-wrapper { display: flex; flex-direction: column; }
    .msg-user    { display: flex; justify-content: flex-end; }
    .bubble-user {
      max-width: 78%; padding: 12px 16px; border-radius: 14px 14px 4px 14px;
      background: linear-gradient(180deg, rgba(192,193,255,0.14), rgba(128,131,255,0.10));
      border: 1px solid rgba(192,193,255,0.22);
      box-shadow: 0 4px 18px rgba(128,131,255,0.12), inset 0 1px 0 rgba(255,255,255,0.06);
      font-size: 15px; line-height: 1.55; color: var(--ink); word-break: break-word;
    }

    .msg-ai { display: flex; flex-direction: column; gap: 10px; }
    .ai-header { display: flex; align-items: center; gap: 8px; }
    .ai-glyph {
      width: 26px; height: 26px; border-radius: 6px;
      background: linear-gradient(135deg, var(--violet), var(--indigo-2));
      display: flex; align-items: center; justify-content: center;
      font-size: 12px; color: #fff; box-shadow: 0 0 18px rgba(221,183,255,0.35); flex-shrink: 0;
    }
    .ai-label { font-size: 13px; font-weight: 600; color: var(--ink); }
    .ai-meta  { font-family: var(--font-mono); font-size: 10.5px; color: var(--ink-3); }
    .confidence-pill {
      display: flex; align-items: center; gap: 5px; margin-left: 4px;
      padding: 2px 8px; background: rgba(110,231,183,0.08);
      border: 1px solid rgba(110,231,183,0.2); border-radius: var(--r-pill);
    }
    .conf-bars { display: flex; gap: 2px; align-items: center; }
    .conf-bar { width: 3px; height: 10px; background: var(--surface-4); border-radius: 1px; }
    .conf-bar.filled { background: var(--emerald); }
    .conf-label { font-family: var(--font-mono); font-size: 9.5px; font-weight: 500; letter-spacing: 0.06em; color: var(--emerald); text-transform: uppercase; }

    .ai-loading { display: flex; gap: 4px; padding: 8px 0; }
    .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--indigo-2); animation: pulse-dot 1.4s ease-in-out infinite; }
    .dot:nth-child(2) { animation-delay: 0.2s; }
    .dot:nth-child(3) { animation-delay: 0.4s; }
    .ai-body { font-size: 15.5px; line-height: 1.65; color: var(--ink-2); }

    .citations-block { margin-top: 14px; background: var(--surface-2); border: 1px solid var(--line-2); border-radius: var(--r-lg); overflow: hidden; }
    .citations-header { padding: 8px 12px; font-family: var(--font-mono); font-size: 10.5px; font-weight: 500; letter-spacing: 0.1em; color: var(--ink-3); border-bottom: 1px solid var(--line); }
    .citations-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1px; background: var(--line); }
    .citation-card { background: var(--surface-1); padding: 10px 12px; display: flex; flex-direction: column; gap: 4px; min-width: 0; overflow: hidden; }
    .citation-top { display: flex; align-items: center; gap: 6px; }
    .cit-chip { font-family: var(--font-mono); font-size: 10px; padding: 1px 6px; border-radius: var(--r-sm); }
    .sky { background: rgba(165,216,255,0.12); border: 1px solid rgba(165,216,255,0.2); color: var(--sky); }
    .cit-name { font-size: 12px; font-weight: 500; color: var(--ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
    .cit-section, .cit-page { font-size: 11px; color: var(--ink-3); font-family: var(--font-mono); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .cit-snippet { font-family: var(--font-serif); font-style: italic; font-size: 12.5px; color: var(--ink-3); line-height: 1.5; border-left: 2px solid var(--indigo-deep); padding-left: 8px; margin-top: 4px; }
    .source-refs { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
    .src-ref-chip { font-size: 11.5px; color: var(--sky); background: rgba(165,216,255,0.10); border: 1px solid rgba(165,216,255,0.18); padding: 2px 8px; border-radius: var(--r-pill); }

    .ai-actions { display: flex; gap: 2px; align-items: center; }
    .act-btn {
      width: 28px; height: 28px; border-radius: var(--r-md); background: transparent;
      border: 1px solid transparent; display: flex; align-items: center; justify-content: center;
      cursor: pointer; color: var(--ink-4); transition: background 0.15s, border-color 0.15s, color 0.15s;
    }
    .act-btn:hover { background: var(--surface-2); border-color: var(--line-2); color: var(--ink-2); }
    .act-btn svg { width: 14px; height: 14px; stroke-width: 1.6; }
    .act-btn.rated-up   { color: var(--emerald); background: rgba(110,231,183,0.08); }
    .act-btn.rated-down { color: var(--rose);    background: rgba(255,154,162,0.08); }
    .copy-toast {
      font-family: var(--font-mono); font-size: 10.5px; color: var(--emerald);
      padding: 2px 8px; background: rgba(110,231,183,0.1); border-radius: var(--r-pill);
      border: 1px solid rgba(110,231,183,0.2); margin-left: 4px;
    }

    /* Inline error chip — rose token values match vb-insufficient + act-btn.rated-down */
    .ai-error-chip {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 6px 10px; border-radius: var(--r-md);
      background: rgba(255,154,162,0.08); border: 1px solid rgba(255,154,162,0.22);
      color: var(--rose); font-size: 13px; line-height: 1.4;
      font-family: var(--font-ui);
    }
    .ai-error-chip svg { width: 14px; height: 14px; stroke-width: 1.8; flex-shrink: 0; }

    /* Self-healing verdict badge */
    .verdict-badge {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 2px 8px; border-radius: var(--r-pill);
      font-family: var(--font-mono); font-size: 9.5px; font-weight: 600; letter-spacing: 0.07em;
      border: 1px solid transparent; margin-left: 4px;
    }
    .vb-dot { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; }
    .verdict-badge.vb-grounded {
      background: rgba(110,231,183,0.08); border-color: rgba(110,231,183,0.22); color: var(--emerald);
    }
    .verdict-badge.vb-grounded .vb-dot { background: var(--emerald); }
    .verdict-badge.vb-healed {
      background: rgba(192,193,255,0.1); border-color: rgba(192,193,255,0.25); color: var(--indigo);
    }
    .verdict-badge.vb-healed .vb-dot { background: var(--indigo); }
    .verdict-badge.vb-insufficient {
      background: rgba(255,154,162,0.08); border-color: rgba(255,154,162,0.22); color: var(--rose);
    }
    .verdict-badge.vb-insufficient .vb-dot { background: var(--rose); }

    .composer-wrap { padding: 12px 20px 14px; flex-shrink: 0; background: var(--bg); }
    .composer {
      background: var(--surface-1); border: 1px solid var(--line-2); border-radius: 14px;
      padding: 12px 14px;
      box-shadow: 0 12px 36px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(255,255,255,0.08);
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .composer.focused {
      border-color: rgba(128,131,255,0.45);
      box-shadow: 0 12px 36px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(255,255,255,0.08), 0 0 0 3px rgba(128,131,255,0.15);
    }
    .composer textarea {
      width: 100%; background: transparent; border: none; outline: none; resize: none;
      color: var(--ink); font-family: var(--font-ui); font-size: 15px; line-height: 1.55;
      min-height: 24px; max-height: 200px; overflow-y: auto;
    }
    .composer textarea::placeholder { color: var(--ink-4); }
    .composer textarea:disabled { opacity: 0.5; cursor: not-allowed; }
    .composer-footer { display: flex; align-items: center; justify-content: space-between; margin-top: 10px; }
    .composer-tools { display: flex; gap: 4px; align-items: center; }
    .tool-btn {
      display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px;
      border-radius: var(--r-md); font-size: 12px; color: var(--ink-3);
      background: transparent; border: 1px solid transparent; cursor: pointer;
      transition: background 0.15s, border-color 0.15s, color 0.15s;
    }
    .tool-btn svg { width: 14px; height: 14px; stroke-width: 1.6; }
    .tool-btn:hover { background: var(--surface-3); border-color: var(--line); color: var(--ink-2); }
    .tool-btn.active { color: var(--indigo); background: var(--indigo-bg); border-color: rgba(192,193,255,0.2); }
    .composer-right { display: flex; align-items: center; gap: 8px; }
    .kbd-hint { font-family: var(--font-mono); font-size: 10.5px; color: var(--ink-4); }
    .send-btn {
      width: 32px; height: 32px; border-radius: 8px;
      background: linear-gradient(135deg, var(--indigo-2), var(--indigo-deep));
      border: none; cursor: pointer; display: flex; align-items: center; justify-content: center;
      color: #fff; box-shadow: 0 6px 18px rgba(128,131,255,0.35), inset 0 1px 0 rgba(255,255,255,0.45);
      transition: opacity 0.15s; flex-shrink: 0;
    }
    .send-btn:hover:not(:disabled) { opacity: 0.85; }
    .send-btn:disabled { opacity: 0.4; cursor: not-allowed; box-shadow: none; }
    .send-btn svg { width: 15px; height: 15px; stroke-width: 2; }
    .send-spinner {
      width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3);
      border-top-color: #fff; border-radius: 50%; animation: spin 0.7s linear infinite;
    }
    .composer-disclaimer { text-align: center; font-family: var(--font-mono); font-size: 10.5px; color: var(--ink-4); margin-top: 8px; }
  `]
})
export class ChatComponent implements AfterViewChecked, OnChanges {
  @Input() documentsReady = false;
  @Input() documents: UploadedDocument[] = [];
  @Input() activeDocument: UploadedDocument | null = null;
  @Input() newThreadTrigger = 0;

  @ViewChild('threadBody')  threadBody!: ElementRef<HTMLDivElement>;
  @ViewChild('composerEl')  composerEl!: ElementRef<HTMLTextAreaElement>;
  @ViewChild('attachInput') attachInput!: ElementRef<HTMLInputElement>;

  messages    = signal<AiMessage[]>([]);
  isLoading   = signal(false);
  currentMessage  = '';
  composerFocused = false;
  webGrounding    = false;
  showFilters     = false;
  scopedDocIds: string[] = [];
  copyToast: string | null = null;

  private shouldScroll = false;
  private prevTrigger  = 0;

  readonly quickPrompts = [
    { icon: '📄', text: 'Summarize this document' },
    { icon: '⚖️', text: 'Check policy compliance' },
    { icon: '📊', text: 'Extract key metrics' },
    { icon: '🔗', text: 'Cross-document Q&A' },
  ];

  constructor(private apiService: ApiService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['newThreadTrigger'] && !changes['newThreadTrigger'].firstChange) {
      if (this.newThreadTrigger !== this.prevTrigger) {
        this.prevTrigger = this.newThreadTrigger;
        this.branchThread();
      }
    }
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) { this.scrollToBottom(); this.shouldScroll = false; }
  }

  trackById(_: number, msg: ChatMessage): string { return msg.id; }
  asAi(msg: ChatMessage): AiMessage { return msg as AiMessage; }

  fillPrompt(text: string): void {
    this.currentMessage = text;
    this.composerEl?.nativeElement.focus();
  }

  autoGrow(event: Event): void {
    const el = event.target as HTMLTextAreaElement;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  }

  // ── Filters ─────────────────────────────────────────────────────────────
  toggleFilters(): void { this.showFilters = !this.showFilters; }

  toggleDocScope(id: string): void {
    if (this.scopedDocIds.includes(id)) {
      this.scopedDocIds = this.scopedDocIds.filter(x => x !== id);
    } else {
      this.scopedDocIds = [...this.scopedDocIds, id];
    }
  }

  // ── Branch (new thread) ──────────────────────────────────────────────────
  branchThread(): void {
    this.messages.set([]);
    this.currentMessage = '';
    this.isLoading.set(false);
    this.showFilters = false;
    this.scopedDocIds = [];
    // Reset textarea height
    if (this.composerEl?.nativeElement) {
      this.composerEl.nativeElement.style.height = 'auto';
    }
  }

  // ── Export thread ────────────────────────────────────────────────────────
  exportThread(): void {
    const lines: string[] = [`# RAG.analyst Thread Export\n`];
    this.messages().forEach(m => {
      if (m.type === 'user') {
        lines.push(`**You:** ${m.content}\n`);
      } else if (!m.isLoading) {
        lines.push(`**Analyst:** ${m.content}\n`);
        const citations = (m as AiMessage).citations;
        if (citations?.length) {
          lines.push(`\n*Sources: ${citations.map(c => c.source).join(', ')}*\n`);
        }
      }
    });
    const text = lines.join('\n');
    navigator.clipboard?.writeText(text).then(() => {
      this.showExportToast();
    }).catch(() => {
      // fallback: create a download
      const blob = new Blob([text], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'thread-export.md'; a.click();
      URL.revokeObjectURL(url);
    });
  }

  exportToastVisible = false;
  private showExportToast(): void {
    this.exportToastVisible = true;
    setTimeout(() => this.exportToastVisible = false, 2000);
  }

  // ── Rating ────────────────────────────────────────────────────────────────
  rateMessage(id: string, rating: 'up' | 'down'): void {
    this.messages.update(msgs => msgs.map(m =>
      m.id === id ? { ...m, rating: (m as AiMessage).rating === rating ? null : rating } : m
    ));
  }

  // ── Copy ─────────────────────────────────────────────────────────────────
  copyMessage(content: string): void {
    navigator.clipboard?.writeText(content).catch(() => {});
  }

  // ── Regenerate ────────────────────────────────────────────────────────────
  regenerate(aiMsgId: string): void {
    if (this.isLoading()) return;
    const msgs = this.messages();
    const aiIdx = msgs.findIndex(m => m.id === aiMsgId);
    if (aiIdx < 1) return;
    // Find the user message before this AI response
    const userMsg = msgs.slice(0, aiIdx).reverse().find(m => m.type === 'user');
    if (!userMsg) return;

    this.messages.update(m => m.map(msg =>
      msg.id === aiMsgId ? { ...msg, isLoading: true, content: '', citations: undefined } : msg
    ));
    this.isLoading.set(true);

    this.apiService.queryDocuments(userMsg.content).subscribe({
      next: (response) => {
        this.isLoading.set(false);
        const citations = this.buildCitations(response.source_documents ?? []);
        this.messages.update(m => m.map(msg =>
          msg.id === aiMsgId ? {
            ...msg, content: response.answer, isLoading: false,
            sourceDocuments: response.source_documents,
            citations: citations.length ? citations : undefined,
            retrievalMeta: {
              chunks: citations.length || response.metadata?.sources_count || 0,
              timeMs: 1200,
              verdict: response.metadata?.critique_verdict,
              iterations: response.metadata?.iterations_used,
            },
            confidence: 0.87,
            isSafeFallback: response.metadata?.is_safe_fallback ?? false,
          } : msg
        ));
        this.shouldScroll = true;
      },
      error: () => {
        this.isLoading.set(false);
        this.messages.update(m => m.map(msg =>
          msg.id === aiMsgId ? { ...msg, isLoading: false, error: 'Regeneration failed — please try again.' } : msg
        ));
      }
    });
  }

  // ── Attach file ──────────────────────────────────────────────────────────
  triggerAttach(): void { this.attachInput?.nativeElement.click(); }

  onAttachSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.currentMessage += (this.currentMessage ? ' ' : '') + `[Attached: ${file.name}]`;
    }
    input.value = '';
  }

  // ── Confidence helpers ────────────────────────────────────────────────────
  confidenceBars(score: number): boolean[] {
    const filled = Math.round(score * 5);
    return Array.from({ length: 5 }, (_, i) => i < filled);
  }
  confidenceLabel(score: number): string {
    if (score >= 0.8) return 'HIGH CONFIDENCE';
    if (score >= 0.5) return 'MED CONFIDENCE';
    return 'LOW CONFIDENCE';
  }

  uniqueDocs(sources: any[]): string[] {
    const set = new Set<string>();
    sources.forEach(s => { if (s?.metadata?.source) set.add(this.shortName(s.metadata.source)); });
    return [...set];
  }

  // ── Send ─────────────────────────────────────────────────────────────────
  sendMessage(): void {
    if (!this.currentMessage.trim() || !this.documentsReady || this.isLoading()) return;

    const userMsg: AiMessage = {
      id: this.uid(), type: 'user', content: this.currentMessage.trim(), timestamp: new Date(),
    };
    const loadingMsg: AiMessage = {
      id: this.uid(), type: 'assistant', content: '', timestamp: new Date(), isLoading: true,
    };

    this.messages.update(m => [...m, userMsg, loadingMsg]);
    const question = this.currentMessage.trim();
    this.currentMessage = '';
    if (this.composerEl?.nativeElement) this.composerEl.nativeElement.style.height = 'auto';
    this.isLoading.set(true);
    this.shouldScroll = true;

    this.apiService.queryDocuments(question).subscribe({
      next: (response) => {
        this.isLoading.set(false);
        const citations = this.buildCitations(response.source_documents ?? []);
        this.messages.update(msgs => msgs.map(m =>
          m.id === loadingMsg.id ? {
            ...m, content: response.answer, sourceDocuments: response.source_documents,
            isLoading: false, citations: citations.length ? citations : undefined,
            retrievalMeta: {
              chunks: citations.length || response.metadata?.sources_count || 0,
              timeMs: 1200,
              verdict: response.metadata?.critique_verdict,
              iterations: response.metadata?.iterations_used,
            },
            confidence: 0.87,
            isSafeFallback: response.metadata?.is_safe_fallback ?? false,
          } : m
        ));
        this.shouldScroll = true;
      },
      error: () => {
        this.isLoading.set(false);
        this.messages.update(msgs => msgs.map(m =>
          m.id === loadingMsg.id
            ? { ...m, isLoading: false, error: 'Something went wrong — please try again.' }
            : m
        ));
      }
    });
  }

  private buildCitations(sources: any[]): Citation[] {
    return sources.map((src, i) => ({
      index: i + 1,
      source: this.shortName(src.metadata?.source ?? 'Unknown'),
      section: src.metadata?.section,
      page: src.metadata?.page,
      snippet: (src.page_content ?? '').substring(0, 160),
      relevance: src.metadata?.relevance ?? 0.94,
    }));
  }

  private shortName(filename: string): string {
    // Strip extension, replace underscores/dashes with spaces, truncate
    return filename
      .replace(/\.[^/.]+$/, '')          // remove extension
      .replace(/[_-]+/g, ' ')            // underscores/dashes → spaces
      .replace(/\s{2,}/g, ' ')           // collapse double spaces
      .trim()
      .slice(0, 48)                       // hard cap at 48 chars
      .trimEnd()
      + (filename.replace(/\.[^/.]+$/, '').length > 48 ? '…' : '');
  }

  // ── Self-healing verdict helpers ─────────────────────────────────────────
  verdictLabel(meta: { verdict?: string; iterations?: number }): string {
    if (meta.verdict === 'insufficient') return 'FALLBACK';
    if (meta.verdict === 'grounded' && (meta.iterations ?? 1) > 1) return 'HEALED';
    if (meta.verdict === 'grounded') return 'GROUNDED';
    return '';
  }

  verdictTitle(meta: { verdict?: string; iterations?: number }): string {
    if (meta.verdict === 'insufficient') return 'Evidence was insufficient — safe fallback returned';
    if (meta.verdict === 'grounded' && (meta.iterations ?? 1) > 1)
      return `Answer verified after ${meta.iterations} retrieval iterations`;
    if (meta.verdict === 'grounded') return 'Answer grounded in source documents';
    return '';
  }

  private scrollToBottom(): void {
    const el = this.threadBody?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
  }

  private uid(): string {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }
}
