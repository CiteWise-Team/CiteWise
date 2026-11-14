import os
import base64
import shutil
from playwright.sync_api import sync_playwright
import pymupdf

repo_root = 'c:/Users/admin/Documents/CiteWise/CiteWise'

def read_b64(path):
    if os.path.exists(path):
        with open(path, 'rb') as f:
            return base64.b64encode(f.read()).decode('utf-8')
    return ''

# Read HTML template
html_path = os.path.join(repo_root, 'docs', 'refactoring_evidence_styled.html')
with open(html_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Load and replace screenshots
replacements = {
    '__IMG_C05_BROKEN__': read_b64(os.path.join(repo_root, 'docs/test-evidence/module3/TC-F-C05_pdf_open.png')),
    '__IMG_C08_FAILED__': read_b64(os.path.join(repo_root, 'docs/test-evidence/module3/TC-F-C08_failed_attempt.png')),
    '__IMG_C04_SUCCESS__': read_b64(os.path.join(repo_root, 'docs/test-evidence/module3/TC-I-C04_paraphrase_200.png')),
    '__IMG_C08_DIFF__': read_b64(os.path.join(repo_root, 'docs/test-evidence/module3/TC-F-C08_diff.png')),
    '__IMG_PANEL_FAILED__': read_b64(os.path.join(repo_root, 'docs/test-evidence/module2/TC-2.1-05_B_failed.png')),
    '__IMG_PANEL__': read_b64(os.path.join(repo_root, 'docs/test-evidence/module2/TC-2.1-01_panel.png')),
    '__IMG_EXCLUDE__': read_b64(os.path.join(repo_root, 'docs/test-evidence/module3/TC-I-C03_exclude.png')),
    '__IMG_EXCLUDE_RES__': read_b64(os.path.join(repo_root, 'docs/test-evidence/module3/TC-I-C03_result.png')),
    '__IMG_CAPPED__': read_b64(os.path.join(repo_root, 'docs/test-evidence/module2/TC-2.1-03_capped.png')),
    '__IMG_LANDING__': read_b64(os.path.join(repo_root, 'docs/deployed_screenshots/landing_page.png')),
    '__IMG_LOGIN__': read_b64(os.path.join(repo_root, 'docs/deployed_screenshots/login_page.png')),
}

for placeholder, b64_val in replacements.items():
    content = content.replace(placeholder, b64_val)

header_tmpl = """<div style="font-size: 7.2pt; font-family: 'Segoe UI', Arial, sans-serif; width: 100%; display: flex; justify-content: space-between; padding: 0 15mm; color: #64748b; border-bottom: 1px solid #cbd5e1; margin-bottom: 3px;">
  <span>CiteWise &bull; Refactoring Evidence</span>
  <span>IT411 Team G3</span>
</div>"""

footer_tmpl = """<div style="font-size: 7.2pt; font-family: 'Segoe UI', Arial, sans-serif; width: 100%; display: flex; justify-content: space-between; padding: 0 15mm; color: #64748b; border-top: 1px solid #cbd5e1; margin-top: 3px;">
  <span>CiteWise &bull; Refactoring Evidence &bull; 3 Nov 2026</span>
  <span><span class="pageNumber"></span></span>
</div>"""

target_pdf = os.path.join(repo_root, 'CiteWise-Refactoring-Evidence.pdf')
parent_pdf = 'c:/Users/admin/Documents/CiteWise/CiteWise-Refactoring-Evidence.pdf'
artifact_pdf = 'C:/Users/admin/.gemini/antigravity/brain/a90c2d1b-2e0d-48b7-a942-05a61f9b06d4/CiteWise-Refactoring-Evidence.pdf'

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    page.set_content(content)
    page.pdf(
        path=target_pdf,
        format='A4',
        display_header_footer=True,
        header_template=header_tmpl,
        footer_template=footer_tmpl,
        margin={"top": "18mm", "bottom": "18mm", "left": "15mm", "right": "15mm"},
        print_background=True
    )
    browser.close()

shutil.copyfile(target_pdf, parent_pdf)
shutil.copyfile(target_pdf, artifact_pdf)
print(f"Generated PDF successfully at:\n  - {target_pdf}\n  - {parent_pdf}\n  - {artifact_pdf}")

# Inspect pages
doc = pymupdf.open(target_pdf)
print(f"\nPDF Page Inspection (Total Pages: {len(doc)}):")
for i in range(len(doc)):
    page_text = doc[i].get_text().strip()
    first_line = page_text.split('\n')[0] if page_text else 'EMPTY'
    print(f"  Page {i+1}: {len(page_text)} chars | First line: {first_line[:65]}")
doc.close()
