/**
 * Citation metadata extraction + APA formatting for CiteWise RRL documents.
 *
 * The synthesis LLM must never invent an author or a year, so every citation it
 * is allowed to emit is derived here from the uploaded PDF's own text and handed
 * over as a ready-made APA string. Anything we cannot establish with confidence
 * is reported as such (APA "n.d." / title-in-author-position rules) rather than
 * being guessed at.
 *
 * Two real failure modes this replaces:
 *   - the paper TITLE being promoted into the author slot
 *     ("LORA: LOW-RANK ADAPTATION, 2019")
 *   - a year scraped out of body text or an in-text citation
 *     ("WMT 2014", "(Liu et al., 2019)") instead of the publication year
 */

// Author-block markers: U+2217 (∗), dagger, double dagger, section, pilcrow,
// ASCII asterisk, hash, and super/subscript digits used for affiliation refs.
const MARKER_CLASS = '\\u2217\\u2020\\u2021\\u00a7\\u00b6\\u002a#\\u00b9\\u00b2\\u00b3\\u2070-\\u2079';
const MARKER_RE = new RegExp(`[${MARKER_CLASS}]`, 'g');

// Words that mean "this line is an institution, not a person".
const AFFILIATION_WORDS = new Set([
  'university', 'universitat', 'universite', 'universidad', 'institute', 'institut', 'college',
  'school', 'department', 'dept', 'faculty', 'laboratory', 'laboratories', 'lab', 'labs',
  'corporation', 'corp', 'inc', 'ltd', 'llc', 'gmbh', 'company', 'foundation', 'academy',
  'center', 'centre', 'hospital', 'clinic', 'ministry', 'agency', 'council', 'society',
  'google', 'microsoft', 'facebook', 'meta', 'openai', 'deepmind', 'anthropic', 'amazon',
  'apple', 'ibm', 'nvidia', 'intel', 'baidu', 'tencent', 'alibaba', 'huawei', 'samsung',
  'brain', 'research', 'labs', 'ai', 'science', 'technology', 'engineering', 'campus',
]);

// Lowercase particles that belong to a surname rather than being a given name.
const NAME_PARTICLES = new Set([
  'van', 'von', 'de', 'del', 'della', 'di', 'da', 'du', 'la', 'le', 'den', 'der',
  'ten', 'ter', 'bin', 'ibn', 'al', 'dos', 'das', 'do', 'st', 'mc', 'mac',
]);

// Function words that betray a prose sentence masquerading as an author line.
const PROSE_WORDS = /\b(?:the|of|and|for|with|that|this|from|which|are|was|were|has|have|been|using|based|we|our|these|those|such|than|when|while|however|although|between|among|into|through|during|about|because|therefore|thus|hence)\b/i;

// Generic/suspicious author labels (kept compatible with the previous guard).
const BAD_AUTHOR_WORDS = new Set([
  'article', 'articles', 'unknown', 'author', 'authors', 'source', 'sources', 'paper',
  'papers', 'research', 'study', 'studies', 'journal', 'document', 'documents', 'untitled',
  'input', 'output', 'abstract', 'introduction', 'conclusion', 'chapter', 'background',
  'method', 'methods', 'results', 'discussion', 'references', 'appendix', 'figure', 'table',
  'preprint', 'proceedings', 'volume', 'copyright', 'permission', 'license', 'licensed',
]);

const YEAR_RE = '(?:19[89]\\d|20[0-4]\\d)';

/** Strips affiliation markers / stray superscripts and collapses whitespace. */
function stripMarkers(value) {
  return String(value ?? '')
    .replace(MARKER_RE, ' ')
    .replace(/\s*\d+\s*$/, ' ')      // trailing affiliation index ("Smith 1")
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function normalizeForCompare(value) {
  return String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function upperRatio(value) {
  const letters = String(value ?? '').replace(/[^A-Za-z]/g, '');
  if (!letters) return 0;
  const upper = letters.replace(/[^A-Z]/g, '').length;
  return upper / letters.length;
}

export function suspiciousAuthor(value) {
  const s = String(value ?? '').trim().toLowerCase();
  if (!s) return true;
  const match = s.match(/^[a-z]+/);
  if (!match) return false;
  return BAD_AUTHOR_WORDS.has(match[0]);
}

function looksLikeAffiliation(line) {
  const tokens = normalizeForCompare(line).split(' ').filter(Boolean);
  return tokens.some((t) => AFFILIATION_WORDS.has(t));
}

/**
 * True when a line in the header zone plausibly holds author names.
 * Deliberately strict: a false negative costs us a "n.d."-style citation,
 * a false positive puts garbage into the reference list.
 */
function looksLikeNameList(line, title) {
  const s = stripMarkers(line);
  if (!s || s.length < 4 || s.length > 200) return false;
  if (/[@{}]|https?:|www\.|\d{4}/i.test(line)) return false;   // emails, URLs, years
  if (/[:;]|\bet al\b/i.test(s)) return false;                 // titles / citations
  if (!/^[A-ZÀ-ÖØ-ÞĀ-ſ]/.test(s)) return false;      // must start capitalised
  if (upperRatio(s) > 0.6) return false;                       // ALL-CAPS => title, not names
  if (looksLikeAffiliation(s)) return false;
  if (suspiciousAuthor(s)) return false;
  if (title && normalizeForCompare(s) === normalizeForCompare(title)) return false;
  if (PROSE_WORDS.test(s)) return false;

  const tokens = s.split(/[\s,&]+/).filter(Boolean);
  if (!tokens.length || tokens.length > 24) return false;

  // Needs at least one "Firstname Lastname" style pair.
  const capitalised = tokens.filter((t) => /^[A-ZÀ-ÖØ-ÞĀ-ſ]/.test(t));
  if (capitalised.length < 2) return false;
  const lowercaseNoise = tokens.filter(
    (t) => /^[a-z]/.test(t) && !NAME_PARTICLES.has(t.toLowerCase())
  );
  return lowercaseNoise.length === 0;
}

/**
 * Splits an author line into individual names. Handles comma lists, "and"/"&",
 * marker-delimited runs ("Edward Hu∗ Yelong Shen∗ ...") and plain
 * space-separated lists ("Yuanzhi Li Shean Wang Lu Wang Weizhu Chen").
 */
function splitNames(rawLine) {
  let s = String(rawLine ?? '').replace(/\s+/g, ' ').trim();
  s = s.replace(new RegExp(`[${MARKER_CLASS}]+`, 'g'), ',');   // markers end a name
  s = s.replace(/\s+(?:and|AND|&)\s+/g, ',');

  const chunks = s.split(/\s*,\s*/).map((p) => stripMarkers(p)).filter(Boolean);
  const names = [];

  for (const chunk of chunks) {
    const tokens = chunk.split(/\s+/).filter(Boolean);
    const hasParticle = tokens.some((t) => NAME_PARTICLES.has(t.toLowerCase()));
    // 4+ bare tokens with no initials/particles = several names run together.
    if (tokens.length >= 4 && !chunk.includes('.') && !hasParticle) {
      for (let i = 0; i < tokens.length; i += 2) names.push(tokens.slice(i, i + 2).join(' '));
    } else {
      names.push(chunk);
    }
  }

  return names.filter((n) => /^[A-ZÀ-ÖØ-ÞĀ-ſ]/.test(n) && n.length >= 3);
}

/** "Ashish Vaswani" -> "Vaswani, A."   "Aidan N. Gomez" -> "Gomez, A. N." */
export function toApaName(raw) {
  const s = stripMarkers(raw);
  if (!s) return null;

  if (s.includes(',')) {
    const [surnameRaw, restRaw = ''] = s.split(',');
    const surname = surnameRaw.trim();
    const initials = restRaw
      .split(/[\s.]+/)
      .map((t) => t.replace(/[^\p{L}]/gu, ''))
      .filter(Boolean)
      .map((t) => `${t[0].toUpperCase()}.`);
    if (!surname) return null;
    return initials.length ? `${surname}, ${initials.join(' ')}` : surname;
  }

  const tokens = s.split(/\s+/).filter(Boolean);
  if (tokens.length === 1) return tokens[0];

  let surnameStart = tokens.length - 1;
  while (surnameStart > 1 && NAME_PARTICLES.has(tokens[surnameStart - 1].toLowerCase())) {
    surnameStart -= 1;
  }
  const surname = tokens.slice(surnameStart).join(' ');
  const initials = tokens
    .slice(0, surnameStart)
    .map((t) => t.replace(/[^\p{L}]/gu, ''))
    .filter(Boolean)
    .map((t) => `${t[0].toUpperCase()}.`);

  return initials.length ? `${surname}, ${initials.join(' ')}` : surname;
}

function surnameOf(apaName) {
  return String(apaName ?? '').split(',')[0].trim();
}

/** APA 7 reference-list author string. */
export function formatApaAuthorList(apaNames) {
  const names = (apaNames ?? []).filter(Boolean);
  if (!names.length) return '';
  if (names.length === 1) return names[0];
  if (names.length <= 20) {
    return `${names.slice(0, -1).join(', ')}, & ${names[names.length - 1]}`;
  }
  return `${names.slice(0, 19).join(', ')}, ... ${names[names.length - 1]}`;
}

/** APA 7 in-text author string: "Vaswani et al." / "Hu & Shen" / "Vaswani". */
export function formatInTextAuthors(apaNames) {
  const names = (apaNames ?? []).filter(Boolean);
  if (!names.length) return '';
  if (names.length === 1) return surnameOf(names[0]);
  if (names.length === 2) return `${surnameOf(names[0])} & ${surnameOf(names[1])}`;
  return `${surnameOf(names[0])} et al.`;
}

/**
 * Publication year, in descending order of trustworthiness. The generic
 * whole-text scan runs last and only after in-text citations and dataset names
 * have been stripped, so "(Liu et al., 2019)" and "WMT 2014" can't win.
 */
function extractYear(head, filename) {
  const name = String(filename ?? '');

  // arXiv identifier YYMM.NNNNN -> publication year (survives later revisions).
  for (const source of [name, head]) {
    const m = String(source).match(/(?:arxiv:\s*)?\b(\d{2})(0[1-9]|1[0-2])\.\d{4,}/i);
    if (m) {
      const yy = parseInt(m[1], 10);
      if (yy >= 90) return String(1900 + yy);
      if (yy <= 40) return String(2000 + yy);
    }
  }

  const patterns = [
    // "31st Conference on ... (NIPS 2017)", "Published as a conference paper at ICLR 2022"
    new RegExp(`(?:proceedings|conference|symposium|workshop|published as)[^\\n]{0,120}?\\b(${YEAR_RE})\\b`, 'i'),
    new RegExp(`(?:©|\\(c\\)|copyright)[^\\n]{0,20}?\\b(${YEAR_RE})\\b`, 'i'),
    new RegExp(`(?:received|accepted|revised|published|submitted)[^\\n]{0,60}?\\b(${YEAR_RE})\\b`, 'i'),
  ];
  for (const p of patterns) {
    const m = head.match(p);
    if (m) return m[1];
  }

  // Last resort: strip everything that looks like a *reference to other work*.
  const cleaned = head
    .replace(/\([^)]*\bet al\.?[^)]*\)/gi, ' ')                       // (Liu et al., 2019)
    .replace(/\([^)]*\b\d{4}[a-z]?\s*\)/g, ' ')                       // (Devlin, 2019b)
    .replace(/\barxiv:\s*\d{4}\.\d{4,}v?\d*/gi, ' ')
    .replace(/\b(?:wmt|newstest|conll|semeval|imagenet|squad|glue|mnli|wikitext)\s*'?\d{2,4}/gi, ' ');
  const generic = cleaned.match(new RegExp(`\\b(${YEAR_RE})\\b`));
  return generic ? generic[1] : null;
}

/**
 * pdf-parse output needs repair before the header can be parsed:
 *   - spaces between differently-styled text runs are routinely dropped
 *     ("Yuanzhi LiShean WangLu Wang"), so re-insert them at lower->Upper
 *     boundaries (guarded so "LoRA" and "McDonald" survive)
 *   - words are hyphen-split across line breaks ("...LAN-\nGUAGE")
 */
function normalizeHeaderText(raw) {
  return String(raw ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/([A-Za-zÀ-ÿ])-\n([A-Za-zÀ-ÿ])/g, '$1$2')
    .replace(/([a-zà-öø-ÿ])([A-ZÀ-ÖØ-Þ][a-zà-öø-ÿ])/g, '$1 $2')
    .replace(/\b(Mc|Mac|O')\s+([A-Z][a-z])/g, '$1$2');
}

/** Header lines, cleaned of marker-only rows and leading list punctuation. */
function headerLines(zone) {
  return zone
    .split('\n')
    .map((l) => l.replace(MARKER_RE, ' ').replace(/\s+/g, ' ').trim())
    .map((l) => l.replace(/^[\s,;·•*?]+/, '').replace(/[\s,;]+$/, '').trim())
    .filter((l) => l.length >= 2 && /\p{L}/u.test(l));
}

/** Title: first substantial, capitalised, non-boilerplate line before the abstract. */
const TITLE_SKIP = /^(arxiv:|doi:|https?:|www\.|©|preprint|submitted|received|accepted|proceedings|journal|volume|issue|pages|conference|workshop|email|@|\d+\s*$)/i;
const TITLE_BOILERPLATE = /(permission|reproduce|all rights reserved|licensed under|creative commons|provided proper|under review|to appear|equal contribution|corresponding author)/i;
// A title line ending in a hyphen or a dangling function word continues below.
const TITLE_CONTINUES = /(?:-|\b(?:for|of|and|the|in|on|with|a|an|to|from|via|using|by|its|their|through|towards?)\b)$/i;

/**
 * Returns the title plus the index of the last line it consumed, so the author
 * scan starts *after* the full title. Without this, a title wrapped onto a
 * second line ("Knowledge-Intensive NLP Tasks") is misread as an author.
 */
function extractTitle(lines) {
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.length < 12 || line.length > 350) continue;
    if (TITLE_SKIP.test(line) || TITLE_BOILERPLATE.test(line)) continue;
    if (!/^[A-Z0-9À-ÖØ-ÞĀ-ſ]/.test(line)) continue;   // titles start capitalised
    if (/@/.test(line)) continue;

    let title = line;
    let lastIndex = i;
    for (let j = i + 1; j < Math.min(i + 4, lines.length); j += 1) {
      if (!TITLE_CONTINUES.test(title)) break;
      const next = lines[j];
      if (!next || /@/.test(next) || looksLikeAffiliation(next) || /^abstract\b/i.test(next)) break;
      title = title.endsWith('-') ? title.slice(0, -1) + next : `${title} ${next}`;
      lastIndex = j;
    }
    return { title: title.replace(/\s+/g, ' ').trim(), lastIndex };
  }
  return { title: null, lastIndex: -1 };
}

/**
 * True when a title still carries pdf-parse concatenation damage that cannot be
 * repaired heuristically (an ALL-CAPS run with no case boundary to split on,
 * e.g. "OFLARGELANGUAGEMODELS"). The filename is a better source in that case.
 */
function hasConcatenationDamage(title) {
  return String(title ?? '').split(/\s+/).some((t) => t.replace(/[^A-Za-z]/g, '').length > 18);
}

// Short words that are ordinary vocabulary rather than acronyms, so an
// ALL-CAPS title lowercases them instead of preserving them as initialisms.
const SHORT_NON_ACRONYMS = new Set([
  'a', 'an', 'the', 'of', 'and', 'for', 'with', 'in', 'on', 'to', 'at', 'by', 'or', 'as',
  'is', 'are', 'be', 'we', 'our', 'its', 'all', 'you', 'new', 'low', 'via', 'if', 'from',
  'into', 'over', 'per', 'not', 'no', 'can', 'do', 'it', 'that', 'this', 'more', 'less',
]);

/** ALL-CAPS titles are converted to APA sentence case; acronyms are preserved. */
function normalizeTitle(title) {
  const s = String(title ?? '').replace(/\s+/g, ' ').trim();
  if (!s || upperRatio(s) < 0.7) return s;

  const sentenceCased = s
    .split(' ')
    .map((word) => {
      if (/\d/.test(word)) return word;                       // GPT-3, BERT-2
      const letters = word.replace(/[^A-Za-z]/g, '');
      // Treat only short, non-vocabulary tokens as acronyms (LORA, NLP, CNN).
      if (letters.length >= 2 && letters.length <= 4 && !SHORT_NON_ACRONYMS.has(letters.toLowerCase())) {
        return word;
      }
      return word.toLowerCase();
    })
    .join(' ');

  // Capitalise the first word and anything following a colon (APA sentence case).
  return sentenceCased.replace(/(^|:\s+)([a-z])/g, (_, p, c) => p + c.toUpperCase());
}

/**
 * Extracts citation metadata from a PDF's parsed text + filename.
 * Order of preference: stored AI metadata -> text heuristics -> filename pattern.
 */
export function extractCitationMetadata(filename, text, storedMetaJson) {
  if (storedMetaJson) {
    try {
      const stored = typeof storedMetaJson === 'string' ? JSON.parse(storedMetaJson) : storedMetaJson;
      if (stored && stored.metadataReliable && stored.title && stored.year && stored.authorDisplay) {
        const authors = Array.isArray(stored.authors) && stored.authors.length
          ? stored.authors
          : [stored.authorDisplay];
        return finalize({
          authors,
          year: String(stored.year),
          title: stored.title,
          journal: stored.journal || '',
          doi: stored.doi || '',
          publisher: stored.publisher || '',
          filename,
        });
      }
    } catch { /* fall through to heuristics */ }
  }

  const name = String(filename ?? '').replace(/\.pdf$/i, '').trim();
  const raw = normalizeHeaderText(text);
  const head = raw.slice(0, 6000);

  const doiMatch = head.match(/\b(?:doi|DOI)[:\s/]+([^\s,;)\]]+)/);
  const doi = doiMatch ? doiMatch[1].replace(/[.,;)\]]+$/, '') : '';

  const year = extractYear(head, name);

  const abstractIdx = head.search(/\bAbstract\b/i);
  const zone = abstractIdx > 60 ? head.slice(0, abstractIdx) : head.slice(0, 2500);
  const zoneLines = headerLines(zone);

  const { title: rawTitle, lastIndex: titleEnd } = extractTitle(zoneLines);
  let title = rawTitle;

  // Authors: scan every line after the full title up to the abstract, collecting
  // all name-like lines. Author blocks are routinely interleaved with
  // affiliations, emails and marker-only rows, and can run to a dozen-plus lines
  // on multi-author papers, so we cannot stop at the first hit.
  const authors = [];
  if (title) {
    for (const line of zoneLines.slice(titleEnd + 1, titleEnd + 41)) {
      if (looksLikeNameList(line, title)) {
        for (const n of splitNames(line)) {
          if (!authors.includes(n)) authors.push(n);
        }
      }
    }
  }

  // An unrepairable ALL-CAPS concatenated title reads worse than the filename.
  if (title && hasConcatenationDamage(title) && name) {
    const fromName = name.replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (fromName && !hasConcatenationDamage(fromName)) title = fromName;
  }

  // Filename fallback: "Author (Year) Title.pdf" / "Year_Author_Title.pdf".
  let fallbackYear = year;
  if (!title || !authors.length) {
    const patterns = [
      /^([A-Z][a-zA-Z\s&.-]{2,40})\s+\(?(19[89]\d|20[0-4]\d)\)?\s+(.{10,})$/,
      /^(19[89]\d|20[0-4]\d)[_\s-]+([A-Z][a-zA-Z\s.-]{2,30})[_\s-]+(.{10,})$/,
    ];
    for (const p of patterns) {
      const m = name.match(p);
      if (!m) continue;
      const isYearFirst = /^\d/.test(m[1]);
      const authorPart = (isYearFirst ? m[2] : m[1]).trim();
      const yearPart = isYearFirst ? m[1] : m[2];
      const titlePart = m[3].replace(/[_-]/g, ' ').trim();
      if (!authors.length && authorPart && !suspiciousAuthor(authorPart)) authors.push(authorPart);
      if (!fallbackYear) fallbackYear = yearPart;
      if (!title) title = titlePart;
      break;
    }
  }

  // Never discard the document entirely: fall back to the filename stem.
  if (!title && name) {
    title = name.replace(/[_-]/g, ' ').replace(/\b\d{4,}\b/g, '').trim() || null;
  }

  return finalize({ authors, year: fallbackYear, title, journal: '', doi, publisher: '', filename });
}

/** Builds the APA strings + reliability verdict from raw extracted parts. */
function finalize({ authors, year, title, journal, doi, publisher, filename }) {
  const cleanTitle = normalizeTitle(title);
  const apaNames = (authors ?? []).map(toApaName).filter(Boolean);

  // Hard guard: the title must never end up in the author position.
  const titleKey = normalizeForCompare(cleanTitle);
  const safeNames = apaNames.filter((n) => {
    const key = normalizeForCompare(n);
    return key && key !== titleKey && !titleKey.startsWith(key) && !suspiciousAuthor(n);
  });

  const hasAuthors = safeNames.length > 0;
  const hasYear = Boolean(year);
  const reliable = Boolean(hasAuthors && hasYear && cleanTitle);

  const warnings = [];
  if (!hasAuthors) warnings.push('MISSING_AUTHOR');
  if (!hasYear) warnings.push('MISSING_YEAR');
  if (!cleanTitle) warnings.push('MISSING_TITLE');
  if (!reliable) warnings.push('LOW_CONFIDENCE_METADATA');

  const yearLabel = hasYear ? String(year) : 'n.d.';
  const shortTitle = shortenTitle(cleanTitle);

  // APA 7: with no recoverable author the title moves into the author slot,
  // and the in-text form quotes a shortened title instead of naming a person.
  const authorList = formatApaAuthorList(safeNames);
  const titleSegment = cleanTitle ? `${cleanTitle.replace(/\.\s*$/, '')}.` : '';
  const tail = [
    journal ? `${journal}.` : '',
    publisher ? `${publisher}.` : '',
    doi ? (/^https?:/i.test(doi) ? doi : `https://doi.org/${doi}`) : '',
  ].filter(Boolean).join(' ');

  const reference = hasAuthors
    ? `${authorList} (${yearLabel}). ${titleSegment}${tail ? ` ${tail}` : ''}`.trim()
    : `${titleSegment} (${yearLabel}).${tail ? ` ${tail}` : ''}`.trim();

  const inTextAuthors = hasAuthors ? formatInTextAuthors(safeNames) : `"${shortTitle}"`;
  const inTextParenthetical = `(${inTextAuthors}, ${yearLabel})`;
  const inTextNarrative = `${inTextAuthors} (${yearLabel})`;

  return {
    // Legacy fields consumed by the existing n8n packet builder.
    author: hasAuthors ? safeNames[0] : null,
    authorDisplay: hasAuthors ? authorList : null,
    authors: safeNames,
    year: hasYear ? String(year) : null,
    title: cleanTitle,
    journal: journal || '',
    volume: '', issue: '', pages: '',
    doi: doi || '', url: '', publisher: publisher || '',
    sourceType: 'document',
    metadataReliable: reliable,
    warnings: [...new Set(warnings)],
    // Pre-formatted, authoritative citation strings.
    citation: {
      reference,
      inTextParenthetical,
      inTextNarrative,
      inTextAuthors,
      year: yearLabel,
      shortTitle,
      reliable,
      sourceFile: filename ?? '',
    },
  };
}

/** First few significant words of a title, for APA no-author in-text form. */
function shortenTitle(title) {
  const words = String(title ?? '').replace(/[.:].*$/, '').split(/\s+/).filter(Boolean);
  if (!words.length) return 'Untitled';
  return words.slice(0, 4).join(' ');
}

/**
 * Reconciles the in-text citations in generated prose against the metadata
 * extracted from the uploaded PDFs.
 *
 * Fixes the two failure modes seen in real drafts:
 *   - the paper title used in the author position ("(LORA: LOW-RANK ..., 2019)")
 *   - the correct author paired with a year scraped from body text
 *
 * An ambiguous match (two sources sharing a surname) is deliberately left
 * untouched: silently re-attributing a claim to the wrong paper would be worse
 * than the formatting error. Those are reported via `unverified` instead.
 */
export function reconcileInTextCitations(text, metas) {
  const fixes = [];
  const unverified = [];
  if (!text || typeof text !== 'string') return { text, fixes, unverified };

  const pool = (metas ?? []).filter((m) => m?.citation);

  // Matches "(Author, 2017)", "(Title, n.d.)", "(Author et al., 2019b)" and the
  // degenerate "(Title,)" the model emits when it has no year to substitute.
  const out = text.replace(/\(([^()]{2,160}?),\s*(?:n\.d\.|\d{4}[a-z]?)?\s*\)/gi, (full, authorPart) => {
    const key = normalizeForCompare(authorPart);
    if (!key) return full;
    const authorWords = new Set(key.split(' '));

    const matches = pool.filter((meta) => {
      const titleKey = normalizeForCompare(meta.title);
      // Title was used where the author belongs.
      if (titleKey && (key === titleKey || (key.length >= 8 && titleKey.startsWith(key)))) return true;
      // Correct author surname(s) present -> trust the source's year over the model's.
      const surnames = normalizeForCompare(
        String(meta.citation.inTextAuthors).replace(/\bet al\.?/i, ' ').replace(/&/g, ' ')
      ).split(' ').filter(Boolean);
      return surnames.length > 0 && surnames.every((s) => authorWords.has(s));
    });

    if (matches.length !== 1) {
      if (matches.length === 0) unverified.push(full);
      return full;
    }
    const corrected = matches[0].citation.inTextParenthetical;
    if (corrected !== full) {
      fixes.push({ from: full, to: corrected, source: matches[0].citation.sourceFile });
    }
    return corrected;
  });

  return { text: out, fixes, unverified };
}

/**
 * Authoritative APA reference list, alphabetised by the string APA sorts on.
 * Built entirely from extracted metadata so the saved draft's references can
 * never drift from what is actually in the uploaded files.
 */
export function buildReferenceList(metas) {
  const seen = new Set();
  const entries = [];
  for (const meta of metas ?? []) {
    const ref = meta?.citation?.reference?.trim();
    if (!ref || seen.has(ref)) continue;
    seen.add(ref);
    entries.push(ref);
  }
  return entries.sort((a, b) => a.localeCompare(b, 'en')).join('\n');
}
