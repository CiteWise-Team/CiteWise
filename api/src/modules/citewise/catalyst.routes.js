// /api/catalyst  – CATalyst data import into CiteWise
// Ports CatalystController.java + CatalystClient.java

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import supabase from '../../common/config/supabaseClient.js';

const router = express.Router();

// Helper: fetch Topic + GapResult rows from the CATalyst Supabase tables
async function fetchCatalystData(workspaceId) {
  const [topicRes, gapRes] = await Promise.all([
    supabase.from('Topic').select('*').eq('group_id', workspaceId),
    supabase.from('GapResult').select('*').eq('group_id', workspaceId),
  ]);

  if (topicRes.error) throw new Error(`Topic query failed: ${topicRes.error.message}`);
  if (gapRes.error)   throw new Error(`Gap query failed: ${gapRes.error.message}`);

  const topic = topicRes.data?.[0] ?? null;

  // GapResult.gap is stored as a JSON string array ["gap1","gap2",...] by the n8n workflow
  const gaps = (gapRes.data ?? []).flatMap(row => {
    const raw = row.gap;
    if (Array.isArray(raw)) return raw.filter(Boolean);
    if (typeof raw === 'string') {
      // Try JSON.parse first — the n8n gap extractor stores a JSON array as text
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed.map(g => String(g).trim()).filter(Boolean);
        return [String(parsed).trim()].filter(Boolean);
      } catch {
        // Fallback: split only on semicolons to avoid breaking comma-containing sentences
        return raw.split(/;\s*/).map(g => g.trim()).filter(Boolean);
      }
    }
    return [];
  });

  return {
    title:    topic?.title     ?? null,
    rationale:topic?.rationale ?? null,
    gaps,
  };
}

// GET /api/catalyst/:groupId  – used by the existing CiteWise WorkspaceImportLayout GET check
router.get('/:groupId', async (req, res) => {
  const { groupId } = req.params;
  if (!groupId?.trim()) {
    return res.status(400).json({ success: false, message: 'Workspace ID is required', data: null });
  }
  try {
    const payload = await fetchCatalystData(groupId.trim());
    return res.json({ success: true, message: 'CATalyst data loaded', data: payload });
  } catch (err) {
    console.error('[catalyst GET]', err.message);
    return res.status(502).json({ success: false, message: 'Failed to reach CATalyst', data: null });
  }
});

// GET /api/catalyst/:groupId/topics  – return all topics for a group (for topic-picker UI)
router.get('/:groupId/topics', async (req, res) => {
  const { groupId } = req.params;
  if (!groupId?.trim()) {
    return res.status(400).json({ success: false, message: 'Workspace ID is required', data: null });
  }
  try {
    const [topicRes, gapRes] = await Promise.all([
      supabase.from('Topic').select('*').eq('group_id', groupId.trim()).order('created_at', { ascending: true }),
      supabase.from('GapResult').select('*').eq('group_id', groupId.trim()),
    ]);
    if (topicRes.error) throw new Error(topicRes.error.message);
    if (gapRes.error)   throw new Error(gapRes.error.message);

    const gaps = (gapRes.data ?? []).flatMap(row => {
      const raw = row.gap;
      if (Array.isArray(raw)) return raw.filter(Boolean);
      if (typeof raw === 'string') {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) return parsed.map(g => String(g).trim()).filter(Boolean);
          return [String(parsed).trim()].filter(Boolean);
        } catch {
          return raw.split(/;\s*/).map(g => g.trim()).filter(Boolean);
        }
      }
      return [];
    });

    return res.json({
      success: true,
      data: {
        topics: (topicRes.data ?? []).map(t => ({ id: t.id, title: t.title, rationale: t.rationale })),
        gaps,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message, data: null });
  }
});

// POST /api/catalyst/import  – fetch + persist research_baselines + return sessionId
// Body: { workspaceId, title?, rationale? }
//   title + rationale override the DB lookup — used when user has picked a specific topic
router.post('/import', async (req, res) => {
  const workspaceId  = req.body?.workspaceId;
  const titleOverride    = req.body?.title?.trim()    || null;
  const rationaleOverride= req.body?.rationale?.trim()|| null;

  if (!workspaceId?.trim()) {
    return res.status(400).json({ success: false, message: 'Workspace ID is required', data: null });
  }

  try {
    const payload = await fetchCatalystData(workspaceId.trim());

    // Use caller-supplied title/rationale if provided (topic was user-selected)
    const finalTitle    = titleOverride    ?? payload.title;
    const finalRationale= rationaleOverride?? payload.rationale ?? '';

    if (!finalTitle) {
      return res.status(400).json({
        success: false,
        message: 'No CATalyst workspace found with that ID, or it has no topic/gap data yet',
        data: null,
      });
    }

    const sessionId = uuidv4();

    const { error: insertError } = await supabase.from('research_baselines').insert({
      session_id:             sessionId,
      catalyst_workspace_id:  workspaceId.trim(),
      project_title:          finalTitle,
      rationale:              finalRationale,
      research_gaps:          payload.gaps,
      source_system:          'CATalyst',
    });

    if (insertError) throw new Error(`Failed to persist baseline: ${insertError.message}`);

    console.log(`✅ Created session ${sessionId} for workspace ${workspaceId} – title: ${finalTitle?.slice(0,60)}`);

    return res.json({
      success: true,
      message: 'Workspace imported successfully',
      data: {
        sessionId,
        title:     finalTitle,
        rationale: finalRationale,
        gaps:      payload.gaps,
      },
    });
  } catch (err) {
    console.error('[catalyst import]', err.message);
    return res.status(500).json({ success: false, message: `Failed to import workspace: ${err.message}`, data: null });
  }
});

export default router;
