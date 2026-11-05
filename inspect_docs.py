import docx, sys
sys.stdout.reconfigure(encoding='utf-8')
from docx.shared import Pt, Inches

for name in ['srs.docx', 'sdd.docx', 'smpm.docx']:
    doc = docx.Document('docs/' + name)
    print(f'\n================  {name}  ================')

    # Section margins
    sec = doc.sections[0]
    print(f'Page: {sec.page_width.inches:.3f}" x {sec.page_height.inches:.3f}"')
    print(f'Margins: top={sec.top_margin.inches:.3f}", bottom={sec.bottom_margin.inches:.3f}", left={sec.left_margin.inches:.3f}", right={sec.right_margin.inches:.3f}"')

    # Header / footer text
    h_text = ' | '.join([p.text.strip() for p in doc.sections[1].header.paragraphs if p.text.strip()]) if len(doc.sections) > 1 else ''
    f_text = ' | '.join([p.text.strip() for p in doc.sections[1].footer.paragraphs if p.text.strip()]) if len(doc.sections) > 1 else ''
    print(f'Header: "{h_text}"')
    print(f'Footer: "{f_text}"')

    # Body styles
    print('--- Named styles used in paragraphs ---')
    used = {}
    for p in doc.paragraphs:
        s = p.style.name
        if s not in used:
            used[s] = p.text.strip()[:60]
    for s, ex in list(used.items())[:12]:
        print(f'  [{s}] ex: "{ex}"')

    # Default font from Normal style
    nf = doc.styles['Normal'].font
    print(f'Normal font: name={nf.name}, size={nf.size}')

    # Heading styles
    for h in ['Heading 1', 'Heading 2', 'Heading 3']:
        try:
            hf = doc.styles[h].font
            hp = doc.styles[h].paragraph_format
            print(f'{h}: font={hf.name}, size={hf.size}, bold={hf.bold}, color={hf.color.rgb if hf.color else None}, space_before={hp.space_before}')
        except:
            pass

    # Table style from first table
    if doc.tables:
        t = doc.tables[0]
        print(f'Table 0 style: {t.style.name}, rows={len(t.rows)}, cols={len(t.columns)}')
        for i, row in enumerate(t.rows[:2]):
            for j, cell in enumerate(row.cells[:3]):
                shading = cell._tc.get_or_add_tcPr()
                print(f'  Cell[{i},{j}] text="{cell.text.strip()[:30]}"')
