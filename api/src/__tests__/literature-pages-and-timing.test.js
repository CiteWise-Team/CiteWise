import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ensurePageCount, updateDocumentFields, recordAssessmentTiming } from '../modules/citewise/helpers/documentPages.js';
import { summarizeTimings } from '../modules/citewise/helpers/assessmentTiming.js';
import supabase from '../common/config/supabaseClient.js';

describe('Literature Page Count Recording', () => {
  it('returns existing page_count without extra DB calls if already set', async () => {
    const doc = { id: 101, page_count: 14 };
    const count = await ensurePageCount(doc);
    expect(count).toBe(14);
    expect(doc.page_count).toBe(14);
  });

  it('recovers page_count from page_offsets_json if page_count is null', async () => {
    const updateSpy = vi.spyOn(supabase, 'from').mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    });

    const doc = {
      id: 102,
      page_count: null,
      page_offsets_json: [2, 1500, 3100, 4800], // 4 pages
    };

    const count = await ensurePageCount(doc);
    expect(count).toBe(4);
    expect(doc.page_count).toBe(4);

    updateSpy.mockRestore();
  });
});

describe('AI Assessment Duration in Seconds & DB Fallback', () => {
  it('summarizeTimings calculates avgAssessmentSeconds alongside ms', () => {
    const rows = [
      { page_count: 5, assessment_ms: 4500, total_ms: 5000, extraction_ms: 500, status: 'COMPLETE', extraction_method: 'local' },
      { page_count: 5, assessment_ms: 5500, total_ms: 6000, extraction_ms: 500, status: 'COMPLETE', extraction_method: 'local' },
    ];
    const summary = summarizeTimings(rows);
    const bucket = summary.overall.buckets[0];
    expect(bucket.avgAssessmentMs).toBe(5000);
    expect(bucket.avgAssessmentSeconds).toBe(5.0);
  });

  it('updateDocumentFields strips unknown column and retries when migration is pending', async () => {
    let callCount = 0;
    const updateSpy = vi.spyOn(supabase, 'from').mockReturnValue({
      update: vi.fn((fields) => ({
        eq: vi.fn(async () => {
          callCount++;
          if (fields.assessment_duration_seconds !== undefined) {
            return {
              error: {
                message: "Could not find the 'assessment_duration_seconds' column of 'uploaded_documents' in the schema cache",
              },
            };
          }
          return { error: null };
        }),
      })),
    });

    await updateDocumentFields(103, {
      scoring_duration_ms: 4200,
      assessment_duration_seconds: 4.2,
      page_count: 8,
    });

    expect(callCount).toBe(2);
    updateSpy.mockRestore();
  });

  it('recordAssessmentTiming retries without unmigrated columns', async () => {
    let callCount = 0;
    const insertSpy = vi.spyOn(supabase, 'from').mockReturnValue({
      insert: vi.fn(async (row) => {
        callCount++;
        if (row.assessment_duration_seconds !== undefined) {
          return {
            error: {
              message: "Could not find the 'assessment_duration_seconds' column of 'assessment_timings' in the schema cache",
            },
          };
        }
        return { error: null };
      }),
    });

    await recordAssessmentTiming({
      document_id: 104,
      assessment_ms: 3600,
      assessment_duration_seconds: 3.6,
      page_count: 12,
    });

    expect(callCount).toBe(2);
    insertSpy.mockRestore();
  });
});
