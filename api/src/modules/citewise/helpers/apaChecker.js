// Deterministic APA 7th edition format checker for T8 (<= 15% APA error rate,
// zero unapproved citations). Validates both References list entries and in-text
// parenthetical citations in the generated draft.

export const APA_ERROR_RATE_TARGET_PCT = 15;

// Matches author-year parenthetical segments such as "(Smith & Jones, 2024)" or
// "(Smith et al., 2023; Doe, n.d.)".
const PARENTHETICAL_RE = /\(([^()]{3,220})\)/g;
const YEAR_TOKEN_RE = /\b(?:(?:19|20)\d{2}[a-z]?|n\.d\.)\b/i;

// Reference entry must contain "(YYYY)." or "(YYYYa)." or "(n.d.)."
const REF_YEAR_RE = /\(\s*(?:(?:19|20)\d{2}[a-z]?|n\.d\.)(?:,\s*[A-Za-z]+(?:\s+\d{1,2})?)?\s*\)\./;

// Common APA 7 author patterns before "(YYYY).":
//   - "Surname, A. B." / "Surname, A., & Surname, B." / "Surname, A. B., et al."
//   - Corporate / group author or title-in-author-position (at least 2 chars before year)
const REF_AUTHOR_INITIAL_RE = /[A-Z][A-Za-zÀ-ÖØ-öø-ÿ'’-]+,\s*[A-Z]\./;

function splitReferenceEntries(referencesText) {
  if (!referencesText || typeof referencesText !== 'string') return [];
  return referencesText
    .split(/\r?\n+/)
    .map((line) => line.replace(/^\s*(?:[-*•]|\d+\.)\s*/, '').trim())
    .filter((line) => line.length > 0 && !/^references?\s*:?$/i.test(line));
}

/**
 * Validate a single APA 7th reference list entry.
 */
export function validateReferenceEntry(entry, index = 0) {
  const issues = [];
  const text = String(entry ?? '').trim();

  if (!text) {
    return { index, entry: text, valid: false, issues: ['EMPTY_ENTRY'] };
  }

  // 1. Year in parentheses followed by period: (2024). or (n.d.).
  const yearMatch = REF_YEAR_RE.exec(text);
  if (!yearMatch) {
    issues.push('MISSING_OR_MALFORMED_YEAR');
  }

  // 2. Author / lead segment before year
  const beforeYear = yearMatch ? text.slice(0, yearMatch.index).trim() : '';
  if (!beforeYear || beforeYear.length < 2) {
    issues.push('MISSING_AUTHOR_SEGMENT');
  } else {
    // Flag "and" instead of "&" in multi-author reference list before year
    if (/\band\b/.test(beforeYear) && REF_AUTHOR_INITIAL_RE.test(beforeYear)) {
      issues.push('USE_AMPERSAND_NOT_AND_IN_AUTHORS');
    }
    // Flag raw filename leaked as author (e.g. "paper_01.pdf")
    if (/\.pdf\b/i.test(beforeYear)) {
      issues.push('RAW_FILENAME_IN_AUTHOR');
    }
  }

  // 3. Title & source after "(YYYY)."
  const afterYear = yearMatch ? text.slice(yearMatch.index + yearMatch[0].length).trim() : '';
  if (!afterYear || afterYear.length < 5) {
    issues.push('MISSING_TITLE_OR_SOURCE');
  } else {
    if (/\.pdf\b/i.test(afterYear) && !/https?:\/\//i.test(afterYear)) {
      issues.push('RAW_FILENAME_IN_TITLE_OR_SOURCE');
    }
    // Check that entry ends with terminal punctuation or a DOI/URL
    const endsCleanly = /[.?!]$/.test(text) || /https?:\/\/\S+$/i.test(text) || /doi:\S+$/i.test(text);
    if (!endsCleanly) {
      issues.push('MISSING_TERMINAL_PUNCTUATION');
    }
  }

  // 4. Placeholder / unresolved metadata tokens
  if (/\b(?:TBD|TODO|UNKNOWN AUTHOR|INSERT CITATION|PLACEHOLDER)\b/i.test(text)) {
    issues.push('PLACEHOLDER_TEXT');
  }

  return {
    index,
    entry: text,
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Validate APA 7th in-text parenthetical citations inside prose.
 */
export function validateInTextCitations(contentText) {
  const text = String(contentText ?? '');
  const results = [];
  let match;
  const re = new RegExp(PARENTHETICAL_RE.source, 'g');

  while ((match = re.exec(text)) !== null) {
    const inner = match[1].trim();
    if (!YEAR_TOKEN_RE.test(inner)) continue;

    // Split multi-source parentheticals on semicolons: "(A, 2020; B, 2021)"
    const parts = inner.split(';').map((p) => p.trim()).filter(Boolean);
    for (const part of parts) {
      if (!YEAR_TOKEN_RE.test(part)) continue;
      // Skip bare year parentheticals from narrative citations like "Smith (2024)"
      if (/^(?:(?:19|20)\d{2}[a-z]?|n\.d\.)$/i.test(part)) continue;

      const issues = [];
      // Must separate author and year with a comma: "Author, 2024"
      if (!/,\s*(?:(?:19|20)\d{2}[a-z]?|n\.d\.)/i.test(part)) {
        issues.push('MISSING_COMMA_BEFORE_YEAR');
      }
      // Inside parentheses APA 7 requires "&" instead of "and"
      if (/\band\b/.test(part.split(',')[0])) {
        issues.push('USE_AMPERSAND_IN_PARENTHETICAL');
      }
      // "et al" must have a period after "al" -> "et al."
      if (/\bet\s+al(?!\.)\b/i.test(part)) {
        issues.push('ET_AL_MISSING_PERIOD');
      }
      // Raw PDF filename leaked into in-text citation
      if (/\.pdf\b/i.test(part)) {
        issues.push('RAW_FILENAME_IN_CITATION');
      }

      results.push({
        citation: `(${part})`,
        valid: issues.length === 0,
        issues,
      });
    }
  }

  return results;
}

/**
 * Run a combined APA 7th format check over references_text and content_text.
 */
export function checkApa7Compliance(contentText, referencesText, unverifiedCitations = []) {
  const refEntries = splitReferenceEntries(referencesText).map((e, idx) => validateReferenceEntry(e, idx));
  const inTextEntries = validateInTextCitations(contentText);

  const refErrors = refEntries.filter((r) => !r.valid).length;
  const inTextErrors = inTextEntries.filter((c) => !c.valid).length;
  const unverifiedCount = Array.isArray(unverifiedCitations) ? unverifiedCitations.length : 0;

  const totalChecked = refEntries.length + inTextEntries.length;
  const formatErrorCount = refErrors + inTextErrors;
  const errorRatePct =
    totalChecked > 0 ? Number(((formatErrorCount / totalChecked) * 100).toFixed(2)) : 0;

  // Check alphabetical ordering of reference list (diagnostic)
  let outOfOrderCount = 0;
  for (let i = 1; i < refEntries.length; i++) {
    const prev = refEntries[i - 1].entry.toLowerCase();
    const curr = refEntries[i].entry.toLowerCase();
    if (curr.localeCompare(prev) < 0) outOfOrderCount++;
  }

  return {
    totalChecked,
    referenceCount: refEntries.length,
    referenceErrorCount: refErrors,
    inTextCitationCount: inTextEntries.length,
    inTextErrorCount: inTextErrors,
    formatErrorCount,
    errorRatePct,
    unverifiedCitationCount: unverifiedCount,
    referencesOutOfOrderCount: outOfOrderCount,
    meetsTarget15Pct: totalChecked > 0 ? errorRatePct <= APA_ERROR_RATE_TARGET_PCT : null,
    meetsZeroUnverified: unverifiedCount === 0,
    referenceChecks: refEntries,
    inTextChecks: inTextEntries,
  };
}
