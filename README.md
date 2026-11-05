# CiteWise

AI-powered academic research assistant that combines **CATalyst** (research gap discovery) and **CiteWise** (RRL evaluation + introduction drafting) in a single application.

---

## Overview

CATalyst and CiteWise started as two separate projects and now live in one monorepo:

- **CATalyst** is the entry point: login, groups, workspace, and the AI workflow pipeline (extract -> summarize -> gap -> topic).
- **CiteWise** is opened from a group card via the **CiteWise** button. It picks up the group's research title, rationale and gaps automatically, then walks through RRL upload -> AI assessment -> introduction drafting.
- **CATalyst 2.0 / SMART Goals** turns an approved draft into SMART objectives (`/api/v1/smart-goals`).

The original Spring Boot Java backend has been replaced by the Express backend and is archived for reference only.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, Vite 7, Bootstrap 5.3, Tailwind 4, React Router 7, pdfjs-dist 5 |
| Backend | Node.js 20+, Express 5, express-rate-limit, Multer, express-validator |
| Database | Supabase (PostgreSQL) |
| Object storage | Cloudflare R2 (S3-compatible) for raw PDFs and parsed markdown |
| AI workflows | n8n (self-hosted, `localhost:5678`) calling Google Gemini |
| PDF parsing | `pdf-parse` (local fast path) + LlamaParse Cloud OCR (scanned PDFs) |
| Auth | Supabase Auth + JWT (`requireAuth` middleware) |
| Tests | Vitest + Supertest (API) |

---

## Ports

| Service | Port |
|---------|------|
| Frontend (Vite) | **5173** |
| Backend (Express) | **8081** |
| n8n | **5678** |

---

## Prerequisites

- Node.js 20+
- n8n running on port 5678 with the workflows from `workflows/` imported and active
- A Supabase project with the CATalyst tables (see [Database Tables](#database-tables))
- A Cloudflare R2 bucket and a LlamaParse API key (for storage and scanned-PDF OCR)

---

## First-Time Setup

### 1. Run the Supabase migrations

In the Supabase SQL editor, run the files in `api/migrations/` in order:

| File | Purpose |
|------|---------|
| `001_r2_and_async_overhaul.sql` | CiteWise tables, R2 keys, async scoring lifecycle |
| `002_smart_goal_briefs.sql` | SMART goal briefs |
| `003_smart_goal_generations.sql` | SMART goal generations |
| `004_page_traceability_and_timing.sql` | `page_count`, `page_offsets_json`, `extraction_ms`, `assessment_timings` |
| `005_literature_pages_and_assessment_duration.sql` | `assessment_duration_seconds` on `uploaded_documents` and `assessment_timings` |

The API tolerates migration 005 not being applied yet: timing columns are skipped until it is.

### 2. Configure env vars

Copy `.env.example` to `api/.env` and `web/.env` and fill in real values. Never commit them; `.env` files are gitignored.

**`api/.env`** (server only, never expose to the browser):
```env
PORT=8081
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_KEY=<service_role_key>
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
FRONTEND_URL=http://localhost:5173
N8N_BASE_URL=http://localhost:5678

# CATalyst n8n webhooks
N8N_EXTRACTOR_WEBHOOK=http://localhost:5678/webhook/<extractor-path>
N8N_SUMMARIZER_PROD_WEBHOOK_URL=http://localhost:5678/webhook/<summarizer-path>
N8N_GAPEXTRACTOR_PROD_WEBHOOK_URL=http://localhost:5678/webhook/<gap-path>
N8N_TOPIC_PROD_WEBHOOK_URL=http://localhost:5678/webhook/<topic-path>
SUPABASE_EXTRACTOR_BUCKET=extractor-files

# CiteWise n8n webhooks
CITEWISE_N8N_SCORING_WEBHOOK_URL=http://localhost:5678/webhook/citewise-evaluator-fixed
CITEWISE_N8N_SYNTHESIS_WEBHOOK_URL=http://localhost:5678/webhook/citewise-synthesizer-fixed
CITEWISE_N8N_PARAPHRASE_WEBHOOK_URL=http://localhost:5678/webhook/citewise-paraphraser-lb
CITEWISE_N8N_CONNECT_TIMEOUT_MS=5000
CITEWISE_N8N_READ_TIMEOUT_MS=120000

# Scoring input limits
CITEWISE_SCORING_MAX_CHARS_TO_N8N=9000
CITEWISE_SCORING_MAX_CHUNKS=6
CITEWISE_SCORING_CHUNK_SIZE=1000
CITEWISE_SCORING_CHUNK_OVERLAP=100

# Cloudflare R2
R2_ACCOUNT_ID=<account_id>
R2_ACCESS_KEY_ID=<access_key>
R2_SECRET_ACCESS_KEY=<secret_key>
R2_BUCKET_NAME=citewise-papers
R2_PUBLIC_URL=<public_url>

# Scanned-PDF OCR
LLAMAPARSE_API_KEY=<llamaparse_key>
```

**`web/.env`** (browser-safe only):
```env
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon_key>
VITE_API_BASE_URL=http://localhost:8081/api
```

### 3. Install dependencies

```powershell
cd api ; npm install
cd ../web ; npm install
```

### 4. Run

```powershell
# Option A: double-click
.\start.bat

# Option B: two terminals
cd api && npm run dev    # http://localhost:8081
cd web && npm run dev    # http://localhost:5173
```

Open **http://localhost:5173**.

### 5. Test and build

```powershell
npm --prefix api test            # Vitest (unit + integration)
npm --prefix web run build       # production build
```

---

## App Flow

```
http://localhost:5173/
|
+-- /                  Landing page
+-- /login /register   Auth
+-- /groups            Group dashboard
|     +-- [CiteWise]   Auto-imports the workspace into CiteWise
+-- /workspace/:id     CATalyst workflow
|     +-- Extractor -> Summarizer -> Gap Extractor -> Topic Suggester
+-- /smart-goals/:groupId   CATalyst 2.0 SMART Goals tracker
|
+-- /citewise          CiteWise flow (3 steps)
      +-- Step 0: Data Import
      |     Research title, rationale and gaps load from the chosen group.
      |     Upload RRL PDFs here (<= 20 MB each, PDF magic bytes checked).
      +-- Step 1: AI Assessment & Literature Review
      |     PDFs are scored by n8n against the baseline. Custom metric
      |     weights, batch / selected assessment, evidence page preview,
      |     approve / reject, citation override.
      +-- Step 2: Generate Introduction
            Approved docs + CATalyst baseline go to n8n (RAG). Titles,
            guided instructions, paraphrase, version history, export, and
            hand-off to SMART Goals.
```

---

## Assessment Pipeline

1. **Upload** (`POST /api/rrl/upload`): the raw PDF is stored in R2 (`raw/{sessionId}/{hash}.pdf`). Native text is extracted with `pdf-parse` and per-page character offsets are recorded (`page_count`, `page_offsets_json`).
2. **Scanned PDFs** (< 1000 extracted chars) are queued for LlamaParse OCR (concurrency 3) and the markdown is stored in R2 (`text/{sessionId}/{hash}.md`).
3. **Scoring** (`POST /api/v1/documents/:id/assess`, `assess-batch`): `selectRelevantChunks` reduces the text to roughly 4,000-4,700 characters, which n8n/Gemini scores on four weighted criteria (Gap Alignment 35%, Methodology 30%, Theory 20%, Citation Quality 15%). Auto-assessment and batch assessment each use a 4-worker pool.
4. **Classification**: Recommended / Needs Review / Low Relevance from the weighted score, confidence and evidence.
5. **Traceability**: every evidence excerpt is verified against the page offsets, so the UI can open the PDF at the cited page.
6. **Zero-inference rescoring**: the raw AI response is cached, so changing metric weights recomputes scores without another LLM call.

---

## Assessment Performance (Dual SLA)

AI assessment latency is **not** driven by PDF page count. Every document is normalized to a bounded input before it is sent to n8n (cap: 9,000 chars / 6 chunks), so latency is dominated by the remote LLM generating scores, rationales and verbatim excerpts.

| Tier | Scope | Target | Measured (3-21 page real papers) |
|------|-------|--------|----------------------------------|
| Tier 1 | Local PDF extraction, page-offset indexing, chunk selection | <= 1.0 s | 69-497 ms |
| Tier 2 | End-to-end multi-criteria AI assessment | <= 30.0 s | 18-31 s (mean ~24 s) |

- `TARGET_MS = 30000` in `api/src/modules/citewise/helpers/assessmentTiming.js` and `api/scripts/benchmark-assessment.js`.
- `CITEWISE_N8N_READ_TIMEOUT_MS` (code default 120000) absorbs cold starts well beyond the SLA.
- Each upload records `page_count`; each assessment records `assessment_duration_seconds` (receipt to completion) on `uploaded_documents` and in `assessment_timings`. They are returned as `pageCount` / `assessmentDurationSeconds` by `GET /api/v1/documents/session/:id` and `GET /api/v1/documents/:id/insights`. Aggregate stats: `GET /api/v1/documents/assessment-timings`.
- The original page-count gating idea was disproved by benchmarking and dropped.

### Benchmark scripts

```powershell
node api/scripts/download-test-papers.js                          # fetch real arXiv papers into test-papers/
node --env-file=api/.env api/scripts/run-assessment-benchmark.js  # live scoring benchmark (needs n8n + Supabase)
node api/scripts/benchmark-assessment.js                          # extraction benchmark
node api/scripts/generate-golden-set.js                           # generate benchmark PDFs
node api/scripts/generate-audit-pdf.js                            # render the documentation audit report
```

---

## API Reference

All routes except auth require `Authorization: Bearer <token>` (`requireAuth`). CiteWise routes also use an `X-Session-Id` header where noted. `/api` is limited to 1200 requests per 10 minutes; AI endpoints (`synthesis/generate`, `synthesis/paraphrase`, `documents/assess-batch`) are limited to 40 per 10 minutes.

### CATalyst routes

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Register user |
| POST | `/api/auth/login` | Login |
| GET/POST | `/api/groups` | List / create groups |
| POST | `/api/extractor/run` | Run PDF extractor workflow |
| POST | `/api/summarizer/run` | Run summarizer workflow |
| POST | `/api/gap/run` | Run gap extractor workflow |
| POST | `/api/topic/run` | Run topic suggester workflow |

### CiteWise: import and upload

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/catalyst/:groupId` | Topic + gaps for a group |
| GET | `/api/catalyst/:groupId/topics` | Candidate topics for a group |
| POST | `/api/catalyst/import` | Import workspace: create session + persist baseline |
| POST | `/api/rrl/upload` | Upload PDFs (`X-Session-Id`), extract, queue scoring |
| POST | `/api/rrl/reextract-metadata/:sessionId` | Re-run citation metadata extraction |

### CiteWise: documents and assessment

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/documents/session-for-group/:groupId` | Resolve the session id for a group |
| GET | `/api/v1/documents/session/:sessionId` | Documents + scores + `pageCount` + `assessmentDurationSeconds` |
| GET | `/api/v1/documents/:id/insights` | Full AI insight + evidence excerpts + timing |
| GET | `/api/v1/documents/:id/page` | Page text / excerpt location for a document |
| GET | `/api/v1/documents/:id/pdf` | Presigned URL for the source PDF |
| GET | `/api/v1/documents/assessment-timings` | Aggregate assessment timing statistics |
| POST | `/api/v1/documents/:id/assess` | (Re)assess one document |
| POST | `/api/v1/documents/assess-batch` | Assess several documents with custom weights |
| PATCH | `/api/v1/documents/:id/approval` | Approve / unapprove |
| PATCH | `/api/v1/documents/:id/citation_override` | Manual APA citation override |
| DELETE | `/api/v1/documents/:id` | Delete document + insight |

### CiteWise: synthesis

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/synthesis/titles` | Suggest working titles from gaps |
| POST | `/api/v1/synthesis/generate` | Start introduction draft generation (async, HTTP 202) |
| GET | `/api/v1/synthesis/status` | Poll generation status |
| POST | `/api/v1/synthesis/paraphrase` | Start paraphrase (async) |
| GET | `/api/v1/synthesis/paraphrase/status` | Poll paraphrase status |
| POST | `/api/v1/synthesis/update-citations` | Reconcile in-text citations and references |
| POST | `/api/v1/synthesis/save-draft` | Save an edited draft |
| GET | `/api/v1/synthesis/export` | Download draft (`?draftId=&format=`) |

### SMART Goals

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/smart-goals/generate` | Generate SMART objectives from a draft |
| POST | `/api/v1/smart-goals/save` | Save objectives |
| GET | `/api/v1/smart-goals/saved/:groupId` | Load saved objectives |

---

## Database Tables

### CATalyst tables (existing, do not modify)

| Table | Key columns |
|-------|-------------|
| `Group` | `id`, `name`, `color`, `description` |
| `Profile` | `id`, `user_id`, `username` |
| `Topic` | `group_id`, `title`, `rationale` |
| `GapResult` | `group_id`, `title`, `gap`, `keywords` |
| `Summary` | `group_id`, `summary` |
| `Extractor` | `group_id`, parsed sections |

### CiteWise tables

| Table | Purpose |
|-------|---------|
| `research_baselines` | Research title, rationale and gaps per session |
| `uploaded_documents` | RRL PDFs: R2 keys, file hash, `page_count`, `page_offsets_json`, extraction method/ms, scoring lifecycle, `assessment_duration_seconds` |
| `document_insights` | AI rubric scores, flags, confidence, cached raw AI response |
| `evidence_excerpts` | Verbatim quotes with `page_number` and `page_verified` |
| `assessment_timings` | Per-run telemetry: `page_count`, `extraction_ms`, `ai_ms`, `total_ms`, `assessment_duration_seconds` |
| `generated_draft` | RAG-synthesized introduction + APA references |

---

## n8n Workflows

Workflow exports live in `workflows/`. The webhook paths are configured in `api/.env`.

### CATalyst workflows

| Workflow | Env var | Triggered by |
|----------|---------|--------------|
| Extractor | `N8N_EXTRACTOR_WEBHOOK` | PDF upload in workspace |
| Summarizer | `N8N_SUMMARIZER_PROD_WEBHOOK_URL` | Summarizer step |
| Gap Extractor | `N8N_GAPEXTRACTOR_PROD_WEBHOOK_URL` | Gap step |
| Topic Suggester | `N8N_TOPIC_PROD_WEBHOOK_URL` | Topic step |

### CiteWise workflows

| Workflow | Env var | Purpose |
|----------|---------|---------|
| Semantic scoring (`citewise-evaluator-fixed`) | `CITEWISE_N8N_SCORING_WEBHOOK_URL` | Rubric scoring + evidence excerpts |
| Synthesis (`citewise-synthesizer-fixed`) | `CITEWISE_N8N_SYNTHESIS_WEBHOOK_URL` | RAG introduction drafting |
| Paraphraser (`citewise-paraphraser-lb`) | `CITEWISE_N8N_PARAPHRASE_WEBHOOK_URL` | Single-pass, token-protected paraphrase |

**Scoring** receives `extracted_text` and a `baseline` (`title`, `rationale`, `researchGaps`) and returns `gapAlignmentScore`, `methodologyScore`, `theoreticalScore`, `citationScore`, `overall`, `confidenceLevel`, `evidenceExcerpts[]`, `mismatchFlags[]`.

**Synthesis** receives `baseline`, `approvedDocuments[]` (with Core / Supporting / Background tiers) and `synthesisInstructions`, and returns `contentText`, `referencesText`, `sections`, `citationsUsed[]`, `validationStatus`, `metrics`.

The paraphraser protects citations and headers with `«CITn»` / `«HDRn»` tokens and restores them afterwards.

> **Tip:** the CATalyst webhooks use auto-generated UUID paths, so update `api/.env` after any re-import. The CiteWise webhooks use named paths and survive re-imports.

---

## Testing

```powershell
npm --prefix api test
```

Test files live in `api/src/__tests__/` and cover auth, CiteWise scoring, page traceability, assessment timing and duration, R2 and async flows, excluded-source synthesis, async paraphrase, SMART goals and regression fixes.

---

## Directory Structure

```
CiteWise/
+-- web/                          Vite React app (port 5173)
|   +-- src/
|       +-- pages/                Login, Register, Home, Groups, Workspace
|       +-- components/           Navbar, GroupCard, workspace panels
|       +-- context/              AuthContext, GroupContext
|       +-- layouts/              PublicLayout, WorkspaceLayout, etc.
|       +-- routes/  hooks/  api/  styles/  assets/
|       +-- citewise/             CiteWise modules
|           +-- module1/          catalyst-import, rrl-upload
|           +-- module2/          ai-assessment, literature-review
|           +-- module3/          synthesis-draft (components, utils)
|           +-- shared/           GlobalNavigationBar, shared utils
|           +-- lib/
|
+-- api/                          Express backend (port 8081)
|   +-- src/
|   |   +-- app.js                Route registration, CORS, rate limiting
|   |   +-- server.js             Entry point
|   |   +-- common/               config (Supabase, R2), middlewares (auth, errors)
|   |   +-- modules/
|   |   |   +-- auth/ groups/ extractor/ summarizer/ gap/ topic/
|   |   |   +-- citewise/
|   |   |       +-- catalyst.routes.js     Workspace import + handoff
|   |   |       +-- rrl.routes.js          Upload, extraction, async scoring
|   |   |       +-- documents.routes.js    Session docs, insights, approval, timings
|   |   |       +-- synthesis.routes.js    RAG draft, paraphrase, export
|   |   |       +-- smartGoals.routes.js   SMART goals
|   |   |       +-- helpers/               chunking, rubricScoring, pageText,
|   |   |                                  citationTrace, citationMetadata,
|   |   |                                  documentPages, assessmentTiming, sessionId
|   |   +-- __tests__/            Vitest suites
|   +-- migrations/               001-005 SQL migrations
|   +-- scripts/                  Benchmarks, golden set, audit report generator
|
+-- workflows/                    n8n workflow exports
+-- docs/                         SRS, SDD, STD, traceability, audit report
+-- test-papers/                  Created by download-test-papers.js (PDFs are gitignored)
+-- .env.example
+-- start.bat
+-- README.md
```
