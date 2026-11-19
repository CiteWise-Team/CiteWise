# CiteWise Live Validation Evidence Report (T1–T8)

- **Generated At:** `2026-11-19T13:34:57.102Z`
- **Live Session ID:** `f637f54a-59af-4577-b432-c9231179d98f`
- **Synthesis Generation Time:** `37.3s`

| Target | Criterion | Observed Result | Verdict |
| :--- | :--- | :--- | :--- |
| **T1 Setup Time** | −80% vs. manual | Telemetry persisted in live DB (`9.74s` auto probe); awaiting human Auto vs. `?mode=manual` trials | **INSTRUMENTED (Needs human trials)** |
| **T2 Import Fidelity** | ≥ 90% fields match | **100%** (30/30 fields across 10 live CATalyst workspaces) | **PASS** |
| **T3 Parse Rate** | ≥ 95% text PDFs parsed | **100%** (40/40 T5 benchmark PDFs + 3/3 live probe PDFs; `upload_rejections` verified) | **PASS** |
| **T4 Assessment Latency** | ≤ 15s (SRS) / < 30s (op) | Historical live DB (n=317): mean **21.17s**, p95 **37.86s**, ≤15s: **23.13%**, ≤30s: **78.5%** | **NEEDS N8N MODEL SWAP** |
| **T5 Selection Accuracy** | ≥ 80% strict binary | **90%** (36/40; P=100%, R=80%, F1=88.89%) | **PASS** |
| **T6 Gap Coverage** | 100% imported gaps covered | **100%** (3/3 gaps; primary focus covered=true) | **PASS** |
| **T7 Approved Cited** | ≥ 80% approved papers cited | **100%** (3/3; omitted=0) | **PASS** |
| **T8 APA 7 & Unverified** | ≤ 15% APA errors, 0 unverified | **0%** format errors (0/26), **0** unverified | **PASS** |
