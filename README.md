# RAG.analyst

A premium document intelligence platform. Upload PDFs, ask questions, and get grounded answers with a self-healing retrieval loop that validates every response before returning it.

![Angular](https://img.shields.io/badge/Angular-20-red?style=flat-square&logo=angular)
![Python](https://img.shields.io/badge/Python-3.12-blue?style=flat-square&logo=python)
![FastAPI](https://img.shields.io/badge/FastAPI-0.110-teal?style=flat-square&logo=fastapi)
![Gemini](https://img.shields.io/badge/Gemini-2.5%20Flash-orange?style=flat-square)

---

## Features

- **Self-healing RAG loop** — retrieve → generate → critique → reformulate → retry (up to 3 passes). A separate critic LLM verifies every answer is grounded before it reaches you.
- **Verdict badges** — each response is labelled GROUNDED, HEALED (took multiple passes), or FALLBACK (evidence insufficient).
- **Multi-document support** — replace or append documents; scope queries to specific sources.
- **Premium dark UI** — 3-column shell (nav · chat · library), collapsible sidebar, citation cards, confidence bars, thread export.
- **Insights dashboard** — query stats, daily activity chart, top topics, document library overview.
- **Rate-limited & logged** — per-IP rate limiting, structured logging, health endpoint.

---

## Architecture

```
┌──────────────────┐        ┌──────────────────────────────────────┐
│  Angular 20      │        │  FastAPI (Python 3.12)               │
│  Frontend        │◄──────►│                                      │
│                  │  REST  │  RAG Service                         │
│  • Chat view     │        │  ├── Upload & chunk PDFs             │
│  • Upload view   │        │  ├── Embed  →  gemini-embedding-001  │
│  • Insights view │        │  ├── Retrieve (InMemoryVectorStore)  │
│  • Library panel │        │  ├── Generate → gemini-2.5-flash     │
└──────────────────┘        │  └── Critique → gemini-2.5-flash     │
                            │       (temp=0, deterministic JSON)   │
                            └──────────────────────────────────────┘
```

**Self-healing loop:**
```
Query → Retrieve → Generate → Critique ──grounded──► Return answer
                       ▲           │
                       │     hallucinated
                       │           │
                       └── reformulate query (max 3 iterations)
                                   │
                             insufficient
                                   │
                             Safe fallback
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Angular 20, TypeScript, Angular Signals, Tailwind CSS |
| Backend | Python 3.12, FastAPI, Uvicorn |
| AI — Generation | `gemini-2.5-flash` (Google Gemini) |
| AI — Embeddings | `gemini-embedding-001` (Google Gemini) |
| AI — Critique | `gemini-2.5-flash` (temp=0, top_k=1) |
| Vector Store | LangChain `InMemoryVectorStore` |
| PDF Processing | LangChain `PyPDFLoader` + `RecursiveCharacterTextSplitter` |
| Rate Limiting | `slowapi` |

---

## Project Structure

```
RAG project/
├── backend/                    # FastAPI Python backend
│   ├── app/
│   │   ├── main.py             # FastAPI app, CORS, middleware
│   │   ├── config.py           # Settings (env vars)
│   │   ├── dependencies.py     # DI — RAG service singleton
│   │   ├── core/
│   │   │   ├── exceptions.py   # AppError + global handlers
│   │   │   ├── limiter.py      # slowapi rate limiter
│   │   │   └── logger.py       # Structured logging
│   │   ├── routers/
│   │   │   ├── chat.py         # POST /chat/query
│   │   │   ├── documents.py    # POST /documents/upload, reset, status
│   │   │   ├── health.py       # GET /health
│   │   │   └── insights.py     # GET /insights
│   │   ├── schemas/
│   │   │   ├── chat.py         # QueryRequest / QueryResponse
│   │   │   └── document.py     # Upload response schemas
│   │   ├── services/
│   │   │   └── rag_service.py  # Core RAG + self-healing loop
│   │   └── utils/
│   │       └── file_utils.py   # Filename sanitisation
│   ├── uploads/                # Uploaded PDFs (gitignored)
│   ├── logs/                   # App logs (gitignored)
│   ├── requirements.txt
│   └── run.py                  # Uvicorn entrypoint
│
├── frontend/                   # Angular 20 app
│   ├── src/app/
│   │   ├── app.ts              # Root component (3-col shell)
│   │   ├── app.html            # Shell template
│   │   ├── app.css             # Shell styles
│   │   ├── components/
│   │   │   ├── chat/           # Chat view + self-healing badges
│   │   │   ├── document-upload/# Upload + progress + mode toggle
│   │   │   ├── insights/       # Stats dashboard
│   │   │   └── command-palette/# ⌘K search
│   │   ├── services/
│   │   │   └── api.service.ts  # HTTP client + typed interfaces
│   │   └── models/
│   │       └── chat.model.ts   # ChatMessage interface
│   └── src/styles.css          # Design tokens + global layout
│
└── README.md
```

---

## Quick Start

### Prerequisites

- Python 3.12+
- Node.js 18+ and Angular CLI (`npm install -g @angular/cli`)
- Google Gemini API key — [get one here](https://aistudio.google.com/apikey)

### Backend

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS / Linux

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY

# Start server
python run.py
# API available at http://localhost:8000
```

### Frontend

```bash
cd frontend
npm install
ng serve
# App available at http://localhost:4200
```

---

## Environment Variables

Create `backend/.env`:

```env
GEMINI_API_KEY=your_key_here

# Optional overrides (defaults shown)
HOST=0.0.0.0
PORT=8000
UPLOAD_DIR=uploads
MAX_FILE_SIZE_MB=20
CHUNK_SIZE=1000
CHUNK_OVERLAP=200
RETRIEVER_K=6
MAX_HEALING_ITERATIONS=3
```

---

## API Reference

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | System health + RAG readiness |
| `POST` | `/documents/upload` | Upload PDF (`multipart/form-data`, field: `document`, optional: `mode=replace\|append`) |
| `GET` | `/documents` | List indexed documents |
| `GET` | `/documents/status` | Detailed RAG status |
| `POST` | `/documents/reset` | Clear all documents |
| `POST` | `/chat/query` | Ask a question (`{ "question": "..." }`) |
| `GET` | `/insights` | Stats dashboard data |

### Query response shape

```json
{
  "success": true,
  "answer": "...",
  "source_documents": [...],
  "metadata": {
    "critique_verdict": "grounded | hallucinated | insufficient",
    "critique_reason": "...",
    "iterations_used": 1,
    "is_safe_fallback": false,
    "sources_count": 4,
    "document_sources": ["doc-name.pdf"]
  }
}
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `⌘K` | Open command palette |
| `⌘N` | New chat thread |
| `⌘↵` | Send message |
| `Esc` | Close palette / notifications |

---

## Roadmap

- [ ] Persistent vector store (ChromaDB / pgvector)
- [ ] Multi-user authentication
- [ ] Streaming responses (SSE)
- [ ] Support for DOCX, XLSX, TXT
- [ ] Docker + docker-compose setup
- [ ] Export conversation as PDF

---

*Built with FastAPI + Angular + Gemini*
