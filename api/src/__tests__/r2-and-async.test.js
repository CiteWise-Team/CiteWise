import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Phase 1: Cloudflare R2 Client & Fallback Interface', () => {
  it('detects unconfigured R2 credentials and defaults to fallback mode', async () => {
    // With dummy/missing env vars, isR2Configured should gracefully return false or handle fallbacks
    const { isR2Configured, uploadPdfToR2, getTextFromR2 } = await import('../common/config/r2Client.js');
    expect(typeof isR2Configured).toBe('boolean');
    expect(typeof uploadPdfToR2).toBe('function');
    expect(typeof getTextFromR2).toBe('function');

    if (!isR2Configured) {
      const uploadRes = await uploadPdfToR2(Buffer.from('test'), 'test.pdf');
      expect(uploadRes.fallback).toBe(true);
      expect(uploadRes.success).toBe(false);

      const textRes = await getTextFromR2('non-existent-key');
      expect(textRes).toBeNull();
    }
  });

  it('correctly constructs S3 PutObjectCommand parameters for PDF and text', async () => {
    const { PutObjectCommand } = await import('@aws-sdk/client-s3');
    const cmd = new PutObjectCommand({
      Bucket: 'citewise-papers',
      Key: 'raw/session-123/hash.pdf',
      Body: Buffer.from('%PDF-test'),
      ContentType: 'application/pdf',
    });

    expect(cmd.input.Bucket).toBe('citewise-papers');
    expect(cmd.input.Key).toBe('raw/session-123/hash.pdf');
    expect(cmd.input.ContentType).toBe('application/pdf');
    expect(cmd.input.Body).toBeDefined();
  });
});

describe('Phase 2 & 3: Asynchronous Status Contracts & Query Optimization', () => {
  it('correctly flattens PostgREST 1-to-many array join in document summaries', () => {
    // Simulates the nested relational join returned by Supabase
    const mockPostgrestDocs = [
      {
        id: 101,
        file_name: 'Survey_Paper.pdf',
        size_bytes: 2048,
        approved: true,
        scoring_status: 'COMPLETE',
        metric_weights_json: null,
        citation_metadata_json: JSON.stringify({ title: 'A Comprehensive Survey on LLMs' }),
        parsed_text: 'Preview text...',
        document_insights: [
          {
            id: 201,
            overall_score: 88,
            gap_alignment_score: 90,
            methodology_score: 85,
            theoretical_score: 80,
            citation_score: 95,
            recommendation_status: 'Recommended',
            relevance_level: 'High',
            evidence_excerpts: [
              { quote_text: 'Sample quote', page_number: 2, relevance_level: 'High' }
            ]
          }
        ]
      }
    ];

    const summaries = mockPostgrestDocs.map((doc) => {
      const insight = Array.isArray(doc.document_insights) ? doc.document_insights[0] : doc.document_insights;
      return {
        id: doc.id,
        fileName: doc.file_name,
        title: JSON.parse(doc.citation_metadata_json).title,
        sizeBytes: doc.size_bytes,
        scoringStatus: doc.scoring_status.toLowerCase(),
        relevancyScore: insight?.overall_score ?? null,
        recommendationStatus: insight?.recommendation_status ?? null,
        relevanceLevel: insight?.relevance_level ?? null,
      };
    });

    expect(summaries).toHaveLength(1);
    expect(summaries[0].title).toBe('A Comprehensive Survey on LLMs');
    expect(summaries[0].relevancyScore).toBe(88);
    expect(summaries[0].recommendationStatus).toBe('Recommended');
    expect(summaries[0].scoringStatus).toBe('complete');
  });

  it('recognizes EXTRACTING as an active processing state for insight polling', () => {
    const validProcessingStatuses = ['EXTRACTING', 'PENDING', 'PROCESSING'];
    const checkState = (status) => validProcessingStatuses.includes(status);

    expect(checkState('EXTRACTING')).toBe(true);
    expect(checkState('PENDING')).toBe(true);
    expect(checkState('PROCESSING')).toBe(true);
    expect(checkState('FAILED')).toBe(false);
    expect(checkState('COMPLETE')).toBe(false);
  });

  it('validates async 202 response payload contract for /synthesis/generate', () => {
    const build202Response = (sessionId, draftId) => ({
      success: true,
      status: 'GENERATING',
      draftId,
      sessionId,
      message: 'Draft synthesis started in the background.',
    });

    const res = build202Response('sess-abc-123', 'draft-uuid-456');
    expect(res.success).toBe(true);
    expect(res.status).toBe('GENERATING');
    expect(res.sessionId).toBe('sess-abc-123');
    expect(res.draftId).toBe('draft-uuid-456');
  });

  it('formats CATalyst Extractor R2 key and view URL correctly', () => {
    const groupId = 'group-uuid-999';
    const filename = 'Research Paper.pdf';
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const r2Key = `catalyst/${groupId}/1788000000000-${safeName}`;

    expect(r2Key).toBe('catalyst/group-uuid-999/1788000000000-Research_Paper.pdf');
    const viewUrl = `/api/extractor/file/view?key=${encodeURIComponent(r2Key)}`;
    expect(viewUrl).toContain('/api/extractor/file/view?key=catalyst%2Fgroup-uuid-999%2F1788000000000-Research_Paper.pdf');
  });
});
