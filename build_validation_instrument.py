"""
Build CiteWise Usability Testing Validation Plan and Framework (DOCX & PDF)
Matches the exact monochrome style of srs.docx / sdd.docx / smpm.docx / CiteWise-Refactoring-Evidence.docx:
  - Letter size, 1" margins
  - Times New Roman body (11pt), Arial headings
  - Heading 1: black background (#000000), white bold text (#FFFFFF)
  - Heading 2: plain bold Arial (11pt, #000000)
  - Heading 3: plain bold Times New Roman (10.5pt, #000000)
  - Tables: thin black border (#000000), black header row with white bold text, white body rows with no shading
  - Only 2 colors used: black (#000000) and white (#FFFFFF)
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

DOCX_NAME = '2627-sem1-it411-39_Usability_Testing_Validation_Plan.docx'
PDF_NAME = '2627-sem1-it411-39_Usability_Testing_Validation_Plan.pdf'
HTML_NAME = '2627-sem1-it411-39_Usability_Testing_Validation_Plan.html'

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
    """Heading 1: black background, white bold Arial 12pt."""
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
    """Heading 2: bold Arial 11pt, black text, no background."""
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
    """Heading 3: bold Times New Roman 10.5pt, black text."""
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

    # Header row: Black background (#000000), white bold text
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
        r.font.name = 'Times New Roman'
        r.font.size = Pt(9.5)
        r.font.color.rgb = RGBColor(255, 255, 255)
        set_cell_border(cell)

    # Body rows: Pure white background, black text
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
            r.font.size = Pt(9.5)
            r.font.color.rgb = RGBColor(0, 0, 0)
            if j in bold_cols or str(val) in ('Total', 'TOTAL (10 files)', 'OVERALL'):
                r.bold = True
            set_cell_border(cell)

    return tbl

# ─── Build Document ───────────────────────────────────────────────────────────

def build_docx():
    doc = Document()

    # Page setup: Letter, 1" margins all around
    section = doc.sections[0]
    section.page_width = Inches(8.5)
    section.page_height = Inches(11.0)
    section.top_margin = Inches(1.0)
    section.bottom_margin = Inches(1.0)
    section.left_margin = Inches(1.0)
    section.right_margin = Inches(1.0)

    # Default paragraph style
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
    cov('Usability Testing Validation Plan and Framework', size=20, bold=True, space_after=6)
    cov('for', size=12, space_after=6)
    cov('CiteWise', size=18, bold=True, space_after=8)
    cov('PSSUQ (Post-Study System Usability Questionnaire) · Lewis (1992/2002) · 7-Point Scale · 19 Items', size=10.5, italic=True, space_after=24)

    meta = [
        ('System:', 'CiteWise — AI-Powered Research Writing Assistant'),
        ('Target Environment:', 'Frontend: https://citewise-seven.vercel.app\nBackend API: https://citewise-2220a55a4660.herokuapp.com/api'),
        ('Course & Term:', 'IT411: Software Testing, Quality Assurance, and Maintenance  •  AY 2026–2027, Semester 1'),
        ('Project & Group:', '2627-sem1-IT411-39  /  Section IT411-G3'),
        ('Prepared by:', 'Rabe, Pranz Nicole C.\nRamirez, Ruther Gerard L.\nReyes, Christian Andrey V.\nEncallado, Sophia Bianca A.\nBadinas, Gregory Ivan Onyx M.'),
        ('Academic Adviser:', 'Mrs. Erica Jean Abadinas'),
        ('Document Date:', 'November 2026'),
        ('Document Version:', '2.0 (Supersedes CiteWise Usability Testing Validation Plan v1.0, SUS-based)'),
        ('Classification:', 'ACADEMIC — CONFIDENTIAL'),
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
        lr.font.size = Pt(10)
        vp = vc.paragraphs[0]
        vp.paragraph_format.space_after = Pt(2)
        vr = vp.add_run(val)
        vr.font.name = 'Times New Roman'
        vr.font.size = Pt(10)
        for cell in (lc, vc):
            set_cell_border(cell)

    p_note = doc.add_paragraph()
    p_note.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_note.paragraph_format.space_before = Pt(18)
    add_run(
        p_note,
        'This document constitutes the formal usability validation plan for CiteWise and must be read alongside the Software Requirements '
        'Specification (2627-sem1-it411-39_SRS) and the MVP Validation Findings Report. All empirical data cited herein reflects verified '
        'test sessions conducted between September 21–28, 2026.',
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
             'Initial usability plan using 10-item System Usability Scale (SUS, Brooke 1996) on a 5-point scale; GQM framework applied.'),
            ('2.0', 'Nov 2026', 'Rabe, P., Ramirez, R., Reyes, C., Encallado, S., Badinas, G.', 'All (§1–§9)',
             'Instrument replaced with PSSUQ (Lewis 2002, 19 items, 7-point scale); three subscale reporting added (SYSUSE, INFOQUAL, INTERQUAL); '
             'empirical baseline from MVP Validation Study (Sep 2026) incorporated; technical performance thresholds verified against load test evidence (Nov 5, 2026).'),
        ],
        col_widths=[0.6, 0.8, 1.5, 1.1, 2.5],
        bold_cols=(0,)
    )

    h1(doc, 'Table of Contents')
    add_clean_table(
        doc,
        headers=['§', 'Section Title', 'Focus / Contents'],
        rows_data=[
            ('1', 'Executive Summary & Theoretical Framework', 'Rationale for instrument transition (SUS to PSSUQ); Governing standards & references'),
            ('2', 'Usability Testing Scope & Module Coverage', 'Modules 1–3 user workflows, scope boundaries, and GQM decomposition'),
            ('3', 'Participant Sampling & Demographics', 'Sample summary (N=24), year level & program distributions, inclusion criteria'),
            ('4', 'PSSUQ Instrument — Scale, Items & Subscales', '7-point Likert scale, 19-item bank by subscale, scoring formulae & Lewis (2002) norms'),
            ('5', 'Acceptance Criteria & Exit Thresholds', 'Primary PSSUQ thresholds, task performance thresholds, technical baselines & Exit Gate Rule'),
            ('6', 'Data Collection Protocol & Task Administration', 'Session structure, UT-01 to UT-04 prompts, think-aloud protocol, observer recording sheet'),
            ('7', 'Empirical Baseline from MVP Validation', 'MVP KPIs, AI latency distribution, load test baseline, unit test coverage (251/251)'),
            ('8', 'Defect Triage & Severity Classification', '4-tier severity model (SEV-1 to SEV-4), defect log, resolution workflow, feature traceability'),
            ('9', 'Test Administration Governance & Sign-Off', 'Roles & responsibilities, phase timeline, risk register, sign-off block & references'),
        ],
        col_widths=[0.4, 2.6, 3.5],
        bold_cols=(0, 1)
    )

    doc.add_page_break()

    # ──── SECTION 1 ────
    h1(doc, '1. Executive Summary & Theoretical Framework')
    body_p(
        doc,
        'This document defines the formal usability testing validation plan and measurement framework for CiteWise, an AI-powered '
        'research writing assistant developed under IT411 Capstone Project (2627-sem1-IT411-39, AY 2026–2027, Semester 1). It supersedes '
        'Version 1.0 of this plan, which employed the System Usability Scale (SUS; Brooke, 1996) as its primary psychometric instrument. '
        'This version adopts the Post-Study System Usability Questionnaire (PSSUQ) developed by James R. Lewis (1992; revised 2002) '
        'as the primary usability evaluation instrument.'
    )

    h2(doc, '1.1 Rationale for Instrument Transition')
    body_p(doc, 'PSSUQ was selected over SUS for the following methodologically grounded reasons:')
    bullet_p(doc, 'Multi-dimensional diagnostics: ',
             'PSSUQ yields three analytically independent subscale scores — System Usefulness (SYSUSE), Information Quality (INFOQUAL), '
             'and Interface Quality (INTERQUAL) — enabling pinpoint identification of which usability dimension requires improvement '
             'rather than producing a single aggregated score.')
    bullet_p(doc, '7-point response scale: ',
             'The 7-point Likert scale provides greater response sensitivity and statistical variance compared to SUS\'s 5-point '
             'alternating-polarity format, reducing floor/ceiling effects in highly usable systems.')
    bullet_p(doc, 'Academic benchmark data: ',
             'Lewis (2002) provides published normative benchmarks (Overall mean μ = 2.82, SD = 0.84) derived from IBM post-study '
             'sessions, enabling direct comparison against industry-validated standards.')
    bullet_p(doc, 'Positive item phrasing: ',
             'All 19 PSSUQ items are phrased consistently in the positive direction, eliminating the alternating-polarity scoring '
             'complexity of SUS and reducing respondent cognitive burden.')
    bullet_p(doc, 'Consistency with ISO/IEC 25010:2023: ',
             'PSSUQ\'s three subscales directly map to ISO/IEC 25010 quality-in-use characteristics: Effectiveness (SYSUSE), '
             'Learnability (INFOQUAL), and Aesthetics / Usability (INTERQUAL).')

    h2(doc, '1.2 Governing Standards & References')
    add_clean_table(
        doc,
        headers=['Standard / Reference', 'Applicability'],
        rows_data=[
            ('ISO/IEC 25010:2023 (SQuaRE)', 'Quality-in-use model; product quality characteristics'),
            ('Lewis, J. R. (1992/2002) — PSSUQ', 'Primary psychometric instrument (19 items, 7-point scale)'),
            ('Basili, V. — GQM Framework', 'Goal–Question–Metric measurement decomposition'),
            ('APA 7th Edition', 'Governing citation format validated by CiteWise'),
            ('IEEE Std 829 / ISTQB', 'Test documentation and defect triage conventions'),
            ('2627-sem1-it411-39 SRS (2026)', 'Functional and non-functional system requirements baseline'),
        ],
        col_widths=[2.5, 4.0],
        bold_cols=(0,)
    )

    # ──── SECTION 2 ────
    h1(doc, '2. Usability Testing Scope & Module Coverage')
    body_p(
        doc,
        'Usability testing encompasses all three functional modules of CiteWise. Each module is validated through specific task '
        'scenarios (UT-01 to UT-04) that simulate authentic end-user research workflows.'
    )

    add_clean_table(
        doc,
        headers=['Module', 'Feature Area', 'Core User Tasks Evaluated', 'Task ID(s)', 'ISO 25010 Attribute'],
        rows_data=[
            ('Module 1:\nResearch Input & Synthesis', 'CATalyst Upload, RRL Parser, Semantic Gap Discovery',
             'Upload research literature (PDF), trigger synthesis pipeline, review gap analysis', 'UT-01, UT-02', 'Effectiveness, Efficiency'),
            ('Module 2:\nAI Assessment Engine', 'AI Scoring, Feedback Generation, Title Synthesis',
             'Submit manuscript for AI assessment; interpret feedback; revise based on AI suggestions', 'UT-02, UT-03', 'Effectiveness, Satisfaction'),
            ('Module 3:\nCitation Manager', 'APA 7 Formatter, Reference Validation, Export',
             'Generate APA 7 citation; validate reference list accuracy; export formatted document', 'UT-03, UT-04', 'Learnability, Satisfaction'),
        ],
        col_widths=[1.3, 1.3, 2.1, 0.8, 1.0],
        bold_cols=(0,)
    )

    body_p(
        doc,
        'Scope Boundary: Administrative features (user account management, system configuration) are excluded from usability testing. '
        'Performance and load testing are governed by a separate test evidence framework (see qa-evidence/performance/).',
        italic=True
    )

    h2(doc, '2.1 GQM Decomposition')
    add_clean_table(
        doc,
        headers=['Goal (G)', 'Question (Q)', 'Metric (M)'],
        rows_data=[
            ('Measure perceived usability of CiteWise', 'How easy is the system to use overall?',
             'PSSUQ Overall score ≤ 2.50 (Lewis 2002 benchmark: 2.82)'),
            ('Assess system usefulness for research tasks', 'Can users complete core tasks effectively?',
             'Task Completion Rate (TCR) ≥ 90%; SYSUSE subscale ≤ 2.60'),
            ('Evaluate information & feedback quality', 'Are on-screen messages and guidance clear?',
             'INFOQUAL subscale ≤ 2.70'),
            ('Validate interface visual design', 'Is the UI pleasant and intuitive?',
             'INTERQUAL subscale ≤ 2.50'),
            ('Confirm AI response time SLA', 'Does AI assessment complete within 15 seconds?',
             '≥ 75% of AI assessments ≤ 15 s; P95 ≤ 30 s'),
        ],
        col_widths=[1.9, 2.1, 2.5],
        bold_cols=(0,)
    )

    

    # ──── SECTION 3 ────
    h1(doc, '3. Participant Sampling & Demographics')
    h2(doc, '3.1 Sample Summary')
    body_p(
        doc,
        'Participants were recruited using purposive sampling targeting fourth-year Information Technology students as the primary '
        'end-user persona of CiteWise. The sample size of N=24 satisfies the minimum threshold recommended by Nielsen & Landauer '
        '(1993) for quantitative usability studies (N ≥ 20).'
    )
    add_clean_table(
        doc,
        headers=['Total Participants', 'Testing Window (2026)', 'Role Classification'],
        rows_data=[
            ('24', 'September 21–28, 2026', 'End Users (Undergraduate Academic Researchers)'),
        ],
        col_widths=[2.0, 2.2, 2.3],
        bold_cols=(0, 1, 2)
    )

    h2(doc, '3.2 Year Level Distribution')
    add_clean_table(
        doc,
        headers=['Year Level', 'Count', 'Percentage (%)'],
        rows_data=[
            ('4th Year', '23', '95.8%'),
            ('3rd Year', '1', '4.2%'),
            ('Total', '24', '100%'),
        ],
        col_widths=[3.0, 1.75, 1.75],
        bold_cols=(0,)
    )

    h2(doc, '3.3 Program / Degree Distribution')
    add_clean_table(
        doc,
        headers=['Program / Degree', 'Count', 'Percentage (%)'],
        rows_data=[
            ('BS Information Technology (BSIT)', '18', '75.0%'),
            ('BS Psychology (BSPsych)', '3', '12.5%'),
            ('BS Civil Engineering (BSCE)', '1', '4.2%'),
            ('BS Business Administration (BSBA)', '1', '4.2%'),
            ('BS Computer Science (BSCS)', '1', '4.2%'),
            ('Total', '24', '100%'),
        ],
        col_widths=[3.5, 1.5, 1.5],
        bold_cols=(0,)
    )

    h2(doc, '3.4 Sampling Strategy & Inclusion Criteria')
    bullet_p(doc, 'Academic Research Experience: ', 'Must be an enrolled undergraduate student who has conducted or is currently conducting academic research.')
    bullet_p(doc, 'Tool Familiarity: ', 'Must have prior experience using word processors or reference management tools.')
    bullet_p(doc, 'Independence: ', 'Must not be a member of the CiteWise development team.')
    bullet_p(doc, 'Voluntary Consent: ', 'Participation is strictly voluntary; informed consent obtained prior to testing session.')

    

    # ──── SECTION 4 ────
    h1(doc, '4. PSSUQ Instrument — Scale, Items & Subscales')
    h2(doc, '4.1 Response Scale')
    body_p(
        doc,
        'Each of the 19 PSSUQ items is rated on a 7-point Likert scale anchored at 1 = Strongly Agree and 7 = Strongly Disagree. '
        'For PSSUQ, lower scores indicate higher usability — the inverse of most satisfaction instruments.'
    )

    add_clean_table(
        doc,
        headers=['1', '2', '3', '4', '5', '6', '7'],
        rows_data=[
            ('Strongly Agree', 'Agree', 'Somewhat Agree', 'Neither', 'Somewhat Disagree', 'Disagree', 'Strongly Disagree'),
        ],
        col_widths=[0.92, 0.92, 0.92, 0.92, 0.94, 0.94, 0.94],
        bold_cols=()
    )

    body_p(
        doc,
        'Scoring Direction: Score = mean of item responses within subscale. Lower = Better. Items left blank are excluded from the '
        'mean calculation for that subscale (not set to 0). Overall PSSUQ = mean of all 19 items (or items 1–18 in the 18-item version; '
        'this plan uses the 19-item Lewis 2002 version).',
        italic=True
    )

    h2(doc, '4.2 PSSUQ Item Bank by Subscale (Lewis, 2002)')
    h3(doc, 'SYSUSE — System Usefulness (Items 1–8)')
    add_clean_table(
        doc,
        headers=['Item', 'Statement'],
        rows_data=[
            ('PSSUQ-1', 'Overall, I am satisfied with how easy it is to use this system.'),
            ('PSSUQ-2', 'It was simple to use this system.'),
            ('PSSUQ-3', 'I was able to complete the tasks and scenarios quickly using this system.'),
            ('PSSUQ-4', 'I felt comfortable using this system.'),
            ('PSSUQ-5', 'It was easy to learn to use this system.'),
            ('PSSUQ-6', 'I believe I could become productive quickly using this system.'),
            ('PSSUQ-7', 'The system gave error messages that clearly told me how to fix problems.'),
            ('PSSUQ-8', 'Whenever I made a mistake using the system, I could recover easily and quickly.'),
        ],
        col_widths=[1.1, 5.4],
        bold_cols=(0,)
    )

    h3(doc, 'INFOQUAL — Information Quality (Items 9–15)')
    add_clean_table(
        doc,
        headers=['Item', 'Statement'],
        rows_data=[
            ('PSSUQ-9', 'The information (such as online help, on-screen messages, and other documentation) provided with this system was clear.'),
            ('PSSUQ-10', 'It was easy to find the information I needed.'),
            ('PSSUQ-11', 'The information provided for the system was easy to understand.'),
            ('PSSUQ-12', 'The information was effective in helping me complete the tasks and scenarios.'),
            ('PSSUQ-13', 'The organization of information on the system screens was clear.'),
            ('PSSUQ-14', 'The interface of this system was pleasant.'),
            ('PSSUQ-15', 'I liked using the interface of this system.'),
        ],
        col_widths=[1.1, 5.4],
        bold_cols=(0,)
    )

    h3(doc, 'INTERQUAL — Interface Quality (Items 16–18) & OVERALL (Item 19)')
    add_clean_table(
        doc,
        headers=['Item', 'Subscale', 'Statement'],
        rows_data=[
            ('PSSUQ-16', 'INTERQUAL', 'This system has all the functions and capabilities I expect it to have.'),
            ('PSSUQ-17', 'INTERQUAL', 'Overall, I am satisfied with this system.'),
            ('PSSUQ-18', 'INTERQUAL', 'There is no inconsistency in the visual design of this system.'),
            ('PSSUQ-19', 'OVERALL', 'Overall, I am satisfied with this system. (Global summary item)'),
        ],
        col_widths=[1.1, 1.1, 4.3],
        bold_cols=(0,)
    )

    h2(doc, '4.3 Subscale Scoring Formulae')
    add_clean_table(
        doc,
        headers=['Subscale', 'Items Included', 'Formula', 'Lewis 2002 Norm (μ)'],
        rows_data=[
            ('SYSUSE', '1–8', 'Mean(Items 1 to 8)', '2.76 (SD 0.90)'),
            ('INFOQUAL', '9–15', 'Mean(Items 9 to 15)', '2.90 (SD 0.84)'),
            ('INTERQUAL', '16–18', 'Mean(Items 16 to 18)', '2.70 (SD 0.90)'),
            ('OVERALL', '1–19', 'Mean(Items 1 to 19)', '2.82 (SD 0.84)'),
        ],
        col_widths=[1.4, 1.3, 2.0, 1.8],
        bold_cols=(0,)
    )
    body_p(
        doc,
        'Source: Lewis, J. R. (2002). Psychometric evaluation of the PSSUQ using data from five years of usability studies. '
        'International Journal of Human-Computer Interaction, 14(3–4), 463–488.',
        italic=True
    )

    

    # ──── SECTION 5 ────
    h1(doc, '5. Acceptance Criteria & Exit Thresholds')
    body_p(
        doc,
        'Exit criteria define the minimum conditions that must be met for the CiteWise system to be declared usability-validated '
        'and cleared for final presentation and deployment. All criteria must be simultaneously satisfied; partial pass is not accepted.'
    )

    h2(doc, '5.1 Primary PSSUQ Usability Thresholds')
    add_clean_table(
        doc,
        headers=['Metric', 'Target Threshold', 'Lewis 2002 Benchmark', 'Rationale', 'Status'],
        rows_data=[
            ('PSSUQ Overall', '≤ 2.50', 'μ = 2.82 (SD 0.84)', '10% improvement over published IBM benchmark', 'Pending'),
            ('SYSUSE', '≤ 2.60', 'μ = 2.76 (SD 0.90)', 'Reflects strong task support for research workflows', 'Pending'),
            ('INFOQUAL', '≤ 2.70', 'μ = 2.90 (SD 0.84)', 'Adequate on-screen guidance for first-time users', 'Pending'),
            ('INTERQUAL', '≤ 2.50', 'μ = 2.70 (SD 0.90)', 'High visual design quality expected of modern web apps', 'Pending'),
        ],
        col_widths=[1.2, 1.0, 1.3, 2.2, 0.8],
        bold_cols=(0, 4)
    )

    h2(doc, '5.2 Task Performance Thresholds')
    add_clean_table(
        doc,
        headers=['Metric', 'ID', 'Target', 'Measurement Method', 'Status'],
        rows_data=[
            ('Task Completion Rate', 'TCR', '≥ 90.0%', 'Observer-recorded binary success/failure per task attempt', 'Pending'),
            ('Mean Task Time (UT-01: Upload)', 'MTT-01', '≤ 120 s', 'Stopwatch from task-start to explicit completion signal', 'Pending'),
            ('Mean Task Time (UT-02: AI Assessment)', 'MTT-02', '≤ 30 s', 'System timestamp (AI pipeline latency excluded)', 'Pending'),
            ('Mean Task Time (UT-03: Citation)', 'MTT-03', '≤ 90 s', 'Stopwatch from task-start to explicit completion signal', 'Pending'),
            ('Critical Error Rate', 'CER', '≤ 5.0%', 'Errors causing irrecoverable task failure / data loss', 'Pending'),
        ],
        col_widths=[1.8, 0.7, 0.8, 2.4, 0.8],
        bold_cols=(0, 1, 4)
    )

    h2(doc, '5.3 Technical / System Performance Thresholds')
    add_clean_table(
        doc,
        headers=['Metric', 'Target', 'Empirical Baseline (MVP)', 'Status'],
        rows_data=[
            ('AI Assessment Latency — Mean', '≤ 15.0 s', '10.44 s (163/215 within 15 s = 75.81%)', 'Baseline Met'),
            ('AI Assessment Latency — P95', '≤ 30.0 s', '28.66 s', 'Baseline Met'),
            ('CATalyst Import (GET, 10 users)', 'Avg ≤ 2,000 ms', '1,335–1,894 ms (load test verified)', 'Baseline Met'),
            ('Synthesis Titles (POST, 10 users)', 'Avg ≤ 1,000 ms', '559–654 ms (load test verified)', 'Baseline Met'),
            ('Document Approval (GET, 10 users)', 'Avg ≤ 2,000 ms', '1,218–1,624 ms (load test verified)', 'Baseline Met'),
            ('API Error Rate (all endpoints)', '≤ 1.0%', '0.00% except PT-A02-100 (upload, 100 users): 0.88%', 'Baseline Met'),
            ('Unit Test Pass Rate', '100%', '251/251 tests passing (10 test files)', 'Verified'),
            ('APA 7 Formatting Error Rate', '≤ 15%', 'Established from requirements (SRS §3.4)', 'Pending'),
            ('RRL Parsing Accuracy', '≥ 95%', 'Established from requirements (SRS §3.2)', 'Pending'),
            ('Source Citation Coverage', '≥ 80%', 'Established from requirements (SRS §3.5)', 'Pending'),
        ],
        col_widths=[2.0, 1.1, 2.5, 0.9],
        bold_cols=(0, 3)
    )

    body_p(
        doc,
        'Exit Gate Rule: Testing is considered not passed if any single Primary PSSUQ threshold (§5.1) or any Technical threshold '
        'marked "Pending" produces a result outside its target range. All items marked Pending require live session data to resolve.',
        bold=True
    )

    

    # ──── SECTION 6 ────
    h1(doc, '6. Data Collection Protocol & Task Administration')
    h2(doc, '6.1 Session Structure (Per Participant)')
    add_clean_table(
        doc,
        headers=['Phase', 'Activity', 'Details', 'Duration'],
        rows_data=[
            ('A', 'Pre-Session Briefing', 'Informed consent form; study objectives overview; think-aloud protocol instruction; demographics questionnaire', '~10 min'),
            ('B', 'Task Execution', 'Participant completes UT-01 through UT-04 sequentially while verbalizing thoughts; observer records task time, completion status, and critical errors; no assistance provided except safety prompts', '~35 min'),
            ('C', 'PSSUQ Administration', 'Printed or digital PSSUQ questionnaire (19 items); 7-point scale; participant completes independently; no interviewer guidance on item interpretation', '~10 min'),
            ('D', 'Post-Session Debrief', 'Open-ended retrospective interview (3 questions): most helpful feature, biggest difficulty, suggestions; recorded with participant consent', '~5 min'),
        ],
        col_widths=[0.5, 1.4, 3.8, 0.8],
        bold_cols=(0, 1)
    )

    h2(doc, '6.2 Usability Task Scenarios (UT-01 to UT-04)')
    add_clean_table(
        doc,
        headers=['Task ID', 'Scenario Title', 'Task Description (Participant Prompt)', 'Success Criterion'],
        rows_data=[
            ('UT-01', 'CATalyst Literature Upload', '"You have a PDF of a research paper you want CiteWise to analyze. Upload it and trigger the CATalyst gap discovery process. Tell us when you believe the analysis is complete."', 'Gap report displayed without error'),
            ('UT-02', 'AI Research Assessment', '"Submit the research abstract provided on your task sheet to CiteWise for AI assessment. Navigate to the results and explain what the system is telling you about your research quality."', 'Score + feedback rendered correctly'),
            ('UT-03', 'APA 7 Citation Generation', '"Using CiteWise, generate an APA 7th Edition citation for the reference provided on your task sheet and add it to your reference list."', 'Valid APA 7 citation produced'),
            ('UT-04', 'Document Export', '"Export your current research document with the generated citations from CiteWise. Confirm that the downloaded file opens correctly."', 'File downloads and opens without error'),
        ],
        col_widths=[0.7, 1.4, 3.1, 1.3],
        bold_cols=(0,)
    )

    h2(doc, '6.3 Think-Aloud Protocol Guidelines')
    bullet_p(doc, 'Continuous Verbalization: ', 'Participants are instructed to verbalize their thought process continuously ("Say what you see, say what you\'re doing, say what you\'re thinking").')
    bullet_p(doc, 'Neutral Prompts Only: ', 'Observers must not answer functional questions; use only neutral prompts: "What are you thinking right now?", "Please keep talking."')
    bullet_p(doc, 'Session Recording: ', 'Sessions are screen-recorded (with consent) for retrospective analysis.')
    bullet_p(doc, 'Qualitative Observation: ', 'Observer records verbatim critical comments and hesitation moments for qualitative coding.')

    h2(doc, '6.4 Observer Data Recording Sheet (Per Task)')
    add_clean_table(
        doc,
        headers=['Task ID', 'Completed?', 'Start Time', 'End Time', 'Elapsed (s)', 'Critical Errors', 'Notable Comments'],
        rows_data=[
            ('UT-01', '[ ] Yes  [ ] No', '___:___', '___:___', '______', '______', ''),
            ('UT-02', '[ ] Yes  [ ] No', '___:___', '___:___', '______', '______', ''),
            ('UT-03', '[ ] Yes  [ ] No', '___:___', '___:___', '______', '______', ''),
            ('UT-04', '[ ] Yes  [ ] No', '___:___', '___:___', '______', '______', ''),
        ],
        col_widths=[0.7, 1.0, 0.8, 0.8, 0.8, 0.9, 1.5],
        bold_cols=(0,)
    )

    h2(doc, '6.5 Data Management & Integrity Controls')
    bullet_p(doc, 'Encrypted Storage: ', 'All raw PSSUQ sheets are scanned and stored in encrypted cloud storage immediately after each session.')
    bullet_p(doc, 'Double-Entry Verification: ', 'Data entry double-checked by a second team member before aggregation.')
    bullet_p(doc, 'Participant Anonymity: ', 'Participants assigned anonymous codes (P-001 to P-024); no names appear in the analysis dataset.')
    bullet_p(doc, 'Outlier Policy: ', 'Responses with >3 items left blank are flagged for review and may be excluded.')

    

    # ──── SECTION 7 ────
    h1(doc, '7. Empirical Baseline from MVP Validation')
    body_p(
        doc,
        'The following empirical data was collected during the CiteWise MVP Validation Study conducted between September 21–28, 2026 '
        'with N=24 participants. This data constitutes the pre-PSSUQ empirical baseline and informs the calibration of acceptance '
        'thresholds defined in Section 5.'
    )

    h2(doc, '7.1 MVP Validation Key Performance Indicators')
    add_clean_table(
        doc,
        headers=['Agreement on Solution Efficacy (Q4–Q27, N=24)', 'Overall Perceived Value (Composite, N=24)', 'Mean AI Assessment Latency (Production, N=215)'],
        rows_data=[
            ('90.4%', '91.7%', '10.44 s'),
        ],
        col_widths=[2.2, 2.1, 2.2],
        bold_cols=(0, 1, 2)
    )

    h2(doc, '7.2 AI Assessment Response Time Distribution (Production)')
    add_clean_table(
        doc,
        headers=['Statistic', 'Value', 'Target / Threshold', 'Result'],
        rows_data=[
            ('Mean Response Time', '10.44 s', '≤ 15.0 s', 'PASS'),
            ('Median Response Time', '8.00 s', '≤ 15.0 s', 'PASS'),
            ('P95 Response Time', '28.66 s', '≤ 30.0 s', 'PASS'),
            ('Maximum Response Time', '47.73 s', '— (outlier monitoring)', 'Monitor'),
            ('Within-15s Completion Rate', '75.81% (163/215)', '≥ 75%', 'PASS'),
        ],
        col_widths=[2.2, 1.5, 1.8, 1.0],
        bold_cols=(0, 3)
    )

    h2(doc, '7.3 Load Test Performance Baseline (Verified, November 2026)')
    body_p(
        doc,
        'Extended load tests were conducted using a custom Node.js k6-compatible load test harness against the production Heroku API. '
        'All results verified against Phase 1 and Phase 2 test evidence in qa-evidence/performance/.'
    )
    add_clean_table(
        doc,
        headers=['Endpoint', 'Concurrency', 'Avg (ms)', 'P95 (ms)', 'Error Rate', 'Verdict'],
        rows_data=[
            ('GET /api/rrl/catalyst (CATalyst import)', '10', '1,335', '~2,000', '0.00%', 'PASS'),
            ('GET /api/rrl/catalyst (CATalyst import)', '25', '1,591', '~2,400', '0.00%', 'PASS'),
            ('GET /api/rrl/catalyst (CATalyst import)', '50', '1,894', '~2,800', '0.00%', 'PASS'),
            ('POST /api/v1/synthesis/titles', '10', '559', '~900', '0.00%', 'PASS'),
            ('POST /api/v1/synthesis/titles', '25', '618', '~1,000', '0.00%', 'PASS'),
            ('POST /api/v1/synthesis/titles', '50', '654', '~1,100', '0.00%', 'PASS'),
            ('POST /api/rrl/upload (PDF upload)', '100', '685', '~2,300', '0.88%', 'PASS'),
            ('GET /:id/approval (document approval)', '10', '1,218', '~1,900', '0.00%', 'PASS'),
        ],
        col_widths=[2.5, 0.9, 0.8, 0.8, 0.8, 0.7],
        bold_cols=(0, 5)
    )
    body_p(doc, 'Source: qa-evidence/performance/extended-load-test-results.json — verified November 5, 2026.', italic=True)

    h2(doc, '7.4 Unit Test Coverage Baseline')
    add_clean_table(
        doc,
        headers=['Test Suite', 'Total Tests', 'Passing', 'Failing', 'Coverage'],
        rows_data=[
            ('auth.test.js', 'Included', 'Passed', '0', '—'),
            ('citewise.routes.test.js', 'Included', 'Passed', '0', '—'),
            ('pr45-and-local-fixes.test.js', '47', '47', '0', '—'),
            ('All other suites (7 files)', 'Included', 'Passed', '0', '—'),
            ('TOTAL (10 files)', '251', '251', '0', '100% Pass'),
        ],
        col_widths=[2.5, 1.0, 1.0, 1.0, 1.0],
        bold_cols=(0,)
    )

    h2(doc, '7.5 MVP Questionnaire Instrument Summary')
    body_p(doc, 'The MVP Validation Study used a 30-item mixed-method questionnaire (Q1–Q3 demographic; Q4–Q27 four-point Likert; Q28–Q30 open-ended). Key findings that inform PSSUQ calibration:')
    bullet_p(doc, 'Solution Efficacy (Q4–Q27): ', '90.4% aggregate agreement — indicates strong baseline perceived usefulness.')
    bullet_p(doc, 'Overall Perceived Value: ', '91.7% — high baseline for PSSUQ SYSUSE subscale expectations.')
    bullet_p(doc, 'Open-Ended Themes (Q28–Q30): ', 'Primary concerns centered on AI response variability and citation edge cases — directly addressed by INFOQUAL and INTERQUAL subscale monitoring.')

    

    # ──── SECTION 8 ────
    h1(doc, '8. Defect Triage & Severity Classification')
    body_p(
        doc,
        'All defects identified during usability testing sessions are logged, triaged, and prioritized according to the four-tier '
        'severity model below. Defect identifiers follow the convention DEF-XXX where XXX is a zero-padded sequential number. '
        'Each defect links back to the UT task scenario and PSSUQ item(s) it impacts.'
    )

    h2(doc, '8.1 Severity Classification Model')
    add_clean_table(
        doc,
        headers=['Severity', 'Label', 'Definition', 'Resolution SLA', 'Release Impact'],
        rows_data=[
            ('SEV-1', 'Critical / Blocker', 'System crash, data loss, complete task failure with no workaround. Causes irrecoverable session termination. Directly fails TCR or CER exit criteria.', 'Immediate (same day)', 'Release blocked'),
            ('SEV-2', 'Major', 'Significant functional impairment that prevents task completion but workaround exists. Causes measurable PSSUQ score degradation (>0.5 point on any subscale).', 'Within 48 hours', 'Release at risk'),
            ('SEV-3', 'Minor', 'Usability issue that creates friction, confusion, or additional steps but does not prevent task completion. Moderate PSSUQ impact (0.2–0.5 points).', 'Within 1 sprint', 'Release with note'),
            ('SEV-4', 'Cosmetic / Low', 'Minor visual inconsistency, typo, or non-functional aesthetic issue. Negligible PSSUQ impact (<0.2 points). Does not affect task completion.', 'Backlog', 'No release impact'),
        ],
        col_widths=[0.7, 1.1, 2.7, 1.0, 1.0],
        bold_cols=(0, 1)
    )

    h2(doc, '8.2 Defect Log Template')
    add_clean_table(
        doc,
        headers=['DEF-ID', 'Severity', 'Task Ref', 'PSSUQ Item(s)', 'Description', 'Status'],
        rows_data=[
            ('DEF-001', 'SEV-2', 'UT-02', 'PSSUQ-7, PSSUQ-8', 'AI assessment error messages do not indicate root cause (timeout vs. parsing failure)', 'Resolved'),
            ('DEF-002', 'SEV-3', 'UT-01', 'PSSUQ-9, PSSUQ-10', 'CATalyst upload progress indicator absent; users unsure if upload succeeded', 'Open'),
            ('DEF-003', 'SEV-3', 'UT-03', 'PSSUQ-13, PSSUQ-15', 'APA citation output panel scrolls off-screen on mobile viewports (≤ 375px wide)', 'Open'),
            ('DEF-004', 'SEV-4', 'UT-04', 'PSSUQ-18', 'Inconsistent button border-radius between export modal and main UI (4px vs 6px)', 'Open'),
        ],
        col_widths=[0.7, 0.7, 0.7, 1.1, 2.5, 0.8],
        bold_cols=(0, 1, 5)
    )
    body_p(doc, 'Note: Additional defect rows to be populated during live usability testing sessions (Phase 3).', italic=True)

    h2(doc, '8.3 Defect Resolution Workflow')
    bullet_p(doc, '1. Discovery: ', 'Observer logs defect in real-time on observer sheet with participant code and timestamp.')
    bullet_p(doc, '2. Triage: ', 'Development team assigns severity within 2 hours of session end.')
    bullet_p(doc, '3. Assignment: ', 'SEV-1/2 assigned to responsible developer immediately; SEV-3/4 added to sprint backlog.')
    bullet_p(doc, '4. Fix & Verification: ', 'Fix deployed to staging; retested against original failure scenario.')
    bullet_p(doc, '5. Closure: ', 'Defect marked RESOLVED only after verifier (non-author) confirms fix.')

    h2(doc, '8.4 PSSUQ Item-to-Feature Traceability')
    add_clean_table(
        doc,
        headers=['PSSUQ Subscale', 'Items', 'Primary CiteWise Feature Area', 'Defect Risk Area'],
        rows_data=[
            ('SYSUSE', '1–8', 'Core workflow: upload → assess → cite → export', 'AI latency spikes, missing error recovery, task flow interruptions'),
            ('INFOQUAL', '9–15', 'On-screen messages, loading states, help text, feedback panels', 'Ambiguous AI feedback, missing progress indicators, unclear error messages'),
            ('INTERQUAL', '16–18', 'UI design system, layout consistency, visual design', 'Responsive breakpoint failures, visual inconsistency across modules'),
            ('OVERALL', '19', 'Holistic system satisfaction', 'Composite reflection of all above'),
        ],
        col_widths=[1.1, 0.7, 2.3, 2.4],
        bold_cols=(0,)
    )

    

    # ──── SECTION 9 ────
    h1(doc, '9. Test Administration Governance & Sign-Off')
    h2(doc, '9.1 Roles & Responsibilities')
    add_clean_table(
        doc,
        headers=['Role', 'Assigned To', 'Responsibilities'],
        rows_data=[
            ('Test Lead', 'Rabe, Pranz Nicole C.', 'Overall test plan execution; participant scheduling; session facilitation; final sign-off authority'),
            ('Session Facilitator', 'Ramirez, Ruther Gerard L.', 'Conduct think-aloud sessions; administer PSSUQ forms; ensure consistent protocol adherence'),
            ('Data Analyst', 'Reyes, Christian Andrey V.', 'Data entry validation; PSSUQ subscale computation; statistical analysis; report generation'),
            ('Observer / Defect Logger', 'Encallado, Sophia Bianca A.', 'Real-time defect logging; observer sheet completion; qualitative note-taking during sessions'),
            ('Technical Support', 'Badinas, Gregory Ivan Onyx M.', 'System deployment readiness; API monitoring during sessions; immediate SEV-1 resolution'),
            ('Academic Adviser', 'Mrs. Erica Jean Abadinas', 'Validation plan review; methodology approval; final academic sign-off'),
        ],
        col_widths=[1.5, 1.8, 3.2],
        bold_cols=(0,)
    )

    h2(doc, '9.2 Testing Phase Timeline')
    add_clean_table(
        doc,
        headers=['Phase', 'Activity', 'Target Date', 'Deliverable', 'Status'],
        rows_data=[
            ('Phase 0', 'Validation Plan Finalization', 'November 2026', 'This document (v2.0, PSSUQ)', 'Complete'),
            ('Phase 1', 'Technical Load Testing', 'November 5, 2026', 'qa-evidence/performance/', 'Complete'),
            ('Phase 2', 'Unit Test Verification', 'November 5, 2026', '251/251 tests passing', 'Complete'),
            ('Phase 3', 'Usability Sessions (N=24)', 'TBD', 'PSSUQ raw data sheets; observer logs', 'Scheduled'),
            ('Phase 4', 'PSSUQ Data Analysis', 'TBD + 2 days', 'Subscale scores; statistical report', 'Pending'),
            ('Phase 5', 'Defect Resolution Sprint', 'TBD + 1 week', 'All SEV-1/2 defects resolved and re-verified', 'Pending'),
            ('Phase 6', 'Validation Closure & Sign-Off', 'TBD', 'Signed validation report; adviser approval', 'Pending'),
        ],
        col_widths=[0.8, 1.8, 1.1, 1.9, 0.9],
        bold_cols=(0, 4)
    )

    h2(doc, '9.3 Risk Register')
    add_clean_table(
        doc,
        headers=['Risk', 'Likelihood', 'Impact', 'Mitigation'],
        rows_data=[
            ('AI latency exceeds 15 s for >25% of assessments during live sessions', 'Medium', 'High', 'Use P95 ≤ 30 s as supplementary metric; communicate system context to participants before UT-02'),
            ('Participant no-shows reduce N below 20', 'Low', 'High', 'Over-recruit by 20% (28 invitations for 24 seats); maintain waitlist of 4 alternates'),
            ('PSSUQ INFOQUAL score exceeds 2.70 threshold', 'Medium', 'Medium', 'DEF-002 (progress indicator) resolved pre-Phase 3; supplementary onboarding tooltip added'),
            ('Production API unavailable during session', 'Low', 'High', 'Staging environment pre-configured as fallback; Technical Support role monitors uptime during sessions'),
            ('Session recording consent refused by participant', 'Low', 'Low', 'Recording is optional; observer notes substitute; participant still administers PSSUQ'),
        ],
        col_widths=[2.0, 0.8, 0.7, 3.0],
        bold_cols=(0,)
    )

    h2(doc, '9.4 Document Control & Sign-Off')
    add_clean_table(
        doc,
        headers=['Role', 'Name', 'Signature', 'Date'],
        rows_data=[
            ('Prepared by (Test Lead)', 'Rabe, Pranz Nicole C.', '', ''),
            ('Reviewed by (Data Analyst)', 'Reyes, Christian Andrey V.', '', ''),
            ('Approved by (Academic Adviser)', 'Mrs. Erica Jean Abadinas', '', ''),
        ],
        col_widths=[2.0, 2.0, 1.5, 1.0],
        bold_cols=(0,)
    )

    h2(doc, 'References')
    refs = [
        'Brooke, J. (1996). SUS: A "quick and dirty" usability scale. In P. W. Jordan, B. Thomas, B. A. Weerdmeester, & A. L. McClelland (Eds.), Usability Evaluation in Industry (pp. 189–194). Taylor & Francis.',
        'International Organization for Standardization. (2023). ISO/IEC 25010:2023 — Systems and software engineering — Systems and software Quality Requirements and Evaluation (SQuaRE) — Product quality model. ISO.',
        'Lewis, J. R. (1992). Psychometric evaluation of the Post-Study System Usability Questionnaire: The PSSUQ (Technical Report 54.723). IBM Corporation.',
        'Lewis, J. R. (2002). Psychometric evaluation of the PSSUQ using data from five years of usability studies. International Journal of Human-Computer Interaction, 14(3–4), 463–488. https://doi.org/10.1080/10447318.2002.9669130',
        'Nielsen, J., & Landauer, T. K. (1993). A mathematical model of the finding of usability problems. Proceedings of the ACM CHI\'93 Conference, 206–213.',
        'IT411-G3 CiteWise Team. (2026). CiteWise MVP Validation Findings and Refactoring Priorities [Internal report]. 2627-sem1-IT411-39.',
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
            fw = 'bold' if fill == '000000' else 'normal'
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
              <span>CiteWise &bull; Usability Testing Validation Plan &amp; Framework (PSSUQ)</span>
              <span>IT411 Team G3</span>
            </div>''',
            footer_template='''<div style="font-size: 7pt; font-family: Arial, sans-serif; width: 100%; 
                display: flex; justify-content: space-between; padding: 0 1in; color: #444;
                border-top: 0.5px solid #888; margin-top: 2px;">
              <span>2627-sem1-IT411-39 &bull; CiteWise Validation Plan v2.0 &bull; November 2026</span>
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
