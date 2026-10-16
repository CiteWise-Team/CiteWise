import { describe, it, expect } from 'vitest';
import {
  extractPdfPages, joinPages, pageForOffset, pageRange,
  buildSearchIndex, locateQuote, resolveExcerptPage,
} from '../modules/citewise/helpers/pageText.js';
import { selectRelevantChunks } from '../modules/citewise/helpers/chunking.js';
import { buildCitationTrace, splitSentences } from '../modules/citewise/helpers/citationTrace.js';
import { summarizeTimings } from '../modules/citewise/helpers/assessmentTiming.js';

const PAGES = [
  ['Introduction to the study of citation errors.', 'Large language models frequently fabricate references.'],
  ['Methodology section.', 'We evaluate retrieval augmented generation on a benchmark of 500 questions.'],
  ['Limitations and future work.', 'Few studies examine traceability of generated citations in student writing.'],
];

// pdf.js cannot open documents inside the vitest runtime ("bad XRef entry" even
// for files plain Node parses), so this stub reproduces pdf-parse 1.1.x's page
// loop: render each page in order, prefix it with "\n\n". The real library is
// exercised against generated PDFs by scripts/benchmark-assessment.js --verify.
function fakePdfParse(pages, { failPage } = {}) {
  return async (_buffer, options) => {
    let text = '';
    for (let i = 0; i < pages.length; i++) {
      let pageText = '';
      if (i !== failPage) {
        const pageData = {
          pageIndex: i,
          getTextContent: async () => ({
            items: pages[i].map((str, l) => ({ str, transform: [0, 0, 0, 0, 0, 700 - l * 12] })),
          }),
        };
        pageText = await options.pagerender(pageData);
      }
      text = `${text}\n\n${pageText}`;
    }
    return { text, numpages: pages.length, numrender: pages.length };
  };
}

describe('extractPdfPages', () => {
  it('reproduces pdf-parse text and maps every page', async () => {
    const paged = await extractPdfPages(fakePdfParse(PAGES), Buffer.alloc(0));

    expect(paged.text).toBe(PAGES.map((lines) => `\n\n${lines.join('\n')}`).join(''));
    expect(paged.pageCount).toBe(3);
    expect(paged.pageOffsets).toHaveLength(3);

    PAGES.forEach((lines, i) => {
      const at = paged.text.indexOf(lines[1]);
      expect(pageForOffset(paged.pageOffsets, at)).toBe(i + 1);
    });
  });

  it('keeps offsets aligned when a page fails to render', async () => {
    const paged = await extractPdfPages(fakePdfParse(PAGES, { failPage: 1 }), Buffer.alloc(0));
    expect(pageForOffset(paged.pageOffsets, paged.text.indexOf(PAGES[2][1]))).toBe(3);
  });

  it('pageRange returns exactly one page of text', async () => {
    const { text, pageOffsets } = await extractPdfPages(fakePdfParse(PAGES), Buffer.alloc(0));
    const r = pageRange(text, pageOffsets, 2);
    const slice = text.slice(r.start, r.end);
    expect(slice).toContain('Methodology section.');
    expect(slice).not.toContain('Limitations');
    expect(slice).not.toContain('Introduction');
  });
});

describe('locateQuote / resolveExcerptPage', () => {
  const { text, pageOffsets } = joinPages([
    'Abstract. This paper studies hallucinated citations in AI tools.',
    'The proposed framework improves source attribu-\ntion accuracy by 23 percent compared with the baseline system.',
    'Future work should address traceability for scanned documents and the ﬁnal evaluation.',
  ]);
  const index = buildSearchIndex(text);

  it('finds an exact quote despite case and punctuation differences', () => {
    const r = resolveExcerptPage({ index, pageOffsets, quote: 'the proposed framework improves source attribution accuracy by 23 percent', aiPage: 1 });
    expect(r).toEqual({ pageNumber: 2, pageVerified: true });
  });

  it('matches quotes that kept a line-break hyphen ("attribu- tion")', () => {
    const hit = locateQuote(index, 'The proposed framework improves source attribu- tion accuracy by 23 percent compared with the baseline system.');
    expect(hit?.method).toBe('exact');
    expect(text.slice(hit.start, hit.end)).toMatch(/^The proposed[\s\S]*baseline system$/);
  });

  it('ignores word spacing (pdf-parse glues italic words: "ingdenserepresentations")', () => {
    const doc = joinPages(['retrieval can be practically implemented us-\ning dense representations alone, where em-\nbeddings are learned']);
    const hit = locateQuote(buildSearchIndex(doc.text), 'retrieval can be practically implemented us- ingdenserepresentations alone, where em- beddings are learned');
    expect(hit?.method).toBe('exact');
    expect(doc.text.slice(hit.start, hit.end)).toMatch(/^retrieval[\s\S]*learned$/);
  });

  it('unfolds ligatures', () => {
    expect(resolveExcerptPage({ index, pageOffsets, quote: 'traceability for scanned documents and the final evaluation', aiPage: 1 }))
      .toEqual({ pageNumber: 3, pageVerified: true });
  });

  it('matches on the opening words when the AI trims the end', () => {
    const quote = 'The proposed framework improves source attribution accuracy by 23 percent compared with the previous approach in every setting';
    expect(locateQuote(index, quote)?.method).toBe('partial');
  });

  it('falls back to the AI page, unverified, when the quote is not in the text', () => {
    expect(resolveExcerptPage({ index, pageOffsets, quote: 'completely invented sentence that is nowhere in this document', aiPage: 2 }))
      .toEqual({ pageNumber: 2, pageVerified: false });
    expect(resolveExcerptPage({ index, pageOffsets, quote: 'completely invented sentence that is nowhere in this document', aiPage: 99 }))
      .toEqual({ pageNumber: null, pageVerified: false });
  });
});

describe('selectRelevantChunks page hints', () => {
  it('labels each chunk with its page', () => {
    const para = (p) => `Retrieval augmented generation evaluation framework research gap paragraph on page ${p}. `.repeat(4);
    const { text, pageOffsets } = joinPages([1, 2, 3, 4].map((p) => `${para(p)}\n\n${para(p)}`));
    const out = selectRelevantChunks(text, { project_title: 'retrieval augmented generation' }, { pageOffsets });
    const headers = out.match(/\[CHUNK [^\]]+\]/g);
    expect(headers.length).toBeGreaterThan(0);
    for (const h of headers) expect(h).toMatch(/page=\d/);
    expect(out).toMatch(/page=4\][\s\S]*on page 4/);
  });

  it('omits hints when no page map exists', () => {
    const out = selectRelevantChunks('word '.repeat(600), {}, {});
    expect(out).not.toMatch(/page=/);
  });
});

describe('buildCitationTrace', () => {
  const { text: fullText, pageOffsets } = joinPages([
    'Cover page and abstract about digital learning.',
    'Students who used mobile flashcards improved vocabulary retention significantly over eight weeks.',
    'Teachers reported that feedback dashboards reduced grading time for large classes.',
  ]);
  const sources = [{
    documentId: 7,
    fileName: 'reyes.pdf',
    citation: { inTextAuthors: 'Reyes et al.', year: '2021' },
    fullText,
    pageOffsets,
    excerpts: [],
  }];

  it('links each citation to the supporting page', () => {
    const draft = 'Background\n\nMobile flashcards improve vocabulary retention among students (Reyes et al., 2021). '
      + 'Dashboards also reduce grading time for teachers (Reyes et al., 2021).';
    const trace = buildCitationTrace(draft, sources);
    expect(trace).toHaveLength(2);
    expect(trace[0].sources[0]).toMatchObject({ documentId: 7, pageNumber: 2, pageVerified: true });
    expect(trace[1].sources[0]).toMatchObject({ documentId: 7, pageNumber: 3 });
    expect(trace[0].start).toBe(draft.indexOf('(Reyes et al., 2021)'));
  });

  it('handles narrative citations', () => {
    const trace = buildCitationTrace('Reyes et al. (2021) found that dashboards reduce grading time.', sources);
    expect(trace[0].sources[0].pageNumber).toBe(3);
  });

  it('gives a page to custom highlights that were stored without one', () => {
    const withHighlight = [{ ...sources[0], fullText, excerpts: [{ quoteText: 'feedback dashboards reduced grading time for large classes', pageNumber: null, isCustom: true }] }];
    const trace = buildCitationTrace('Feedback dashboards reduced grading time (Reyes et al., 2021).', withHighlight);
    expect(trace[0].sources[0]).toMatchObject({ pageNumber: 3, via: 'custom-highlight' });
  });

  it('ignores parentheticals that cite no known source', () => {
    expect(buildCitationTrace('Something happened (Unknown, 2019).', sources)).toEqual([]);
  });

  it('does not split sentences after "et al."', () => {
    expect(splitSentences('Reyes et al. (2021) found X. Then Y happened.')).toHaveLength(2);
  });
});

describe('summarizeTimings', () => {
  const row = (pages, ms, extra = {}) => ({
    page_count: pages, total_ms: ms, assessment_ms: ms, extraction_method: 'local',
    status: 'COMPLETE', reused_ai_response: false, ...extra,
  });

  it('derives the page threshold from a linear fit and the observed buckets', () => {
    // 4 s fixed + 0.5 s per page -> 15 s at 22 pages
    const rows = [2, 4, 8, 10, 15, 18, 25, 30, 40].map((p) => row(p, 4000 + 500 * p));
    const s = summarizeTimings(rows);
    expect(s.overall.fit).toEqual({ fixedMs: 4000, msPerPage: 500 });
    expect(s.overall.estimatedMaxPages).toBe(22);
    expect(s.overall.observedMaxPages).toBe(20);
    expect(s.methods.local.runs).toBe(9);
  });

  it('ignores weight-only re-scores and failed runs', () => {
    const s = summarizeTimings([row(5, 100, { reused_ai_response: true }), row(5, 100, { status: 'FAILED' })]);
    expect(s.runs).toBe(0);
  });
});
