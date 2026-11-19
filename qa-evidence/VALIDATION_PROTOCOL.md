# CiteWise Validation Data-Collection Protocol (T1–T8)

This protocol formalizes the session isolation, metric definitions, and SQL extraction rules required before running live participant trials (Fix #6 and Fix #11).

---

## 1. Fresh Session & Workspace Isolation Rule (Fix #6)

`deriveSessionId(userId, groupId)` (`api/src/modules/citewise/helpers/sessionId.js`) is deterministic for automated CATalyst imports (`POST /api/catalyst/import`). Re-uploading the same PDFs into the same `session_id` triggers duplicate detection (`rrl.routes.js`).

1. **Automated arm (`setup_mode = 'auto'`)**:
   - Create a **new CATalyst workspace (`group_id`) per participant per trial** (or assign one unique test account per trial).
   - Do **not** reuse a workspace across repeat trials of T1 or T3.
2. **Manual arm (`?mode=manual`, `setup_mode = 'manual'`)**:
   - `POST /api/catalyst/manual-baseline` now mints a fresh random UUID (`uuidv4()`) by default and `WorkspaceImportLayout.jsx` isolates manual `localStorage` keys under `citewise.<groupId>.manual.*`.
   - Participants should still open a clean tab (or fresh workspace) and counter-balance arm order (50% Auto → Manual, 50% Manual → Auto) to eliminate learning-order bias.
3. **Batch benchmarks (T5)**:
   - Always run via `node api/scripts/run-t5-benchmark.js`, which mints a fresh `crypto.randomUUID()` session per run and throttles requests to 16 s (`<= 40 req / 10 min`).

---

## 2. Shared Metric Definitions

| Target | Claim Definition & Threshold | Authoritative Source |
| :--- | :--- | :--- |
| **T1 Setup Time (−80%)** | `setup_completed_at - setup_started_at` where **start** = opening Module 1 (manual) or clicking Open/Import into CiteWise (auto) and **complete** = first RRL PDF upload batch returning (`POST /api/catalyst/setup-timing`). | `research_baselines` (`setup_mode`, `setup_started_at`, `setup_completed_at`) or `GET /api/catalyst/setup-timings/export?format=csv` |
| **T2 Import Fidelity (≥90%)** | Side-by-side comparison of `import_fidelity_json` (captured at import time) vs. stored `project_title`, `rationale`, and `research_gaps`. Distinguish intentional caller topic overrides (`titleOverridden`) from parse discrepancies. | `research_baselines.import_fidelity_json` |
| **T3 Parse Rate (≥95%)** | Denominator = `uploaded_documents` rows + non-duplicate `upload_rejections` rows (`UNSUPPORTED_TYPE`, `OVERSIZE`, `EMPTY`, `INVALID_MAGIC_BYTES`). Numerator = `uploaded_documents` with `extraction_status = 'OK'` (or `character_count > 0`). | `uploaded_documents.extraction_status` + `upload_rejections` |
| **T4 Latency (≤15s SRS)** | Primary claim column: **`assessment_ms`** (end-to-end scoring run excluding `reused_ai_response = true` and non-`COMPLETE` rows). Report mean, median, p95, and `% <= 15s` alongside `ai_ms` and `% <= 30s` operational SLA. | `assessment_timings` or `GET /api/v1/documents/assessment-timings?targetMs=15000` |
| **T5 Selection Accuracy (≥80%)** | Strict binary mapping: `Recommended → Relevant`; `Needs Review | Low Relevance | FAILED → Not Relevant` against `api/test-data/t5-benchmark/ground_truth.csv` (40 PDFs, SHA-256 verified in `dataset-manifest.json`). | `qa-evidence/t5-benchmark/*.csv` + `document_insights.recommendation_status` |
| **T6 Gap Coverage (100%)** | Keyphrase-overlap coverage (`threshold = 0.35`, `helpers/gapCoverage.js`) of `gaps_used_json` against `generated_draft` (`gap_text` + `content_text`), preserved in `draft_snapshots` (`snapshot_type = 'generated'`). | `draft_snapshots.gap_coverage_json` & `generated_draft.gaps_used_json` |
| **T7 Approved Cited (≥80%)** | `(usableCount - omittedCount) / usableCount` computed from the **immutable `'generated'` snapshot** before user edits or regeneration. | `draft_snapshots` (`snapshot_type = 'generated'`) |
| **T8 APA Errors (≤15%, 0 unapproved)** | Automated check (`apa_check_json.errorRatePct <= 15` and `citation_integrity_json.unverified` length = 0) on the `'generated'` snapshot, supplemented by two-rater human rubric verification on a random sample of drafts. | `draft_snapshots.apa_check_json` & `citation_integrity_json` |

---

## 3. Supabase SQL Extraction Queries (Post-Migration 006 & 007)

### T1 Setup Time
```sql
SELECT setup_mode,
       COUNT(*) AS runs,
       ROUND(AVG(EXTRACT(EPOCH FROM (setup_completed_at - setup_started_at)))::numeric, 2) AS mean_seconds
FROM research_baselines
WHERE setup_completed_at IS NOT NULL
GROUP BY setup_mode;
```

### T2 Import Fidelity
```sql
SELECT session_id, user_id,
       (import_fidelity_json ->> 'titleMatchesSource')::boolean AS title_match,
       (import_fidelity_json ->> 'titleOverridden')::boolean AS title_overridden,
       (import_fidelity_json ->> 'rationaleMatchesSource')::boolean AS rationale_match,
       (import_fidelity_json ->> 'storedGapCount')::int AS gaps_stored
FROM research_baselines
WHERE import_fidelity_json IS NOT NULL;
```

### T3 Parse Rate (Full Denominator)
```sql
WITH attempts AS (
  SELECT session_id, extraction_status = 'OK' AS parsed_ok FROM uploaded_documents
  UNION ALL
  SELECT session_id, FALSE AS parsed_ok FROM upload_rejections
  WHERE rejection_reason NOT IN ('DUPLICATE_FILENAME', 'DUPLICATE_HASH')
)
SELECT COUNT(*) FILTER (WHERE parsed_ok) AS parsed,
       COUNT(*) AS attempted,
       ROUND(100.0 * COUNT(*) FILTER (WHERE parsed_ok) / NULLIF(COUNT(*), 0), 2) AS parse_rate_pct
FROM attempts;
```

### T4 Assessment Latency (Excluding Weight-Only Re-Scores)
```sql
SELECT COUNT(*) AS runs,
       ROUND(AVG(assessment_ms) / 1000.0, 2) AS mean_assessment_s,
       ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY assessment_ms) / 1000.0, 2) AS p95_assessment_s,
       ROUND(100.0 * COUNT(*) FILTER (WHERE assessment_ms <= 15000) / NULLIF(COUNT(*), 0), 2) AS pct_within_15s,
       ROUND(100.0 * COUNT(*) FILTER (WHERE assessment_ms <= 30000) / NULLIF(COUNT(*), 0), 2) AS pct_within_30s,
       ROUND(AVG(ai_ms) / 1000.0, 2) AS mean_ai_s
FROM assessment_timings
WHERE status = 'COMPLETE' AND reused_ai_response IS NOT TRUE;
```

### T6, T7, T8 (Immutable As-Generated Snapshots)
```sql
SELECT session_id, user_id, version_number, created_at,
       (gap_coverage_json ->> 'coveragePct')::numeric AS t6_gap_coverage_pct,
       jsonb_array_length(COALESCE(citation_integrity_json -> 'omittedDocuments', '[]'::jsonb)) AS t7_omitted_count,
       (metrics_json -> 'sourceTierSummary' ->> 'usableCount')::int AS t7_usable_count,
       (apa_check_json ->> 'errorRatePct')::numeric AS t8_apa_error_pct,
       jsonb_array_length(COALESCE(citation_integrity_json -> 'unverified', '[]'::jsonb)) AS t8_unverified_count
FROM draft_snapshots
WHERE snapshot_type = 'generated'
ORDER BY created_at DESC;
```
