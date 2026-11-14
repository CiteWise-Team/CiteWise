"""
Convert CiteWise-Refactoring-Evidence.docx to PDF via Playwright + docx2html approach.
We render the DOCX as clean HTML and print it as a letter-sized PDF matching the exact docx formatting.
"""

import os, sys, shutil, base64
from pathlib import Path
from playwright.sync_api import sync_playwright

REPO = 'c:/Users/admin/Documents/CiteWise/CiteWise'
DOCX_PATH = os.path.join(REPO, 'CiteWise-Refactoring-Evidence.docx')
OUT_PDF = os.path.join(REPO, 'CiteWise-Refactoring-Evidence.pdf')
OUT_COPY = 'c:/Users/admin/Documents/CiteWise/CiteWise-Refactoring-Evidence.pdf'
ARTIFACT_PDF = 'C:/Users/admin/.gemini/antigravity/brain/a90c2d1b-2e0d-48b7-a942-05a61f9b06d4/CiteWise-Refactoring-Evidence.pdf'

# ── Parse docx content into structured data ──────────────────────────────────
import docx
from docx.shared import Pt, RGBColor
from docx.oxml.ns import qn

doc = docx.Document(DOCX_PATH)

def get_shading(element):
    """Return fill hex or None."""
    pPr = element.find(qn('w:pPr'))
    if pPr is None:
        return None
    shd = pPr.find(qn('w:shd'))
    if shd is not None:
        return shd.get(qn('w:fill'))
    return None

def get_para_html(p):
    """Convert a paragraph to an HTML string."""
    style = p.style.name
    fill = get_shading(p._p)
    has_black_bg = fill == '000000'

    runs_html = ''
    for run in p.runs:
        text = run.text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('\n', '<br>')
        if not text:
            continue
        bold = run.bold
        italic = run.italic
        fname = run.font.name or ('Arial' if 'Heading' in style else 'Times New Roman')
        try:
            fsize = round(run.font.size.pt) if run.font.size else (12 if 'Heading' in style else 11)
        except:
            fsize = 11
        color = 'ffffff' if has_black_bg else '000000'
        if run.font.color and run.font.color.type:
            try:
                color = str(run.font.color.rgb).lower()
            except:
                pass
        is_code = fname and 'Courier' in fname
        span_style = (
            f'font-family: {fname}, monospace;' if is_code else
            f'font-family: {fname}, serif;'
        )
        span_style += f' font-size: {fsize}pt;'
        if bold:
            span_style += ' font-weight: bold;'
        if italic:
            span_style += ' font-style: italic;'
        span_style += f' color: #{color};'
        if is_code:
            span_style += ' background: #f2f2f2; padding: 0 2px;'
        runs_html += f'<span style="{span_style}">{text}</span>'

    if not runs_html.strip():
        return '<p style="margin: 2pt 0;">&nbsp;</p>'

    align = p.alignment
    text_align = 'center' if str(align) == 'CENTER (1)' else 'left'

    # Build container style
    if has_black_bg:
        pstyle = (
            f'background: #000000; color: #ffffff; '
            f'padding: 4pt 8pt; margin: 10pt 0 3pt 0; '
            f'font-family: Arial, sans-serif; font-weight: bold; font-size: 12pt; '
            f'text-align: {text_align}; page-break-after: avoid;'
        )
    elif 'Heading 2' in style:
        pstyle = (
            f'font-family: Arial, sans-serif; font-weight: bold; font-size: 11pt; '
            f'margin: 8pt 0 2pt 0; text-align: {text_align}; color: #000000;'
        )
    elif 'Heading 3' in style:
        pstyle = (
            f'font-family: Times New Roman, serif; font-weight: bold; font-size: 10.5pt; '
            f'margin: 6pt 0 2pt 0; text-align: {text_align}; color: #000000;'
        )
    elif 'Title' in style:
        pstyle = (
            f'font-family: Times New Roman, serif; font-weight: bold; font-size: 18pt; '
            f'margin: 4pt 0; text-align: center; color: #000000;'
        )
    else:
        pstyle = (
            f'font-family: Times New Roman, serif; font-size: 11pt; '
            f'margin: 3pt 0; text-align: {text_align}; color: #000000; line-height: 1.3;'
        )
    return f'<p style="{pstyle}">{runs_html}</p>'


def get_table_html(table):
    """Convert a docx table to HTML."""
    html = '<table style="width: 100%; border-collapse: collapse; margin: 6pt 0; font-size: 9pt;">'
    for i, row in enumerate(table.rows):
        html += '<tr>'
        for j, cell in enumerate(row.cells):
            cell_text = cell.text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('\n', '<br>')
            # check shading
            tc = cell._tc
            tcPr = tc.find(qn('w:tcPr'))
            fill = None
            if tcPr is not None:
                shd = tcPr.find(qn('w:shd'))
                if shd is not None:
                    fill = shd.get(qn('w:fill'))
            
            bg = '#000000' if fill == '000000' else '#ffffff'
            color = '#ffffff' if fill == '000000' else '#000000'
            bold = 'bold' if fill == '000000' else 'normal'
            fname = 'Arial' if fill == '000000' else 'Times New Roman'
            
            # check if courier (code cell)
            is_code = False
            for p in cell.paragraphs:
                for r in p.runs:
                    if r.font.name and 'Courier' in r.font.name:
                        is_code = True
                        break
            
            fam = 'Courier New, monospace' if is_code else f'{fname}, serif'
            fsz = '8pt' if is_code else '9pt'
            cell_style = (
                f'border: 1px solid #000000; padding: 3pt 4pt; '
                f'background: {bg}; color: {color}; font-weight: {bold}; '
                f'font-family: {fam}; font-size: {fsz}; '
                f'vertical-align: top;'
            )
            html += f'<td style="{cell_style}">{cell_text}</td>'
        html += '</tr>'
    html += '</table>'
    return html


# ── Build full HTML ──────────────────────────────────────────────────────────

html_parts = ['''<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @page { size: letter; margin: 1in; }
  body { margin: 0; padding: 0; font-family: "Times New Roman", serif; font-size: 11pt; color: #000; }
  .page-break { page-break-before: always; }
  pre, .code-block {
    font-family: "Courier New", monospace;
    font-size: 8pt;
    background: #f2f2f2;
    padding: 6pt 8pt;
    margin: 4pt 0;
    white-space: pre-wrap;
    word-break: break-all;
    line-height: 1.3;
  }
</style>
</head>
<body>''']

# Track page breaks (they appear as empty paragraphs in docx after page break element)
# We'll detect them via XML
from lxml import etree as ET

body_elem = doc.element.body

# Walk body children in order
from docx.oxml.ns import qn

tbl_iter = iter(doc.tables)
para_idx = 0
paras = doc.paragraphs

def is_page_break(para):
    for run in para.runs:
        for br in run._r.findall(qn('w:br')):
            if br.get(qn('w:type')) == 'page':
                return True
    return False

def para_has_shading_code(para):
    """Check if paragraph has light grey background (code block)."""
    fill = get_shading(para._p)
    return fill == 'F2F2F2' or fill == 'f2f2f2'

# Walk element body children
for child in body_elem:
    tag = child.tag.split('}')[-1] if '}' in child.tag else child.tag
    if tag == 'p':
        # Find matching paragraph object
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
        if para_has_shading_code(p_obj):
            code_text = p_obj.text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
            html_parts.append(f'<pre>{code_text}</pre>')
        else:
            html_parts.append(get_para_html(p_obj))
    elif tag == 'tbl':
        # Find matching table
        t_obj = None
        for t in doc.tables:
            if t._tbl is child:
                t_obj = t
                break
        if t_obj:
            html_parts.append(get_table_html(t_obj))
    elif tag == 'sectPr':
        pass  # skip section properties

html_parts.append('</body></html>')

html_content = '\n'.join(html_parts)
html_tmp = os.path.join(REPO, 'docs', 'refactoring_evidence_docx_render.html')
with open(html_tmp, 'w', encoding='utf-8') as f:
    f.write(html_content)

print(f'HTML written: {html_tmp}')

# ── Render to PDF ────────────────────────────────────────────────────────────
with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    with open(html_tmp, 'r', encoding='utf-8') as f:
        page.set_content(f.read(), wait_until='load')
    page.pdf(
        path=OUT_PDF,
        format='Letter',
        print_background=True,
        display_header_footer=True,
        header_template='''<div style="font-size: 7pt; font-family: Arial, sans-serif; width: 100%; 
            display: flex; justify-content: space-between; padding: 0 1in; color: #444; 
            border-bottom: 0.5px solid #888; margin-bottom: 2px;">
          <span>CiteWise &bull; Refactoring Evidence</span>
          <span>IT411 Team G3</span>
        </div>''',
        footer_template='''<div style="font-size: 7pt; font-family: Arial, sans-serif; width: 100%; 
            display: flex; justify-content: space-between; padding: 0 1in; color: #444;
            border-top: 0.5px solid #888; margin-top: 2px;">
          <span>CiteWise &bull; Refactoring Evidence &bull; 3 Nov 2026</span>
          <span><span class="pageNumber"></span></span>
        </div>''',
        margin={'top': '0.85in', 'bottom': '0.85in', 'left': '0in', 'right': '0in'},
    )
    browser.close()

shutil.copy2(OUT_PDF, OUT_COPY)
shutil.copy2(OUT_PDF, ARTIFACT_PDF)

import pymupdf
doc2 = pymupdf.open(OUT_PDF)
print(f'\nGenerated PDF: {OUT_PDF}')
print(f'Total pages: {len(doc2)}')
for i, pg in enumerate(doc2):
    lines = [l.strip() for l in pg.get_text().split('\n') if l.strip()]
    print(f'  Page {i+1}: {lines[0][:70] if lines else "(empty)"}')
