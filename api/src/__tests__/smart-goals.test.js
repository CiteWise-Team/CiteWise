import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

describe('SMART goals generation', () => {
  let app;
  let state;
  const previousApiKey = process.env.GEMINI_API_KEY;
  const previousModel = process.env.GEMINI_MODEL;
  const previousNodeEnv = process.env.NODE_ENV;

  beforeEach(async () => {
    vi.resetModules();
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    const goal = (number) => ({
      objective: `Objective ${number}`,
      specific: `Examine retrieval relevance ${number}.`,
      measurable: 'Report observed findings without a fabricated target.',
      achievable: 'Use the supplied research scope.',
      relevant: 'Addresses the selected gap.',
      timeBound: 'Researcher to determine timeline.',
      sourceRefs: ['paper-1', 'unapproved-paper'],
      assumptions: [],
      needsUserInput: ['timeline'],
    });
    state = {
      generated: {
        overallAim: 'Address the selected gap.',
        goals: [goal(1), goal(2), goal(3)],
      },
      prompt: null,
      request: null,
      requests: [],
      statuses: [],
      errorMessage: 'This model is temporarily overloaded.',
      errorCode: null,
      fetchError: null,
      rawResponse: null,
      filters: [],
      documents: Array.from({ length: 6 }, (_, index) => ({
        id: `paper-${index + 1}`,
        document_insights: [{
          gap_alignment_score: 85 - index,
          relevance_level: 'High',
          generated_at: '2026-09-29T00:00:00.000Z',
          evidence_excerpts: [{
            quote_text: `Prior retrieval relevance research identifies a limitation in ranking relevant evidence ${index + 1}.`,
            page_number: index + 2,
            criterion: 'Research gap relevance',
            relevance_level: 'High',
            display_order: 0,
          }],
        }],
      })),
      briefs: new Map(),
      upserts: [],
      savedGenerations: new Map(),
      savedGenerationUpserts: [],
      userId: 'user-1',
    };

    vi.doMock('node-fetch', () => ({
      default: async (url, options) => {
        if (state.fetchError) throw state.fetchError;
        state.request = { url, options };
        state.requests.push(state.request);
        const body = JSON.parse(options.body);
        state.prompt = JSON.parse(body.contents[0].parts[0].text);
        const status = state.statuses.shift() ?? 200;
        return {
          ok: status >= 200 && status < 300,
          status,
          text: async () => state.rawResponse ?? (status >= 400
            ? JSON.stringify({ error: { code: state.errorCode, message: state.errorMessage } })
            : JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(state.generated) }] } }] })),
        };
      },
    }));
    vi.doMock('../common/config/supabaseClient.js', () => ({
      default: {
        from(table) {
          const query = {
            queryFilters: [],
            select: () => query,
            eq(field, value) {
              state.filters.push({ table, field, value });
              query.queryFilters.push({ field, value });
              return query;
            },
            maybeSingle: async () => {
              const sessionId = query.queryFilters.find((filter) => filter.field === 'session_id')?.value;
              if (table === 'research_baselines') {
                return { data: { project_title: 'Baseline title', rationale: 'Must not enter the SMART prompt.', research_gaps: ['Another unselected gap'] }, error: null };
              }
              if (table === 'smart_goal_generations') {
                return { data: state.savedGenerations.get(sessionId) ?? null, error: null };
              }
              return { data: state.briefs.get(sessionId) ?? null, error: null };
            },
            upsert: async (row) => {
              if (table === 'smart_goal_generations') {
                state.savedGenerations.set(row.session_id, row);
                state.savedGenerationUpserts.push(row);
              } else {
                state.briefs.set(row.session_id, row);
                state.upserts.push(row);
              }
              return { error: null };
            },
            then(resolve, reject) {
              return Promise.resolve(table === 'uploaded_documents'
                ? { data: state.documents, error: null }
                : { data: null, error: null }).then(resolve, reject);
            },
          };
          return query;
        },
      },
    }));
    vi.doMock('../common/middlewares/auth.middleware.js', () => ({
      default: (req, _res, next) => { req.user = { id: state.userId }; next(); },
    }));

    const { default: smartGoalsRoutes } = await import('../modules/citewise/smartGoals.routes.js');
    app = express();
    app.use(express.json());
    app.use('/api/v1/smart-goals', smartGoalsRoutes);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.doUnmock('node-fetch');
    vi.doUnmock('../common/config/supabaseClient.js');
    vi.doUnmock('../common/middlewares/auth.middleware.js');
    if (previousApiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previousApiKey;
    if (previousModel === undefined) delete process.env.GEMINI_MODEL;
    else process.env.GEMINI_MODEL = previousModel;
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
  });

  it('requires the research title and selected gap before calling Gemini', async () => {
    const response = await request(app).post('/api/v1/smart-goals/generate').send({
      groupId: 'group-1',
    });

    expect(response.status).toBe(400);
    expect(state.prompt).toBeNull();
  });

  it('requires a research title', async () => {
    const response = await request(app).post('/api/v1/smart-goals/generate').send({
      groupId: 'group-1',
      selectedGap: 'Selected gap',
    });

    expect(response.status).toBe(400);
    expect(state.prompt).toBeNull();
  });

  it('requires a selected research gap', async () => {
    const response = await request(app).post('/api/v1/smart-goals/generate').send({
      groupId: 'group-1',
      researchTitle: 'Retrieval quality research',
    });

    expect(response.status).toBe(400);
    expect(state.prompt).toBeNull();
  });

  it('requires assessed approved RRL evidence', async () => {
    state.documents = [];
    const response = await request(app).post('/api/v1/smart-goals/generate').send({
      groupId: 'group-1',
      researchTitle: 'Retrieval quality research',
      selectedGap: 'Selected gap',
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/approve and assess at least one RRL paper/i);
    expect(state.request).toBeNull();
  });

  it('sends only title, selected gap, and compact relevant RRL evidence', async () => {
    const response = await request(app).post('/api/v1/smart-goals/generate').send({
      groupId: 'group-1',
      researchTitle: 'Retrieval quality research',
      selectedGap: 'Limited retrieval relevance in evidence ranking',
      rationale: 'SECRET rationale that must not reach Gemini',
      methodologyMode: 'specified',
      selectedMethodology: 'SECRET methodology',
      methodologyNotes: 'SECRET methodology notes',
      introductionVersion: {
        id: 'draft-v2',
        label: 'Edited v2',
        content: 'SECRET full introduction',
        references: ['SECRET introduction reference'],
      },
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.researchTitle).toBe('Retrieval quality research');
    expect(response.body.goals).toHaveLength(3);
    expect(response.body.goals[0].sourceRefs).toEqual(['paper-1']);
    expect(response.body.approvedSourceCount).toBe(5);
    expect(response.body).toMatchObject({
      rationale: '',
      methodologyMode: '',
      selectedMethodology: '',
      methodologyNotes: '',
      introductionVersion: null,
      methodology: { approach: '', needsResearcherApproval: false },
    });
    expect(state.request.url).toContain('/models/gemini-3.6-flash:generateContent');
    expect(state.request.options.headers['x-goog-api-key']).toBe('test-gemini-key');
    expect(JSON.parse(state.request.options.body).generationConfig.responseMimeType).toBe('application/json');
    expect(state.filters).toContainEqual(expect.objectContaining({ table: 'uploaded_documents', field: 'approved', value: true }));
    expect(state.prompt.researchBrief).toMatchObject({
      version: 2,
      researchTitle: 'Retrieval quality research',
      selectedGap: 'Limited retrieval relevance in evidence ranking',
    });
    expect(state.prompt.researchBrief.evidence).toHaveLength(5);
    expect(new Set(state.prompt.researchBrief.evidence.map((item) => item.sourceId)).size).toBe(5);
    expect(state.prompt.researchBrief.evidence[0]).toMatchObject({ sourceId: 'paper-1', page: 2 });
    expect(state.prompt.rules.join(' ')).toMatch(/do not invent.*methodology/i);
    const serializedPrompt = JSON.stringify(state.prompt);
    for (const forbidden of ['SECRET rationale', 'SECRET methodology', 'SECRET full introduction', 'Another unselected gap']) {
      expect(serializedPrompt).not.toContain(forbidden);
    }
    expect(state.prompt).not.toHaveProperty('availableGaps');
  });

  it('does not require or include rationale or methodology', async () => {
    const response = await request(app).post('/api/v1/smart-goals/generate').send({
      groupId: 'group-1',
      researchTitle: 'Retrieval quality research',
      selectedGap: 'Limited retrieval relevance',
    });

    expect(response.status).toBe(200);
    expect(state.prompt.researchBrief).toMatchObject({
      researchTitle: 'Retrieval quality research',
      selectedGap: 'Limited retrieval relevance',
    });
    expect(state.prompt.researchBrief).not.toHaveProperty('rationale');
    expect(state.prompt.researchBrief).not.toHaveProperty('methodology');
  });

  it('ranks RRL evidence for the selected gap instead of taking database order', async () => {
    state.documents[0].document_insights[0].gap_alignment_score = 0;
    state.documents[0].document_insights[0].relevance_level = 'Low';
    state.documents[0].document_insights[0].evidence_excerpts[0].quote_text = 'An unrelated paper discussing a different field and topic.';
    state.documents[5].document_insights[0].gap_alignment_score = 99;
    state.documents[5].document_insights[0].evidence_excerpts[0].quote_text = 'Limited retrieval relevance affects evidence ranking in research.';

    const response = await request(app).post('/api/v1/smart-goals/generate').send({
      groupId: 'group-1',
      researchTitle: 'Retrieval quality research',
      selectedGap: 'Limited retrieval relevance in evidence ranking',
    });

    expect(response.status).toBe(200);
    expect(state.prompt.researchBrief.evidence[0]).toMatchObject({ sourceId: 'paper-6', page: 7 });
    expect(state.prompt.researchBrief.evidence.some((item) => item.sourceId === 'paper-1')).toBe(false);
  });

  it('reuses the session brief for unchanged title, gap, and RRL', async () => {
    const body = { groupId: 'group-1', researchTitle: 'Retrieval quality research', selectedGap: 'Limited retrieval relevance' };
    const first = await request(app).post('/api/v1/smart-goals/generate').send(body);
    const second = await request(app).post('/api/v1/smart-goals/generate').send(body);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(state.upserts).toHaveLength(1);
    expect(state.requests).toHaveLength(2);
    expect(state.requests[0].options.body).toBe(state.requests[1].options.body);
  });

  it('invalidates the brief when title, gap, or selected RRL evidence changes', async () => {
    const body = { groupId: 'group-1', researchTitle: 'Retrieval quality research', selectedGap: 'Limited retrieval relevance' };
    await request(app).post('/api/v1/smart-goals/generate').send(body);
    await request(app).post('/api/v1/smart-goals/generate').send({ ...body, researchTitle: 'Evidence ranking research' });
    await request(app).post('/api/v1/smart-goals/generate').send({ ...body, selectedGap: 'A different retrieval gap' });
    state.documents[0].document_insights[0].evidence_excerpts[0].quote_text = 'Changed evidence about limited retrieval relevance.';
    await request(app).post('/api/v1/smart-goals/generate').send(body);

    expect(state.upserts).toHaveLength(4);
  });

  it('isolates cached briefs by user and group session', async () => {
    const body = { groupId: 'group-1', researchTitle: 'Retrieval quality research', selectedGap: 'Limited retrieval relevance' };
    const first = await request(app).post('/api/v1/smart-goals/generate').send(body);
    state.userId = 'user-2';
    const second = await request(app).post('/api/v1/smart-goals/generate').send(body);
    state.userId = 'user-1';
    const third = await request(app).post('/api/v1/smart-goals/generate').send({ ...body, groupId: 'group-2' });

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(third.status).toBe(200);
    expect(state.briefs.size).toBe(3);
    expect(state.upserts).toHaveLength(3);
  });

  it('saves and reloads a SMART generation within its authenticated group session', async () => {
    const generation = {
      researchTitle: 'Retrieval quality research',
      projectTitle: 'Retrieval quality research',
      selectedGap: 'Limited retrieval relevance',
      overallAim: 'Study retrieval quality.',
      approvedSourceCount: 2,
      rationale: 'Must not be persisted.',
      methodologyMode: 'specified',
      goals: [state.generated.goals[0]],
    };

    const saveResponse = await request(app).post('/api/v1/smart-goals/save').send({ groupId: 'group-1', generation });
    const loadResponse = await request(app).get('/api/v1/smart-goals/saved/group-1');

    expect(saveResponse.status).toBe(200);
    expect(loadResponse.status).toBe(200);
    expect(state.savedGenerationUpserts).toHaveLength(1);
    expect(saveResponse.body.generation).toMatchObject({
      researchTitle: 'Retrieval quality research',
      selectedGap: 'Limited retrieval relevance',
      rationale: '',
      methodologyMode: '',
      goals: [{ objective: 'Objective 1', sourceRefs: ['paper-1', 'unapproved-paper'] }],
    });
    expect(loadResponse.body.generation).toEqual(saveResponse.body.generation);
    expect(state.savedGenerationUpserts[0].session_id).toBeTruthy();
  });

  it('does not return a saved SMART generation to another user or group', async () => {
    await request(app).post('/api/v1/smart-goals/save').send({
      groupId: 'group-1',
      generation: {
        researchTitle: 'Retrieval quality research',
        selectedGap: 'Limited retrieval relevance',
        goals: [state.generated.goals[0]],
      },
    });

    state.userId = 'user-2';
    const otherUser = await request(app).get('/api/v1/smart-goals/saved/group-1');
    state.userId = 'user-1';
    const otherGroup = await request(app).get('/api/v1/smart-goals/saved/group-2');

    expect(otherUser.status).toBe(200);
    expect(otherUser.body.generation).toBeNull();
    expect(otherGroup.status).toBe(200);
    expect(otherGroup.body.generation).toBeNull();
  });

  it('rejects an invalid SMART generation save', async () => {
    const response = await request(app).post('/api/v1/smart-goals/save').send({
      groupId: 'group-1',
      generation: { goals: [] },
    });

    expect(response.status).toBe(400);
    expect(state.savedGenerationUpserts).toHaveLength(0);
  });

  it('uses only the selected model when Gemini is overloaded', async () => {
    process.env.GEMINI_MODEL = 'gemini-3.6-flash';
    state.errorMessage = 'Gemini model is temporarily overloaded. Key: test-gemini-key';
    state.statuses = [503];
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const response = await request(app).post('/api/v1/smart-goals/generate').send({
      groupId: 'group-1',
      researchTitle: 'Retrieval quality research',
      selectedGap: 'Selected gap',
    });

    expect(response.status).toBe(502);
    expect(response.body.message).toContain('temporarily overloaded');
    expect(response.body.message).not.toMatch(/gemini/i);
    expect(state.requests).toHaveLength(1);
    expect(state.request.url).toContain('/models/gemini-3.6-flash:generateContent');

    const [logLabel, logText] = errorSpy.mock.calls[0];
    const diagnostic = JSON.parse(logText);
    expect(logLabel).toBe('[smart-goals][gemini-diagnostic]');
    expect(diagnostic).toMatchObject({
      httpStatus: 503,
      providerCode: 'N/A',
      model: 'gemini-3.6-flash',
      classification: ['model unavailable'],
    });
    expect(diagnostic.providerMessage).toContain('temporarily overloaded');
    expect(JSON.stringify(diagnostic)).not.toContain('test-gemini-key');
  });

  it('classifies common provider HTTP errors', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const cases = [
      { status: 429, code: 429, message: 'Quota exceeded for test-gemini-key', expected: ['quota exceeded', '429 / rate limit'] },
      { status: 401, code: 401, message: 'API key not valid: test-gemini-key', expected: ['invalid API key'] },
      { status: 404, code: 404, message: 'Requested model was not found', expected: ['model unavailable'] },
      { status: 400, code: 'INVALID_ARGUMENT', message: 'Malformed request body', expected: ['malformed request'] },
      { status: 400, code: 'INVALID_ARGUMENT', message: 'Input token limit exceeded', expected: ['token/context limit'] },
      { status: 413, code: 413, message: 'Request body too large', expected: ['token/context limit'] },
    ];

    for (const testCase of cases) {
      state.statuses = [testCase.status];
      state.errorCode = testCase.code;
      state.errorMessage = testCase.message;
      const response = await request(app).post('/api/v1/smart-goals/generate').send({
        groupId: 'group-1',
        researchTitle: 'Retrieval quality research',
        selectedGap: 'Selected gap',
      });

      expect(response.status).toBe(502);
      const diagnostic = JSON.parse(errorSpy.mock.calls.at(-1)[1]);
      expect(diagnostic.httpStatus).toBe(testCase.status);
      expect(diagnostic.providerCode).toBe(String(testCase.code));
      for (const classification of testCase.expected) {
        expect(diagnostic.classification).toContain(classification);
      }
      expect(JSON.stringify(diagnostic)).not.toContain('test-gemini-key');
    }
  });

  it('classifies provider timeouts and JSON parsing failures', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    state.fetchError = Object.assign(new Error('request timed out'), { type: 'request-timeout' });
    let response = await request(app).post('/api/v1/smart-goals/generate').send({
      groupId: 'group-1',
      researchTitle: 'Retrieval quality research',
      selectedGap: 'Selected gap',
    });

    expect(response.status).toBe(502);
    let diagnostic = JSON.parse(errorSpy.mock.calls.at(-1)[1]);
    expect(diagnostic.classification).toContain('timeout');
    expect(diagnostic.phase).toBe('calling Gemini');

    state.fetchError = null;
    state.rawResponse = 'not-json';
    response = await request(app).post('/api/v1/smart-goals/generate').send({
      groupId: 'group-1',
      researchTitle: 'Retrieval quality research',
      selectedGap: 'Selected gap',
    });

    expect(response.status).toBe(502);
    diagnostic = JSON.parse(errorSpy.mock.calls.at(-1)[1]);
    expect(diagnostic.httpStatus).toBe(200);
    expect(diagnostic.classification).toContain('JSON/schema parsing failure');
  });

  it('returns a generic provider error to production clients while retaining diagnostics in logs', async () => {
    process.env.NODE_ENV = 'production';
    state.statuses = [429];
    state.errorCode = 429;
    state.errorMessage = 'Quota exceeded for test-gemini-key';
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const response = await request(app).post('/api/v1/smart-goals/generate').send({
      groupId: 'group-1',
      researchTitle: 'Retrieval quality research',
      selectedGap: 'Selected gap',
    });

    expect(response.status).toBe(502);
    expect(response.body.message).toBe('Could not generate SMART goals right now. Please try again.');
    const diagnostic = JSON.parse(errorSpy.mock.calls[0][1]);
    expect(diagnostic.classification).toContain('quota exceeded');
    expect(JSON.stringify(diagnostic)).not.toContain('test-gemini-key');
  });
});