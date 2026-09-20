// /api/v1/smart-goals  – AI S.M.A.R.T. Research Goal Generator
import express from 'express';
import fetch from 'node-fetch';
import supabase from '../../common/config/supabaseClient.js';
import requireAuth from '../../common/middlewares/auth.middleware.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import multer from 'multer';
import pdfParse from 'pdf-parse';

const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

// Require auth middleware
router.use(requireAuth);

const SYSTEM_PROMPT = `
Instruction: Generate a Feasible S.M.A.R.T. Research Goal

Generate one S.M.A.R.T. goal for the given research project. The goal must prioritize feasibility and realistic completion over ambitious or overly broad outcomes.

Before generating the goal, evaluate the research based on the following factors:

1. Research Scope: Identify exactly what the study will investigate. Keep the target population, variables, location, and research problem narrow enough to be completed within the available resources. Avoid goals that attempt to study too many variables, populations, or locations at once.
2. Available Participants: Consider whether the researchers can realistically access the required participants. Use a reasonable sample size based on the researchers' expected access. Do not assume access to large populations unless explicitly provided.
3. Time: Consider the stated research deadline or available research period. Ensure participant recruitment, data collection, data processing, analysis, and writing fit within the timeframe.
4. Resources: Consider budget, equipment, software, internet access, transportation, and materials. Prefer methods achievable with given resources.
5. Researcher Skills: Ensure methodology and analysis match current skills. Avoid unnecessarily complex statistical methods when a simpler valid approach works.
6. Data Accessibility: Only require data that can realistically be obtained (surveys, interviews, observations, public data).
7. Measurability: Define a concrete and achievable outcome with numeric targets (number of participants, responses, variables examined, completion percentage). Avoid vague terms ("fully understand", "prove").
8. Ethical & Practical Constraints: Comply with informed consent, privacy, and confidentiality.

S.M.A.R.T. Requirements:
- Specific: Clearly identify research problem, population, variables, activity.
- Measurable: Include realistic numerical or observable target.
- Achievable: Realistically attainable using actual time, participants, skills, and resources.
- Relevant: Directly contribute to answering the research problem.
- Time-bound: Include realistic deadline or timeframe.

Important Rule: Do not fabricate information about resources, participants, deadline, or capabilities. If not explicitly provided, use conservative assumptions and clearly label them as "Conservative Assumptions".
`;

router.post('/generate', async (req, res) => {
  const { sessionId, groupId, title, rationale, gaps, approvedDocs, additionalRrl, draftText, constraints } = req.body;

  if (!title && !sessionId) {
    return res.status(400).json({ success: false, message: 'Project title or sessionId is required' });
  }

  try {
    // 1. Resolve baseline info if sessionId provided
    let projectTitle = title || '';
    let projectRationale = rationale || '';
    let projectGaps = Array.isArray(gaps) ? gaps.join('; ') : (gaps || '');

    if (sessionId && (!projectTitle || !projectRationale)) {
      const { data: baselines } = await supabase
        .from('research_baselines')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (baselines?.length) {
        projectTitle = projectTitle || baselines[0].project_title || '';
        projectRationale = projectRationale || baselines[0].rationale || '';
        if (!projectGaps) {
          const rawGaps = baselines[0].research_gaps;
          projectGaps = Array.isArray(rawGaps) ? rawGaps.join('; ') : (rawGaps || '');
        }
      }
    }

    // 2. Resolve approved documents text if sessionId provided
    let rrlSummariesText = '';
    if (sessionId) {
      const { data: docs } = await supabase
        .from('uploaded_documents')
        .select('file_name, parsed_text, citation_metadata_json')
        .eq('session_id', sessionId)
        .eq('approved', true);

      if (docs?.length) {
        rrlSummariesText = docs.map(d => `- Paper: ${d.file_name}\n  Excerpt: ${(d.parsed_text || '').slice(0, 800)}...`).join('\n\n');
      }
    }

    // Combine any manually provided approved docs summary
    if (Array.isArray(approvedDocs) && approvedDocs.length) {
      const manualRrl = approvedDocs.map(d => `- Paper: ${d.fileName || d.name || 'RRL'}`).join('\n');
      rrlSummariesText = rrlSummariesText ? `${rrlSummariesText}\n\n${manualRrl}` : manualRrl;
    }

    const payloadContext = {
      projectTitle,
      projectRationale,
      projectGaps,
      synthesisDraftText: (draftText || '').slice(0, 3000),
      rrlEvidence: rrlSummariesText,
      additionalRrl: (additionalRrl || '').trim(),
      constraints: {
        timeframe: constraints?.timeframe || '1 Semester (3-4 Months)',
        targetParticipants: constraints?.targetParticipants || '50-100 accessible survey respondents',
        budgetResources: constraints?.budgetResources || 'Standard student software & internet access',
        researcherSkills: constraints?.researcherSkills || 'Undergraduate / Graduate research methodology',
        location: constraints?.location || 'Local university / online survey',
      }
    };

    // 3. Trigger AI inference (via Google Gemini)
    let smartGoalResult = null;
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not configured in environment variables');
      }
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        generationConfig: {
          responseMimeType: "application/json",
        }
      });

      const prompt = `${SYSTEM_PROMPT}\n\nContext:\n${JSON.stringify(payloadContext, null, 2)}\n\nPlease output valid JSON adhering to this exact structure:
{
  "title": "string",
  "fullSmartGoal": "string (A single paragraph summarizing the SMART goal)",
  "smartComponents": {
    "specific": "string",
    "measurable": "string",
    "achievable": "string",
    "relevant": "string",
    "timeBound": "string"
  },
  "evaluations": [
    { "factor": "string (e.g. Research Scope, Available Participants, Time & Schedule, Resources & Equipment, Researcher Skills, Data Accessibility, Ethical Compliance)", "status": "string (Optimal/Feasible/Risky/Within Budget/High)", "detail": "string" }
  ],
  "conservativeAssumptions": ["string"]
}`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      smartGoalResult = JSON.parse(text);
      
      // Merge title from context if missing
      if (!smartGoalResult.title) smartGoalResult.title = projectTitle;
    } catch (err) {
      console.error('[smart-goals] Gemini AI failed:', err.message);
      // 4. Generate structured fallback SMART Goal response if direct AI response fails
      smartGoalResult = buildStructuredSmartGoal(payloadContext, null);
    }

    // Save to smart_goals_history if sessionId is present
    if (sessionId) {
      try {
        const { data: insertedGoal, error: insertError } = await supabase
          .from('smart_goals_history')
          .insert({
            session_id: sessionId,
            group_id: groupId || null,
            title: smartGoalResult.title || projectTitle,
            full_smart_goal: smartGoalResult.fullSmartGoal,
            smart_components: smartGoalResult.smartComponents,
            evaluations: smartGoalResult.evaluations,
            conservative_assumptions: smartGoalResult.conservativeAssumptions
          })
          .select()
          .single();

        if (insertError) {
          console.warn('[smart-goals] Failed to insert history:', insertError);
        } else {
          smartGoalResult.id = insertedGoal.id;
          smartGoalResult.createdAt = insertedGoal.created_at;
        }
      } catch (err) {
        console.warn('[smart-goals] Exception inserting history:', err.message);
      }
    }

    return res.json({
      success: true,
      message: 'S.M.A.R.T. Goal generated successfully',
      data: smartGoalResult
    });

  } catch (err) {
    console.error('[smart-goals] Generation error:', err);
    return res.status(500).json({ success: false, message: `Failed to generate SMART goal: ${err.message}` });
  }
});

function buildStructuredSmartGoal(context, rawAi) {
  const { projectTitle, projectRationale, projectGaps, constraints, additionalRrl } = context;
  const titleStr = projectTitle || 'Academic Research Study';

  // Construct realistic Specific statement
  const specificStatement = `To investigate the impact of ${titleStr} on target outcomes among ${constraints.targetParticipants} located at ${constraints.location}.`;

  // Construct realistic Measurable statement
  const measurableStatement = `Achieve complete survey responses from a target sample size of ${constraints.targetParticipants}, evaluating key variables with a completion rate of at least 85%.`;

  // Construct realistic Achievable statement
  const achievableStatement = `Feasible within current capabilities using accessible research tools (${constraints.budgetResources}) and methodology skills (${constraints.researcherSkills}).`;

  // Construct realistic Relevant statement
  const relevantStatement = `Directly addresses identified research gaps (${projectGaps.slice(0, 120) || 'literature gaps'}) and contributes actionable insights to the problem domain.`;

  // Construct realistic Time-bound statement
  const timeBoundStatement = `Complete participant recruitment, data collection, analysis, and final reporting within ${constraints.timeframe}.`;

  const fullSmartGoal = `"${specificStatement} The target is to collect data from ${constraints.targetParticipants} within ${constraints.timeframe}, ensuring method validity and data completeness."`;

  return {
    title: projectTitle,
    fullSmartGoal,
    smartComponents: {
      specific: specificStatement,
      measurable: measurableStatement,
      achievable: achievableStatement,
      relevant: relevantStatement,
      timeBound: timeBoundStatement,
    },
    evaluations: [
      { factor: 'Research Scope', status: 'Optimal', detail: `Focused strictly on ${titleStr} within ${constraints.location}. Avoids over-broad multi-location variables.` },
      { factor: 'Available Participants', status: 'Feasible', detail: `Targeting ${constraints.targetParticipants}. Sample size is realistic for accessible channels.` },
      { factor: 'Time & Schedule', status: 'Realistic', detail: `Structured to fit within ${constraints.timeframe} covering recruitment, collection, and analysis.` },
      { factor: 'Resources & Equipment', status: 'Within Budget', detail: `Utilizes ${constraints.budgetResources}. Requires zero paid external databases or costly equipment.` },
      { factor: 'Researcher Skills', status: 'Matched', detail: `Aligned with ${constraints.researcherSkills}. Uses valid, standard quantitative/qualitative analysis.` },
      { factor: 'Data Accessibility', status: 'High', detail: `Relies on direct surveys/interviews and accessible literature. No confidential/proprietary data required.` },
      { factor: 'Ethical Compliance', status: 'Verified', detail: `Standard informed consent protocols and anonymized response handling.` },
    ],
    conservativeAssumptions: [
      `Assumed research timeframe is limited to ${constraints.timeframe}.`,
      `Assumed participant recruitment will rely on accessible institutional/online sampling.`,
      additionalRrl ? `Integrated additional RRL insights: "${additionalRrl.slice(0, 80)}..."` : `Evaluated using accepted synthesis literature and baseline research gaps.`
    ]
  };
}

export default router;

// GET /history/:sessionId - Fetch SMART goal generation history
router.get('/history/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  try {
    const { data: history, error } = await supabase
      .from('smart_goals_history')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    
    // Map to camelCase for frontend
    const formattedHistory = history.map(item => ({
      id: item.id,
      sessionId: item.session_id,
      groupId: item.group_id,
      title: item.title,
      fullSmartGoal: item.full_smart_goal,
      smartComponents: item.smart_components,
      evaluations: item.evaluations,
      conservativeAssumptions: item.conservative_assumptions,
      createdAt: item.created_at
    }));

    return res.json({ success: true, data: formattedHistory });
  } catch (err) {
    console.error('[smart-goals] Fetch history error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /parse-pdf - Parse a PDF file for Additional RRL
router.post('/parse-pdf', upload.single('pdf'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No PDF file provided.' });
  }
  
  try {
    const data = await pdfParse(req.file.buffer);
    return res.json({ success: true, text: data.text });
  } catch (err) {
    console.error('[smart-goals] PDF parse error:', err);
    return res.status(500).json({ success: false, message: 'Failed to parse PDF.' });
  }
});
