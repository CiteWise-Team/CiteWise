"""
Render high-fidelity PDF for CiteWise Usability Testing Validation Plan & Framework (PSSUQ v2.0).
Matches the visual framework and layout from the uploaded PDF document and capstone templates.
"""

import os, sys, shutil
from pathlib import Path
from playwright.sync_api import sync_playwright

REPO_DIR = os.path.abspath('c:/Users/admin/Documents/CiteWise/CiteWise')
DOCS_DIR = os.path.join(REPO_DIR, 'docs')
ROOT_DIR = os.path.abspath('c:/Users/admin/Documents/CiteWise')

HTML_PATH = os.path.join(DOCS_DIR, '2627-sem1-it411-39_Usability_Testing_Validation_Plan.html')
PDF_OUT = os.path.join(DOCS_DIR, '2627-sem1-it411-39_Usability_Testing_Validation_Plan.pdf')
ROOT_PDF = os.path.join(ROOT_DIR, '2627-sem1-it411-39_Usability_Testing_Validation_Plan.pdf')

HTML_CONTENT = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>CiteWise — Usability Testing Validation Plan & Framework (PSSUQ v2.0)</title>
<style>
    @page {
    size: letter;
    margin: 0.35in 0.45in;
  }
  * {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    color: #1e293b;
    margin: 0;
    padding: 0;
    font-size: 7.8pt;
    line-height: 1.28;
    background: #ffffff;
  }
  .page {
    page-break-after: always;
    page-break-inside: avoid;
    break-after: page;
    break-inside: avoid;
    position: relative;
    height: 10.1in;
    max-height: 10.1in;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    overflow: hidden;
  }
  .page:last-child {
    page-break-after: avoid;
    break-after: avoid;
  }
  
  /* Running Header & Footer */
  .running-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1.5px solid #1e3a8a;
    padding-bottom: 4px;
    margin-bottom: 6px;
    font-size: 7.1pt;
    color: #475569;
    font-weight: 500;
  }
  .running-header .title {
    font-weight: 700;
    color: #0f172a;
  }
  .running-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1px solid #cbd5e1;
    padding-top: 5px;
    margin-top: 6px;
    font-size: 7pt;
    color: #64748b;
  }

  /* Section Header Banner */
  .section-banner {
    background: #1e3a8a;
    color: #ffffff;
    padding: 4px 8px;
    font-size: 10pt;
    font-weight: 700;
    letter-spacing: 0.3px;
    margin-top: 6px;
    margin-bottom: 6px;
    border-radius: 2px;
  }
  .subsection-title {
    font-size: 8.8pt;
    font-weight: 700;
    color: #1e3a8a;
    margin-top: 5px;
    margin-bottom: 4px;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 2px;
  }

  p {
    margin: 0 0 5px 0;
    text-align: justify;
  }
  ul {
    margin: 3px 0 6px 16px;
    padding: 0;
  }
  li {
    margin-bottom: 3px;
  }

  /* Tables */
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 3px 0 5px 0;
    font-size: 7.1pt;
  }
  th {
    background: #1e3a8a;
    color: #ffffff;
    font-weight: 600;
    text-align: left;
    padding: 3px 5px;
    border: 1px solid #1e3a8a;
  }
  td {
    padding: 2px 5px;
    border: 1px solid #cbd5e1;
    vertical-align: top;
  }
  tr:nth-child(even) td {
    background: #f8fafc;
  }

  /* Badges */
  .badge {
    display: inline-block;
    padding: 1.5px 6px;
    border-radius: 3px;
    font-size: 6.8pt;
    font-weight: 700;
    text-transform: uppercase;
    text-align: center;
  }
  .badge-pass, .badge-verified, .badge-met {
    background: #dcfce7;
    color: #166534;
    border: 1px solid #bbf7d0;
  }
  .badge-pending, .badge-open, .badge-monitor {
    background: #fef9c3;
    color: #854d0e;
    border: 1px solid #fef08a;
  }
  .badge-crit {
    background: #fee2e2;
    color: #991b1b;
    border: 1px solid #fecaca;
  }
  .badge-sev2 {
    background: #ffedd5;
    color: #9a3412;
    border: 1px solid #fed7aa;
  }
  .badge-sev3 {
    background: #e0f2fe;
    color: #0369a1;
    border: 1px solid #bae6fd;
  }
  .badge-sev4 {
    background: #f3e8ff;
    color: #6b21a8;
    border: 1px solid #e9d5ff;
  }

  /* KPI Box Grid */
  .kpi-container {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    margin: 6px 0 8px 0;
  }
  .kpi-box {
    border: 1.5px solid #cbd5e1;
    border-radius: 4px;
    padding: 6px;
    text-align: center;
    background: #ffffff;
  }
  .kpi-val {
    font-size: 15pt;
    font-weight: 800;
    color: #059669;
    line-height: 1.1;
  }
  .kpi-lbl {
    font-size: 7.2pt;
    font-weight: 600;
    color: #475569;
    margin-top: 2px;
  }
  .kpi-sub {
    font-size: 6.5pt;
    color: #94a3b8;
  }

  /* Likert visual scale */
  .likert-scale {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 4px;
    margin: 6px 0;
  }
  .likert-item {
    border: 1px solid #cbd5e1;
    border-radius: 3px;
    text-align: center;
    padding: 3px 2px;
  }
  .likert-num {
    font-size: 9pt;
    font-weight: 800;
  }
  .likert-desc {
    font-size: 6.5pt;
    font-weight: 600;
    line-height: 1.1;
  }
  .likert-1 { background: #dcfce7; color: #166534; border-color: #86efac; }
  .likert-2 { background: #ecfdf5; color: #047857; border-color: #a7f3d0; }
  .likert-3 { background: #f0fdf4; color: #15803d; border-color: #bbf7d0; }
  .likert-4 { background: #f1f5f9; color: #475569; border-color: #cbd5e1; }
  .likert-5 { background: #fffbeb; color: #b45309; border-color: #fde68a; }
  .likert-6 { background: #ffedd5; color: #c2410c; border-color: #fed7aa; }
  .likert-7 { background: #fee2e2; color: #b91c1c; border-color: #fca5a5; }

  /* Callout boxes */
  .callout {
    border-left: 3px solid #1e3a8a;
    background: #f8fafc;
    padding: 6px 8px;
    margin: 6px 0;
    font-size: 7.1pt;
  }
  .callout-amber {
    border-left-color: #d97706;
    background: #fffbeb;
    color: #92400e;
  }

  /* Cover Page Styles */
  .cover-top-banner {
    background: #1e3a8a;
    color: #ffffff;
    text-align: center;
    padding: 6px 10px;
    font-size: 7.1pt;
    font-weight: 700;
    letter-spacing: 1.2px;
  }
  .cover-body {
    text-align: center;
    padding: 30px 20px;
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
  }
  .cover-pre {
    font-size: 8.5pt;
    font-weight: 600;
    color: #64748b;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    margin-bottom: 6px;
  }
  .cover-title {
    font-family: Georgia, "Times New Roman", serif;
    font-size: 28pt;
    font-weight: 700;
    color: #0f172a;
    margin-bottom: 4px;
  }
  .cover-sub {
    font-size: 13pt;
    font-weight: 600;
    color: #334155;
    margin-bottom: 6px;
  }
  .cover-instrument {
    font-size: 9pt;
    color: #1e3a8a;
    font-weight: 700;
    padding: 4px 14px;
    border-top: 1.5px solid #1e3a8a;
    border-bottom: 1.5px solid #1e3a8a;
    margin-bottom: 24px;
    display: inline-block;
  }
  .cover-meta {
    font-size: 8pt;
    color: #334155;
    line-height: 1.6;
    max-width: 500px;
    margin-bottom: 24px;
  }
  .cover-meta strong {
    color: #0f172a;
  }
  .cover-badge {
    background: #fef3c7;
    border: 1.5px solid #f59e0b;
    color: #92400e;
    font-size: 8pt;
    font-weight: 700;
    padding: 3px 14px;
    border-radius: 4px;
    letter-spacing: 1.5px;
    display: inline-block;
    margin-bottom: 20px;
  }
  .cover-footer-note {
    font-size: 7pt;
    color: #64748b;
    border-top: 1px solid #cbd5e1;
    padding-top: 8px;
    text-align: center;
    line-height: 1.4;
  }
</style>
</head>
<body>

<!-- ════════════════════════ PAGE 1: COVER ════════════════════════ -->
<div class="page">
  <div class="cover-top-banner">
    IT411 CAPSTONE PROJECT &nbsp;·&nbsp; 2627-SEM1-IT411-39 &nbsp;·&nbsp; IT411-G3
  </div>

  <div class="cover-body">
    <div class="cover-pre">FORMAL VALIDATION DOCUMENT</div>
    <div class="cover-title">CiteWise</div>
    <div class="cover-sub">Usability Testing Validation Plan<br>and Framework</div>
    
    <div class="cover-instrument">
      PSSUQ (Post-Study System Usability Questionnaire)<br>
      <span style="font-size: 7.1pt; font-weight: 500; color: #475569;">Lewis (1992/2002) · 7-Point Scale · 19 Items</span>
    </div>

    <div class="cover-meta">
      <strong>System:</strong> CiteWise — AI-Powered Research Writing Assistant<br>
      <strong>Frontend URL:</strong> https://citewise-seven.vercel.app<br>
      <strong>Backend URL:</strong> https://citewise-2220a55a4660.herokuapp.com/api<br>
      <strong>Academic Year / Semester:</strong> 2026–2027, Semester 1<br>
      <strong>Course Code:</strong> IT411 &nbsp;|&nbsp; <strong>Section:</strong> IT411-G3<br>
      <strong>Project Code:</strong> 2627-sem1-IT411-39<br><br>
      <strong>Prepared by:</strong><br>
      Rabe, Pranz Nicole C. &nbsp;|&nbsp; Ramirez, Ruther Gerard L.<br>
      Reyes, Christian Andrey V. &nbsp;|&nbsp; Encallado, Sophia Bianca A.<br>
      Badinas, Gregory Ivan Onyx M.<br><br>
      <strong>Adviser:</strong> Mrs. Erica Jean Abadinas<br>
      <strong>Document Date:</strong> November 2026<br>
      <strong>Document Version:</strong> 2.0<br>
      <strong>Supersedes:</strong> CiteWise Usability Testing Validation Plan v1.0 (SUS-based)
    </div>

    <div class="cover-badge">ACADEMIC — CONFIDENTIAL</div>

    <div class="cover-footer-note">
      This document constitutes the formal usability validation plan for CiteWise and must be read alongside the Software Requirements Specification (2627-sem1-it411-39_SRS) and the MVP Validation Findings Report. All empirical data cited herein reflects verified test sessions conducted between September 21–28, 2026.
    </div>
  </div>
</div>

<!-- ════════════════════════ PAGE 2: TOC & SEC 1 ════════════════════════ -->
<div class="page">
  <div class="running-header">
    <span class="title">CiteWise — PSSUQ Usability Testing Validation Plan & Framework</span>
    <span>Version 2.0 · November 2026</span>
  </div>

  <div>
    <div class="section-banner">§ Table of Contents</div>
    <table>
      <tr>
        <th style="width: 30px;">§</th>
        <th>Section</th>
        <th style="width: 50px; text-align: right;">Page</th>
      </tr>
      <tr><td>1</td><td><strong>Executive Summary & Theoretical Framework</strong></td><td style="text-align: right;">3</td></tr>
      <tr><td>2</td><td><strong>Usability Testing Scope & Module Coverage</strong></td><td style="text-align: right;">4</td></tr>
      <tr><td>3</td><td><strong>Participant Sampling & Demographics</strong></td><td style="text-align: right;">4</td></tr>
      <tr><td>4</td><td><strong>PSSUQ Instrument — Scale, Items & Subscales</strong></td><td style="text-align: right;">5</td></tr>
      <tr><td>5</td><td><strong>Acceptance Criteria & Exit Thresholds</strong></td><td style="text-align: right;">6</td></tr>
      <tr><td>6</td><td><strong>Data Collection Protocol & Task Administration</strong></td><td style="text-align: right;">7</td></tr>
      <tr><td>7</td><td><strong>Empirical Baseline from MVP Validation</strong></td><td style="text-align: right;">8</td></tr>
      <tr><td>8</td><td><strong>Defect Triage & Severity Classification</strong></td><td style="text-align: right;">9</td></tr>
      <tr><td>9</td><td><strong>Test Administration Governance & Sign-Off</strong></td><td style="text-align: right;">10</td></tr>
    </table>

    <div class="section-banner">1 Executive Summary & Theoretical Framework</div>
    <p>
      This document defines the formal usability testing validation plan and measurement framework for <strong>CiteWise</strong>, an AI-powered research writing assistant developed under IT411 Capstone Project (2627-sem1-IT411-39, AY 2026–2027, Semester 1). It supersedes Version 1.0 of this plan, which employed the System Usability Scale (SUS; Brooke, 1996) as its primary psychometric instrument. This version adopts the <strong>Post-Study System Usability Questionnaire (PSSUQ)</strong> developed by James R. Lewis (1992; revised 2002) as the primary usability evaluation instrument.
    </p>

    <div class="subsection-title">1.1 Rationale for Instrument Transition</div>
    <p>PSSUQ was selected over SUS for the following methodologically grounded reasons:</p>
    <ul>
      <li><strong>Multi-dimensional diagnostics:</strong> PSSUQ yields three analytically independent subscale scores — <em>System Usefulness (SYSUSE)</em>, <em>Information Quality (INFOQUAL)</em>, and <em>Interface Quality (INTERQUAL)</em> — enabling pinpoint identification of which usability dimension requires improvement rather than producing a single aggregated score.</li>
      <li><strong>7-point response scale:</strong> The 7-point Likert scale provides greater response sensitivity and statistical variance compared to SUS's 5-point alternating-polarity format, reducing floor/ceiling effects in highly usable systems.</li>
      <li><strong>Academic benchmark data:</strong> Lewis (2002) provides published normative benchmarks (Overall mean &mu; = 2.82, SD = 0.84) derived from IBM post-study sessions, enabling direct comparison against industry-validated standards.</li>
      <li><strong>Positive item phrasing:</strong> All 19 PSSUQ items are phrased consistently in the positive direction, eliminating the alternating-polarity scoring complexity of SUS and reducing respondent cognitive burden.</li>
      <li><strong>Consistency with ISO/IEC 25010:2023:</strong> PSSUQ's three subscales directly map to ISO/IEC 25010 quality-in-use characteristics: Effectiveness (SYSUSE), Learnability (INFOQUAL), and Aesthetics / Usability (INTERQUAL).</li>
    </ul>

    <div class="subsection-title">1.2 Governing Standards & References</div>
    <table>
      <tr>
        <th style="width: 40%;">Standard / Reference</th>
        <th>Applicability</th>
      </tr>
      <tr>
        <td><strong>ISO/IEC 25010:2023 (SQuaRE)</strong></td>
        <td>Quality-in-use model; product quality characteristics</td>
      </tr>
      <tr>
        <td><strong>Lewis, J. R. (1992/2002) — PSSUQ</strong></td>
        <td>Primary psychometric instrument (19 items, 7-point scale)</td>
      </tr>
      <tr>
        <td><strong>Basili, V. — GQM Framework</strong></td>
        <td>Goal–Question–Metric measurement decomposition</td>
      </tr>
      <tr>
        <td><strong>APA 7th Edition</strong></td>
        <td>Governing citation format validated by CiteWise</td>
      </tr>
      <tr>
        <td><strong>IEEE Std 829 / ISTQB</strong></td>
        <td>Test documentation and defect triage conventions</td>
      </tr>
      <tr>
        <td><strong>2627-sem1-it411-39 SRS (2026)</strong></td>
        <td>Functional and non-functional system requirements baseline</td>
      </tr>
    </table>
  </div>

  <div class="running-footer">
    <span>2627-sem1-IT411-39 · IT411-G3 · CiteWise</span>
    <span>PSSUQ Validation Plan v2.0 — Page 2</span>
    <span>Academic — Confidential</span>
  </div>
</div>

<!-- ════════════════════════ PAGE 3: SEC 2 & SEC 3 ════════════════════════ -->
<div class="page">
  <div class="running-header">
    <span class="title">CiteWise — PSSUQ Usability Testing Validation Plan & Framework</span>
    <span>Version 2.0 · November 2026</span>
  </div>

  <div>
    <div class="section-banner">2 Usability Testing Scope & Module Coverage</div>
    <p>
      Usability testing encompasses all three functional modules of CiteWise. Each module is validated through specific task scenarios (UT-01 to UT-04) that simulate authentic end-user research workflows.
    </p>

    <table>
      <tr>
        <th style="width: 18%;">Module</th>
        <th style="width: 24%;">Feature Area</th>
        <th>Core User Tasks Evaluated</th>
        <th style="width: 12%;">Task ID(s)</th>
        <th style="width: 18%;">ISO 25010 Attribute</th>
      </tr>
      <tr>
        <td><strong>Module 1</strong><br>Research Input & Synthesis</td>
        <td>CATalyst Upload, RRL Parser, Semantic Gap Discovery</td>
        <td>Upload research literature (PDF), trigger synthesis pipeline, review gap analysis</td>
        <td>UT-01, UT-02</td>
        <td>Effectiveness, Efficiency</td>
      </tr>
      <tr>
        <td><strong>Module 2</strong><br>AI Assessment Engine</td>
        <td>AI Scoring, Feedback Generation, Title Synthesis</td>
        <td>Submit manuscript for AI assessment; interpret feedback; revise based on AI suggestions</td>
        <td>UT-02, UT-03</td>
        <td>Effectiveness, Satisfaction</td>
      </tr>
      <tr>
        <td><strong>Module 3</strong><br>Citation Manager</td>
        <td>APA 7 Formatter, Reference Validation, Export</td>
        <td>Generate APA 7 citation; validate reference list accuracy; export formatted document</td>
        <td>UT-03, UT-04</td>
        <td>Learnability, Satisfaction</td>
      </tr>
    </table>

    <div class="callout">
      <strong>Scope Boundary:</strong> Administrative features (user account management, system configuration) are excluded from usability testing. Performance and load testing are governed by a separate test evidence framework (see <code>qa-evidence/performance/</code>).
    </div>

    <div class="subsection-title">2.1 GQM Decomposition</div>
    <table>
      <tr>
        <th style="width: 28%;">Goal (G)</th>
        <th style="width: 32%;">Question (Q)</th>
        <th>Metric (M)</th>
      </tr>
      <tr>
        <td>Measure perceived usability of CiteWise</td>
        <td>How easy is the system to use overall?</td>
        <td>PSSUQ Overall score &le; 2.5 (Lewis 2002 benchmark: 2.82)</td>
      </tr>
      <tr>
        <td>Assess system usefulness for research tasks</td>
        <td>Can users complete core tasks effectively?</td>
        <td>Task Completion Rate (TCR) &ge; 90%; SYSUSE subscale &le; 2.6</td>
      </tr>
      <tr>
        <td>Evaluate information & feedback quality</td>
        <td>Are on-screen messages and guidance clear?</td>
        <td>INFOQUAL subscale &le; 2.7</td>
      </tr>
      <tr>
        <td>Validate interface visual design</td>
        <td>Is the UI pleasant and intuitive?</td>
        <td>INTERQUAL subscale &le; 2.5</td>
      </tr>
      <tr>
        <td>Confirm AI response time SLA</td>
        <td>Does AI assessment complete within 15 seconds?</td>
        <td>&ge; 75% of AI assessments &le; 15 s; P95 &le; 30 s</td>
      </tr>
    </table>

    <div class="section-banner">3 Participant Sampling & Demographics</div>
    <div class="subsection-title">3.1 Sample Summary</div>
    <div class="kpi-container">
      <div class="kpi-box">
        <div class="kpi-val">24</div>
        <div class="kpi-lbl">Total Participants</div>
      </div>
      <div class="kpi-box">
        <div class="kpi-val" style="color: #0284c7;">Sep 21–28</div>
        <div class="kpi-lbl">Testing Window (2026)</div>
      </div>
      <div class="kpi-box">
        <div class="kpi-val" style="color: #475569;">End Users</div>
        <div class="kpi-lbl">Role Classification</div>
      </div>
    </div>
    <p>
      Participants were recruited using purposive sampling targeting fourth-year Information Technology students as the primary end-user persona of CiteWise. The sample size of N=24 satisfies the minimum threshold recommended by Nielsen & Landauer (1993) for quantitative usability studies (N&ge;20).
    </p>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
      <div>
        <div class="subsection-title">3.2 Year Level Distribution</div>
        <table>
          <tr><th>Year Level</th><th style="width: 50px;">Count</th><th style="width: 50px;">%</th></tr>
          <tr><td>4th Year</td><td>23</td><td>95.8%</td></tr>
          <tr><td>3rd Year</td><td>1</td><td>4.2%</td></tr>
          <tr style="font-weight: 700; background: #e2e8f0;"><td>Total</td><td>24</td><td>100%</td></tr>
        </table>
      </div>
      <div>
        <div class="subsection-title">3.3 Program / Degree Distribution</div>
        <table>
          <tr><th>Program</th><th style="width: 50px;">Count</th><th style="width: 50px;">%</th></tr>
          <tr><td>BS Information Technology (BSIT)</td><td>18</td><td>75.0%</td></tr>
          <tr><td>BS Psychology (BSPsych)</td><td>3</td><td>12.5%</td></tr>
          <tr><td>BS Civil Engineering (BSCE)</td><td>1</td><td>4.2%</td></tr>
          <tr><td>BS Business Administration (BSBA)</td><td>1</td><td>4.2%</td></tr>
          <tr><td>BS Computer Science (BSCS)</td><td>1</td><td>4.2%</td></tr>
          <tr style="font-weight: 700; background: #e2e8f0;"><td>Total</td><td>24</td><td>100%</td></tr>
        </table>
      </div>
    </div>

    <div class="subsection-title">3.4 Sampling Strategy & Inclusion Criteria</div>
    <ul>
      <li>Must be an enrolled undergraduate student who has conducted or is currently conducting academic research</li>
      <li>Must have prior experience using word processors or reference management tools</li>
      <li>Must not be a member of the CiteWise development team</li>
      <li>Participation is strictly voluntary; informed consent obtained prior to testing session</li>
    </ul>
  </div>

  <div class="running-footer">
    <span>2627-sem1-IT411-39 · IT411-G3 · CiteWise</span>
    <span>PSSUQ Validation Plan v2.0 — Page 3</span>
    <span>Academic — Confidential</span>
  </div>
</div>

<!-- ════════════════════════ PAGE 4: SEC 4 ════════════════════════ -->
<div class="page">
  <div class="running-header">
    <span class="title">CiteWise — PSSUQ Usability Testing Validation Plan & Framework</span>
    <span>Version 2.0 · November 2026</span>
  </div>

  <div>
    <div class="section-banner">4 PSSUQ Instrument — Scale, Items & Subscales</div>
    <div class="subsection-title">4.1 Response Scale</div>
    <p>
      Each of the 19 PSSUQ items is rated on a 7-point Likert scale anchored at <strong>1 = Strongly Agree</strong> and <strong>7 = Strongly Disagree</strong>. For PSSUQ, <em>lower scores indicate higher usability</em> — the inverse of most satisfaction instruments.
    </p>

    <div class="likert-scale">
      <div class="likert-item likert-1"><div class="likert-num">1</div><div class="likert-desc">Strongly<br>Agree</div></div>
      <div class="likert-item likert-2"><div class="likert-num">2</div><div class="likert-desc">Agree</div></div>
      <div class="likert-item likert-3"><div class="likert-num">3</div><div class="likert-desc">Somewhat<br>Agree</div></div>
      <div class="likert-item likert-4"><div class="likert-num">4</div><div class="likert-desc">Neither</div></div>
      <div class="likert-item likert-5"><div class="likert-num">5</div><div class="likert-desc">Somewhat<br>Disagree</div></div>
      <div class="likert-item likert-6"><div class="likert-num">6</div><div class="likert-desc">Disagree</div></div>
      <div class="likert-item likert-7"><div class="likert-num">7</div><div class="likert-desc">Strongly<br>Disagree</div></div>
    </div>

    <div class="callout">
      <strong>Scoring Direction:</strong> Score = mean of item responses within subscale. <strong>Lower = Better</strong>. Items left blank are excluded from the mean calculation for that subscale (not set to 0). Overall PSSUQ = mean of all 19 items (or items 1–18 in the 18-item version; this plan uses the 19-item Lewis 2002 version).
    </div>

    <div class="subsection-title">4.2 PSSUQ Item Bank by Subscale (Lewis, 2002)</div>
    
    <div style="font-weight: 700; font-size: 7.8pt; color: #1e3a8a; margin: 4px 0 2px 0;">SYSUSE — System Usefulness (Items 1–8)</div>
    <table>
      <tr><th style="width: 15%;">Item</th><th>Statement</th></tr>
      <tr><td><strong>PSSUQ-1</strong></td><td>Overall, I am satisfied with how easy it is to use this system.</td></tr>
      <tr><td><strong>PSSUQ-2</strong></td><td>It was simple to use this system.</td></tr>
      <tr><td><strong>PSSUQ-3</strong></td><td>I was able to complete the tasks and scenarios quickly using this system.</td></tr>
      <tr><td><strong>PSSUQ-4</strong></td><td>I felt comfortable using this system.</td></tr>
      <tr><td><strong>PSSUQ-5</strong></td><td>It was easy to learn to use this system.</td></tr>
      <tr><td><strong>PSSUQ-6</strong></td><td>I believe I could become productive quickly using this system.</td></tr>
      <tr><td><strong>PSSUQ-7</strong></td><td>The system gave error messages that clearly told me how to fix problems.</td></tr>
      <tr><td><strong>PSSUQ-8</strong></td><td>Whenever I made a mistake using the system, I could recover easily and quickly.</td></tr>
    </table>

    <div style="font-weight: 700; font-size: 7.8pt; color: #1e3a8a; margin: 4px 0 2px 0;">INFOQUAL — Information Quality (Items 9–15)</div>
    <table>
      <tr><th style="width: 15%;">Item</th><th>Statement</th></tr>
      <tr><td><strong>PSSUQ-9</strong></td><td>The information (such as online help, on-screen messages, and other documentation) provided with this system was clear.</td></tr>
      <tr><td><strong>PSSUQ-10</strong></td><td>It was easy to find the information I needed.</td></tr>
      <tr><td><strong>PSSUQ-11</strong></td><td>The information provided for the system was easy to understand.</td></tr>
      <tr><td><strong>PSSUQ-12</strong></td><td>The information was effective in helping me complete the tasks and scenarios.</td></tr>
      <tr><td><strong>PSSUQ-13</strong></td><td>The organization of information on the system screens was clear.</td></tr>
      <tr><td><strong>PSSUQ-14</strong></td><td>The interface of this system was pleasant.</td></tr>
      <tr><td><strong>PSSUQ-15</strong></td><td>I liked using the interface of this system.</td></tr>
    </table>

    <div style="font-weight: 700; font-size: 7.8pt; color: #1e3a8a; margin: 4px 0 2px 0;">INTERQUAL — Interface Quality (Items 16–18)</div>
    <table>
      <tr><th style="width: 15%;">Item</th><th>Statement</th></tr>
      <tr><td><strong>PSSUQ-16</strong></td><td>This system has all the functions and capabilities I expect it to have.</td></tr>
      <tr><td><strong>PSSUQ-17</strong></td><td>Overall, I am satisfied with this system.</td></tr>
      <tr><td><strong>PSSUQ-18</strong></td><td>There is no inconsistency in the visual design of this system.</td></tr>
    </table>

    <div style="font-weight: 700; font-size: 7.8pt; color: #1e3a8a; margin: 4px 0 2px 0;">OVERALL — Overall Satisfaction (Item 19)</div>
    <table>
      <tr><th style="width: 15%;">Item</th><th>Statement</th></tr>
      <tr><td><strong>PSSUQ-19</strong></td><td>Overall, I am satisfied with this system. (Global summary item)</td></tr>
    </table>

    <div class="subsection-title">4.3 Subscale Scoring Formulae</div>
    <table>
      <tr>
        <th style="width: 20%;">Subscale</th>
        <th style="width: 20%;">Items Included</th>
        <th>Formula</th>
        <th style="width: 25%;">Lewis 2002 Norm (&mu;)</th>
      </tr>
      <tr><td><strong>SYSUSE</strong></td><td>1–8</td><td>Mean(Items 1 to 8)</td><td>2.76 (SD 0.90)</td></tr>
      <tr><td><strong>INFOQUAL</strong></td><td>9–15</td><td>Mean(Items 9 to 15)</td><td>2.90 (SD 0.84)</td></tr>
      <tr><td><strong>INTERQUAL</strong></td><td>16–18</td><td>Mean(Items 16 to 18)</td><td>2.70 (SD 0.90)</td></tr>
      <tr style="font-weight: 700; background: #e2e8f0;"><td>OVERALL</td><td>1–19</td><td>Mean(Items 1 to 19)</td><td>2.82 (SD 0.84)</td></tr>
    </table>
    <div style="font-size: 6.8pt; color: #64748b; margin-top: 2px;">
      Source: Lewis, J. R. (2002). Psychometric evaluation of the PSSUQ using data from five years of usability studies. <em>International Journal of Human-Computer Interaction</em>, 14(3–4), 463–488.
    </div>
  </div>

  <div class="running-footer">
    <span>2627-sem1-IT411-39 · IT411-G3 · CiteWise</span>
    <span>PSSUQ Validation Plan v2.0 — Page 4</span>
    <span>Academic — Confidential</span>
  </div>
</div>

<!-- ════════════════════════ PAGE 5: SEC 5 ════════════════════════ -->
<div class="page">
  <div class="running-header">
    <span class="title">CiteWise — PSSUQ Usability Testing Validation Plan & Framework</span>
    <span>Version 2.0 · November 2026</span>
  </div>

  <div>
    <div class="section-banner">5 Acceptance Criteria & Exit Thresholds</div>
    <p>
      Exit criteria define the minimum conditions that must be met for the CiteWise system to be declared <strong>usability-validated</strong> and cleared for final presentation and deployment. All criteria must be simultaneously satisfied; partial pass is not accepted.
    </p>

    <div class="subsection-title">5.1 Primary PSSUQ Usability Thresholds</div>
    <table>
      <tr>
        <th style="width: 20%;">Metric</th>
        <th style="width: 18%;">Target Threshold</th>
        <th style="width: 22%;">Lewis 2002 Benchmark</th>
        <th>Rationale</th>
        <th style="width: 12%;">Status</th>
      </tr>
      <tr>
        <td><strong>PSSUQ Overall</strong></td>
        <td>&le; 2.50</td>
        <td>&mu; = 2.82 (SD 0.84)</td>
        <td>10% improvement over published IBM benchmark</td>
        <td><span class="badge badge-pending">Pending</span></td>
      </tr>
      <tr>
        <td><strong>SYSUSE</strong></td>
        <td>&le; 2.60</td>
        <td>&mu; = 2.76 (SD 0.90)</td>
        <td>Reflects strong task support for research workflows</td>
        <td><span class="badge badge-pending">Pending</span></td>
      </tr>
      <tr>
        <td><strong>INFOQUAL</strong></td>
        <td>&le; 2.70</td>
        <td>&mu; = 2.90 (SD 0.84)</td>
        <td>Adequate on-screen guidance for first-time users</td>
        <td><span class="badge badge-pending">Pending</span></td>
      </tr>
      <tr>
        <td><strong>INTERQUAL</strong></td>
        <td>&le; 2.50</td>
        <td>&mu; = 2.70 (SD 0.90)</td>
        <td>High visual design quality expected of modern web apps</td>
        <td><span class="badge badge-pending">Pending</span></td>
      </tr>
    </table>

    <div class="subsection-title">5.2 Task Performance Thresholds</div>
    <table>
      <tr>
        <th>Metric</th>
        <th style="width: 12%;">ID</th>
        <th style="width: 15%;">Target</th>
        <th>Measurement Method</th>
        <th style="width: 12%;">Status</th>
      </tr>
      <tr>
        <td>Task Completion Rate</td>
        <td><strong>TCR</strong></td>
        <td>&ge; 90.0%</td>
        <td>Observer-recorded binary success/failure per task attempt</td>
        <td><span class="badge badge-pending">Pending</span></td>
      </tr>
      <tr>
        <td>Mean Task Time (UT-01: Upload)</td>
        <td><strong>MTT-01</strong></td>
        <td>&le; 120 s</td>
        <td>Stopwatch from task-start to explicit completion signal</td>
        <td><span class="badge badge-pending">Pending</span></td>
      </tr>
      <tr>
        <td>Mean Task Time (UT-02: AI Assessment)</td>
        <td><strong>MTT-02</strong></td>
        <td>&le; 30 s</td>
        <td>System timestamp (AI pipeline latency excluded)</td>
        <td><span class="badge badge-pending">Pending</span></td>
      </tr>
      <tr>
        <td>Mean Task Time (UT-03: Citation)</td>
        <td><strong>MTT-03</strong></td>
        <td>&le; 90 s</td>
        <td>Stopwatch from task-start to explicit completion signal</td>
        <td><span class="badge badge-pending">Pending</span></td>
      </tr>
      <tr>
        <td>Critical Error Rate</td>
        <td><strong>CER</strong></td>
        <td>&le; 5.0%</td>
        <td>Errors causing irrecoverable task failure / data loss</td>
        <td><span class="badge badge-pending">Pending</span></td>
      </tr>
    </table>

    <div class="subsection-title">5.3 Technical / System Performance Thresholds</div>
    <table>
      <tr>
        <th style="width: 32%;">Metric</th>
        <th style="width: 18%;">Target</th>
        <th>Empirical Baseline (MVP)</th>
        <th style="width: 16%;">Status</th>
      </tr>
      <tr>
        <td>AI Assessment Latency — Mean</td>
        <td>&le; 15.0 s</td>
        <td>10.44 s (163/215 within 15 s = 75.81%)</td>
        <td><span class="badge badge-met">Baseline Met</span></td>
      </tr>
      <tr>
        <td>AI Assessment Latency — P95</td>
        <td>&le; 30.0 s</td>
        <td>28.66 s</td>
        <td><span class="badge badge-met">Baseline Met</span></td>
      </tr>
      <tr>
        <td>CATalyst Import (GET, 10 users)</td>
        <td>Avg &le; 2,000 ms</td>
        <td>1,335–1,894 ms (load test verified)</td>
        <td><span class="badge badge-met">Baseline Met</span></td>
      </tr>
      <tr>
        <td>Synthesis Titles (POST, 10 users)</td>
        <td>Avg &le; 1,000 ms</td>
        <td>559–654 ms (load test verified)</td>
        <td><span class="badge badge-met">Baseline Met</span></td>
      </tr>
      <tr>
        <td>Document Approval (GET, 10 users)</td>
        <td>Avg &le; 2,000 ms</td>
        <td>1,218–1,624 ms (load test verified)</td>
        <td><span class="badge badge-met">Baseline Met</span></td>
      </tr>
      <tr>
        <td>API Error Rate (all endpoints)</td>
        <td>&le; 1.0%</td>
        <td>0.00% except PT-A02-100 (upload, 100 users): 0.88%</td>
        <td><span class="badge badge-met">Baseline Met</span></td>
      </tr>
      <tr>
        <td>Unit Test Pass Rate</td>
        <td>100%</td>
        <td>251/251 tests passing (10 test files)</td>
        <td><span class="badge badge-verified">Verified</span></td>
      </tr>
      <tr>
        <td>APA 7 Formatting Error Rate</td>
        <td>&le; 15%</td>
        <td>Established from requirements (SRS §3.4)</td>
        <td><span class="badge badge-pending">Pending</span></td>
      </tr>
      <tr>
        <td>RRL Parsing Accuracy</td>
        <td>&ge; 95%</td>
        <td>Established from requirements (SRS §3.2)</td>
        <td><span class="badge badge-pending">Pending</span></td>
      </tr>
      <tr>
        <td>Source Citation Coverage</td>
        <td>&ge; 80%</td>
        <td>Established from requirements (SRS §3.5)</td>
        <td><span class="badge badge-pending">Pending</span></td>
      </tr>
    </table>

    <div class="callout callout-amber">
      <strong>Exit Gate Rule:</strong> Testing is considered <strong>not passed</strong> if any single Primary PSSUQ threshold (§5.1) or any Technical threshold marked "Pending" produces a result outside its target range. All items marked <span class="badge badge-pending">Pending</span> require live session data to resolve.
    </div>
  </div>

  <div class="running-footer">
    <span>2627-sem1-IT411-39 · IT411-G3 · CiteWise</span>
    <span>PSSUQ Validation Plan v2.0 — Page 5</span>
    <span>Academic — Confidential</span>
  </div>
</div>

<!-- ════════════════════════ PAGE 6: SEC 6 ════════════════════════ -->
<div class="page">
  <div class="running-header">
    <span class="title">CiteWise — PSSUQ Usability Testing Validation Plan & Framework</span>
    <span>Version 2.0 · November 2026</span>
  </div>

  <div>
    <div class="section-banner">6 Data Collection Protocol & Task Administration</div>
    <div class="subsection-title">6.1 Session Structure (Per Participant)</div>
    <table>
      <tr>
        <th style="width: 10%;">Phase</th>
        <th style="width: 25%;">Activity</th>
        <th>Details</th>
        <th style="width: 15%;">Duration</th>
      </tr>
      <tr>
        <td><strong>A</strong></td>
        <td>Pre-Session Briefing</td>
        <td>Informed consent form; study objectives overview; think-aloud protocol instruction; demographics questionnaire</td>
        <td>~10 min</td>
      </tr>
      <tr>
        <td><strong>B</strong></td>
        <td>Task Execution</td>
        <td>Participant completes UT-01 through UT-04 sequentially while verbalizing thoughts; observer records task time, completion status, and critical errors; no assistance provided except safety prompts</td>
        <td>~35 min</td>
      </tr>
      <tr>
        <td><strong>C</strong></td>
        <td>PSSUQ Administration</td>
        <td>Printed or digital PSSUQ questionnaire (19 items); 7-point scale; participant completes independently; no interviewer guidance on item interpretation</td>
        <td>~10 min</td>
      </tr>
      <tr>
        <td><strong>D</strong></td>
        <td>Post-Session Debrief</td>
        <td>Open-ended retrospective interview (3 questions): most helpful feature, biggest difficulty, suggestions; recorded with participant consent</td>
        <td>~5 min</td>
      </tr>
    </table>

    <div class="subsection-title">6.2 Usability Task Scenarios (UT-01 to UT-04)</div>
    <table>
      <tr>
        <th style="width: 12%;">Task ID</th>
        <th style="width: 25%;">Scenario Title</th>
        <th>Task Description (Participant Prompt)</th>
        <th style="width: 20%;">Success Criterion</th>
      </tr>
      <tr>
        <td><strong>UT-01</strong></td>
        <td>CATalyst Literature Upload</td>
        <td>"You have a PDF of a research paper you want CiteWise to analyze. Upload it and trigger the CATalyst gap discovery process. Tell us when you believe the analysis is complete."</td>
        <td>Gap report displayed without error</td>
      </tr>
      <tr>
        <td><strong>UT-02</strong></td>
        <td>AI Research Assessment</td>
        <td>"Submit the research abstract provided on your task sheet to CiteWise for AI assessment. Navigate to the results and explain what the system is telling you about your research quality."</td>
        <td>Score + feedback rendered correctly</td>
      </tr>
      <tr>
        <td><strong>UT-03</strong></td>
        <td>APA 7 Citation Generation</td>
        <td>"Using CiteWise, generate an APA 7th Edition citation for the reference provided on your task sheet and add it to your reference list."</td>
        <td>Valid APA 7 citation produced</td>
      </tr>
      <tr>
        <td><strong>UT-04</strong></td>
        <td>Document Export</td>
        <td>"Export your current research document with the generated citations from CiteWise. Confirm that the downloaded file opens correctly."</td>
        <td>File downloads and opens without error</td>
      </tr>
    </table>

    <div class="subsection-title">6.3 Think-Aloud Protocol Guidelines</div>
    <ul>
      <li>Participants are instructed to verbalize their thought process continuously (<em>"Say what you see, say what you're doing, say what you're thinking"</em>)</li>
      <li>Observers must not answer functional questions; use only neutral prompts: <em>"What are you thinking right now?", "Please keep talking."</em></li>
      <li>Sessions are screen-recorded (with consent) for retrospective analysis</li>
      <li>Observer records verbatim critical comments and hesitation moments for qualitative coding</li>
    </ul>

    <div class="subsection-title">6.4 Observer Data Recording Sheet (Per Task)</div>
    <table>
      <tr>
        <th style="width: 10%;">Task ID</th>
        <th style="width: 16%;">Completed?</th>
        <th style="width: 14%;">Start Time</th>
        <th style="width: 14%;">End Time</th>
        <th style="width: 12%;">Elapsed (s)</th>
        <th style="width: 14%;">Critical Errors</th>
        <th>Notable Comments</th>
      </tr>
      <tr>
        <td><strong>UT-01</strong></td>
        <td>&#x25A2; Yes &nbsp;&#x25A2; No</td>
        <td>___:___</td>
        <td>___:___</td>
        <td>______</td>
        <td>______</td>
        <td></td>
      </tr>
      <tr>
        <td><strong>UT-02</strong></td>
        <td>&#x25A2; Yes &nbsp;&#x25A2; No</td>
        <td>___:___</td>
        <td>___:___</td>
        <td>______</td>
        <td>______</td>
        <td></td>
      </tr>
      <tr>
        <td><strong>UT-03</strong></td>
        <td>&#x25A2; Yes &nbsp;&#x25A2; No</td>
        <td>___:___</td>
        <td>___:___</td>
        <td>______</td>
        <td>______</td>
        <td></td>
      </tr>
      <tr>
        <td><strong>UT-04</strong></td>
        <td>&#x25A2; Yes &nbsp;&#x25A2; No</td>
        <td>___:___</td>
        <td>___:___</td>
        <td>______</td>
        <td>______</td>
        <td></td>
      </tr>
    </table>

    <div class="subsection-title">6.5 Data Management & Integrity Controls</div>
    <ul>
      <li>All raw PSSUQ sheets are scanned and stored in encrypted cloud storage immediately after each session</li>
      <li>Data entry double-checked by a second team member before aggregation</li>
      <li>Participants assigned anonymous codes (P-001 to P-024); no names appear in the analysis dataset</li>
      <li>Outlier policy: responses with &gt;3 items left blank are flagged for review and may be excluded</li>
    </ul>
  </div>

  <div class="running-footer">
    <span>2627-sem1-IT411-39 · IT411-G3 · CiteWise</span>
    <span>PSSUQ Validation Plan v2.0 — Page 6</span>
    <span>Academic — Confidential</span>
  </div>
</div>

<!-- ════════════════════════ PAGE 7: SEC 7 ════════════════════════ -->
<div class="page">
  <div class="running-header">
    <span class="title">CiteWise — PSSUQ Usability Testing Validation Plan & Framework</span>
    <span>Version 2.0 · November 2026</span>
  </div>

  <div>
    <div class="section-banner">7 Empirical Baseline from MVP Validation</div>
    <p>
      The following empirical data was collected during the CiteWise MVP Validation Study conducted between <strong>September 21–28, 2026 with N=24 participants</strong>. This data constitutes the pre-PSSUQ empirical baseline and informs the calibration of acceptance thresholds defined in Section 5.
    </p>

    <div class="subsection-title">7.1 MVP Validation Key Performance Indicators</div>
    <div class="kpi-container">
      <div class="kpi-box">
        <div class="kpi-val">90.4%</div>
        <div class="kpi-lbl">Agreement on Solution Efficacy</div>
        <div class="kpi-sub">(Q4–Q27 aggregate, N=24)</div>
      </div>
      <div class="kpi-box">
        <div class="kpi-val">91.7%</div>
        <div class="kpi-lbl">Overall Perceived Value</div>
        <div class="kpi-sub">(composite score, N=24)</div>
      </div>
      <div class="kpi-box">
        <div class="kpi-val">10.44 s</div>
        <div class="kpi-lbl">Mean AI Assessment Latency</div>
        <div class="kpi-sub">(production, N=215 assessments)</div>
      </div>
    </div>

    <div class="subsection-title">7.2 AI Assessment Response Time Distribution (Production)</div>
    <table>
      <tr>
        <th style="width: 30%;">Statistic</th>
        <th style="width: 25%;">Value</th>
        <th style="width: 25%;">Target / Threshold</th>
        <th>Result</th>
      </tr>
      <tr>
        <td>Mean Response Time</td>
        <td>10.44 s</td>
        <td>&le; 15.0 s</td>
        <td><span class="badge badge-pass">PASS</span></td>
      </tr>
      <tr>
        <td>Median Response Time</td>
        <td>8.00 s</td>
        <td>&le; 15.0 s</td>
        <td><span class="badge badge-pass">PASS</span></td>
      </tr>
      <tr>
        <td>P95 Response Time</td>
        <td>28.66 s</td>
        <td>&le; 30.0 s</td>
        <td><span class="badge badge-pass">PASS</span></td>
      </tr>
      <tr>
        <td>Maximum Response Time</td>
        <td>47.73 s</td>
        <td>— (outlier monitoring)</td>
        <td><span class="badge badge-monitor">Monitor</span></td>
      </tr>
      <tr>
        <td>Within-15s Completion Rate</td>
        <td>75.81% (163/215)</td>
        <td>&ge; 75%</td>
        <td><span class="badge badge-pass">PASS</span></td>
      </tr>
    </table>

    <div class="subsection-title">7.3 Load Test Performance Baseline (Verified, November 2026)</div>
    <p style="font-size: 7.2pt; color: #475569;">
      Extended load tests were conducted using a custom Node.js k6-compatible load test harness against the production Heroku API. All results verified against Phase 1 and Phase 2 test evidence in <code>qa-evidence/performance/</code>.
    </p>
    <table>
      <tr>
        <th>Endpoint</th>
        <th style="width: 14%;">Concurrency</th>
        <th style="width: 14%;">Avg (ms)</th>
        <th style="width: 14%;">P95 (ms)</th>
        <th style="width: 14%;">Error Rate</th>
        <th style="width: 12%;">Verdict</th>
      </tr>
      <tr>
        <td>GET /api/rrl/catalyst (CATalyst import)</td>
        <td>10</td>
        <td>1,335</td>
        <td>~2,000</td>
        <td>0.00%</td>
        <td><span class="badge badge-pass">PASS</span></td>
      </tr>
      <tr>
        <td>GET /api/rrl/catalyst (CATalyst import)</td>
        <td>25</td>
        <td>1,591</td>
        <td>~2,400</td>
        <td>0.00%</td>
        <td><span class="badge badge-pass">PASS</span></td>
      </tr>
      <tr>
        <td>GET /api/rrl/catalyst (CATalyst import)</td>
        <td>50</td>
        <td>1,894</td>
        <td>~2,800</td>
        <td>0.00%</td>
        <td><span class="badge badge-pass">PASS</span></td>
      </tr>
      <tr>
        <td>POST /api/v1/synthesis/titles</td>
        <td>10</td>
        <td>559</td>
        <td>~900</td>
        <td>0.00%</td>
        <td><span class="badge badge-pass">PASS</span></td>
      </tr>
      <tr>
        <td>POST /api/v1/synthesis/titles</td>
        <td>25</td>
        <td>618</td>
        <td>~1,000</td>
        <td>0.00%</td>
        <td><span class="badge badge-pass">PASS</span></td>
      </tr>
      <tr>
        <td>POST /api/v1/synthesis/titles</td>
        <td>50</td>
        <td>654</td>
        <td>~1,100</td>
        <td>0.00%</td>
        <td><span class="badge badge-pass">PASS</span></td>
      </tr>
      <tr>
        <td>POST /api/rrl/upload (PDF upload)</td>
        <td>100</td>
        <td>685</td>
        <td>~2,300</td>
        <td>0.88%</td>
        <td><span class="badge badge-pass">PASS</span></td>
      </tr>
      <tr>
        <td>GET /:id/approval (document approval)</td>
        <td>10</td>
        <td>1,218</td>
        <td>~1,900</td>
        <td>0.00%</td>
        <td><span class="badge badge-pass">PASS</span></td>
      </tr>
    </table>
    <div style="font-size: 6.8pt; color: #64748b; margin-top: -3px; margin-bottom: 6px;">
      Source: <code>qa-evidence/performance/extended-load-test-results.json</code> — verified November 5, 2026
    </div>

    <div class="subsection-title">7.4 Unit Test Coverage Baseline</div>
    <table>
      <tr>
        <th>Test Suite</th>
        <th style="width: 18%;">Total Tests</th>
        <th style="width: 16%;">Passing</th>
        <th style="width: 16%;">Failing</th>
        <th style="width: 18%;">Coverage</th>
      </tr>
      <tr><td>auth.test.js</td><td>Included</td><td>&#x2714;</td><td>0</td><td>—</td></tr>
      <tr><td>citewise.routes.test.js</td><td>Included</td><td>&#x2714;</td><td>0</td><td>—</td></tr>
      <tr><td>pr45-and-local-fixes.test.js</td><td>47</td><td>47</td><td>0</td><td>—</td></tr>
      <tr><td>All other suites (7 files)</td><td>Included</td><td>&#x2714;</td><td>0</td><td>—</td></tr>
      <tr style="font-weight: 700; background: #e2e8f0;"><td>TOTAL (10 files)</td><td>251</td><td>251</td><td>0</td><td>100% Pass</td></tr>
    </table>

    <div class="subsection-title">7.5 MVP Questionnaire Instrument Summary</div>
    <p>
      The MVP Validation Study used a 30-item mixed-method questionnaire (Q1–Q3 demographic; Q4–Q27 four-point Likert; Q28–Q30 open-ended). Key findings from the 30-item instrument that inform PSSUQ calibration:
    </p>
    <ul>
      <li><strong>Solution Efficacy (Q4–Q27):</strong> 90.4% aggregate agreement — indicates strong baseline perceived usefulness</li>
      <li><strong>Overall Perceived Value:</strong> 91.7% — high baseline for PSSUQ SYSUSE subscale expectations</li>
      <li><strong>Open-Ended Themes (Q28–Q30):</strong> Primary concerns centered on AI response variability and citation edge cases — directly addressed by INFOQUAL and INTERQUAL subscale monitoring</li>
    </ul>
  </div>

  <div class="running-footer">
    <span>2627-sem1-IT411-39 · IT411-G3 · CiteWise</span>
    <span>PSSUQ Validation Plan v2.0 — Page 7</span>
    <span>Academic — Confidential</span>
  </div>
</div>

<!-- ════════════════════════ PAGE 8: SEC 8 ════════════════════════ -->
<div class="page">
  <div class="running-header">
    <span class="title">CiteWise — PSSUQ Usability Testing Validation Plan & Framework</span>
    <span>Version 2.0 · November 2026</span>
  </div>

  <div>
    <div class="section-banner">8 Defect Triage & Severity Classification</div>
    <p>
      All defects identified during usability testing sessions are logged, triaged, and prioritized according to the four-tier severity model below. Defect identifiers follow the convention <code>DEF-XXX</code> where XXX is a zero-padded sequential number. Each defect links back to the UT task scenario and PSSUQ item(s) it impacts.
    </p>

    <div class="subsection-title">8.1 Severity Classification Model</div>
    <table>
      <tr>
        <th style="width: 10%;">Severity</th>
        <th style="width: 18%;">Label</th>
        <th>Definition</th>
        <th style="width: 16%;">Resolution SLA</th>
        <th style="width: 14%;">Release Impact</th>
      </tr>
      <tr>
        <td><span class="badge badge-crit">SEV-1</span></td>
        <td><strong>Critical / Blocker</strong></td>
        <td>System crash, data loss, complete task failure with no workaround. Causes irrecoverable session termination. Directly fails TCR or CER exit criteria.</td>
        <td>Immediate (same day)</td>
        <td><span style="color: #b91c1c; font-weight: 700;">Release blocked</span></td>
      </tr>
      <tr>
        <td><span class="badge badge-sev2">SEV-2</span></td>
        <td><strong>Major</strong></td>
        <td>Significant functional impairment that prevents task completion but workaround exists. Causes measurable PSSUQ score degradation (&gt;0.5 point on any subscale).</td>
        <td>Within 48 hours</td>
        <td><span style="color: #c2410c; font-weight: 700;">Release at risk</span></td>
      </tr>
      <tr>
        <td><span class="badge badge-sev3">SEV-3</span></td>
        <td><strong>Minor</strong></td>
        <td>Usability issue that creates friction, confusion, or additional steps but does not prevent task completion. Moderate PSSUQ impact (0.2–0.5 points).</td>
        <td>Within 1 sprint</td>
        <td>Release with note</td>
      </tr>
      <tr>
        <td><span class="badge badge-sev4">SEV-4</span></td>
        <td><strong>Cosmetic / Low</strong></td>
        <td>Minor visual inconsistency, typo, or non-functional aesthetic issue. Negligible PSSUQ impact (&lt;0.2 points). Does not affect task completion.</td>
        <td>Backlog</td>
        <td>No release impact</td>
      </tr>
    </table>

    <div class="subsection-title">8.2 Defect Log Template</div>
    <table>
      <tr>
        <th style="width: 11%;">DEF-ID</th>
        <th style="width: 11%;">Severity</th>
        <th style="width: 11%;">Task Ref</th>
        <th style="width: 16%;">PSSUQ Item(s)</th>
        <th>Description</th>
        <th style="width: 12%;">Status</th>
      </tr>
      <tr>
        <td><strong>DEF-001</strong></td>
        <td><span class="badge badge-sev2">SEV-2</span></td>
        <td>UT-02</td>
        <td>PSSUQ-7, PSSUQ-8</td>
        <td>AI assessment error messages do not indicate root cause (timeout vs. parsing failure)</td>
        <td><span class="badge badge-pass">Resolved</span></td>
      </tr>
      <tr>
        <td><strong>DEF-002</strong></td>
        <td><span class="badge badge-sev3">SEV-3</span></td>
        <td>UT-01</td>
        <td>PSSUQ-9, PSSUQ-10</td>
        <td>CATalyst upload progress indicator absent; users unsure if upload succeeded</td>
        <td><span class="badge badge-pending">Open</span></td>
      </tr>
      <tr>
        <td><strong>DEF-003</strong></td>
        <td><span class="badge badge-sev3">SEV-3</span></td>
        <td>UT-03</td>
        <td>PSSUQ-13, PSSUQ-15</td>
        <td>APA citation output panel scrolls off-screen on mobile viewports (&le; 375px wide)</td>
        <td><span class="badge badge-pending">Open</span></td>
      </tr>
      <tr>
        <td><strong>DEF-004</strong></td>
        <td><span class="badge badge-sev4">SEV-4</span></td>
        <td>UT-04</td>
        <td>PSSUQ-18</td>
        <td>Inconsistent button border-radius between export modal and main UI (4px vs 6px)</td>
        <td><span class="badge badge-pending">Open</span></td>
      </tr>
      <tr style="font-style: italic; background: #f8fafc; color: #64748b;">
        <td colspan="6" style="text-align: center;">Additional defect rows to be populated during live usability testing sessions (Phase 3)</td>
      </tr>
    </table>

    <div class="subsection-title">8.3 Defect Resolution Workflow</div>
    <div style="display: flex; flex-direction: column; gap: 4px; font-size: 7.1pt; margin-bottom: 8px;">
      <div><strong>1. Discovery</strong> &rarr; Observer logs defect in real-time on observer sheet with participant code and timestamp</div>
      <div><strong>2. Triage</strong> &rarr; Development team assigns severity within 2 hours of session end</div>
      <div><strong>3. Assignment</strong> &rarr; SEV-1/2 assigned to responsible developer immediately; SEV-3/4 added to sprint backlog</div>
      <div><strong>4. Fix & Verification</strong> &rarr; Fix deployed to staging; retested against original failure scenario</div>
      <div><strong>5. Closure</strong> &rarr; Defect marked RESOLVED only after verifier (non-author) confirms fix</div>
    </div>

    <div class="subsection-title">8.4 PSSUQ Item-to-Feature Traceability</div>
    <table>
      <tr>
        <th style="width: 18%;">PSSUQ Subscale</th>
        <th style="width: 12%;">Items</th>
        <th style="width: 35%;">Primary CiteWise Feature Area</th>
        <th>Defect Risk Area</th>
      </tr>
      <tr>
        <td><strong>SYSUSE</strong></td>
        <td>1–8</td>
        <td>Core workflow: upload &rarr; assess &rarr; cite &rarr; export</td>
        <td>AI latency spikes, missing error recovery, task flow interruptions</td>
      </tr>
      <tr>
        <td><strong>INFOQUAL</strong></td>
        <td>9–15</td>
        <td>On-screen messages, loading states, help text, feedback panels</td>
        <td>Ambiguous AI feedback, missing progress indicators, unclear error messages</td>
      </tr>
      <tr>
        <td><strong>INTERQUAL</strong></td>
        <td>16–18</td>
        <td>UI design system, layout consistency, visual design</td>
        <td>Responsive breakpoint failures, visual inconsistency across modules</td>
      </tr>
      <tr>
        <td><strong>OVERALL</strong></td>
        <td>19</td>
        <td>Holistic system satisfaction</td>
        <td>Composite reflection of all above</td>
      </tr>
    </table>
  </div>

  <div class="running-footer">
    <span>2627-sem1-IT411-39 · IT411-G3 · CiteWise</span>
    <span>PSSUQ Validation Plan v2.0 — Page 8</span>
    <span>Academic — Confidential</span>
  </div>
</div>

<!-- ════════════════════════ PAGE 9: SEC 9 ════════════════════════ -->
<div class="page">
  <div class="running-header">
    <span class="title">CiteWise — PSSUQ Usability Testing Validation Plan & Framework</span>
    <span>Version 2.0 · November 2026</span>
  </div>

  <div>
    <div class="section-banner">9 Test Administration Governance & Sign-Off</div>
    <div class="subsection-title">9.1 Roles & Responsibilities</div>
    <table>
      <tr>
        <th style="width: 25%;">Role</th>
        <th style="width: 30%;">Assigned To</th>
        <th>Responsibilities</th>
      </tr>
      <tr>
        <td><strong>Test Lead</strong></td>
        <td>Rabe, Pranz Nicole C.</td>
        <td>Overall test plan execution; participant scheduling; session facilitation; final sign-off authority</td>
      </tr>
      <tr>
        <td><strong>Session Facilitator</strong></td>
        <td>Ramirez, Ruther Gerard L.</td>
        <td>Conduct think-aloud sessions; administer PSSUQ forms; ensure consistent protocol adherence</td>
      </tr>
      <tr>
        <td><strong>Data Analyst</strong></td>
        <td>Reyes, Christian Andrey V.</td>
        <td>Data entry validation; PSSUQ subscale computation; statistical analysis; report generation</td>
      </tr>
      <tr>
        <td><strong>Observer / Defect Logger</strong></td>
        <td>Encallado, Sophia Bianca A.</td>
        <td>Real-time defect logging; observer sheet completion; qualitative note-taking during sessions</td>
      </tr>
      <tr>
        <td><strong>Technical Support</strong></td>
        <td>Badinas, Gregory Ivan Onyx M.</td>
        <td>System deployment readiness; API monitoring during sessions; immediate SEV-1 resolution</td>
      </tr>
      <tr>
        <td><strong>Academic Adviser</strong></td>
        <td>Mrs. Erica Jean Abadinas</td>
        <td>Validation plan review; methodology approval; final academic sign-off</td>
      </tr>
    </table>

    <div class="subsection-title">9.2 Testing Phase Timeline</div>
    <table>
      <tr>
        <th style="width: 12%;">Phase</th>
        <th style="width: 32%;">Activity</th>
        <th style="width: 20%;">Target Date</th>
        <th>Deliverable</th>
        <th style="width: 14%;">Status</th>
      </tr>
      <tr><td>Phase 0</td><td>Validation Plan Finalization</td><td>November 2026</td><td>This document (v2.0, PSSUQ)</td><td><span class="badge badge-pass">Complete</span></td></tr>
      <tr><td>Phase 1</td><td>Technical Load Testing</td><td>November 5, 2026</td><td>qa-evidence/performance/</td><td><span class="badge badge-pass">Complete</span></td></tr>
      <tr><td>Phase 2</td><td>Unit Test Verification</td><td>November 5, 2026</td><td>251/251 tests passing</td><td><span class="badge badge-pass">Complete</span></td></tr>
      <tr><td>Phase 3</td><td>Usability Sessions (N=24)</td><td>TBD</td><td>PSSUQ raw data sheets; observer logs</td><td><span class="badge badge-sev3">Scheduled</span></td></tr>
      <tr><td>Phase 4</td><td>PSSUQ Data Analysis</td><td>TBD + 2 days</td><td>Subscale scores; statistical report</td><td><span class="badge badge-pending">Pending</span></td></tr>
      <tr><td>Phase 5</td><td>Defect Resolution Sprint</td><td>TBD + 1 week</td><td>All SEV-1/2 defects resolved and re-verified</td><td><span class="badge badge-pending">Pending</span></td></tr>
      <tr><td>Phase 6</td><td>Validation Closure & Sign-Off</td><td>TBD</td><td>Signed validation report; adviser approval</td><td><span class="badge badge-pending">Pending</span></td></tr>
    </table>

    <div class="subsection-title">9.3 Risk Register</div>
    <table>
      <tr>
        <th>Risk</th>
        <th style="width: 14%;">Likelihood</th>
        <th style="width: 12%;">Impact</th>
        <th>Mitigation</th>
      </tr>
      <tr>
        <td>AI latency exceeds 15 s for &gt;25% of assessments during live sessions</td>
        <td>Medium</td>
        <td>High</td>
        <td>Use P95 &le; 30 s as supplementary metric; communicate system context to participants before UT-02</td>
      </tr>
      <tr>
        <td>Participant no-shows reduce N below 20</td>
        <td>Low</td>
        <td>High</td>
        <td>Over-recruit by 20% (28 invitations for 24 seats); maintain waitlist of 4 alternates</td>
      </tr>
      <tr>
        <td>PSSUQ INFOQUAL score exceeds 2.70 threshold</td>
        <td>Medium</td>
        <td>Medium</td>
        <td>DEF-002 (progress indicator) resolved pre-Phase 3; supplementary onboarding tooltip added</td>
      </tr>
      <tr>
        <td>Production API unavailable during session</td>
        <td>Low</td>
        <td>High</td>
        <td>Staging environment pre-configured as fallback; Technical Support role monitors uptime during sessions</td>
      </tr>
      <tr>
        <td>Session recording consent refused by participant</td>
        <td>Low</td>
        <td>Low</td>
        <td>Recording is optional; observer notes substitute; participant still administers PSSUQ</td>
      </tr>
    </table>

    <div class="subsection-title">9.4 Document Control & Sign-Off</div>
    <table>
      <tr>
        <th style="width: 30%;">Role</th>
        <th style="width: 30%;">Name</th>
        <th>Signature</th>
        <th style="width: 18%;">Date</th>
      </tr>
      <tr>
        <td><strong>Prepared by (Test Lead)</strong></td>
        <td>Rabe, Pranz Nicole C.</td>
        <td>________________________</td>
        <td>November 2026</td>
      </tr>
      <tr>
        <td><strong>Reviewed by (Data Analyst)</strong></td>
        <td>Reyes, Christian Andrey V.</td>
        <td>________________________</td>
        <td>November 2026</td>
      </tr>
      <tr>
        <td><strong>Approved by (Academic Adviser)</strong></td>
        <td>Mrs. Erica Jean Abadinas</td>
        <td>________________________</td>
        <td>November 2026</td>
      </tr>
    </table>

    <div style="font-size: 6.8pt; color: #475569; margin-top: 6px; line-height: 1.35;">
      <strong>Document Version History:</strong><br>
      <em>v1.0 (SUS-based, Brooke 1996)</em> — Initial usability plan using 10-item SUS on 5-point scale; GQM framework applied.<br>
      <em>v2.0 (PSSUQ, Lewis 2002)</em> — Instrument replaced with PSSUQ (19 items, 7-point scale); three subscale reporting added; empirical baseline from MVP Validation Study (Sep 2026) incorporated; technical performance thresholds verified against load test evidence (Nov 5, 2026). All changes approved per academic supervisor guidance.<br><br>
      <strong>References:</strong><br>
      Brooke, J. (1996). SUS: A "quick and dirty" usability scale. In <em>Usability Evaluation in Industry</em> (pp. 189–194). Taylor & Francis.<br>
      International Organization for Standardization. (2023). ISO/IEC 25010:2023 — <em>SQuaRE — Product quality model</em>. ISO.<br>
      Lewis, J. R. (1992). Psychometric evaluation of the Post-Study System Usability Questionnaire: The PSSUQ (Technical Report 54.723). IBM Corporation.<br>
      Lewis, J. R. (2002). Psychometric evaluation of the PSSUQ using data from five years of usability studies. <em>IJHCI</em>, 14(3–4), 463–488.<br>
      Nielsen, J., & Landauer, T. K. (1993). A mathematical model of the finding of usability problems. <em>Proc. ACM CHI'93</em>, 206–213.<br>
      IT411-G3 CiteWise Team. (2026). <em>CiteWise MVP Validation Findings and Refactoring Priorities</em> [Internal report]. 2627-sem1-IT411-39.
    </div>
  </div>

  <div class="running-footer">
    <span>2627-sem1-IT411-39 · IT411-G3 · CiteWise</span>
    <span>PSSUQ Validation Plan v2.0 — Page 9</span>
    <span>Academic — Confidential</span>
  </div>
</div>

</body>
</html>
"""

def generate_pdf():
    print(f"Writing HTML to: {HTML_PATH}")
    with open(HTML_PATH, "w", encoding="utf-8") as f:
        f.write(HTML_CONTENT)
    
    print("Launching Playwright to render PDF...")
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.goto(f"file:///{HTML_PATH}")
        page.pdf(
            path=PDF_OUT,
            format="Letter",
            print_background=True,
            margin={"top": "0in", "bottom": "0in", "left": "0in", "right": "0in"}
        )
        browser.close()
    
    print(f"Generated PDF: {PDF_OUT}")
    shutil.copy2(PDF_OUT, ROOT_PDF)
    print(f"Copied PDF to: {ROOT_PDF}")

if __name__ == '__main__':
    generate_pdf()
