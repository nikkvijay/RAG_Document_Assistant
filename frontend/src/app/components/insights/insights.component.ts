import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService, InsightsResponse } from '../../services/api.service';

type DotColor = 'emerald' | 'indigo' | 'amber' | 'rose';

interface KPI {
  label: string;
  value: string;
  sub: string;
  sparkPoints: string;
  sparkColor: string;
}

const LEVEL_DOT: Record<string, DotColor> = {
  success: 'emerald',
  info:    'indigo',
  warning: 'amber',
  error:   'rose',
};

@Component({
  selector: 'app-insights',
  standalone: true,
  imports: [CommonModule],
  template: `
<div class="insights-view">

  <!-- Loading -->
  <div *ngIf="loading()" class="ins-loading">
    <div class="ins-spinner"></div>
    <span>Loading insights…</span>
  </div>

  <!-- Error -->
  <div *ngIf="error() && !loading()" class="ins-error">
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
    </svg>
    {{ error() }}
    <button class="retry-btn" (click)="load()">Retry</button>
  </div>

  <!-- Content -->
  <ng-container *ngIf="data() && !loading()">

    <!-- Hero -->
    <div class="ins-hero">
      <h1 class="ins-title">Knowledge <em>at a glance.</em></h1>
      <p class="ins-sub">Live metrics from your RAG index — retrieval quality, query volume, and system health.</p>
    </div>

    <!-- KPI grid -->
    <div class="kpi-grid">
      <div *ngFor="let kpi of kpis()" class="kpi-card">
        <div class="kpi-label">{{ kpi.label }}</div>
        <div class="kpi-value">{{ kpi.value }}</div>
        <div class="kpi-sub">{{ kpi.sub }}</div>
        <svg class="kpi-spark" viewBox="0 0 80 28" fill="none" preserveAspectRatio="none">
          <polyline
            [attr.points]="kpi.sparkPoints"
            [attr.stroke]="kpi.sparkColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            fill="none"
            opacity="0.7"/>
        </svg>
      </div>
    </div>

    <!-- Panel grid -->
    <div class="panel-grid">

      <!-- Top topics -->
      <div class="panel">
        <div class="panel-header">
          <span class="panel-title">Top Topics</span>
          <span class="panel-sub">From last 30 days of queries</span>
        </div>

        <!-- No queries yet -->
        <div *ngIf="!data()!.top_topics.length" class="panel-empty">
          No queries yet — topics appear after you start chatting.
        </div>

        <div class="topics-list" *ngIf="data()!.top_topics.length">
          <div *ngFor="let t of data()!.top_topics" class="topic-row">
            <span class="topic-name">{{ t.name }}</span>
            <div class="topic-bar-track">
              <div class="topic-bar-fill" [style.width.%]="t.pct"></div>
            </div>
            <span class="topic-pct">{{ t.pct }}%</span>
          </div>
        </div>
      </div>

      <!-- Recent activity -->
      <div class="panel">
        <div class="panel-header">
          <span class="panel-title">Recent Activity</span>
          <span class="panel-sub">Live system events</span>
        </div>

        <!-- No activity yet -->
        <div *ngIf="!data()!.activity.length" class="panel-empty">
          No activity yet — events appear as you upload and query.
        </div>

        <div class="activity-list" *ngIf="data()!.activity.length">
          <div *ngFor="let e of data()!.activity" class="activity-row">
            <span class="activity-dot" [class]="'dot-' + dotColor(e.level)"></span>
            <span class="activity-text">{{ e.message }}</span>
            <span class="activity-ago">{{ e.ago }}</span>
          </div>
        </div>
      </div>

    </div>

    <!-- Indexed documents -->
    <div class="panel" *ngIf="data()!.documents.length">
      <div class="panel-header">
        <span class="panel-title">Indexed Documents</span>
        <span class="panel-sub">{{ data()!.documents_count }} total</span>
      </div>
      <div class="doc-table">
        <div class="doc-row doc-row-header">
          <span>Name</span>
          <span>Chunks</span>
          <span>Uploaded</span>
        </div>
        <div *ngFor="let doc of data()!.documents" class="doc-row">
          <span class="doc-name" [title]="doc.file_name">{{ doc.file_name }}</span>
          <span class="doc-chunks">{{ doc.chunks_count }}</span>
          <span class="doc-date">{{ doc.uploaded_at | date:'MMM d, HH:mm' }}</span>
        </div>
      </div>
    </div>

    <!-- Refresh -->
    <div class="ins-footer">
      <button class="refresh-btn" (click)="load()">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
        </svg>
        Refresh
      </button>
      <span class="refresh-hint">Data is live from the current session</span>
    </div>

  </ng-container>
</div>
  `,
  styles: [`
    .insights-view {
      padding: 36px 40px;
      overflow-y: auto;
      height: 100%;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    /* Loading */
    .ins-loading {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 80px 0;
      color: var(--ink-3);
      font-size: 14px;
    }
    .ins-spinner {
      width: 20px; height: 20px;
      border: 2px solid var(--surface-4);
      border-top-color: var(--indigo-2);
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }

    /* Error */
    .ins-error {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 14px 18px;
      background: rgba(255,154,162,0.08);
      border: 1px solid rgba(255,154,162,0.2);
      border-radius: var(--r-lg);
      font-size: 13px;
      color: var(--rose);
      max-width: 560px;
    }
    .ins-error svg { width: 16px; height: 16px; flex-shrink: 0; }
    .retry-btn {
      margin-left: auto;
      background: none;
      border: 1px solid rgba(255,154,162,0.3);
      color: var(--rose);
      padding: 3px 10px;
      border-radius: var(--r-md);
      font-size: 12px;
      cursor: pointer;
    }
    .retry-btn:hover { background: rgba(255,154,162,0.1); }

    /* Hero */
    .ins-hero { max-width: 600px; }
    .ins-title {
      font-family: var(--font-serif);
      font-size: 36px;
      line-height: 1.05;
      letter-spacing: -0.02em;
      color: var(--ink);
      margin-bottom: 8px;
    }
    .ins-title em { font-style: italic; color: var(--indigo); }
    .ins-sub { font-size: 13px; color: var(--ink-3); }

    /* KPI grid */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
    }
    .kpi-card {
      background: var(--surface-1);
      border: 1px solid var(--line-2);
      border-radius: var(--r-lg);
      padding: 16px 18px 14px;
      position: relative;
      overflow: hidden;
    }
    .kpi-label {
      font-family: var(--font-mono);
      font-size: 10.5px;
      font-weight: 500;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--ink-3);
      margin-bottom: 8px;
    }
    .kpi-value {
      font-size: 28px;
      font-weight: 600;
      color: var(--ink);
      letter-spacing: -0.01em;
      font-feature-settings: "tnum";
      line-height: 1.1;
      margin-bottom: 4px;
    }
    .kpi-sub {
      font-family: var(--font-mono);
      font-size: 10.5px;
      color: var(--ink-4);
    }
    .kpi-spark {
      position: absolute;
      bottom: 10px;
      right: 12px;
      width: 80px;
      height: 28px;
      opacity: 0.55;
    }

    /* Panel grid */
    .panel-grid {
      display: grid;
      grid-template-columns: 1.4fr 1fr;
      gap: 12px;
    }
    .panel {
      background: var(--surface-1);
      border: 1px solid var(--line-2);
      border-radius: var(--r-lg);
      overflow: hidden;
    }
    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      border-bottom: 1px solid var(--line);
    }
    .panel-title { font-size: 13px; font-weight: 600; color: var(--ink); }
    .panel-sub   { font-family: var(--font-mono); font-size: 10.5px; color: var(--ink-4); }
    .panel-empty { padding: 24px 16px; font-size: 12.5px; color: var(--ink-4); text-align: center; }

    /* Topics */
    .topics-list { padding: 10px 16px; display: flex; flex-direction: column; gap: 10px; }
    .topic-row   { display: flex; align-items: center; gap: 10px; }
    .topic-name  { font-size: 13px; color: var(--ink-2); width: 140px; flex-shrink: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .topic-bar-track { flex: 1; height: 6px; background: var(--surface-3); border-radius: 3px; overflow: hidden; }
    .topic-bar-fill  { height: 100%; background: linear-gradient(90deg, var(--indigo-2), var(--indigo)); border-radius: 3px; box-shadow: 0 0 6px rgba(128,131,255,0.35); transition: width 0.6s ease; }
    .topic-pct  { font-family: var(--font-mono); font-size: 10.5px; color: var(--ink-3); width: 32px; text-align: right; flex-shrink: 0; }

    /* Activity */
    .activity-list { padding: 4px 0; }
    .activity-row {
      display: flex; align-items: center; gap: 10px; padding: 9px 16px;
      border-bottom: 1px solid var(--line); transition: background 0.1s;
    }
    .activity-row:last-child { border-bottom: none; }
    .activity-row:hover { background: rgba(255,255,255,0.015); }
    .activity-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
    .dot-emerald { background: var(--emerald); box-shadow: 0 0 6px rgba(110,231,183,0.5); }
    .dot-indigo  { background: var(--indigo-2); box-shadow: 0 0 6px rgba(128,131,255,0.5); }
    .dot-amber   { background: var(--amber);    box-shadow: 0 0 6px rgba(255,183,131,0.5); }
    .dot-rose    { background: var(--rose);     box-shadow: 0 0 6px rgba(255,154,162,0.5); }
    .activity-text { flex: 1; font-size: 12.5px; color: var(--ink-2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .activity-ago  { font-family: var(--font-mono); font-size: 10px; color: var(--ink-4); white-space: nowrap; }

    /* Documents table */
    .doc-table { padding: 4px 0; }
    .doc-row {
      display: grid;
      grid-template-columns: 1fr 80px 140px;
      align-items: center;
      gap: 12px;
      padding: 8px 16px;
      border-bottom: 1px solid var(--line);
      font-size: 12.5px;
    }
    .doc-row:last-child { border-bottom: none; }
    .doc-row-header {
      font-family: var(--font-mono);
      font-size: 10px;
      letter-spacing: 0.08em;
      color: var(--ink-4);
      text-transform: uppercase;
    }
    .doc-name   { color: var(--ink-2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .doc-chunks { color: var(--indigo); font-family: var(--font-mono); font-size: 11px; }
    .doc-date   { color: var(--ink-4); font-family: var(--font-mono); font-size: 10.5px; }

    /* Footer */
    .ins-footer {
      display: flex;
      align-items: center;
      gap: 12px;
      padding-bottom: 8px;
    }
    .refresh-btn {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 5px 12px; border-radius: var(--r-md);
      background: transparent; border: 1px solid var(--line-2);
      font-size: 12.5px; color: var(--ink-3); cursor: pointer;
      transition: background 0.15s, color 0.15s, border-color 0.15s;
    }
    .refresh-btn svg { width: 13px; height: 13px; stroke-width: 1.8; }
    .refresh-btn:hover { background: var(--surface-2); border-color: var(--line-strong); color: var(--ink); }
    .refresh-hint { font-family: var(--font-mono); font-size: 10.5px; color: var(--ink-4); }
  `]
})
export class InsightsComponent implements OnInit {
  data    = signal<InsightsResponse | null>(null);
  loading = signal(true);
  error   = signal<string | null>(null);

  constructor(private api: ApiService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.api.getInsights().subscribe({
      next: (res) => {
        this.data.set(res);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(
          err.status === 0
            ? 'Cannot reach backend — is the Python server running?'
            : `Failed to load insights (${err.status})`
        );
        this.loading.set(false);
      },
    });
  }

  kpis() {
    const d = this.data();
    if (!d) return [];

    const dailyCounts = d.query_stats.daily_counts;
    const querySparkPoints = this.toSvgPoints(dailyCounts);

    const chunkCounts = d.documents.map(doc => doc.chunks_count);
    const chunkSparkPoints = chunkCounts.length >= 2
      ? this.toSvgPoints(chunkCounts)
      : '0,14 80,14';

    return [
      {
        label: 'Indexed Documents',
        value: String(d.documents_count),
        sub: `${d.total_chunks.toLocaleString()} total chunks`,
        sparkPoints: chunkSparkPoints,
        sparkColor: '#8083FF',
      },
      {
        label: 'Queries · 7d',
        value: String(d.query_stats.total_7d),
        sub: `${d.query_stats.total_all} all-time · avg ${d.query_stats.avg_chunks_per_query} chunks`,
        sparkPoints: querySparkPoints,
        sparkColor: '#6EE7B7',
      },
      {
        label: 'Queries · 30d',
        value: String(d.query_stats.total_30d),
        sub: `Session activity`,
        sparkPoints: querySparkPoints,
        sparkColor: '#C0C1FF',
      },
    ] as KPI[];
  }

  dotColor(level: string): DotColor {
    return LEVEL_DOT[level] ?? 'indigo';
  }

  private toSvgPoints(values: number[]): string {
    if (!values.length) return '0,14 80,14';
    const max = Math.max(...values, 1);
    const step = 80 / Math.max(values.length - 1, 1);
    return values
      .map((v, i) => `${Math.round(i * step)},${Math.round(26 - (v / max) * 22)}`)
      .join(' ');
  }
}
