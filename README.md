# CiteWise

AI-powered academic research assistant that combines **CATalyst** (research gap discovery) and **CiteWise** (RRL evaluation + introduction drafting) into a single unified application.

---

## Overview

CATalyst and CiteWise were two separate projects. They are now one app:

- **CATalyst** is the entry point — login, groups, workspace, and the AI workflow pipeline (extract → summarize → gap → topic)
- **CiteWise** is accessible from every group card via the **CiteWise →** button — it picks up the group's research title, rationale, and gaps automatically and walks through RRL upload → AI assessment → introduction drafting

The Spring Boot Java backend that CiteWise originally used has been fully replaced by CATalyst's Express backend, extended with all CiteWise logic ported into it.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, Vite 7, Bootstrap 5.3, Tailwind 4 |
| Backend | Node.js, Express 5 |
| Database | Supabase (PostgreSQL) |
| AI Workflows | n8n (self-hosted, localhost:5678) |
| PDF Parsing | pdf-parse (Node.js) |
| Auth | Supabase Auth + JWT |

---

## Ports

| Service | Port |
|---------|------|
| Frontend | **5173** |
| Backend (Express) | **8081** |
| n8n | **5678** |

---

## Prerequisites

- Node.js 18+
- n8n running locally on port 5678 with all 6 workflows imported and active
- Supabase project `sdtkvjedqygqyudwirsf` (CATalyst's project — all tables live here)

---

## First-Time Setup

### 1. Run the Supabase migration

Open the SQL editor for project `sdtkvjedqygqyudwirsf` and run the contents of:

```
api/migrations/ (001 through 005, in order)
```

This creates the 5 CiteWise tables without touching the existing CATalyst tables.

### 2. Configure env vars

`api/.env` and `web/.env` are already configured for local development. See `.env.example` for all available keys.

**`api/.env`** — server only, never expose to the browser:
```env
PORT=8081
SUPABASE_URL=https://sdtkvjedqygqyudwirsf.supabase.co
SUPABASE_KEY=<service_role_key>
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
FRONTEND_URL=http://localhost:5173
N8N_BASE_URL=http://localhost:5678
GEMINI_API_KEY=<your_gemini_api_key>
GEMINI_MODEL=gemini-3.6-flash

# CATalyst n8n webhooks
N8N_EXTRACTOR_WEBHOOK=http://localhost:5678/webhook/<your-extractor-path>
N8N_SUMMARIZER_PROD_WEBHOOK_URL=http://localhost:5678/webhook/<your-summarizer-path>
N8N_GAPEXTRACTOR_PROD_WEBHOOK_URL=http://localhost:5678/webhook/<your-gap-path>
N8N_TOPIC_PROD_WEBHOOK_URL=http://localhost:5678/webhook/<your-topic-path>

# CiteWise n8n webhooks
CITEWISE_N8N_SCORING_WEBHOOK_URL=http://localhost:5678/webhook/semantic_scoring
CITEWISE_N8N_SYNTHESIS_WEBHOOK_URL=http://localhost:5678/webhook/citewise-synthesizer-v2
```

**`web/.env`** — browser-safe only:
```env
VITE_SUPABASE_URL=https://sdtkvjedqygqyudwirsf.supabase.co
VITE_SUPABASE_ANON_KEY=<anon_key>
VITE_API_BASE_URL=http://localhost:8081/api
```

> `application.properties` is no longer used. The Spring Boot backend has been replaced and is archived in `OLD/backend/` for reference only.

### 3. Install dependencies

```powershell
cd api  ; npm install
cd ../web ; npm install
```

### 4. Run

```powershell
# Option A — double-click
.\start.bat

# Option B — two terminals
cd api && npm run dev    # → http://localhost:8081
cd web && npm run dev    # → http://localhost:5173
```

Open **http://localhost:5173**

---

## App Flow

```
http://localhost:5173/
│
├── / ──────────────── Landing page
├── /login  /register ─ Auth
├── /groups ────────── Group dashboard
│     └── [CiteWise →] ── Auto-imports workspace into CiteWise
├── /workspace/:id ─── CATalyst workflow
│     └── Extractor → Summarizer → Gap Extractor → Topic Suggester
│
└── /citewise ──────── CiteWise flow (3 steps)
      ├── Step 0: Data Import
      │     └── Research title, rationale, and gaps loaded automatically
      │         from the group you clicked. Upload RRL PDFs here.
      ├── Step 1: AI Assessment
      │     └── PDFs are scored by n8n (semantic_scoring webhook).
      │         Approve or reject each document.
      └── Step 2: Generate Introduction
            └── Approved docs + CATalyst baseline sent to n8n
                (citewise-synthesizer-v2 webhook). Draft saved to DB.
                Export as TXT.
```

---

## API Reference

### CATalyst routes (existing)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Register user |
| POST | `/api/auth/login` | Login |
| GET/POST | `/api/groups` | List / create groups |
| POST | `/api/extractor/run` | Run PDF extractor workflow |
| POST | `/api/summarizer/run` | Run summarizer workflow |
| POST | `/api/gap/run` | Run gap extractor workflow |
| POST | `/api/topic/run` | Run topic suggester workflow |

### CiteWise routes (new)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/catalyst/:groupId` | Fetch topic + gaps for a group |
| POST | `/api/catalyst/import` | Import workspace → create session + persist baseline |
| POST | `/api/rrl/upload` | Upload PDFs (`X-Session-Id` header), queue n8n scoring |
| GET | `/api/v1/documents/session/:id` | List all documents + scores for a session |
| GET | `/api/v1/documents/:id/insights` | Full AI insight + evidence excerpts |
| POST | `/api/v1/documents/:id/assess` | Re-trigger n8n scoring for one document |
| PATCH | `/api/v1/documents/:id/approval` | Set `{ status: "APPROVED" \| "READY" }` |
| DELETE | `/api/v1/documents/:id` | Delete document + its insight |
| POST | `/api/v1/synthesis/generate` | Generate introduction draft via n8n RAG |
| GET | `/api/v1/synthesis/export` | Download draft (`?draftId=&format=txt`) |

---

## Assessment Performance (Dual SLA)

AI assessment latency is **not** driven by PDF page count. `selectRelevantChunks` normalizes every document to roughly 4,000-4,700 characters (cap: 9,000 chars / 6 chunks) before it is sent to n8n, so latency is dominated by the remote LLM generating scores, rationales and verbatim excerpts.

| Tier | Scope | Target | Measured (3-21 page real papers) |
|------|-------|--------|----------------------------------|
| Tier 1 | Local PDF extraction, page-offset indexing, chunk selection | <= 1.0 s | 69-497 ms |
| Tier 2 | End-to-end multi-criteria AI assessment | <= 30.0 s | 18-31 s (mean ~24 s) |

- `TARGET_MS = 30000` in `api/src/modules/citewise/helpers/assessmentTiming.js` and `api/scripts/benchmark-assessment.js`.
- `CITEWISE_N8N_READ_TIMEOUT_MS` (default 120000) absorbs cold starts well beyond the SLA.
- Each upload records `page_count`; each assessment records `assessment_duration_seconds` (receipt to completion) on `uploaded_documents` and in `assessment_timings`. These are returned as `pageCount` / `assessmentDurationSeconds` by `GET /api/v1/documents/session/:id` and `GET /api/v1/documents/:id/insights`.

### Benchmark scripts

```powershell
node api/scripts/download-test-papers.js                          # fetch real arXiv papers into test-papers/
node --env-file=api/.env api/scripts/run-assessment-benchmark.js  # live scoring benchmark (needs n8n + Supabase)
node api/scripts/benchmark-assessment.js                          # synthetic extraction benchmark
```

---

## Database Tables

### CATalyst tables (existing — do not modify)

| Table | Key columns |
|-------|-------------|
| `Group` | `id`, `name`, `color`, `description` |
| `Profile` | `id`, `user_id`, `username` |
| `Topic` | `group_id`, `title`, `rationale` |
| `GapResult` | `group_id`, `title`, `gap`, `keywords` |
| `Summary` | `group_id`, `summary` |
| `Extractor` | `group_id`, parsed sections |

### CiteWise tables (created by migration 001)

| Table | Purpose |
|-------|---------|
| `research_baselines` | Stores the research title, rationale, and gaps per session |
| `uploaded_documents` | RRL PDFs — extracted text, file hash, scoring lifecycle |
| `document_insights` | AI rubric scores (gap alignment, methodology, theory, citation) |
| `evidence_excerpts` | Supporting quote excerpts linked to each insight |
| `generated_draft` | Final RAG-synthesized introduction + APA references |
| `assessment_timings` | Per-run telemetry: `page_count`, `extraction_ms`, `ai_ms`, `total_ms`, `assessment_duration_seconds` (migrations 004-005) |

### Migrations (`api/migrations/`)

Run in order in the Supabase SQL editor: `001_r2_and_async_overhaul.sql`, `002_smart_goal_briefs.sql`, `003_smart_goal_generations.sql`, `004_page_traceability_and_timing.sql`, `005_literature_pages_and_assessment_duration.sql`. The API tolerates migration 005 not yet being applied (timing columns are skipped until it is).

---

## n8n Workflows

All 6 workflows run on `localhost:5678`. The webhook paths are configured in `api/.env`.

### CATalyst workflows

| Workflow | Webhook path | Triggered by |
|----------|-------------|--------------|
| Extractor | `N8N_EXTRACTOR_WEBHOOK` | PDF upload in workspace |
| Summarizer | `N8N_SUMMARIZER_PROD_WEBHOOK_URL` | Summarizer step |
| Gap Extractor | `N8N_GAPEXTRACTOR_PROD_WEBHOOK_URL` | Gap step |
| Topic Suggester | `N8N_TOPIC_PROD_WEBHOOK_URL` | Topic step |

### CiteWise workflows

**Semantic Scoring** (`semantic_scoring`)

Receives:
```json
{
  "extracted_text": "...",
  "baseline": { "title": "...", "rationale": "...", "researchGaps": "..." }
}
```
Returns: `gapAlignmentScore`, `methodologyScore`, `theoreticalScore`, `citationScore`, `overall`, `confidenceLevel`, `evidenceExcerpts[]`, `mismatchFlags[]`

**Synthesis** (`citewise-synthesizer-v2`)

Receives: `baseline`, `approvedDocuments[]` (with tier labels: Core / Supporting / Tangential), `synthesisInstructions`

Returns: `contentText`, `referencesText`, `sections`, `citationsUsed[]`, `validationStatus`, `metrics`

> **Tip:** All 6 workflows can be combined into one n8n workflow JSON (multiple webhook trigger nodes) for easy sharing. The two CiteWise webhook paths (`semantic_scoring`, `citewise-synthesizer-v2`) use named custom paths so they survive re-imports without needing `.env` changes. The 4 CATalyst webhooks use auto-generated UUIDs — update `api/.env` after any re-import.

---

## Directory Structure

```
CiteWise/
├── web/                          Vite React app (port 5173)
│   └── src/
│       ├── pages/                Login, Register, Home, Groups, Workspace
│       ├── components/           Navbar, GroupCard, workspace panels
│       ├── context/              AuthContext, GroupContext
│       ├── layouts/              PublicLayout, WorkspaceLayout, etc.
│       └── citewise/             CiteWise modules
│           ├── App.jsx           CiteWise step-state root
│           ├── module1/          Data Import + RRL Upload
│           ├── module2/          AI Assessment + Literature Review
│           ├── module3/          Synthesis Draft + Export
│           └── shared/           GlobalNavigationBar
│
├── api/                          Express backend (port 8081)
│   └── src/
│       ├── app.js                Route registration
│       ├── server.js             Entry point
│       ├── common/               Supabase client, auth middleware
│       └── modules/
│           ├── auth/             Register, login, JWT
│           ├── groups/           Group CRUD
│           ├── extractor/        CATalyst PDF extractor
│           ├── summarizer/       CATalyst summarizer
│           ├── gap/              CATalyst gap extractor
│           ├── topic/            CATalyst topic suggester
│           └── citewise/         CiteWise backend modules
│               ├── catalyst.routes.js   Workspace import + handoff
│               ├── rrl.routes.js        PDF upload + async n8n scoring
│               ├── documents.routes.js  Session docs, insights, approval
│               ├── synthesis.routes.js  RAG draft generation + export
│               └── helpers/
│                   ├── chunking.js      Semantic chunking for n8n payload
│                   └── rubricScoring.js AI response parser + rubric engine
│
├── db/
│   └── migrations/
│       └── 001_init_citewise_tables.sql
│
├── OLD/                          Archived reference code (not used by app)
│   ├── backend/                  Original Spring Boot Java backend
│   └── frontend/                 Original CiteWise React frontend
│
├── .env.example
├── start.bat
└── README.md
```
