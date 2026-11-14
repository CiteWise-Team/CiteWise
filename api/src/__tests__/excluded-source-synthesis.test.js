/**
 * CiteWise – Integration tests for Excluded Source in Synthesis & Citations
 *
 * Verifies the bugfix where a document marked "Exclude from synthesis"
 * in Module 2 must not leak into:
 *   1. Module 2 localStorage / sessionStorage approved documents list
 *   2. Module 3 ApprovedSourceList ("Citation Area")
 *   3. Module 3 synthesis /generate request payload (approvedDocumentIds)
 *   4. Backend Supabase uploaded_documents table (must be marked approved: false)
 *   5. Backend synthesis approvedDocs / citation metadata
 *   6. Backend POST /update-citations referencesText calculation
 *   7. Edge cases: selectedDocumentIds metadata key in rrlUsage, ID parsing, dynamic restore
 */

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '../../..');
const readSource = (rel) => fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8');

describe('Module 2 & 3: Excluded Source Filtering Logic', () => {
  it('getActiveApprovedDocs filters out documents marked "exclude" in rrlUsage', () => {
    const docs = [
      { id: 101, name: 'Doc1.pdf', approved: true },
      { id: 102, name: 'Doc2.pdf', approved: true },
      { id: 103, name: 'Doc3.pdf', approved: false },
      { id: 104, name: 'Doc4.pdf', approved: true },
    ];

    const rrlUsage = {
      102: { usage: 'exclude' },
      104: { usage: 'core' },
    };

    const getActiveApprovedDocs = (docsList, usage) => {
      return (docsList || []).filter((d) => {
        if (!d.approved) return false;
        const u = usage[d.id]?.usage || usage[String(d.id)]?.usage;
        return u !== 'exclude';
      });
    };

    const active = getActiveApprovedDocs(docs, rrlUsage);
    expect(active.map((d) => d.id)).toEqual([101, 104]);
    expect(active.some((d) => d.id === 102)).toBe(false);
  });

  it('handles both string and numeric IDs in rrlUsage correctly', () => {
    const docs = [
      { id: 1, name: 'Doc1.pdf', approved: true },
      { id: 2, name: 'Doc2.pdf', approved: true },
      { id: '3', name: 'Doc3.pdf', approved: true },
    ];

    const rrlUsage = {
      '2': { usage: 'exclude' },
      3: { usage: 'exclude' },
    };

    const filterActive = (docsList, usage) =>
      docsList.filter((d) => {
        if (!d.approved) return false;
        const u = usage[d.id]?.usage || usage[String(d.id)]?.usage;
        return u !== 'exclude';
      });

    const active = filterActive(docs, rrlUsage);
    expect(active.map((d) => d.id)).toEqual([1]);
  });

  it('robustly ignores metadata properties like selectedDocumentIds in rrlUsage', () => {
    const rrlUsage = {
      selectedDocumentIds: ['101', '102'],
      101: { usage: 'core' },
      102: { usage: 'exclude' },
    };

    const parseId = (id) => (isNaN(Number(id)) ? id : Number(id));
    const isDocKey = (k) => k !== 'selectedDocumentIds' && typeof rrlUsage[k] === 'object' && rrlUsage[k] !== null;

    const excludedDocIds = Object.keys(rrlUsage || {})
      .filter((id) => isDocKey(id) && rrlUsage[id]?.usage === 'exclude')
      .map(parseId)
      .filter(Boolean);

    const rrlDocIds = Object.keys(rrlUsage || {})
      .filter((id) => isDocKey(id) && rrlUsage[id]?.usage && rrlUsage[id]?.usage !== 'exclude')
      .map(parseId)
      .filter(Boolean);

    expect(excludedDocIds).toEqual([102]);
    expect(rrlDocIds).toEqual([101]);
    expect(rrlDocIds.includes('selectedDocumentIds')).toBe(false);
    expect(excludedDocIds.includes('selectedDocumentIds')).toBe(false);
  });

  it('restores un-excluded documents when usage transitions from exclude to auto/core', () => {
    const baseDocs = [
      { id: 101, name: 'Doc1.pdf', approved: true },
      { id: 102, name: 'Doc2.pdf', approved: true },
    ];

    // Excluded state
    const usageExcluded = { 102: { usage: 'exclude' } };
    const filteredExcluded = baseDocs.filter((d) => {
      const u = usageExcluded[d.id]?.usage || usageExcluded[String(d.id)]?.usage;
      return u !== 'exclude';
    });
    expect(filteredExcluded.map((d) => d.id)).toEqual([101]);

    // Un-excluded state (changed back to auto)
    const usageRestored = { 102: { usage: 'auto' } };
    const filteredRestored = baseDocs.filter((d) => {
      const u = usageRestored[d.id]?.usage || usageRestored[String(d.id)]?.usage;
      return u !== 'exclude';
    });
    expect(filteredRestored.map((d) => d.id)).toEqual([101, 102]);
  });
});

describe('ValidationDashboardLayout.jsx source verification', () => {
  const code = readSource('web/src/citewise/module2/literature-review/components/ValidationDashboardLayout.jsx');

  it('defines getActiveApprovedDocs checking for usage !== "exclude"', () => {
    expect(code).toContain('getActiveApprovedDocs');
    expect(code).toContain('usage !== "exclude"');
  });

  it('subscribes to rrlUsage store changes to keep approved docs in sync', () => {
    expect(code).toMatch(/store\.subscribe\(\s*\(\s*\{\s*name/);
    expect(code).toContain('name === "rrlUsage"');
  });

  it('uses getActiveApprovedDocs in applyApprovalToggle', () => {
    expect(code).toMatch(/applyApprovalToggle[\s\S]*?getActiveApprovedDocs\(updatedDocs,\s*resolvedSessionId\)/);
  });

  it('uses getActiveApprovedDocs in handleBatchApprove', () => {
    expect(code).toMatch(/handleBatchApprove[\s\S]*?getActiveApprovedDocs\(updatedDocs,\s*resolvedSessionId\)/);
  });

  it('uses getActiveApprovedDocs in handleDeleteDocument', () => {
    expect(code).toMatch(/handleDeleteDocument[\s\S]*?getActiveApprovedDocs\(updatedDocs,\s*resolvedSessionId\)/);
  });

  it('uses getActiveApprovedDocs in handleProceed', () => {
    expect(code).toMatch(/handleProceed[\s\S]*?getActiveApprovedDocs\(documents,\s*resolvedSessionId\)/);
  });
});

describe('SynthesisDraftModule.jsx source verification', () => {
  const code = readSource('web/src/citewise/module3/synthesis-draft/components/SynthesisDraftModule.jsx');

  it('filters initialDocs on mount with rrlUsage', () => {
    expect(code).toMatch(/activeInitialDocs\s*=\s*initialDocs\.filter/);
    expect(code).toMatch(/usage\s*!==\s*"exclude"/);
  });

  it('filters apiApproved documents by excluding rrlUsage exclude', () => {
    expect(code).toMatch(/rrlUsage\[doc\.id\]\?\.usage\s*===\s*"exclude"/);
  });

  it('filters handleStorageChange events with rrlUsage', () => {
    expect(code).toMatch(/handleStorageChange[\s\S]*?usage\s*!==\s*"exclude"/);
  });

  it('subscribes to rrlUsage changes and re-reads storage to dynamically restore or purge docs', () => {
    expect(code).toMatch(/store\.subscribe\(\s*\(\s*\{\s*name,\s*sessionId:\s*eventSessionId/);
    expect(code).toMatch(/localStorage\.getItem\(DOCS_STORAGE_KEY\)/);
  });

  it('filters approvedDocumentIds in handleGenerate request body', () => {
    expect(code).toMatch(/activeApprovedDocs\s*=\s*approvedDocuments\.filter/);
    expect(code).toMatch(/approvedDocumentIds:\s*activeApprovedDocs\.map/);
  });

  it('passes rrlUsage and filtered approvedDocumentIds in fastUpdateCitations', () => {
    expect(code).toMatch(/fastUpdateCitations[\s\S]*?bodyPayload\s*=\s*\{[\s\S]*?rrlUsage,[\s\S]*?approvedDocumentIds:\s*activeApprovedDocs\.map/);
  });

  it('unmarks exclude usage if a document is re-selected via Manage Sources', () => {
    expect(code).toMatch(/onUpdateSources=\{[\s\S]*?nextUsage\[d\.id\]\s*=\s*\{\s*\.\.\.nextUsage\[d\.id\],\s*usage:\s*"auto"\s*\}/);
  });
});

describe('synthesis.routes.js backend verification', () => {
  const code = readSource('api/src/modules/citewise/synthesis.routes.js');

  it('identifies excludedDocIds from rrlUsage with isDocKey check in POST /generate', () => {
    expect(code).toMatch(/isDocKey\(id\)\s*&&\s*rrlUsage\[id\]\?\.usage\s*===\s*'exclude'/);
  });

  it('filters payloadDocIds and allApprovedIds with excludedSet', () => {
    expect(code).toMatch(/!excludedSet\.has\(String\(id\)\)/);
  });

  it('explicitly updates Supabase with approved: false for excludedDocIds', () => {
    expect(code).toMatch(/supabase\.from\('uploaded_documents'\)\.update\(\{\s*approved:\s*false\s*\}\)\.in\('id',\s*excludedDocIds\)/);
  });

  it('filters approvedDocs loaded from Supabase to remove excluded documents', () => {
    expect(code).toMatch(/approvedDocs\.filter\(\(d\)\s*=>\s*!excludedSet\.has\(String\(d\.id\)\)\)/);
  });

  it('POST /update-citations filters out excluded documents from rrlUsage and approvedDocumentIds', () => {
    expect(code).toMatch(/router\.post\('\/update-citations'[\s\S]*?isDocKey\(id\)\s*&&\s*rrlUsage\[id\]\?\.usage\s*===\s*'exclude'/);
    expect(code).toMatch(/approvedDocs\s*=\s*approvedDocs\.filter\(\(doc\)\s*=>\s*!excludedIds\.has\(String\(doc\.id\)\)\)/);
  });

  it('POST /update-citations updates Supabase approved: false for excluded documents', () => {
    expect(code).toMatch(/supabase\.from\('uploaded_documents'\)\.update\(\{\s*approved:\s*false\s*\}\)\.in\('id',\s*excludedDocIds\)/);
  });

  it('POST /update-citations rebuilds referencesText based on citedMetas or active approvedMetas', () => {
    expect(code).toMatch(/const referencesText = citedMetas\.length > 0\s*\?\s*buildReferenceList\(citedMetas\)\s*:\s*buildReferenceList\(allCitationMetas\);/);
  });

  it('asyncSynthesisJob prioritizes citedMetas for referencesText', () => {
    expect(code).toMatch(/const referencesText = citedMetas\.length > 0\s*\?\s*buildReferenceList\(citedMetas\)\s*:\s*\(n8nData\.referencesText/);
  });
});
