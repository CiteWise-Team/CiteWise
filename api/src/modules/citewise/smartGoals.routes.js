import express from 'express';
import fetch from 'node-fetch';
import supabase from '../../common/config/supabaseClient.js';
import requireAuth from '../../common/middlewares/auth.middleware.js';
import { deriveSessionId } from './helpers/sessionId.js';
import { getOrStoreSmartGoalsBrief } from './smartGoalsBrief.service.js';

const router = express.Router();
router.use(requireAuth);

const responseSchema = {
  type: 'OBJECT',
  properties: {
    overallAim: { type: 'STRING' },
    goals: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          objective: { type: 'STRING' },
          specific: { type: 'STRING' },
          measurable: { type: 'STRING' },
          achievable: { type: 'STRING' },
          relevant: { type: 'STRING' },
          timeBound: { type: 'STRING' },
          sourceRefs: { type: 'ARRAY', items: { type: 'STRING' } },
          assumptions: { type: 'ARRAY', items: { type: 'STRING' } },
          needsUserInput: { type: 'ARRAY', items: { type: 'STRING' } },
        },
        required: ['objective', 'specific', 'measurable', 'achievable', 'relevant', 'timeBound', 'sourceRefs', 'assumptions', 'needsUserInput'],
      },
      minItems: 3,
      maxItems: 4,
    },
  },
  required: ['overallAim', 'goals'],
};

function cleanText(value, maxLength = 1200) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function normalizeSavedGeneration(value) {
  if (!value || typeof value !== 'object' || !Array.isArray(value.goals) || value.goals.length < 1 || value.goals.length > 100) {
    return null;
  }

  const textList = (items) => Array.isArray(items)
    ? items.filter((item) => typeof item === 'string').map((item) => cleanText(item, 500)).filter(Boolean).slice(0, 20)
    : [];
  const researchTitle = cleanText(value.researchTitle || value.projectTitle, 300);

  if (!researchTitle) return null;

  return {
    success: true,
    projectTitle: researchTitle,
    researchTitle,
    selectedGap: cleanText(value.selectedGap, 1500),
    rationale: '',
    constraints: '',
    methodologyMode: '',
    selectedMethodology: '',
    methodologyNotes: '',
    introductionVersion: null,
    approvedSourceCount: Number.isFinite(Number(value.approvedSourceCount)) ? Math.max(0, Number(value.approvedSourceCount)) : 0,
    overallAim: cleanText(value.overallAim, 3000),
    methodology: {
      approach: '',
      rationale: '',
      dataRequirements: '',
      limitations: [],
      needsResearcherApproval: false,
    },
    goals: value.goals.map((goal) => ({
      objective: cleanText(goal?.objective, 3000),
      specific: cleanText(goal?.specific, 3000),
      measurable: cleanText(goal?.measurable, 3000),
      achievable: cleanText(goal?.achievable, 3000),
      relevant: cleanText(goal?.relevant, 3000),
      timeBound: cleanText(goal?.timeBound, 3000),
      sourceRefs: textList(goal?.sourceRefs),
      assumptions: textList(goal?.assumptions),
      needsUserInput: textList(goal?.needsUserInput),
    })),
  };
}

router.get('/saved/:groupId', async (req, res) => {
  const groupId = cleanText(req.params.groupId, 128);
  const sessionId = deriveSessionId(req.user?.id, groupId);
  if (!sessionId) return res.status(401).json({ message: 'A signed-in user is required.' });

  const { data, error } = await supabase
    .from('smart_goal_generations')
    .select('generation_json')
    .eq('session_id', sessionId)
    .maybeSingle();

  if (error) {
    console.error('[smart-goals] saved generation load failed:', error.message);
    return res.status(500).json({ message: 'Could not load saved SMART goals.' });
  }

  return res.json({ success: true, generation: data?.generation_json ?? null });
});

router.post('/save', async (req, res) => {
  const groupId = cleanText(req.body?.groupId, 128);
  const generation = normalizeSavedGeneration(req.body?.generation);
  if (!groupId || !generation) {
    return res.status(400).json({ message: 'A group and valid SMART goals are required to save.' });
  }

  const sessionId = deriveSessionId(req.user?.id, groupId);
  if (!sessionId) return res.status(401).json({ message: 'A signed-in user is required.' });

  const { error } = await supabase
    .from('smart_goal_generations')
    .upsert({
      session_id: sessionId,
      generation_json: generation,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'session_id' });

  if (error) {
    console.error('[smart-goals] generation save failed:', error.message);
    return res.status(500).json({ message: 'Could not save SMART goals.' });
  }

  return res.json({ success: true, generation });
});

function parseGoals(text, allowedSourceIds) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('The generated response was not valid JSON. Please try again.');
  }

  if (!Array.isArray(parsed.goals) || parsed.goals.length < 3 || parsed.goals.length > 4) {
    throw new Error('The generated response did not contain 3 to 4 objectives. Please try again.');
  }

  const stringList = (value) => Array.isArray(value)
    ? value.filter((item) => typeof item === 'string').map((item) => item.trim()).filter(Boolean).slice(0, 8)
    : [];

  return {
    overallAim: cleanText(parsed.overallAim),
    methodology: {
      approach: '',
      rationale: '',
      dataRequirements: '',
      limitations: [],
      needsResearcherApproval: false,
    },
    goals: parsed.goals.map((goal) => ({
      objective: cleanText(goal.objective),
      specific: cleanText(goal.specific),
      measurable: cleanText(goal.measurable),
      achievable: cleanText(goal.achievable),
      relevant: cleanText(goal.relevant),
      timeBound: cleanText(goal.timeBound),
      sourceRefs: stringList(goal.sourceRefs).filter((id) => allowedSourceIds.has(id)),
      assumptions: stringList(goal.assumptions),
      needsUserInput: stringList(goal.needsUserInput),
    })),
  };
}

async function loadApprovedSources(sessionId) {
  const { data: documents, error } = await supabase
    .from('uploaded_documents')
    .select(`
      id,
      document_insights (
        gap_alignment_score,
        relevance_level,
        generated_at,
        evidence_excerpts (
          quote_text,
          page_number,
          criterion,
          relevance_level,
          display_order
        )
      )
    `)
    .eq('session_id', sessionId)
    .eq('approved', true);

  if (error) throw error;
  return documents ?? [];
}

function safeDiagnosticText(value, apiKey) {
  let text = typeof value === 'string' ? value : String(value ?? '');
  if (apiKey) text = text.replaceAll(apiKey, '[redacted]');
  return text
    .replace(/(x-goog-api-key|authorization)\s*[:=]\s*[^\s,;]+/gi, '$1=[redacted]')
    .replace(/\bGemini\b/gi, 'AI provider')
    .replace(/\s+/g, ' ')
    .slice(0, 500);
}

function parseProviderError(rawResponse, apiKey) {
  try {
    const providerError = JSON.parse(rawResponse)?.error ?? {};
    return {
      providerCode: providerError.code ?? providerError.status ?? 'N/A',
      providerMessage: safeDiagnosticText(providerError.message || 'Provider returned an error without a message.', apiKey),
    };
  } catch {
    return {
      providerCode: 'N/A',
      providerMessage: 'Provider returned an unreadable error response.',
    };
  }
}

function classifyDiagnostic({ status, providerCode, providerMessage, error, parsingFailure = false }) {
  const detail = `${providerCode ?? ''} ${providerMessage ?? ''} ${error?.message ?? ''}`.toLowerCase();
  const categories = [];
  const isTimeout = error?.type === 'request-timeout'
    || error?.name === 'AbortError'
    || error?.name === 'TimeoutError'
    || error?.code === 'ETIMEDOUT'
    || /timed? ?out|timeout/.test(detail);

  if (isTimeout) categories.push('timeout');
  if (/quota|billing|resource[_ -]?exhausted|daily limit/.test(detail)) categories.push('quota exceeded');
  if (Number(status) === 429 || /rate.?limit|too many requests/.test(detail)) categories.push('429 / rate limit');
  if (Number(status) === 401 || /api[_ -]?key.{0,30}(invalid|not valid|rejected)|invalid.{0,20}api[_ -]?key/.test(detail)) {
    categories.push('invalid API key');
  }
  if (Number(status) === 404 || /model.{0,30}(unavailable|not found|unsupported|overloaded)|model_not_found/.test(detail)) {
    categories.push('model unavailable');
  }
  if (Number(status) === 400 || /invalid_argument|malformed request|bad request/.test(detail)) {
    categories.push('malformed request');
  }
  if (Number(status) === 413 || /max_tokens|token.{0,30}(limit|exceed|maximum)|context.{0,30}(limit|length|exceed)|too many tokens/.test(detail)) {
    categories.push('token/context limit');
  }
  if (parsingFailure) categories.push('JSON/schema parsing failure');
  if (!categories.length) categories.push('another provider error');
  return [...new Set(categories)];
}

function logGeminiDiagnostic({ status, providerCode, providerMessage, model, classification, phase, apiKey }) {
  console.error('[smart-goals][gemini-diagnostic]', JSON.stringify({
    httpStatus: status ?? 'N/A',
    providerCode: safeDiagnosticText(String(providerCode ?? 'N/A'), apiKey),
    providerMessage: safeDiagnosticText(providerMessage, apiKey),
    model,
    classification,
    phase,
  }));
}

function isDevelopment() {
  return process.env.NODE_ENV !== 'production';
}

function diagnosticResponseMessage(detail) {
  return isDevelopment() ? detail : 'Could not generate SMART goals right now. Please try again.';
}

router.post('/generate', async (req, res) => {
  const groupId = cleanText(req.body?.groupId, 128);
  const researchTitle = cleanText(req.body?.researchTitle, 300);
  const selectedGap = cleanText(req.body?.selectedGap, 1500);

  if (!groupId || !researchTitle || !selectedGap) {
    return res.status(400).json({ message: 'Group, research title, and selected research gap are required.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ message: 'SMART Goals generation is not configured. Ask an administrator to configure the AI service.' });
  }

  const sessionId = deriveSessionId(req.user?.id, groupId);
  if (!sessionId) return res.status(401).json({ message: 'A signed-in user is required.' });

  const model = (process.env.GEMINI_MODEL || 'gemini-3.6-flash').replace(/^models\//, '');
  let phase = 'loading SMART Objectives context';

  try {
    const { data: baseline, error: baselineError } = await supabase
      .from('research_baselines')
      .select('project_title')
      .eq('session_id', sessionId)
      .maybeSingle();

    if (baselineError) throw baselineError;
    if (!baseline) return res.status(404).json({ message: 'Import this group into CiteWise before generating SMART goals.' });

    const documents = await loadApprovedSources(sessionId);
    const { brief } = await getOrStoreSmartGoalsBrief(supabase, sessionId, researchTitle, selectedGap, documents);
    if (!brief?.evidence?.length) {
      return res.status(400).json({ message: 'Approve and assess at least one RRL paper with evidence excerpts in Step 2 before generating goals.' });
    }
    const allowedSourceIds = new Set(brief.evidence.map((excerpt) => excerpt.sourceId));
    const prompt = {
      task: 'Create 3 to 4 specific, feasible, research-oriented objectives, each with objective, specific, measurable, achievable, relevant, and timeBound fields.',
      rules: [
        'Use the research title as the primary description of the study and make every objective address the selected research gap.',
        'Use only the supplied RRL excerpts as supporting evidence; do not introduce unsupported facts or additional research gaps.',
        'Do not invent findings, numerical targets, deadlines, sample sizes, populations, or methodology, and do not claim anything has already been proven.',
        'When a measurable target or deadline is not supplied, state that the researcher must decide it and add it to needsUserInput rather than inventing a value.',
        'Use sourceRefs only for supplied source IDs that support the objective. Keep the objectives distinct and actionable.',
      ],
      researchBrief: brief,
    };

    const requestOptions = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: JSON.stringify(prompt) }] }],
        generationConfig: { responseMimeType: 'application/json', responseSchema },
      }),
      timeout: parseInt(process.env.GEMINI_TIMEOUT_MS) || 60000,
    };

    phase = 'calling Gemini';
    const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, requestOptions);
    phase = 'reading Gemini response';
    const rawGeminiResponse = await geminiResponse.text();

    if (!geminiResponse.ok) {
      const { providerCode, providerMessage } = parseProviderError(rawGeminiResponse, apiKey);
      const classification = classifyDiagnostic({ status: geminiResponse.status, providerCode, providerMessage });
      logGeminiDiagnostic({ status: geminiResponse.status, providerCode, providerMessage, model, classification, phase, apiKey });
      return res.status(502).json({
        message: diagnosticResponseMessage(`AI provider request failed (HTTP ${geminiResponse.status}; code ${providerCode}; ${classification.join(', ')}): ${providerMessage}`),
      });
    }

    phase = 'parsing Gemini response';
    let geminiData;
    try {
      geminiData = JSON.parse(rawGeminiResponse);
    } catch {
      const providerMessage = 'Provider returned a successful HTTP response with a non-JSON body.';
      const classification = classifyDiagnostic({ status: geminiResponse.status, providerCode: 'N/A', providerMessage, parsingFailure: true });
      logGeminiDiagnostic({ status: geminiResponse.status, providerCode: 'N/A', providerMessage, model, classification, phase, apiKey });
      return res.status(502).json({ message: diagnosticResponseMessage(providerMessage) });
    }

    const generatedText = geminiData.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? '')
      .join('') ?? '';
    let generated;
    try {
      generated = parseGoals(generatedText, allowedSourceIds);
      if (generated.goals.some((goal) => !goal.objective || !goal.specific || !goal.measurable || !goal.achievable || !goal.relevant || !goal.timeBound)) {
        throw new Error('The provider response contained an incomplete objective.');
      }
    } catch (error) {
      const providerCode = geminiData.candidates?.[0]?.finishReason
        ?? geminiData.promptFeedback?.blockReason
        ?? 'N/A';
      const providerMessage = safeDiagnosticText(
        geminiData.promptFeedback?.blockReasonMessage || geminiData.candidates?.[0]?.finishMessage || error.message,
        apiKey,
      );
      const classification = classifyDiagnostic({ status: geminiResponse.status, providerCode, providerMessage, parsingFailure: true });
      logGeminiDiagnostic({ status: geminiResponse.status, providerCode, providerMessage, model, classification, phase, apiKey });
      return res.status(502).json({
        message: diagnosticResponseMessage(`AI provider response could not be parsed (${classification.join(', ')}): ${providerMessage}`),
      });
    }

    return res.json({
      success: true,
      projectTitle: researchTitle,
      researchTitle,
      selectedGap,
      rationale: '',
      constraints: '',
      methodologyMode: '',
      selectedMethodology: '',
      methodologyNotes: '',
      introductionVersion: null,
      approvedSourceCount: allowedSourceIds.size,
      ...generated,
    });
  } catch (error) {
    const providerMessage = safeDiagnosticText(error?.message || 'No error message was provided.', apiKey);
    const providerCode = error?.code ?? error?.type ?? error?.name ?? 'N/A';
    const classification = classifyDiagnostic({ providerCode, providerMessage, error });
    const providerPhase = phase === 'calling Gemini' || phase === 'reading Gemini response';
    if (!providerPhase && classification[0] === 'another provider error') classification[0] = 'backend/context error';
    logGeminiDiagnostic({ providerCode, providerMessage, model, classification, phase, apiKey });
    return res.status(502).json({
      message: diagnosticResponseMessage(`SMART Objectives generation failed during ${phase}: ${providerMessage}`),
    });
  }
});

export default router;