import os
import base64
import shutil
from playwright.sync_api import sync_playwright
import pymupdf

repo_root = 'c:/Users/admin/Documents/CiteWise/CiteWise'
html_file = os.path.join(repo_root, 'docs', 'refactoring_evidence.html')
target_pdf = os.path.join(repo_root, 'CiteWise-Refactoring-Evidence.pdf')
parent_pdf = 'c:/Users/admin/Documents/CiteWise/CiteWise-Refactoring-Evidence.pdf'

# Read HTML
with open(html_file, 'r', encoding='utf-8') as f:
    content = f.read()

# Read logo base64
logo_path = os.path.join(repo_root, 'web', 'public', 'citewise-logo.png')
if os.path.exists(logo_path):
    with open(logo_path, 'rb') as f:
        b64 = base64.b64encode(f.read()).decode('utf-8')
    logo_tag = f'<img src="data:image/png;base64,{b64}" alt="CiteWise Logo" class="brand-logo" />'
else:
    logo_tag = '<div class="brand-logo-fallback">CiteWise</div>'

content = content.replace('<!-- LOGO_TAG -->', logo_tag)

header_tmpl = """<div style="font-size: 7.5pt; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; width: 100%; display: flex; justify-content: space-between; padding: 0 15mm; color: #64748b; border-bottom: 1px solid #e2e8f0; margin-bottom: 3px;">
  <span>CiteWise — Software Refactoring Evidence Document (v2.0)</span>
  <span>IT411 Team G3 &bull; CIT-U CCS</span>
</div>"""

footer_tmpl = """<div style="font-size: 7.5pt; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; width: 100%; display: flex; justify-content: space-between; padding: 0 15mm; color: #64748b; border-top: 1px solid #e2e8f0; margin-top: 3px;">
  <span>Cebu Institute of Technology – University</span>
  <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
</div>"""

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    page.set_content(content)
    page.pdf(
        path=target_pdf,
        format='Letter',
        display_header_footer=True,
        header_template=header_tmpl,
        footer_template=footer_tmpl,
        margin={"top": "22mm", "bottom": "22mm", "left": "15mm", "right": "15mm"},
        print_background=True
    )
    browser.close()

# Also copy to parent folder
shutil.copyfile(target_pdf, parent_pdf)

print(f"Generated PDF successfully at:\n  - {target_pdf}\n  - {parent_pdf}")

# Inspect pages and char counts
doc = pymupdf.open(target_pdf)
print(f"\nPDF Verification:")
print(f"Total Pages: {len(doc)}")
for i in range(len(doc)):
    page_text = doc[i].get_text().strip()
    first_line = page_text.split('\n')[0] if page_text else 'EMPTY'
    print(f"  Page {i+1}: {len(page_text)} chars | First line: {first_line[:65]}")
doc.close()
