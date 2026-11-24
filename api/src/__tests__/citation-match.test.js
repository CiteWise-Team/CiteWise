/**
 * A source cited with curly quotes or apostrophes must not be reported as
 * "omitted" just because the extracted citation uses straight ones.
 */

import { describe, it, expect } from 'vitest';
import { isCitedIn } from '../modules/citewise/helpers/citationMetadata.js';

const titleOnly = {
  citation: {
    inTextParenthetical: `("Teachers' perception of barriers", n.d.)`,
    inTextAuthors: `"Teachers' perception of barriers"`,
    shortTitle: `Teachers' perception of barriers`,
    sourceFile: `Teachers' perception of barriers to game-base learning.pdf`,
  },
};

describe('isCitedIn', () => {
  it('matches the exact straight-quote citation', () => {
    expect(isCitedIn(titleOnly, `Barriers remain ("Teachers' perception of barriers", n.d.).`)).toBe(true);
  });

  it('matches when the draft uses curly quotes and apostrophes', () => {
    expect(isCitedIn(titleOnly, 'Barriers remain (“Teachers’ perception of barriers”, n.d.).')).toBe(true);
  });

  it('ignores case and line breaks inside the citation', () => {
    expect(isCitedIn(titleOnly, 'as noted in teachers’ perception\nof barriers (n.d.)')).toBe(true);
  });

  it('does not report an uncited source as cited', () => {
    expect(isCitedIn(titleOnly, 'Only (Greipl et al., 2020) is cited here.')).toBe(false);
    expect(isCitedIn({}, 'anything')).toBe(false);
  });

  it('still matches author-year citations', () => {
    const meta = { citation: { inTextParenthetical: '(Greipl et al., 2020)', inTextAuthors: 'Greipl et al.' } };
    expect(isCitedIn(meta, 'games help (Greipl et al., 2020).')).toBe(true);
  });
});
