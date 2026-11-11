"""
Build CiteWise Final Validation Instrument (DOCX & PDF)
File: 2627-sem1-it411-39_Final_Validation_Instrument.docx / .pdf

Uses the PSSUQ (Lewis 1992/2002, 19-item, 7-point scale) & GQM validation framework,
fully grounded in the actual CiteWise project architecture, modules, use cases, test corpus,
Dual SLA, and product targets from:
  - Software Requirements Specification (SRS v1.2 / v2.0)
  - Software Design Description (SDD v2.0)
  - Software Project Management Plan (SMPM)
  - Software Test Document (2627-sem1-it411-39_Software Test Document.docx, STD v1.4)
  - Refactoring Evidence (CiteWise-Refactoring-Evidence.docx)

Styling matches srs.docx / sdd.docx / smpm.docx / CiteWise-Refactoring-Evidence.docx:
  - Letter size (8.5" x 11"), 1" margins
  - Times New Roman body (11pt), Arial headings
  - Heading 1: black background (#000000), white bold text (#FFFFFF, 12pt Arial)
  - Heading 2: plain bold Arial (11pt, #000000)
  - Heading 3: plain bold Times New Roman (10.5pt, #000000)
  - Tables: thin black border (#000000), black header row with white bold text, white body rows
  - Strictly monochrome: black (#000000) and white (#FFFFFF)
"""

import os, sys, shutil
from docx import Document
from docx.shared import Pt, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
from playwright.sync_api import sync_playwright

REPO = os.path.abspath('c:/Users/admin/Documents/CiteWise/CiteWise')
DOCS_DIR = os.path.join(REPO, 'docs')
ROOT_DIR = os.path.abspath('c:/Users/admin/Documents/CiteWise')
ARTIFACT_DIR = r'C:\Users\admin\.gemini\antigravity\brain\68045760-d232-4fd4-b6ed-d38b897fa8bd'

DOCX_NAME = '2627-sem1-it411-39_Final_Validation_Instrument.docx'
PDF_NAME = '2627-sem1-it411-39_Final_Validation_Instrument.pdf'
HTML_NAME = '2627-sem1-it411-39_Final_Validation_Instrument.html'

OUT_DOCX = os.path.join(DOCS_DIR, DOCX_NAME)
ROOT_DOCX = os.path.join(ROOT_DIR, DOCX_NAME)
ART_DOCX = os.path.join(ARTIFACT_DIR, DOCX_NAME)

OUT_PDF = os.path.join(DOCS_DIR, PDF_NAME)
ROOT_PDF = os.path.join(ROOT_DIR, PDF_NAME)
ART_PDF = os.path.join(ARTIFACT_DIR, PDF_NAME)

OUT_HTML = os.path.join(DOCS_DIR, HTML_NAME)

# ─── DOCX Helpers ─────────────────────────────────────────────────────────────

def set_cell_border(cell, **kwargs):
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    tcBorders = OxmlElement('w:tcBorders')
    for side in ('top', 'left', 'bottom', 'right', 'insideH', 'insideV'):
        val = kwargs.get(side, 'single')
        el = OxmlElement(f'w:{side}')
        el.set(qn('w:val'), val if val else 'single')
        el.set(qn('w:sz'), '4')
        el.set(qn('w:space'), '0')
        el.set(qn('w:color'), '000000')
        tcBorders.append(el)
    tcPr.append(tcBorders)

def shade_cell(cell, fill_hex):
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:color'), 'auto')
    shd.set(qn('w:fill'), fill_hex)
    tcPr.append(shd)

def para_shading(para, fill_hex):
    pPr = para._p.get_or_add_pPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:color'), 'auto')
    shd.set(qn('w:fill'), fill_hex)
    pPr.append(shd)

def add_run(para, text, bold=False, italic=False, font_name='Times New Roman', size=11, color=(0, 0, 0), code=False):
    run = para.add_run(text)
    run.bold = bold
    run.italic = italic
    if code:
        run.font.name = 'Courier New'
        run.font.size = Pt(9)
    else:
        run.font.name = font_name
        run.font.size = Pt(size)
    if color:
        run.font.color.rgb = RGBColor(*color)
    return run

def h1(doc, text):
    p = doc.add_paragraph()
    p.style = doc.styles['Heading 1']
    p.paragraph_format.space_before = Pt(14)
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.left_indent = Inches(0)
    para_shading(p, '000000')
    run = p.add_run(text)
    run.bold = True
    run.font.name = 'Arial'
    run.font.size = Pt(12)
    run.font.color.rgb = RGBColor(255, 255, 255)
    return p

def h2(doc, text):
    p = doc.add_paragraph()
    p.style = doc.styles['Heading 2']
    p.paragraph_format.space_before = Pt(10)
    p.paragraph_format.space_after = Pt(2)
    run = p.add_run(text)
    run.bold = True
    run.font.name = 'Arial'
    run.font.size = Pt(11)
    run.font.color.rgb = RGBColor(0, 0, 0)
    return p

def h3(doc, text):
    p = doc.add_paragraph()
    p.style = doc.styles['Heading 3']
    p.paragraph_format.space_before = Pt(8)
    p.paragraph_format.space_after = Pt(2)
    run = p.add_run(text)
    run.bold = True
    run.font.name = 'Times New Roman'
    run.font.size = Pt(10.5)
    run.font.color.rgb = RGBColor(0, 0, 0)
    return p

def body_p(doc, text='', bold=False, italic=False):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.line_spacing = Pt(13)
    if text:
        add_run(p, text, bold=bold, italic=italic)
    return p

def bullet_p(doc, lead_bold, rest_text=''):
    p = doc.add_paragraph(style='List Bullet')
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.line_spacing = Pt(13)
    add_run(p, lead_bold, bold=True)
    if rest_text:
        add_run(p, rest_text, bold=False)
    return p

def add_clean_table(doc, headers, rows_data, col_widths=None, bold_cols=(0,)):
    tbl = doc.add_table(rows=len(rows_data) + 1, cols=len(headers))
    tbl.style = 'Table Grid'
    tbl.alignment = WD_TABLE_ALIGNMENT.LEFT

    for j, hdr in enumerate(headers):
        cell = tbl.cell(0, j)
        if col_widths and j < len(col_widths):
            cell.width = Inches(col_widths[j])
        shade_cell(cell, '000000')
        p = cell.paragraphs[0]
        p.paragraph_format.space_before = Pt(1)
        p.paragraph_format.space_after = Pt(1)
        r = p.add_run(hdr)
        r.bold = True
        r.font.name = 'Arial'
        r.font.size = Pt(9)
        r.font.color.rgb = RGBColor(255, 255, 255)
        set_cell_border(cell)

    for i, row in enumerate(rows_data):
        for j, val in enumerate(row):
            cell = tbl.cell(i + 1, j)
            if col_widths and j < len(col_widths):
                cell.width = Inches(col_widths[j])
            p = cell.paragraphs[0]
            p.paragraph_format.space_before = Pt(1)
            p.paragraph_format.space_after = Pt(1)
            r = p.add_run(str(val))
            r.font.name = 'Times New Roman'
            r.font.size = Pt(9)
            r.font.color.rgb = RGBColor(0, 0, 0)
            if j in bold_cols or str(val) in ('Total', 'TOTAL (8 suites)', 'OVERALL'):
                r.bold = True
            set_cell_border(cell)

    return tbl

# ─── Build Document ───────────────────────────────────────────────────────────

def build_docx():
    doc = Document()

    section = doc.sections[0]
    section.page_width = Inches(8.5)
    section.page_height = Inches(11.0)
    section.top_margin = Inches(1.0)
    section.bottom_margin = Inches(1.0)
    section.left_margin = Inches(1.0)
    section.right_margin = Inches(1.0)

    normal = doc.styles['Normal']
    normal.font.name = 'Times New Roman'
    normal.font.size = Pt(11)
    normal.paragraph_format.space_after = Pt(4)
    normal.paragraph_format.line_spacing = Pt(13)

    # ──── COVER PAGE ────
    def cov(text, size=12, bold=False, italic=False, space_before=0, space_after=4):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_before = Pt(space_before)
        p.paragraph_format.space_after = Pt(space_after)
        r = p.add_run(text)
        r.font.name = 'Times New Roman'
        r.font.size = Pt(size)
        r.bold = bold
        r.italic = italic
        r.font.color.rgb = RGBColor(0, 0, 0)
        return p

    cov('', space_before=36)
    cov('CEBU INSTITUTE OF TECHNOLOGY – UNIVERSITY', size=13, bold=True, space_after=2)
    cov('College of Computer Studies', size=11, space_after=24)
    cov('Final Validation Instrument', size=22, bold=True, space_after=6)
    cov('for', size=12, space_after=6)
    cov('CiteWise', size=18, bold=True, space_after=8)
    cov('PSSUQ Psychometric Evaluation (Lewis, 1992/2002) & Domain-Specific Validation Rubrics', size=10.5, italic=True, space_after=24)

    meta = [
        ('Document ID:', '2627-sem1-it411-39_Final_Validation_Instrument  •  Version 2.0'),
        ('Date:', 'November 2026'),
        ('System Under Test:', 'CiteWise — AI-Augmented Literature Evaluation and Proposal Introduction Drafting Platform'),
        ('Deployed Target:', 'Web (Vercel): https://citewise-seven.vercel.app\nAPI (Heroku): https://citewise-2220a55a4660.herokuapp.com/api'),
        ('Architecture Stack:', 'React 19 (Vite 7)  •  Node.js v20+ / Express 5.2.1  •  Supabase PostgreSQL (RLS)  •  Cloudflare R2  •  n8n & Google Gemini  •  Crossref API & LlamaParse OCR'),
        ('Course & Term:', 'IT411: Software Testing, Quality Assurance, and Maintenance  •  AY 2026–2027, Semester 1'),
        ('Project & Group:', '2627-sem1-IT411-39  /  Team IT411-G3'),
        ('Prepared by:', 'Rabe, Pranz Nicole C. | Ramirez, Ruther Gerard L.\nReyes, Christian Andrey V. | Encallado, Sophia Bianca A.\nBadinas, Gregory Ivan Onyx M.'),
        ('Academic Adviser:', 'Mrs. Erica Jean Abadinas'),
        ('Upstream Baseline:', 'SRS v1.2, SDD v2.0, SMPM, STD v1.4 (63 Test Cases), Refactoring Evidence v1.0 (7 Major Refactorings), Usability Testing Validation Plan v2.0'),
    ]

    meta_table = doc.add_table(rows=len(meta), cols=2)
    meta_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    meta_table.style = 'Table Grid'
    for i, (label, val) in enumerate(meta):
        lc = meta_table.cell(i, 0)
        vc = meta_table.cell(i, 1)
        lc.width = Inches(1.6)
        vc.width = Inches(4.9)
        lp = lc.paragraphs[0]
        lp.paragraph_format.space_after = Pt(2)
        lr = lp.add_run(label)
        lr.bold = True
        lr.font.name = 'Times New Roman'
        lr.font.size = Pt(9.5)
        vp = vc.paragraphs[0]
        vp.paragraph_format.space_after = Pt(2)
        vr = vp.add_run(val)
        vr.font.name = 'Times New Roman'
        vr.font.size = Pt(9.5)
        for cell in (lc, vc):
            set_cell_border(cell)

    p_note = doc.add_paragraph()
    p_note.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_note.paragraph_format.space_before = Pt(14)
    add_run(
        p_note,
        'This document contains the complete, ready-to-administer Final Validation Instrument for CiteWise, operationalizing '
        'the PSSUQ usability framework alongside the domain-specific verification rubrics defined in the Software Requirements '
        'Specification (SRS v1.2), Software Design Description (SDD v2.0), Software Test Document (STD v1.4), and Software '
        'Project Management Plan (SMPM).',
        italic=True, size=9.5
    )

    doc.add_page_break()

    # ──── CHANGE HISTORY & TABLE OF CONTENTS ────
    h1(doc, 'Change History')
    add_clean_table(
        doc,
        headers=['Version', 'Date', 'Author(s)', 'Section(s) Changed', 'Description of Change'],
        rows_data=[
            ('1.0', 'Sep 2026', 'Rabe, P., Ramirez, R., Reyes, C., Encallado, S., Badinas, G.', 'All',
             'Initial MVP Validation Questionnaire (30-item mixed-method instrument: Q1–Q3 demographic, Q4–Q27 4-point Likert efficacy, Q28–Q30 open-ended) and SUS baseline.'),
            ('2.0', 'Nov 2026', 'Rabe, P., Ramirez, R., Reyes, C., Encallado, S., Badinas, G.', 'All (§1–§9)',
             'Final Validation Instrument aligned with refactored CiteWise v2.0 architecture. Adopts the 19-item 7-point PSSUQ framework (Lewis 1992/2002) with SYSUSE, INFOQUAL, and INTERQUAL subscales; aligns tasks UT-01 to UT-04 with UC-1.1 through UC-3.3; incorporates SMPM domain rubrics (source-selection accuracy, APA 7th citation compiler accuracy, CATalyst gap coverage) and Dual SLA telemetry.'),
        ],
        col_widths=[0.55, 0.75, 1.5, 1.0, 2.7],
        bold_cols=(0,)
    )

    h1(doc, 'Table of Contents')
    add_clean_table(
        doc,
        headers=['§', 'Section Title', 'Contents & Validation Artifacts'],
        rows_data=[
            ('1', 'Purpose, Scope & Theoretical Framework', 'System context (CATalyst → CiteWise → CATalyst 2.0), PSSUQ rationale, ISO/IEC 25010:2023 & GQM mapping'),
            ('2', 'System Under Test & Module Traceability', 'Modules 1–3 architecture, use cases UC-1.1 to UC-3.3, STD test case links, and GQM matrix'),
            ('3', 'Instrument Part I: Consent & Participant Profile', 'Sampling strategy (N=24–30), inclusion criteria, RA 10173 privacy notice, and Demographic Form'),
            ('4', 'Instrument Part II: Usability Task Sheet (UT-01–UT-04)', 'Participant task prompts for Module 1, Module 2 (HITL & PDF.js), and Module 3 (RAG & De-slop), plus test corpus'),
            ('5', 'Instrument Part III: PSSUQ 19-Item Questionnaire', '7-point Likert respondent sheet (SYSUSE 1–8, INFOQUAL 9–15, INTERQUAL 16–18, OVERALL 19) & scoring formulae'),
            ('6', 'Instrument Part IV: Domain Rubrics & Debrief Guide', 'SMPM objective rubrics (Source Selection ≥80%, APA 7th Error ≤15%, Gap Coverage 100%) & retrospective interview'),
            ('7', 'Instrument Part V: Observer & Telemetry Logs', 'Think-aloud observer sheet, Dual SLA telemetry log (extraction_ms & total_ms), and SEV-1–SEV-4 defect log'),
            ('8', 'Acceptance Criteria, Baselines & Exit Gates', 'PSSUQ thresholds, task & domain thresholds, MVP & Refactoring Evidence baselines (199/199 unit tests), Exit Gate Rule'),
            ('9', 'Validation Governance, Schedule, Risks & Sign-Off', 'Team RACI roles, milestone schedule, risk register, data integrity controls, sign-off block & references'),
        ],
        col_widths=[0.35, 2.55, 3.6],
        bold_cols=(0, 1)
    )

    doc.add_page_break()

    # ──── SECTION 1 ────
    h1(doc, '1. Purpose, Scope & Theoretical Framework')
    body_p(
        doc,
        'CiteWise is a web-based, AI-augmented literature evaluation and proposal introduction drafting platform developed at the '
        'College of Computer Studies, Cebu Institute of Technology – University (Project Code: 2627-sem1-IT411-39). Within the '
        'two-stage research workflow, CiteWise operates downstream of CATalyst (problem and research-gap discovery) and upstream '
        'of CATalyst 2.0 (SMART research objective formulation). It ingests standardized research baselines from CATalyst, extracts '
        'and indexes candidate Review of Related Literature (RRL) PDFs, evaluates each paper against a weighted four-criterion '
        'academic rubric with page-level evidence traceability, enforces mandatory Human-in-the-Loop (HITL) validation, and drafts '
        'a cited three-part Proposal Introduction (Background, Rationale, Research Gap) in APA 7th Edition.'
    )
    body_p(
        doc,
        'This Final Validation Instrument defines the complete set of psychometric questionnaires, domain-specific evaluation '
        'rubrics, participant task sheets, observer recording forms, and telemetry checklists used to validate the feature-complete, '
        'refactored CiteWise v2.0 application prior to final capstone defense.'
    )

    h2(doc, '1.1 Methodological Transition: From MVP Survey & SUS to PSSUQ + Domain Rubrics')
    body_p(
        doc,
        'During the MVP Validation Study (September 21–28, 2026; N=24), the team administered a 30-item mixed-method questionnaire '
        'alongside an initial System Usability Scale (SUS; Brooke, 1996) plan. Following the completion of all seven major '
        'architectural refactorings (documented in CiteWise-Refactoring-Evidence.docx) and adviser review, this final instrument '
        'adopts the 19-item Post-Study System Usability Questionnaire (PSSUQ; Lewis, 1992/2002) paired with objective product '
        'validation rubrics from the Software Project Management Plan (SMPM §1.1.1):'
    )
    bullet_p(doc, 'Three-dimensional diagnostic subscales: ',
             'Unlike single-score SUS, PSSUQ decomposes usability into System Usefulness (SYSUSE, Items 1–8), Information Quality '
             '(INFOQUAL, Items 9–15), and Interface Quality (INTERQUAL, Items 16–18), plus Overall Satisfaction (Item 19). This '
             'directly isolates whether user friction stems from workflow speed (SYSUSE), AI rubric rationales and citation warnings '
             '(INFOQUAL), or the multi-panel PDF.js and synthesis interface (INTERQUAL).')
    bullet_p(doc, '7-point positive Likert sensitivity: ',
             'Anchored at 1 = Strongly Agree to 7 = Strongly Disagree (Lower = Better), all 19 items are phrased positively, '
             'reducing respondent cognitive load and eliminating alternating-polarity scoring errors.')
    bullet_p(doc, 'Published normative benchmarks: ',
             'Scores are evaluated directly against Lewis (2002) IBM post-study norms (SYSUSE μ = 2.76, INFOQUAL μ = 2.90, '
             'INTERQUAL μ = 2.70, Overall μ = 2.82) with stricter CiteWise exit thresholds (Overall ≤ 2.50).')
    bullet_p(doc, 'Alignment with ISO/IEC 25010:2023 & SMPM Product Targets: ',
             'Psychometric perceptions are triangulated against objective domain metrics required by SMPM §1.1.1: PDF text-parsing '
             'rate (≥ 95%), HITL source-selection accuracy (≥ 80%), CATalyst research gap incorporation (100%), approved RRL citation '
             'coverage (≥ 80%), APA 7th Edition formatting error rate (≤ 15%), and Dual SLA latency compliance.')

    h2(doc, '1.2 Governing Standards & Project Baselines')
    add_clean_table(
        doc,
        headers=['Standard / Project Artifact', 'Applicability to Final Validation Instrument'],
        rows_data=[
            ('ISO/IEC 25010:2023 (SQuaRE)', 'Quality-in-use characteristics: Effectiveness (SYSUSE), Learnability (INFOQUAL), Aesthetics/Satisfaction (INTERQUAL)'),
            ('Lewis, J. R. (1992/2002) — PSSUQ', '19-item, 7-point psychometric usability instrument and normative subscale benchmarks'),
            ('Basili, V. — GQM Framework', 'Goal–Question–Metric decomposition linking usability and domain accuracy goals to operational metrics'),
            ('APA 7th Edition Publication Manual', 'Governing standard for inline citation compiler (author-date, et al., compound surnames) and reference list'),
            ('SRS v1.2 & SDD v2.0 (2627-sem1-IT411-39)', 'Functional use cases (UC-1.1 to UC-3.3), non-functional Dual SLA, and architectural baseline'),
            ('STD v1.4 & Refactoring Evidence v1.0', '63 functional/non-functional test cases, 199/199 unit tests, and 7 verified architectural refactorings'),
            ('SMPM (Software Project Management Plan)', 'Control vs. test group validation metrics, 30-user study governance, and RA 10173 data privacy controls'),
        ],
        col_widths=[2.4, 4.1],
        bold_cols=(0,)
    )

    # ──── SECTION 2 ────
    h1(doc, '2. System Under Test & Module Traceability')
    body_p(
        doc,
        'The Final Validation Instrument evaluates all three functional modules of CiteWise across four end-to-end usability task '
        'scenarios (UT-01 to UT-04). Table 2.1 maps each module to its SRS use cases, SDD components, STD test cases, usability '
        'tasks, and ISO/IEC 25010 attributes.'
    )

    h2(doc, '2.1 CiteWise Module & Use Case Coverage Matrix')
    add_clean_table(
        doc,
        headers=['Module', 'SRS Use Cases & SDD Components', 'Core User Workflow Evaluated', 'Task & STD Ref', 'ISO 25010 & PSSUQ'],
        rows_data=[
            ('Module 1:\nCATalyst Integration Gateway',
             'UC-1.1 Import CATalyst Data\nUC-1.2 Topic & Gap Workshop\nUC-1.3 Upload RRL PDFs\n(pdf-parse, LlamaParse OCR, R2, Crossref)',
             'Import research title, rationale & gaps from CATalyst; configure target gaps; batch upload RRL PDFs (≤20MB) and verify extracted metadata',
             'UT-01\n(TC-1.1-01 to TC-1.3-04)',
             'Effectiveness, Efficiency\n(SYSUSE, INFOQUAL)'),
            ('Module 2:\nRRL Rubric Engine & HITL Validation',
             'UC-2.1 4-Criterion AI Scoring\nUC-2.2 Review & Approve RRL\nUC-2.3 Custom Weights & Batch\nUC-2.4 Usage Tiers\nUC-2.5 PDF.js Page Traceability',
             'Run 4-criterion rubric scoring (Gap 35%, Method 30%, Theory 20%, Citation 15%); inspect flags & PDF.js highlighted excerpts; adjust weights/tiers; approve or reject papers',
             'UT-02\n(TC-2.1-01 to TC-2.5-04)',
             'Effectiveness, Learnability, Satisfaction\n(SYSUSE, INFOQUAL, INTERQUAL)'),
            ('Module 3:\nAutomated Synthesis & Citation',
             'UC-3.1 Draft Proposal Intro\nUC-3.2 "De-slop" Paraphrasing\nUC-3.3 Directives, Versioning, PDF/DOCX Export & CATalyst 2.0 Handoff',
             'Generate async HTTP 202 3-part RAG introduction from approved RRLs; verify APA 7th citations; apply «CITn»/«HDRn» protected De-slop paraphrasing; export PDF/DOCX & handoff',
             'UT-03, UT-04\n(TC-3.1-01 to TC-3.3-04)',
             'Effectiveness, Learnability, Satisfaction\n(SYSUSE, INFOQUAL, INTERQUAL)'),
        ],
        col_widths=[1.15, 1.55, 1.9, 0.9, 1.0],
        bold_cols=(0, 3)
    )

    body_p(
        doc,
        'Scope Boundary: Upstream gap discovery algorithms inside CATalyst, non-English or image-only unparsable PDFs, citation '
        'formats other than APA 7th Edition, and infrastructure provisioning are excluded per SMPM §1.1.1.',
        italic=True
    )

    h2(doc, '2.2 Goal–Question–Metric (GQM) Decomposition')
    add_clean_table(
        doc,
        headers=['Goal ID & Objective (G)', 'Evaluation Question (Q)', 'Operational Metric & Target Threshold (M)'],
        rows_data=[
            ('G1: Perceived System Usability', 'How usable and satisfying is CiteWise across the end-to-end workflow?',
             'PSSUQ Overall Score ≤ 2.50 (Lewis 2002 norm: 2.82); Item 19 ≤ 2.50'),
            ('G2: Workflow Usefulness & Setup Efficiency', 'Can researchers import baselines, screen RRLs, and draft introductions effectively?',
             'Task Completion Rate (TCR) ≥ 90.0%; SYSUSE (Items 1–8) ≤ 2.60; Manual setup time reduction ≥ 80%'),
            ('G3: AI Insight & Traceability Clarity', 'Are rubric scores, mismatch flags, PDF.js highlights, and citation warnings clear?',
             'INFOQUAL (Items 9–15) ≤ 2.70; Source-selection accuracy ≥ 80% on standardized RRL test corpus'),
            ('G4: Visual & Interaction Quality', 'Is the multi-panel Validation Dashboard and Synthesis Editor intuitive and consistent?',
             'INTERQUAL (Items 16–18) ≤ 2.50; Critical Error Rate (CER) ≤ 5.0%'),
            ('G5: Synthesis & APA 7th Citation Integrity', 'Does the drafted introduction incorporate all gaps and format citations accurately?',
             '100% CATalyst gap incorporation; ≥ 80% approved RRL coverage; ≤ 15% APA 7th formatting error rate; 0% hallucinated citations'),
            ('G6: Dual SLA & Async Responsiveness', 'Does system latency satisfy the recalibrated Dual SLA and async polling targets?',
             'Tier 1 local extraction ≤ 1.0 s (100% runs); Tier 2 AI scoring ≤ 30.0 s (≥ 90% runs; MVP mean 10.44 s); Async 202 response < 100 ms'),
        ],
        col_widths=[1.5, 2.1, 2.9],
        bold_cols=(0,)
    )

    # ──── SECTION 3 ────
    h1(doc, '3. Instrument Part I: Informed Consent & Participant Profile Form')
    h2(doc, '3.1 Sampling Strategy, Inclusion Criteria & Ethical Compliance')
    body_p(
        doc,
        'Participants are recruited via purposive sampling targeting undergraduate university students actively conducting academic '
        'research or capstone proposals (primary persona: 3rd and 4th Year BS Information Technology and allied degree students at '
        'CIT-U). A minimum sample size of N=24 (up to N=30 per SMPM §8.1.1) satisfies the Nielsen & Landauer (1993) quantitative '
        'usability threshold (N ≥ 20).'
    )
    bullet_p(doc, 'Inclusion Criteria: ',
             '(1) Enrolled undergraduate student with experience in academic research or RRL writing; (2) Prior familiarity with word '
             'processors or reference tools; (3) Not a member of the CiteWise development team; (4) Voluntary signed informed consent.')
    bullet_p(doc, 'Data Privacy Act of 2012 (RA 10173) Compliance: ',
             'Per SMPM §8.1.1, participant identities are anonymized using sequential codes (P-001 to P-030). Only workflow telemetry, '
             'task observations, and questionnaire ratings are retained for academic analysis and deleted/anonymized after final defense.')

    h2(doc, '3.2 Printable Form — Participant Informed Consent & Demographic Profile')
    add_clean_table(
        doc,
        headers=['Field / Item', 'Participant Response / Selection (To be completed prior to Phase B)'],
        rows_data=[
            ('Participant Code (Assigned by Facilitator)', 'P-______    |    Session Date: ____/____/2026    |    Group Assignment:  [ ] Test Group (CiteWise)   [ ] Control Group'),
            ('Q1. Year Level', '[ ] 1st Year     [ ] 2nd Year     [ ] 3rd Year     [ ] 4th Year'),
            ('Q2. Academic Degree / Program', '[ ] BS Information Technology (BSIT)     [ ] BS Computer Science (BSCS)\n[ ] BS Psychology (BSPsych)              [ ] BS Civil Engineering (BSCE)\n[ ] BS Business Administration (BSBA)    [ ] Other: ________________________'),
            ('Q3. Academic Research Experience', '[ ] Currently writing Capstone / Thesis proposal or manuscript\n[ ] Completed at least one academic research course with RRL chapter\n[ ] Prior experience with citation/reference tools (Zotero, Mendeley, MS Word Citations, Google Scholar)'),
            ('Informed Consent Attestation\n(RA 10173 & CIT-U Ethics)',
             'I voluntarily agree to participate in the CiteWise usability and validation study. I understand that my task performance, '
             'system telemetry, and questionnaire responses will be recorded anonymously under my Participant Code for academic research '
             'purposes in accordance with the Data Privacy Act of 2012 (RA 10173), and that I may withdraw at any time without penalty.\n\n'
             'Participant Signature: ____________________________      Date: _______________      Screen Recording Consent:  [ ] Yes   [ ] No'),
        ],
        col_widths=[2.0, 4.5],
        bold_cols=(0,)
    )

    # ──── SECTION 4 ────
    h1(doc, '4. Instrument Part II: Guided Usability Task Sheet (UT-01 to UT-04)')
    body_p(
        doc,
        'The following task sheet is provided to each participant during Phase B (Task Execution, ~35 minutes). Participants execute '
        'UT-01 through UT-04 sequentially in a live browser session (https://citewise-seven.vercel.app) using the standardized '
        'test dataset while verbalizing their thoughts under the Think-Aloud Protocol.'
    )

    h2(doc, '4.1 Standardized Validation Dataset (From STD §2.3 Test Corpus)')
    add_clean_table(
        doc,
        headers=['Dataset ID', 'Document Type & Role in Validation', 'Expected System & User Outcome'],
        rows_data=[
            ('CATalyst Baseline (WS-A)', 'Imported Group Research Title, Rationale, and 3 target Research Gaps', 'Automatically populates Module 1 workspace and Topic/Gap Workshop via GET /api/rrl/catalyst'),
            ('CORPUS-01 to CORPUS-05', 'In-domain peer-reviewed academic PDFs (3 to 21 pages, digital text layer)', 'Extracted in ≤1.0 s; scored ≥70 (High/Moderate Relevance) with verified page excerpts; user Approves'),
            ('CTRL-A, CTRL-B, CTRL-C', 'Out-of-scope / mismatched methodology control PDFs (STD §2.3)', 'Flagged with Topic Mismatch / declared score caps; scored <50 (Low Relevance); user Rejects / Excludes'),
        ],
        col_widths=[1.4, 2.4, 2.7],
        bold_cols=(0,)
    )

    h2(doc, '4.2 Participant Task Scenarios & Prompts (UT-01 to UT-04)')
    add_clean_table(
        doc,
        headers=['Task ID & Target Time', 'Module & Use Case', 'Participant Prompt (Read/Handed to Participant)', 'Objective Pass / Success Criterion'],
        rows_data=[
            ('UT-01\n(Target: ≤ 120 s)',
             'Module 1:\nCATalyst Gateway\n(UC-1.1, UC-1.2, UC-1.3)',
             '"Open your assigned group workspace in CiteWise and verify that the research title, rationale, and research gaps from CATalyst have been imported. In the Topic & Gap Workshop, confirm the active research gaps. Then upload the assigned candidate RRL PDF files (including domain papers and control paper CTRL-A) and tell us when extraction and metadata indexing are complete."',
             'CATalyst baseline imported; PDFs pass magic-byte check, extract text in ≤1.0 s, populate Crossref metadata, and appear in document list without error.'),
            ('UT-02\n(Target: ≤ 60 s UI\n+ ≤ 30 s AI SLA)',
             'Module 2:\nRRL Rubric Engine & HITL Validation\n(UC-2.1 to UC-2.5)',
             '"Trigger the AI rubric assessment on your uploaded papers. Open the Validation Dashboard and examine the 4-criterion scores (Gap Alignment, Methodology, Theory/Framework, Citation Quality) and validation flags. Click an evidence excerpt to verify the highlighted quote inside the PDF.js page preview. Adjust the usage tier or rubric weight slider to observe score recalculation, then Approve the high-relevance domain papers and leave the mismatched control paper (CTRL-A) unapproved/excluded."',
             '4-criterion rubric breakdown & flags displayed; PDF.js opens to exact page with highlighted excerpt; weight/tier updates state; domain papers Approved and CTRL-A Excluded.'),
            ('UT-03\n(Target: ≤ 90 s UI\n+ Async 202)',
             'Module 3:\nSynthesis & De-slop Paraphrasing\n(UC-3.1, UC-3.2)',
             '"Proceed to Module 3 (Automated Synthesis & Citation) and generate the three-part Proposal Introduction (Background, Rationale, Research Gap). Once drafting completes, verify that only your approved papers are cited in APA 7th Edition and that all research gaps are addressed. Next, trigger the \'De-slop\' AI Paraphrasing tool on the draft, review the refined academic prose, and accept the paraphrased version."',
             '3-part introduction generated via HTTP 202 polling; 0 excluded sources leaked; APA 7th citations reconciled; De-slop completes with all «CITn» citations and «HDRn» headers preserved.'),
            ('UT-04\n(Target: ≤ 60 s)',
             'Module 3:\nVersioning, Export & Handoff\n(UC-3.3)',
             '"Save your current draft to Version History. Export your Proposal Introduction and Reference List as both a PDF file and a DOCX file, open the downloaded files to confirm that formatting, 1-inch margins, and special author characters render properly, and initiate the handoff to CATalyst 2.0."',
             'Draft saved in version history; client-side PDF (Roboto TTF) and DOCX download and open without corruption or garbled characters; CATalyst 2.0 handoff confirmed.'),
        ],
        col_widths=[0.95, 1.15, 2.8, 1.6],
        bold_cols=(0, 1)
    )

    # ──── SECTION 5 ────
    h1(doc, '5. Instrument Part III: PSSUQ 19-Item Psychometric Questionnaire')
    body_p(
        doc,
        'Immediately upon completing UT-01 through UT-04 (Phase C, ~10 minutes), the participant completes the 19-item Post-Study '
        'System Usability Questionnaire (PSSUQ; Lewis, 1992/2002) independently. Every item is rated on a 7-point Likert scale '
        'where 1 = Strongly Agree and 7 = Strongly Disagree (Lower scores indicate higher usability).'
    )

    h2(doc, '5.1 PSSUQ 7-Point Response Scale & Scoring Direction')
    add_clean_table(
        doc,
        headers=['1', '2', '3', '4', '5', '6', '7', 'N/A'],
        rows_data=[
            ('Strongly Agree\n(Best Usability)', 'Agree', 'Somewhat Agree', 'Neither Agree nor Disagree', 'Somewhat Disagree', 'Disagree', 'Strongly Disagree\n(Worst Usability)', 'Not Applicable / Blank'),
        ],
        col_widths=[0.85, 0.75, 0.85, 0.9, 0.85, 0.75, 0.85, 0.7],
        bold_cols=(0, 6)
    )
    body_p(
        doc,
        'Scoring Rule: Subscale score = arithmetic mean of non-blank items in that subscale. Items marked N/A or left blank are '
        'excluded from the denominator (never set to 0). Lower = Better.',
        italic=True
    )

    h2(doc, '5.2 Printable Respondent Form — PSSUQ 19-Item Bank (Contextualized to CiteWise)')
    add_clean_table(
        doc,
        headers=['Item ID', 'Subscale', 'Statement (Rate 1 = Strongly Agree to 7 = Strongly Disagree)', 'Rating (Circle One)'],
        rows_data=[
            ('PSSUQ-1', 'SYSUSE', 'Overall, I am satisfied with how easy it is to use CiteWise.', '1   2   3   4   5   6   7   N/A'),
            ('PSSUQ-2', 'SYSUSE', 'It was simple to use CiteWise to screen literature and draft a proposal introduction.', '1   2   3   4   5   6   7   N/A'),
            ('PSSUQ-3', 'SYSUSE', 'I was able to complete the research tasks and scenarios (UT-01 to UT-04) quickly using CiteWise.', '1   2   3   4   5   6   7   N/A'),
            ('PSSUQ-4', 'SYSUSE', 'I felt comfortable using CiteWise during the literature evaluation and synthesis workflow.', '1   2   3   4   5   6   7   N/A'),
            ('PSSUQ-5', 'SYSUSE', 'It was easy to learn to use CiteWise.', '1   2   3   4   5   6   7   N/A'),
            ('PSSUQ-6', 'SYSUSE', 'I believe I could become productive quickly in my academic research using CiteWise.', '1   2   3   4   5   6   7   N/A'),
            ('PSSUQ-7', 'SYSUSE', 'CiteWise gave error messages or validation alerts that clearly told me how to fix problems.', '1   2   3   4   5   6   7   N/A'),
            ('PSSUQ-8', 'SYSUSE', 'Whenever I made a mistake using CiteWise (e.g., weight sliders, approvals, draft edits), I could recover easily and quickly.', '1   2   3   4   5   6   7   N/A'),
            ('PSSUQ-9', 'INFOQUAL', 'The information (such as AI rubric rationales, mismatch flags, PDF.js highlights, and status messages) provided with CiteWise was clear.', '1   2   3   4   5   6   7   N/A'),
            ('PSSUQ-10', 'INFOQUAL', 'It was easy to find the information I needed (scores, page-verified quotes, and APA 7th citations).', '1   2   3   4   5   6   7   N/A'),
            ('PSSUQ-11', 'INFOQUAL', 'The information provided by CiteWise was easy to understand.', '1   2   3   4   5   6   7   N/A'),
            ('PSSUQ-12', 'INFOQUAL', 'The information (4-criterion scores and page-level evidence) was effective in helping me complete the tasks and scenarios.', '1   2   3   4   5   6   7   N/A'),
            ('PSSUQ-13', 'INFOQUAL', 'The organization of information on the CiteWise screens (Gateway, Validation Dashboard, Synthesis Editor) was clear.', '1   2   3   4   5   6   7   N/A'),
            ('PSSUQ-14', 'INFOQUAL', 'The interface of CiteWise was pleasant.', '1   2   3   4   5   6   7   N/A'),
            ('PSSUQ-15', 'INFOQUAL', 'I liked using the interface of CiteWise.', '1   2   3   4   5   6   7   N/A'),
            ('PSSUQ-16', 'INTERQUAL', 'CiteWise has all the functions and capabilities I expect an AI research literature evaluation and drafting assistant to have.', '1   2   3   4   5   6   7   N/A'),
            ('PSSUQ-17', 'INTERQUAL', 'Overall, I am satisfied with the CiteWise interface design.', '1   2   3   4   5   6   7   N/A'),
            ('PSSUQ-18', 'INTERQUAL', 'There is no inconsistency in the visual design of CiteWise across Modules 1, 2, and 3.', '1   2   3   4   5   6   7   N/A'),
            ('PSSUQ-19', 'OVERALL', 'Overall, I am satisfied with CiteWise. (Global summary item)', '1   2   3   4   5   6   7   N/A'),
        ],
        col_widths=[0.75, 0.85, 3.3, 1.6],
        bold_cols=(0, 1)
    )

    h2(doc, '5.3 Subscale Scoring Formulae & Normative Benchmarks (Lewis, 2002)')
    add_clean_table(
        doc,
        headers=['PSSUQ Subscale', 'Items Averaged', 'Computation Formula', 'Lewis (2002) Norm (μ ± SD)', 'CiteWise Target Threshold'],
        rows_data=[
            ('SYSUSE (System Usefulness)', 'Items 1–8', 'Mean(PSSUQ-1 to PSSUQ-8)', '2.76 (SD 0.90)', '≤ 2.60'),
            ('INFOQUAL (Information Quality)', 'Items 9–15', 'Mean(PSSUQ-9 to PSSUQ-15)', '2.90 (SD 0.84)', '≤ 2.70'),
            ('INTERQUAL (Interface Quality)', 'Items 16–18', 'Mean(PSSUQ-16 to PSSUQ-18)', '2.70 (SD 0.90)', '≤ 2.50'),
            ('OVERALL (Global Usability)', 'Items 1–19', 'Mean(PSSUQ-1 to PSSUQ-19)', '2.82 (SD 0.84)', '≤ 2.50'),
        ],
        col_widths=[1.6, 0.9, 1.5, 1.4, 1.1],
        bold_cols=(0, 4)
    )

    # ──── SECTION 6 ────
    h1(doc, '6. Instrument Part IV: Domain-Specific Validation Rubrics & Debrief Guide')
    body_p(
        doc,
        'Per SMPM §1.1.1 ("Determination of satisfaction") and §1.1.3 ("Validation study results"), CiteWise must be validated not '
        'only on perceived usability (PSSUQ) but also on objective domain accuracy across its three modules. The Data Analyst and '
        'Observer complete Table 6.1 for each participant session.'
    )

    h2(doc, '6.1 CiteWise Domain-Specific Product Target Verification Rubric')
    add_clean_table(
        doc,
        headers=['Domain Metric (SMPM / SRS)', 'Module', 'Operational Measurement Formula', 'Target Threshold', 'Observed Value & Verdict'],
        rows_data=[
            ('M1-A: Setup Time Reduction', 'Module 1', '(Mean Control Setup Time − CiteWise UT-01 Time) / Mean Control Setup Time × 100%', '≥ 80% reduction', '_____ s  (____%)   [ ] PASS  [ ] FAIL'),
            ('M1-B: Semantic Mapping Accuracy', 'Module 1', 'Correctly mapped CATalyst Title, Rationale & Gap fields / Total imported fields × 100%', '≥ 90% accuracy', '____ / ____ (____%) [ ] PASS  [ ] FAIL'),
            ('M1-C: PDF Text-Parsing Rate', 'Module 1', 'Successfully extracted digital academic PDFs with valid page offsets / Total digital PDFs × 100%', '≥ 95% parsing rate', '____ / ____ (____%) [ ] PASS  [ ] FAIL'),
            ('M2-A: Source-Selection Accuracy', 'Module 2', '(Approved relevant corpus PDFs + Rejected CTRL-A/B/C PDFs) / Total corpus PDFs evaluated × 100%', '≥ 80% accuracy', '____ / ____ (____%) [ ] PASS  [ ] FAIL'),
            ('M2-B: Page-Excerpt Traceability', 'Module 2', 'Evidence excerpts whose PDF.js page preview & highlight match source PDF page / Total excerpts × 100%', '100% page match', '____ / ____ (____%) [ ] PASS  [ ] FAIL'),
            ('M3-A: CATalyst Gap Incorporation', 'Module 3', 'Imported CATalyst Research Gaps addressed in generated 3-part Introduction / Total imported gaps × 100%', '100% incorporation', '____ / ____ (____%) [ ] PASS  [ ] FAIL'),
            ('M3-B: Approved RRL Citation Coverage', 'Module 3', 'Distinct user-approved RRL documents cited in generated Introduction / Total approved RRLs × 100%', '≥ 80% coverage', '____ / ____ (____%) [ ] PASS  [ ] FAIL'),
            ('M3-C: Citation Hallucination / Leak Rate', 'Module 3', 'Unapproved, excluded, or fabricated citations present in draft or after De-slop paraphrasing', '0% (Zero tolerance)', '____ citations      [ ] PASS  [ ] FAIL'),
            ('M3-D: APA 7th Formatting Error Rate', 'Module 3', 'Inline citations or reference entries with APA 7th syntax errors / Total generated citations × 100%', '≤ 15% error rate', '____ / ____ (____%) [ ] PASS  [ ] FAIL'),
        ],
        col_widths=[1.4, 0.65, 2.2, 0.95, 1.3],
        bold_cols=(0, 3)
    )

    h2(doc, '6.2 Post-Session Retrospective Debrief Interview Guide (Phase D, ~5 minutes)')
    add_clean_table(
        doc,
        headers=['Prompt ID', 'Open-Ended Debrief Question (Asked by Session Facilitator)', 'Summary of Verbatim Participant Response'],
        rows_data=[
            ('DEBRIEF-1', 'Which CiteWise feature (CATalyst import, 4-criterion rubric & PDF.js page preview, or 3-part RAG synthesis & De-slop paraphrasing) was most helpful for your research workflow, and why?', '\n\n'),
            ('DEBRIEF-2', 'Did you encounter any confusion when interpreting the AI rubric scores, mismatch flags, or citation reconciliation warnings?', '\n\n'),
            ('DEBRIEF-3', 'What was the biggest difficulty or friction point you experienced across Tasks UT-01 through UT-04?', '\n\n'),
            ('DEBRIEF-4', 'What specific improvements would you recommend prior to full institutional deployment?', '\n\n'),
        ],
        col_widths=[0.85, 2.85, 2.8],
        bold_cols=(0,)
    )

    # ──── SECTION 7 ────
    h1(doc, '7. Instrument Part V: Observer Recording, Telemetry & Defect Logging Sheets')
    h2(doc, '7.1 Session Administration Structure & Think-Aloud Protocol')
    add_clean_table(
        doc,
        headers=['Phase', 'Activity', 'Administration Protocol & Facilitator Rules', 'Duration'],
        rows_data=[
            ('Phase A', 'Briefing & Consent', 'Administer Part I (Consent & Profile Form); explain study objectives and Think-Aloud rules ("Say what you see, what you are doing, and what you are thinking").', '~10 min'),
            ('Phase B', 'Task Execution (UT-01–UT-04)', 'Participant executes Part II tasks independently. Facilitator uses only neutral prompts ("What are you thinking right now?", "Please keep talking") and provides zero functional hints.', '~35 min'),
            ('Phase C', 'PSSUQ Administration', 'Participant independently completes Part III (19-item PSSUQ Form) without facilitator interpretation.', '~10 min'),
            ('Phase D', 'Debrief & Telemetry Export', 'Facilitator conducts Part IV debrief interview while Data Analyst exports Part IV/V database telemetry.', '~5 min'),
        ],
        col_widths=[0.65, 1.35, 3.8, 0.7],
        bold_cols=(0, 1)
    )

    h2(doc, '7.2 Printable Observer Task Recording Sheet (Per Participant)')
    add_clean_table(
        doc,
        headers=['Task ID', 'Completed?', 'Start Time', 'End Time', 'UI Elapsed (s)', 'Target (s)', 'Critical Errors', 'Observer Notes / Hesitation Points'],
        rows_data=[
            ('UT-01 (Module 1 Upload)', '[ ] Yes  [ ] No', '___:___', '___:___', '______ s', '≤ 120 s', '____', ''),
            ('UT-02 (Module 2 HITL)', '[ ] Yes  [ ] No', '___:___', '___:___', '______ s', '≤ 60 s*', '____', ''),
            ('UT-03 (Module 3 Draft)', '[ ] Yes  [ ] No', '___:___', '___:___', '______ s', '≤ 90 s*', '____', ''),
            ('UT-04 (Module 3 Export)', '[ ] Yes  [ ] No', '___:___', '___:___', '______ s', '≤ 60 s', '____', ''),
        ],
        col_widths=[1.1, 0.85, 0.65, 0.65, 0.75, 0.65, 0.65, 1.2],
        bold_cols=(0,)
    )
    body_p(doc, '*Note: For UT-02 and UT-03, UI Elapsed (s) measures active human interaction time, while asynchronous LLM execution is logged separately in Table 7.3.', italic=True)

    h2(doc, '7.3 System Telemetry Verification Log (Dual SLA & Async 202 Endpoints)')
    add_clean_table(
        doc,
        headers=['Telemetry Field / Endpoint (Supabase / API)', 'Associated Task & Test Case', 'SLA Target Threshold', 'Recorded Session Value', 'SLA Verdict'],
        rows_data=[
            ('assessment_timings.extraction_ms (Tier 1 Local SLA)', 'UT-01 / TC-NF-01, TC-NF-02', '≤ 1,000 ms (≤ 1.0 s)\n(< 300 ms for 1–10p PDFs)', '________ ms\n(Page count: ____)', '[ ] PASS  [ ] FAIL'),
            ('assessment_timings.total_ms / assessment_duration_seconds (Tier 2 AI SLA)', 'UT-02 / TC-2.1-01, TC-NF-01', '≤ 30,000 ms (≤ 30.0 s)\n(Mean baseline: 10.44 s)', '________ ms\n(______ s)', '[ ] PASS  [ ] FAIL'),
            ('POST /api/v1/synthesis/generate (Initial HTTP 202 Handshake)', 'UT-03 / TC-3.1-01, TC-NF-03', 'HTTP 202 in ≤ 200 ms;\nFull RAG draft ≤ 60.0 s', '202: _____ ms\nTotal: _____ s', '[ ] PASS  [ ] FAIL'),
            ('POST /api/v1/synthesis/paraphrase (Async De-slop Polling)', 'UT-03 / TC-3.2-01, Refactor #1', 'HTTP 202 in ≤ 200 ms;\nZero Heroku H12 503 timeouts', '202: _____ ms\nTotal: _____ s', '[ ] PASS  [ ] FAIL'),
        ],
        col_widths=[1.85, 1.2, 1.35, 1.1, 1.0],
        bold_cols=(0,)
    )

    h2(doc, '7.4 Four-Tier Defect Severity Model & Real-Time Defect Log Sheet')
    add_clean_table(
        doc,
        headers=['Severity', 'Classification', 'Operational & Psychometric Definition', 'Resolution SLA', 'Release Gate Impact'],
        rows_data=[
            ('SEV-1', 'Critical / Blocker', 'System crash, data loss, IDOR/auth failure, hallucinated citation leak, or unrecoverable task failure. Directly fails TCR or CER exit gates.', 'Immediate (same day)', 'Blocks final defense / release'),
            ('SEV-2', 'Major', 'Significant functional impairment preventing task completion without workaround, or causing >0.5 point degradation on any PSSUQ subscale.', 'Within 48 hours', 'Release at risk until re-verified'),
            ('SEV-3', 'Minor', 'Usability friction, unclear label, or extra clicks that do not prevent task completion (0.2–0.5 point PSSUQ impact).', 'Within 1 sprint', 'Permitted with documented note'),
            ('SEV-4', 'Cosmetic / Low', 'Minor visual alignment or typography inconsistency (<0.2 point PSSUQ impact); does not affect functionality.', 'Backlog', 'No release impact'),
        ],
        col_widths=[0.65, 1.05, 2.7, 1.0, 1.1],
        bold_cols=(0, 1)
    )

    h3(doc, 'Real-Time Usability Defect Log & Pre-Session Verification Status')
    add_clean_table(
        doc,
        headers=['DEF-ID', 'Severity', 'Task & Use Case', 'PSSUQ Item(s)', 'Defect Description & Root Cause', 'Status'],
        rows_data=[
            ('DEF-001', 'SEV-1', 'UT-03 (UC-3.2)', 'PSSUQ-3, PSSUQ-8', 'Synchronous De-slop paraphrase timed out at ~30s with Heroku H12 503; refactored to async HTTP 202 + 1.5s polling (Refactor #1).', 'Resolved & Verified'),
            ('DEF-002', 'SEV-2', 'UT-04 (UC-3.3)', 'PSSUQ-12, PSSUQ-18', 'Client PDF export garbled Turkish Unicode "İ" (DEMİREL, 2024); extracted pdfExport.js with embedded Base64 Roboto TTF fonts (Refactor #2).', 'Resolved & Verified'),
            ('DEF-003', 'SEV-2', 'UT-03 (UC-3.1)', 'PSSUQ-7, PSSUQ-12', 'Excluded literature leaked into synthesis draft; enforced centralized getActiveApprovedDocs predicate & event sync (Refactor #4).', 'Resolved & Verified'),
            ('DEF-004', 'SEV-3', 'UT-02 (UC-2.1)', 'PSSUQ-9, PSSUQ-10', 'Ambiguous AI error state on n8n timeout vs. parsing failure and polling loop on 404; added circuit breaker & clear root-cause banner (Refactor #3).', 'Resolved & Verified'),
            ('DEF-005', 'SEV-3', 'UT-03 (UC-3.1)', 'PSSUQ-11, PSSUQ-16', 'Compound Filipino surnames ("Dela Cruz") truncated to "Cruz" and declared score caps ignored; fixed cultural particle parser & cap clamping (Refactor #7).', 'Resolved & Verified'),
            ('DEF-___', 'SEV-___', 'UT-___', 'PSSUQ-___', '[Blank row for live Phase 3 validation session logging]', 'Open / Triage'),
        ],
        col_widths=[0.65, 0.6, 0.95, 0.95, 2.45, 0.9],
        bold_cols=(0, 1, 5)
    )

    # ──── SECTION 8 ────
    h1(doc, '8. Acceptance Criteria, Empirical Baselines & Exit Gate Thresholds')
    body_p(
        doc,
        'For CiteWise to be declared formally validated and cleared for final defense submission, all Primary PSSUQ Thresholds '
        '(§8.1), Task & Domain Performance Thresholds (§8.2), and Technical System Baselines (§8.3) must be simultaneously satisfied.'
    )

    h2(doc, '8.1 Primary PSSUQ Usability Exit Thresholds')
    add_clean_table(
        doc,
        headers=['Psychometric Metric', 'Target Exit Threshold', 'Lewis (2002) IBM Benchmark', 'ISO/IEC 25010 Mapping & Rationale'],
        rows_data=[
            ('PSSUQ Overall (Items 1–19)', '≤ 2.50', 'μ = 2.82 (SD 0.84)', 'Holistic Satisfaction — >10% improvement over published benchmark'),
            ('SYSUSE Subscale (Items 1–8)', '≤ 2.60', 'μ = 2.76 (SD 0.90)', 'Effectiveness & Efficiency — strong task support across Modules 1–3'),
            ('INFOQUAL Subscale (Items 9–15)', '≤ 2.70', 'μ = 2.90 (SD 0.84)', 'Learnability — clear AI rubric explanations, PDF.js highlights & alerts'),
            ('INTERQUAL Subscale (Items 16–18)', '≤ 2.50', 'μ = 2.70 (SD 0.90)', 'Aesthetics & Operability — cohesive multi-column research UI'),
        ],
        col_widths=[1.6, 1.1, 1.4, 2.4],
        bold_cols=(0, 1)
    )

    h2(doc, '8.2 Task Performance & Domain Accuracy Exit Thresholds')
    add_clean_table(
        doc,
        headers=['Metric ID & Name', 'Target Threshold', 'Measurement Method', 'Governing Source'],
        rows_data=[
            ('TCR: Task Completion Rate', '≥ 90.0%', 'Binary task success across UT-01 to UT-04 without facilitator intervention', 'Usability Framework §5.2'),
            ('MTT-01 to MTT-04: Mean Task Times', 'UT-01 ≤120s; UT-02 ≤60s;\nUT-03 ≤90s; UT-04 ≤60s', 'Observer stopwatch from task prompt to completion signal (excluding LLM wait)', 'Usability Framework §5.2'),
            ('CER: Critical Error Rate', '≤ 5.0%', 'Percentage of task attempts resulting in unrecoverable failure or data loss', 'Usability Framework §5.2'),
            ('DOM-1: PDF Text-Parsing Accuracy', '≥ 95.0%', 'Digital academic PDFs extracted with intact text and page offsets', 'SMPM §1.1.1 / SRS §3.2'),
            ('DOM-2: Source-Selection Accuracy', '≥ 80.0%', 'Correct HITL approval of relevant corpus papers and rejection of CTRL-A/B/C', 'SMPM §1.1.1 / SRS §3.5'),
            ('DOM-3: Gap & Approved RRL Coverage', '100% Gaps; ≥ 80% RRLs;\n0% Hallucinated Citations', 'Audit of generated 3-part Proposal Introduction against group workspace', 'SMPM §1.1.1 / STD TC-3.1'),
            ('DOM-4: APA 7th Formatting Error Rate', '≤ 15.0%', 'Audit of inline citations and Reference List against APA 7th rubric', 'SMPM §1.1.1 / SRS §3.4'),
        ],
        col_widths=[1.6, 1.25, 2.45, 1.2],
        bold_cols=(0, 1)
    )

    h2(doc, '8.3 Pre-Validation Empirical Baseline (MVP Validation & Post-Refactoring Evidence)')
    body_p(
        doc,
        'Table 8.3 consolidates the verified empirical baseline established prior to final validation across the September 2026 MVP '
        'Validation Study (N=24, 215 production AI assessments), the November 2026 Refactoring Verification (7 of 7 refactorings '
        'complete), the 63 STD test cases, and production load testing.'
    )
    add_clean_table(
        doc,
        headers=['Baseline Dimension', 'Target / SLA', 'Verified Empirical Result (CiteWise v2.0)', 'Status'],
        rows_data=[
            ('MVP Solution Efficacy (Q4–Q27, N=24)', '≥ 80.0% agreement', '90.4% aggregate positive agreement across 24 undergraduate researchers', 'Baseline Met'),
            ('MVP Overall Perceived Value (N=24)', '≥ 85.0% composite', '91.7% composite perceived value score', 'Baseline Met'),
            ('Tier 1 SLA: Local PDF Extraction & Indexing', '≤ 1,000 ms (≤ 1.0 s)', '69 ms – 497 ms across 3-page to 21-page academic PDFs (< 2% of runtime)', 'Verified (100%)'),
            ('Tier 2 SLA: AI Rubric Assessment Latency', '≤ 30.0 s (Dual SLA)\n(≥ 75% within 15 s)', 'Mean: 10.44 s; Median: 8.00 s; P95: 28.66 s; 75.81% (163/215) ≤ 15.0 s', 'Baseline Met'),
            ('Load Test: CATalyst Import (10–50 users)', 'Avg ≤ 2,000 ms', '1,335 ms (10u), 1,591 ms (25u), 1,894 ms (50u); 0.00% error rate', 'Baseline Met'),
            ('Load Test: RRL Upload & Approval (10–100u)', 'Error Rate ≤ 1.0%', 'Upload (100u): 685 ms avg, 0.88% error; Approval (10u): 1,218 ms, 0.00% error', 'Baseline Met'),
            ('Backend Automated Unit & Regression Suites', '100% Pass Rate', '199/199 tests passing across 8 suites (async-paraphrase, excluded-source, regression-bugfixes, citewise, smart-goals, page-traceability, auth, r2-and-async)', 'Verified (100%)'),
            ('Major Architectural Refactorings (1–7)', 'All Critical/High Fixed', '7/7 Complete; −38.4% cyclomatic complexity reduction (22.5 → 9.0 average)', 'Verified (100%)'),
        ],
        col_widths=[1.75, 1.15, 2.7, 0.9],
        bold_cols=(0, 3)
    )

    body_p(
        doc,
        'Exit Gate Rule: Final validation is considered NOT PASSED if any Primary PSSUQ threshold (§8.1) or any Domain Accuracy '
        'threshold (§8.2) falls outside its target range, or if any SEV-1 or SEV-2 defect remains unresolved.',
        bold=True
    )

    # ──── SECTION 9 ────
    h1(doc, '9. Validation Governance, Schedule, Risks & Sign-Off')
    h2(doc, '9.1 Roles & Responsibilities')
    add_clean_table(
        doc,
        headers=['Validation Role', 'Assigned Team Member', 'Core Responsibilities'],
        rows_data=[
            ('Test Lead & Project Manager', 'Rabe, Pranz Nicole C.', 'Overall validation execution, participant scheduling, consent archival, and final sign-off coordination'),
            ('Session Facilitator', 'Ramirez, Ruther Gerard L.', 'Brief participants, enforce Think-Aloud rules, administer UT-01–UT-04 and PSSUQ forms, conduct debriefs'),
            ('Data Analyst', 'Reyes, Christian Andrey V.', 'Double-check raw PSSUQ data entry, compute SYSUSE/INFOQUAL/INTERQUAL means & SDs, score domain rubrics'),
            ('Observer & Defect Logger', 'Encallado, Sophia Bianca A.', 'Record task completion times, critical errors, verbatim Think-Aloud comments, and real-time DEF-XXX logs'),
            ('Technical Support & Telemetry Lead', 'Badinas, Gregory Ivan Onyx M.', 'Monitor Vercel/Heroku/Supabase/n8n uptime, extract assessment_timings telemetry, resolve SEV-1/2 issues'),
            ('Academic Adviser', 'Mrs. Erica Jean Abadinas', 'Review and approve Final Validation Instrument, audit methodology, and grant final academic sign-off'),
        ],
        col_widths=[1.5, 1.6, 3.4],
        bold_cols=(0,)
    )

    h2(doc, '9.2 Validation Execution Schedule (Aligned with SMPM Milestones)')
    add_clean_table(
        doc,
        headers=['Phase', 'Activity', 'Target Window', 'Deliverable / Evidence Artifact', 'Status'],
        rows_data=[
            ('Phase 0', 'MVP Validation & Refactoring Baseline', 'Sep 21 – Nov 3, 2026', 'MVP Validation Report (N=24) & CiteWise-Refactoring-Evidence.pdf', 'Complete'),
            ('Phase 1', 'Technical Load, Unit & Dual SLA Verification', 'November 5, 2026', '199/199 unit tests, 63 STD cases, Dual SLA & load test logs', 'Complete'),
            ('Phase 2', 'Final Validation Instrument Approval', 'November 2026', 'This document (2627-sem1-it411-39_Final_Validation_Instrument)', 'Complete'),
            ('Phase 3', 'Final Usability & Validation Sessions (N≥24)', 'Nov 2026 (Pre-Defense)', 'Signed Part I–V instrument packets, PSSUQ sheets, telemetry exports', 'Scheduled'),
            ('Phase 4', 'Statistical & Domain Rubric Analysis', 'Phase 3 + 2 days', 'PSSUQ subscale report, control vs. test group domain accuracy matrix', 'Pending'),
            ('Phase 5', 'Final Defect Triage & Closure Sign-Off', 'Before Dec 18, 2026', 'Zero open SEV-1/2 defects; signed Final Validation Report for defense', 'Pending'),
        ],
        col_widths=[0.65, 1.85, 1.15, 2.0, 0.85],
        bold_cols=(0, 4)
    )

    h2(doc, '9.3 Validation Risk Register')
    add_clean_table(
        doc,
        headers=['Identified Risk', 'Likelihood', 'Impact', 'Mitigation Control'],
        rows_data=[
            ('LLM token generation latency spikes during live UT-02 / UT-03 sessions', 'Medium', 'High', 'Enforce Dual SLA (≤30s AI scoring) and async HTTP 202 polling with progress stages so UI never freezes'),
            ('Participant no-shows reduce sample below N=20 Nielsen threshold', 'Low', 'High', 'Over-recruit by 20% (30 invitations for 24–30 seats) and maintain alternate schedule slots'),
            ('Incomplete PSSUQ forms (>3 blank items) skew subscale means', 'Low', 'Medium', 'Facilitator inspects Part III form completeness before Phase D debrief; apply Lewis (2002) blank exclusion rule'),
            ('External n8n / Gemini webhook rate limit during concurrent testing', 'Low', 'High', '4-worker concurrency pool and exponential backoff configured; Technical Support monitors live n8n queue'),
        ],
        col_widths=[2.0, 0.75, 0.65, 3.1],
        bold_cols=(0,)
    )

    h2(doc, '9.4 Document Control & Approval Sign-Off')
    add_clean_table(
        doc,
        headers=['Role', 'Name', 'Signature', 'Date'],
        rows_data=[
            ('Prepared by (Test Lead)', 'Rabe, Pranz Nicole C.', '', ''),
            ('Prepared by (Session Facilitator)', 'Ramirez, Ruther Gerard L.', '', ''),
            ('Reviewed by (Data Analyst)', 'Reyes, Christian Andrey V.', '', ''),
            ('Reviewed by (Observer / QA)', 'Encallado, Sophia Bianca A.', '', ''),
            ('Reviewed by (Technical Support)', 'Badinas, Gregory Ivan Onyx M.', '', ''),
            ('Approved by (Academic Adviser)', 'Mrs. Erica Jean Abadinas', '', ''),
        ],
        col_widths=[2.0, 2.0, 1.5, 1.0],
        bold_cols=(0,)
    )

    h2(doc, 'References')
    refs = [
        'American Psychological Association. (2020). Publication manual of the American Psychological Association (7th ed.). https://doi.org/10.1037/0000165-000',
        'Basili, V. R., Caldiera, G., & Rombach, H. D. (1994). The Goal Question Metric approach. In Encyclopedia of Software Engineering (pp. 528–532). Wiley.',
        'Brooke, J. (1996). SUS: A "quick and dirty" usability scale. In Usability Evaluation in Industry (pp. 189–194). Taylor & Francis.',
        'International Organization for Standardization. (2023). ISO/IEC 25010:2023 — Systems and software engineering — Systems and software Quality Requirements and Evaluation (SQuaRE) — Product quality model. ISO.',
        'IT411-G3 CiteWise Team. (2026a). Software Requirements Specification (SRS v1.2), Software Design Description (SDD v2.0), Software Project Management Plan (SMPM), and Software Test Document (STD v1.4) for CiteWise. 2627-sem1-IT411-39.',
        'IT411-G3 CiteWise Team. (2026b). CiteWise Refactoring Evidence (v1.0) & Usability Testing Validation Plan (v2.0). College of Computer Studies, Cebu Institute of Technology – University.',
        'Lewis, J. R. (1992). Psychometric evaluation of the Post-Study System Usability Questionnaire: The PSSUQ (Technical Report 54.723). IBM Corporation.',
        'Lewis, J. R. (2002). Psychometric evaluation of the PSSUQ using data from five years of usability studies. International Journal of Human-Computer Interaction, 14(3–4), 463–488. https://doi.org/10.1080/10447318.2002.9669130',
        'Nielsen, J., & Landauer, T. K. (1993). A mathematical model of the finding of usability problems. Proceedings of the ACM CHI\'93 Conference, 206–213.',
    ]
    for r_str in refs:
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(3)
        p.paragraph_format.left_indent = Inches(0.25)
        p.paragraph_format.first_line_indent = Inches(-0.25)
        add_run(p, r_str, size=9.5)

    doc.save(OUT_DOCX)
    shutil.copy2(OUT_DOCX, ROOT_DOCX)
    if os.path.exists(ARTIFACT_DIR):
        shutil.copy2(OUT_DOCX, ART_DOCX)
    print(f'Built DOCX: {OUT_DOCX}')
    return doc


# ─── Convert DOCX to PDF (Exact Monochrome Style of build_docx_to_pdf.py) ────

def get_shading(element):
    pPr = element.find(qn('w:pPr'))
    if pPr is None:
        return None
    shd = pPr.find(qn('w:shd'))
    if shd is not None:
        return shd.get(qn('w:fill'))
    return None

def get_para_html(p):
    style = p.style.name
    fill = get_shading(p._p)
    has_black_bg = fill == '000000'
    is_bullet = 'List Bullet' in style

    runs_html = ''
    for run in p.runs:
        text = run.text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('\n', '<br>')
        if not text:
            continue
        bold = run.bold
        italic = run.italic
        fname = run.font.name or ('Arial' if 'Heading' in style else 'Times New Roman')
        try:
            fsize = round(run.font.size.pt, 1) if run.font.size else (12 if 'Heading' in style else 11)
        except:
            fsize = 11
        color = 'ffffff' if has_black_bg else '000000'
        span_style = f"font-family: '{fname}', serif; font-size: {fsize}pt; color: #{color};"
        if bold:
            span_style += ' font-weight: bold;'
        if italic:
            span_style += ' font-style: italic;'
        runs_html += f'<span style="{span_style}">{text}</span>'

    if not runs_html.strip():
        return '<p style="margin: 2pt 0;">&nbsp;</p>'

    align = p.alignment
    text_align = 'center' if align == WD_ALIGN_PARAGRAPH.CENTER else 'left'

    if has_black_bg:
        pstyle = (
            f'background: #000000; color: #ffffff; '
            f'padding: 4pt 8pt; margin: 12pt 0 4pt 0; '
            f'font-family: Arial, sans-serif; font-weight: bold; font-size: 12pt; '
            f'text-align: {text_align}; page-break-after: avoid; break-after: avoid;'
        )
        return f'<p style="{pstyle}">{runs_html}</p>'
    elif 'Heading 2' in style:
        pstyle = (
            f'font-family: Arial, sans-serif; font-weight: bold; font-size: 11pt; '
            f'margin: 9pt 0 2pt 0; text-align: {text_align}; color: #000000; page-break-after: avoid; break-after: avoid;'
        )
        return f'<p style="{pstyle}">{runs_html}</p>'
    elif 'Heading 3' in style:
        pstyle = (
            f'font-family: Times New Roman, serif; font-weight: bold; font-size: 10.5pt; '
            f'margin: 6pt 0 2pt 0; text-align: {text_align}; color: #000000; page-break-after: avoid; break-after: avoid;'
        )
        return f'<p style="{pstyle}">{runs_html}</p>'
    elif is_bullet:
        pstyle = (
            f'font-family: Times New Roman, serif; font-size: 11pt; '
            f'margin: 2pt 0 2pt 18pt; text-indent: -10pt; text-align: left; color: #000000; line-height: 1.3;'
        )
        return f'<p style="{pstyle}">&bull;&nbsp; {runs_html}</p>'
    else:
        pstyle = (
            f'font-family: Times New Roman, serif; font-size: 11pt; '
            f'margin: 3pt 0; text-align: {text_align}; color: #000000; line-height: 1.3;'
        )
        return f'<p style="{pstyle}">{runs_html}</p>'

def get_table_html(table):
    html = '<table style="width: 100%; border-collapse: collapse; margin: 6pt 0; font-size: 9pt;">'
    for i, row in enumerate(table.rows):
        html += '<tr>'
        for j, cell in enumerate(row.cells):
            cell_text = cell.text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('\n', '<br>')
            tc = cell._tc
            tcPr = tc.find(qn('w:tcPr'))
            fill = None
            if tcPr is not None:
                shd = tcPr.find(qn('w:shd'))
                if shd is not None:
                    fill = shd.get(qn('w:fill'))
            bg = '#000000' if fill == '000000' else '#ffffff'
            color = '#ffffff' if fill == '000000' else '#000000'
            fname = 'Arial, sans-serif' if fill == '000000' else 'Times New Roman, serif'
            is_bold = fill == '000000'
            if not is_bold:
                for p in cell.paragraphs:
                    for r in p.runs:
                        if r.bold:
                            is_bold = True
                            break
            fw = 'bold' if is_bold else 'normal'
            cell_style = (
                f'border: 1px solid #000000; padding: 3pt 4pt; '
                f'background: {bg}; color: {color}; font-weight: {fw}; '
                f'font-family: {fname}; font-size: 9pt; '
                f'vertical-align: top;'
            )
            html += f'<td style="{cell_style}">{cell_text}</td>'
        html += '</tr>'
    html += '</table>'
    return html

def is_page_break(para):
    for run in para.runs:
        for br in run._r.findall(qn('w:br')):
            if br.get(qn('w:type')) == 'page':
                return True
    return False

def build_pdf_from_docx(doc):
    html_parts = ['''<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @page { size: letter; margin: 1in; }
  body { margin: 0; padding: 0; font-family: "Times New Roman", serif; font-size: 11pt; color: #000000; background: #ffffff; }
  .page-break { page-break-before: always; }
  table { page-break-inside: auto; }
  tr { page-break-inside: avoid; page-break-after: auto; }
</style>
</head>
<body>''']

    body_elem = doc.element.body
    for child in body_elem:
        tag = child.tag.split('}')[-1] if '}' in child.tag else child.tag
        if tag == 'p':
            p_obj = None
            for p in doc.paragraphs:
                if p._p is child:
                    p_obj = p
                    break
            if p_obj is None:
                continue
            if is_page_break(p_obj):
                html_parts.append('<div class="page-break"></div>')
                continue
            html_parts.append(get_para_html(p_obj))
        elif tag == 'tbl':
            t_obj = None
            for t in doc.tables:
                if t._tbl is child:
                    t_obj = t
                    break
            if t_obj:
                html_parts.append(get_table_html(t_obj))

    html_parts.append('</body></html>')
    html_content = '\n'.join(html_parts)

    with open(OUT_HTML, 'w', encoding='utf-8') as f:
        f.write(html_content)

    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        with open(OUT_HTML, 'r', encoding='utf-8') as f:
            page.set_content(f.read(), wait_until='load')
        page.pdf(
            path=OUT_PDF,
            format='Letter',
            print_background=True,
            display_header_footer=True,
            header_template='''<div style="font-size: 7pt; font-family: Arial, sans-serif; width: 100%; 
                display: flex; justify-content: space-between; padding: 0 1in; color: #444; 
                border-bottom: 0.5px solid #888; margin-bottom: 2px;">
              <span>CiteWise &bull; Final Validation Instrument (PSSUQ &amp; Domain Rubrics)</span>
              <span>IT411 Team G3</span>
            </div>''',
            footer_template='''<div style="font-size: 7pt; font-family: Arial, sans-serif; width: 100%; 
                display: flex; justify-content: space-between; padding: 0 1in; color: #444;
                border-top: 0.5px solid #888; margin-top: 2px;">
              <span>2627-sem1-IT411-39 &bull; CiteWise Final Validation Instrument v2.0 &bull; November 2026</span>
              <span><span class="pageNumber"></span></span>
            </div>''',
            margin={'top': '0.85in', 'bottom': '0.85in', 'left': '0in', 'right': '0in'},
        )
        browser.close()

    shutil.copy2(OUT_PDF, ROOT_PDF)
    if os.path.exists(ARTIFACT_DIR):
        shutil.copy2(OUT_PDF, ART_PDF)
    print(f'Built PDF: {OUT_PDF}')

if __name__ == '__main__':
    doc_obj = build_docx()
    build_pdf_from_docx(doc_obj)
