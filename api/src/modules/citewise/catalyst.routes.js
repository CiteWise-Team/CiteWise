// /api/catalyst  – CATalyst data import into CiteWise
// Ports CatalystController.java + CatalystClient.java

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import supabase from '../../common/config/supabaseClient.js';
import requireAuth from '../../common/middlewares/auth.middleware.js';
import { deriveSessionId } from './helpers/sessionId.js';

const router = express.Router();

// All CATalyst import routes require a valid user session.
router.use(requireAuth);

function normalizeSetupMode(raw) {
  return String(raw ?? '').trim().toLowerCase() === 'manual' ? 'manual' : 'auto';
}

function parseIsoTimestamp(raw) {
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function parseGapsInput(rawGaps) {
  if (Array.isArray(rawGaps)) {
    return rawGaps.map((g) => String(g ?? '').trim()).filter(Boolean);
  }
  if (typeof rawGaps === 'string') {
    const trimmed = rawGaps.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.map((g) => String(g ?? '').trim()).filter(Boolean);
    } catch { /* fall through to line/semicolon split */ }
    return trimmed.split(/\r?\n+|;\s*/).map((g) => g.trim()).filter(Boolean);
  }
  return [];
}

function isMissingSetupTimingColumnError(err) {
  return /setup_mode|setup_started_at|setup_completed_at|user_id|import_fidelity_json|schema cache|column/i.test(String(err?.message ?? ''));
}

const OPTIONAL_BASELINE_COLS = [
  'setup_mode',
  'setup_started_at',
  'setup_completed_at',
  'user_id',
  'import_fidelity_json',
];

async function persistBaselineRow(baseline) {
  const tryUpsert = async (row) => {
    let { error } = await supabase
      .from('research_baselines')
      .upsert(row, { onConflict: 'session_id' });

    if (error) {
      const { data: existingBaseline } = await supabase
        .from('research_baselines')
        .select('session_id')
        .eq('session_id', row.session_id)
        .maybeSingle();

      if (existingBaseline) {
        const { error: updateError } = await supabase
          .from('research_baselines')
          .update(row)
          .eq('session_id', row.session_id);
        error = updateError;
      }
    }
    return error;
  };

  let current = { ...baseline };
  let err = await tryUpsert(current);

  // Gracefully strip any unmigrated optional telemetry columns (migrations 006/007)
  let stripped = false;
  while (err && isMissingSetupTimingColumnError(err)) {
    const colMatch = String(err?.message ?? '').match(/Could not find the '([^']+)' column/i);
    if (colMatch && Object.prototype.hasOwnProperty.call(current, colMatch[1])) {
      delete current[colMatch[1]];
      stripped = true;
      err = await tryUpsert(current);
      continue;
    }
    const remainingOptional = OPTIONAL_BASELINE_COLS.filter((c) => Object.prototype.hasOwnProperty.call(current, c));
    if (!remainingOptional.length) break;
    for (const c of remainingOptional) delete current[c];
    stripped = true;
    err = await tryUpsert(current);
  }

  if (stripped) {
    console.warn('[T1/T2 Telemetry] Optional columns missing on research_baselines; saved core baseline. Apply migrations 006 & 007.');
  }
  if (err) throw new Error(`Failed to persist baseline: ${err.message}`);
}

function escapeCsvCell(value) {
  if (value === null || value === undefined) return '';
  const s = String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function computeDurationSeconds(startedAt, completedAt) {
  if (!startedAt || !completedAt) return null;
  const startMs = new Date(startedAt).getTime();
  const endMs = new Date(completedAt).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) return null;
  return Number(((endMs - startMs) / 1000).toFixed(2));
}

// GET /api/catalyst/setup-timings/export?format=csv|json
// Exports T1 setup duration telemetry (setup_mode, setup_started_at, setup_completed_at)
router.get('/setup-timings/export', async (req, res) => {
  const format = String(req.query.format ?? 'json').trim().toLowerCase();
  const filterMode = req.query.setupMode ? normalizeSetupMode(req.query.setupMode) : null;
  const filterSessionId = req.query.sessionId ? String(req.query.sessionId).trim() : null;
  const includeAll = String(req.query.all ?? '').toLowerCase() === 'true';

  try {
    let query = supabase
      .from('research_baselines')
      .select('session_id, catalyst_workspace_id, project_title, source_system, setup_mode, setup_started_at, setup_completed_at, created_at')
      .order('created_at', { ascending: false });

    if (filterSessionId) query = query.eq('session_id', filterSessionId);
    if (filterMode) query = query.eq('setup_mode', filterMode);

    const { data, error } = await query;
    if (error) {
      if (isMissingSetupTimingColumnError(error)) {
        return res.status(400).json({
          success: false,
          message: 'Setup timing columns are not migrated yet. Apply api/migrations/006_t1_setup_timing.sql first.',
          data: null,
        });
      }
      throw new Error(error.message);
    }

    const rows = (data ?? [])
      .filter((r) => includeAll || r.setup_started_at || r.setup_completed_at || r.setup_mode)
      .map((r) => ({
        session_id: r.session_id,
        catalyst_workspace_id: r.catalyst_workspace_id ?? null,
        project_title: r.project_title ?? null,
        source_system: r.source_system ?? null,
        setup_mode: r.setup_mode ?? (r.source_system === 'Manual' ? 'manual' : 'auto'),
        setup_started_at: r.setup_started_at ?? null,
        setup_completed_at: r.setup_completed_at ?? null,
        setup_duration_seconds: computeDurationSeconds(r.setup_started_at, r.setup_completed_at),
      }));

    if (format === 'csv') {
      const headers = [
        'session_id',
        'catalyst_workspace_id',
        'project_title',
        'source_system',
        'setup_mode',
        'setup_started_at',
        'setup_completed_at',
        'setup_duration_seconds',
      ];
      const csvLines = [headers.join(',')];
      for (const r of rows) {
        csvLines.push(headers.map((h) => escapeCsvCell(r[h])).join(','));
      }
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="t1-setup-timings.csv"');
      return res.send(csvLines.join('\n') + '\n');
    }

    const autoDurations = rows
      .filter((r) => r.setup_mode === 'auto' && r.setup_duration_seconds != null)
      .map((r) => r.setup_duration_seconds);
    const manualDurations = rows
      .filter((r) => r.setup_mode === 'manual' && r.setup_duration_seconds != null)
      .map((r) => r.setup_duration_seconds);
    const mean = (arr) => (arr.length ? Number((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2)) : null);
    const autoMeanSeconds = mean(autoDurations);
    const manualMeanSeconds = mean(manualDurations);
    const reductionPct =
      autoMeanSeconds != null && manualMeanSeconds != null && manualMeanSeconds > 0
        ? Number((((manualMeanSeconds - autoMeanSeconds) / manualMeanSeconds) * 100).toFixed(2))
        : null;

    return res.json({
      success: true,
      data: {
        summary: {
          totalRows: rows.length,
          autoCount: autoDurations.length,
          manualCount: manualDurations.length,
          autoMeanSeconds,
          manualMeanSeconds,
          reductionPct,
        },
        rows,
      },
    });
  } catch (err) {
    console.error('[catalyst setup-timings/export]', err.message);
    return res.status(500).json({ success: false, message: `Failed to export setup timings: ${err.message}`, data: null });
  }
});


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

  let baseline = null;
  if (!topic?.title || !gaps.length) {
    const { data: bData } = await supabase
      .from('research_baselines')
      .select('project_title, research_gaps, rationale')
      .eq('catalyst_workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    baseline = bData;
  }

  const baselineGaps = Array.isArray(baseline?.research_gaps) ? baseline.research_gaps : [];
  const rawGapValues = (gapRes.data ?? []).map((row) => row.gap);

  return {
    title:    topic?.title     ?? baseline?.project_title ?? null,
    rationale:topic?.rationale ?? baseline?.rationale     ?? null,
    gaps:     gaps.length      ? gaps : baselineGaps,
    rawSource: {
      sourceTitle: topic?.title ?? null,
      sourceRationale: topic?.rationale ?? null,
      rawGapValues,
      usedBaselineFallback: !topic?.title || !gaps.length,
    },
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
// Body: { workspaceId, title?, rationale?, setupMode?, setupStartedAt? }
//   title + rationale override the DB lookup — used when user has picked a specific topic
router.post('/import', async (req, res) => {
  const workspaceId      = req.body?.workspaceId;
  const titleOverride    = req.body?.title?.trim()    || null;
  const rationaleOverride= req.body?.rationale?.trim()|| null;
  const setupMode        = normalizeSetupMode(req.body?.setupMode ?? 'auto');
  const setupStartedAt   = parseIsoTimestamp(req.body?.setupStartedAt) ?? new Date().toISOString();

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

    // Deriving the session from the account + workspace instead of minting a
    // fresh uuid means importing again — on another machine, or after clearing
    // site data — lands on the same session, so papers already uploaded against
    // it are still there. A random id per import stranded them.
    const sessionId = deriveSessionId(req.user?.id, workspaceId.trim()) || uuidv4();

    const importFidelity = {
      capturedAt: new Date().toISOString(),
      sourceTitle: payload.rawSource?.sourceTitle ?? null,
      storedTitle: finalTitle,
      titleOverridden: Boolean(titleOverride && titleOverride !== payload.rawSource?.sourceTitle),
      titleMatchesSource: finalTitle === (payload.rawSource?.sourceTitle ?? null),
      sourceRationale: payload.rawSource?.sourceRationale ?? null,
      storedRationale: finalRationale,
      rationaleOverridden: Boolean(rationaleOverride && rationaleOverride !== payload.rawSource?.sourceRationale),
      rationaleMatchesSource: finalRationale === (payload.rawSource?.sourceRationale ?? ''),
      rawGapValues: payload.rawSource?.rawGapValues ?? [],
      storedGaps: payload.gaps,
      storedGapCount: Array.isArray(payload.gaps) ? payload.gaps.length : 0,
      usedBaselineFallback: Boolean(payload.rawSource?.usedBaselineFallback),
    };

    const baseline = {
      session_id:             sessionId,
      user_id:                req.user?.id ?? null,
      catalyst_workspace_id:  workspaceId.trim(),
      project_title:          finalTitle,
      rationale:              finalRationale,
      research_gaps:          payload.gaps,
      source_system:          'CATalyst',
      setup_mode:             setupMode,
      setup_started_at:       setupStartedAt,
      import_fidelity_json:   importFidelity,
    };

    await persistBaselineRow(baseline);

    console.log(`✓ Created session ${sessionId} for workspace ${workspaceId} (${setupMode}) - title: ${finalTitle?.slice(0,60)}`);

    return res.json({
      success: true,
      message: 'Workspace imported successfully',
      data: {
        sessionId,
        title:     finalTitle,
        rationale: finalRationale,
        gaps:      payload.gaps,
        setupMode,
        setupStartedAt,
        importFidelity,
      },
    });
  } catch (err) {
    console.error('[catalyst import]', err.message);
    return res.status(500).json({ success: false, message: `Failed to import workspace: ${err.message}`, data: null });
  }
});

// POST /api/catalyst/manual-baseline  – T1 ?mode=manual baseline entry
// Body: { workspaceId?, title, rationale, gaps, setupStartedAt?, reuseSession? }
router.post('/manual-baseline', async (req, res) => {
  const workspaceId    = String(req.body?.workspaceId ?? '').trim();
  const title          = String(req.body?.title ?? '').trim();
  const rationale      = String(req.body?.rationale ?? '').trim();
  const gaps           = parseGapsInput(req.body?.gaps);
  const setupStartedAt = parseIsoTimestamp(req.body?.setupStartedAt) ?? new Date().toISOString();
  const reuseSession   = Boolean(req.body?.reuseSession);

  if (!title) {
    return res.status(400).json({ success: false, message: 'Research Title is required', data: null });
  }
  if (!rationale && gaps.length === 0) {
    return res.status(400).json({ success: false, message: 'Rationale or at least one Research Gap is required', data: null });
  }

  try {
    // Always mint a fresh UUID for ?mode=manual unless reuseSession is explicitly requested,
    // preventing session_id collisions with the automated CATalyst arm on the same workspace.
    const sessionId = (reuseSession && workspaceId ? deriveSessionId(req.user?.id, workspaceId) : null) || uuidv4();
    const baseline = {
      session_id:             sessionId,
      user_id:                req.user?.id ?? null,
      catalyst_workspace_id:  workspaceId || null,
      project_title:          title,
      rationale,
      research_gaps:          gaps,
      source_system:          'Manual',
      setup_mode:             'manual',
      setup_started_at:       setupStartedAt,
    };

    await persistBaselineRow(baseline);

    console.log(`✓ Saved manual baseline for session ${sessionId} - title: ${title.slice(0, 60)}`);

    return res.json({
      success: true,
      message: 'Manual research baseline saved',
      data: {
        sessionId,
        title,
        rationale,
        gaps,
        setupMode: 'manual',
        setupStartedAt,
      },
    });
  } catch (err) {
    console.error('[catalyst manual-baseline]', err.message);
    return res.status(500).json({ success: false, message: `Failed to save manual baseline: ${err.message}`, data: null });
  }
});

// POST /api/catalyst/setup-timing  – records T1 setup_started_at / setup_completed_at / setup_mode
router.post('/setup-timing', async (req, res) => {
  const sessionId        = String(req.body?.sessionId ?? '').trim();
  const setupMode        = normalizeSetupMode(req.body?.setupMode ?? 'auto');
  const setupStartedAt   = parseIsoTimestamp(req.body?.setupStartedAt);
  const setupCompletedAt = parseIsoTimestamp(req.body?.setupCompletedAt) ?? new Date().toISOString();

  if (!sessionId) {
    return res.status(400).json({ success: false, message: 'Session ID is required', data: null });
  }

  try {
    const { data: existing, error: fetchErr } = await supabase
      .from('research_baselines')
      .select('session_id, setup_started_at, setup_mode')
      .eq('session_id', sessionId)
      .maybeSingle();

    if (fetchErr) {
      if (isMissingSetupTimingColumnError(fetchErr)) {
        return res.json({
          success: true,
          message: 'Setup timing skipped (migration 006 not applied yet)',
          data: { sessionId, setupMode, setupStartedAt, setupCompletedAt, setupDurationSeconds: null, migrated: false },
        });
      }
      throw new Error(fetchErr.message);
    }

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Session baseline not found', data: null });
    }

    const effectiveStartedAt = existing.setup_started_at ?? setupStartedAt ?? setupCompletedAt;
    const { error: updateErr } = await supabase
      .from('research_baselines')
      .update({
        setup_mode: existing.setup_mode ?? setupMode,
        setup_started_at: effectiveStartedAt,
        setup_completed_at: setupCompletedAt,
      })
      .eq('session_id', sessionId);

    if (updateErr) {
      if (isMissingSetupTimingColumnError(updateErr)) {
        return res.json({
          success: true,
          message: 'Setup timing skipped (migration 006 not applied yet)',
          data: { sessionId, setupMode, setupStartedAt: effectiveStartedAt, setupCompletedAt, setupDurationSeconds: null, migrated: false },
        });
      }
      throw new Error(updateErr.message);
    }

    const setupDurationSeconds = computeDurationSeconds(effectiveStartedAt, setupCompletedAt);
    return res.json({
      success: true,
      message: 'Setup timing recorded',
      data: {
        sessionId,
        setupMode: existing.setup_mode ?? setupMode,
        setupStartedAt: effectiveStartedAt,
        setupCompletedAt,
        setupDurationSeconds,
      },
    });
  } catch (err) {
    console.error('[catalyst setup-timing]', err.message);
    return res.status(500).json({ success: false, message: `Failed to record setup timing: ${err.message}`, data: null });
  }
});

export default router;
