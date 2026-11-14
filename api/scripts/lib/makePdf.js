// Builds a minimal text-only PDF (one Helvetica font, one content stream per
// page). Used by tests and the assessment benchmark to get real pdf-parse
// output for an exact, known number of pages.

function escapePdfText(s) {
  return String(s).replace(/[\\()]/g, (c) => `\\${c}`).replace(/[^\x20-\x7e]/g, '?');
}

export function makePdf(pages) {
  const objects = [];
  const add = (body) => { objects.push(body); return objects.length; };

  const catalogId = add(null);
  const pagesId = add(null);
  const fontId = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');

  const pageIds = pages.map((lines) => {
    const ops = ['BT', '/F1 10 Tf', '12 TL', '56 760 Td'];
    for (const line of lines) ops.push(`(${escapePdfText(line)}) Tj T*`);
    ops.push('ET');
    const stream = ops.join('\n');
    const contentId = add(`<< /Length ${Buffer.byteLength(stream, 'latin1')} >>\nstream\n${stream}\nendstream`);
    return add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`);
  });

  objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;

  let out = '%PDF-1.4\n';
  const offsets = [];
  objects.forEach((body, i) => {
    offsets.push(Buffer.byteLength(out, 'latin1'));
    out += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefAt = Buffer.byteLength(out, 'latin1');
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) out += `${String(off).padStart(10, '0')} 00000 n \n`;
  out += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`;
  return Buffer.from(out, 'latin1');
}

const WORDS = ('retrieval augmented generation citation evidence academic synthesis framework evaluation '
  + 'benchmark methodology hallucination source verification literature review research gap students '
  + 'model dataset accuracy reliability traceability introduction analysis results discussion').split(' ');

// Roughly a dense academic page: ~55 lines of ~95 characters.
export function samplePages(count, linesPerPage = 55) {
  let seed = 7;
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  return Array.from({ length: count }, (_, p) =>
    Array.from({ length: linesPerPage }, (_, l) => {
      const words = [`Page${p + 1}line${l + 1}`];
      while (words.join(' ').length < 90) words.push(WORDS[Math.floor(rand() * WORDS.length)]);
      return words.join(' ');
    }));
}
