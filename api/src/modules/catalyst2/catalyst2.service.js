import supabase from '../../common/config/supabaseClient.js';
import {
  createIntegrationImportRepo,
  createIntegrationErrorRepo,
  createRrlAssessmentRepo,
  createSmartObjectiveRepo,
  getIntegrationImportByIdRepo,
  getIntegrationImportsByWorkspaceRepo,
  getIntegrationErrorsByImportRepo,
  getRrlAssessmentByIdRepo,
  updateRrlAssessmentStatusRepo,
  getRrlAssessmentsByWorkspaceRepo,
  getSmartObjectiveByIdRepo,
  getSmartObjectivesByWorkspaceRepo,
  updateSmartObjectiveRepo,
} from './catalyst2.repository.js';

const ALLOWED_IMPORT_TYPES = new Set([
  'workspace_snapshot',
  'topic_import',
  'gap_import',
  'rrl_import',
  'manual_sync',
]);

const ALLOWED_IMPORT_STATUSES = new Set([
  'pending',
  'processing',
  'completed',
  'failed',
  'cancelled',
]);

const ALLOWED_ASSESSMENT_STATUSES = new Set([
  'pending',
  'in_progress',
  'completed',
  'failed',
  'rejected',
]);

const ALLOWED_OBJECTIVE_TYPES = new Set(['research', 'gap', 'concept', 'summary']);
const ALLOWED_PRIORITIES = new Set(['low', 'medium', 'high']);
const ALLOWED_OBJECTIVE_STATUSES = new Set(['draft', 'active', 'archived']);

const SCORE_FIELDS = [
  'recency_score',
  'methodology_alignment_score',
  'contribution_significance_score',
  'thematic_relevance_score',
  'overall_relevance_score',
];

async function assertUserCanAccessWorkspace(userId, workspaceId) {
  if (!userId || !workspaceId) {
    throw new Error('workspace_id and user_id are required');
  }

  const { data, error } = await supabase
    .from('group_members')
    .select('id')
    .eq('user_id', userId)
    .eq('group_id', workspaceId)
    .maybeSingle();

  if (error) {
    throw new Error('Failed to validate workspace membership: ' + error.message);
  }

  if (!data) {
    const accessError = new Error('User is not a member of this workspace');
    accessError.statusCode = 403;
    throw accessError;
  }
}

function normalizeImportType(value) {
  const normalized = String(value ?? '').trim();
  if (!normalized) {
    throw new Error('import_type is required');
  }

  const directValue = normalized;
  if (ALLOWED_IMPORT_TYPES.has(directValue)) {
    return directValue;
  }

  const legacyAliases = {
    workspace: 'workspace_snapshot',
    topic: 'topic_import',
    gap: 'gap_import',
    rrl: 'rrl_import',
    sync: 'manual_sync',
    queued: 'manual_sync',
  };

  const mapped = legacyAliases[normalized.toLowerCase()];
  if (mapped) {
    return mapped;
  }

  throw new Error(`Invalid import_type: ${value}. Allowed values: ${[...ALLOWED_IMPORT_TYPES].join(', ')}`);
}

function normalizeImportStatus(value) {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (!normalized) {
    return 'pending';
  }

  if (ALLOWED_IMPORT_STATUSES.has(normalized)) {
    return normalized;
  }

  const legacyAliases = {
    queued: 'pending',
    started: 'processing',
    success: 'completed',
    done: 'completed',
    error: 'failed',
    cancelled: 'cancelled',
  };

  if (legacyAliases[normalized]) {
    return legacyAliases[normalized];
  }

  throw new Error(`Invalid status: ${value}. Allowed values: ${[...ALLOWED_IMPORT_STATUSES].join(', ')}`);
}

function normalizeAssessmentStatus(value) {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (!normalized) {
    return 'pending';
  }

  if (ALLOWED_ASSESSMENT_STATUSES.has(normalized)) {
    return normalized;
  }

  const legacyAliases = {
    queued: 'pending',
    inprogress: 'in_progress',
    started: 'in_progress',
    pass: 'completed',
    success: 'completed',
    fail: 'failed',
    reject: 'rejected',
  };

  if (legacyAliases[normalized]) {
    return legacyAliases[normalized];
  }

  throw new Error(`Invalid assessment_status: ${value}. Allowed values: ${[...ALLOWED_ASSESSMENT_STATUSES].join(', ')}`);
}

function normalizeNumericScore(fieldName, value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`${fieldName} must be a number between 0 and 1`);
  }

  if (parsed < 0 || parsed > 1) {
    throw new Error(`${fieldName} must be between 0 and 1`);
  }

  return parsed;
}

function requireAllowedValue(fieldName, value, allowedValues, defaultValue = null) {
  const normalized = String(value ?? defaultValue ?? '').trim().toLowerCase();
  if (!normalized || !allowedValues.has(normalized)) {
    throw new Error(`Invalid ${fieldName}: ${value}. Allowed values: ${[...allowedValues].join(', ')}`);
  }
  return normalized;
}

function normalizeVersionNumber(value) {
  if (value === null || value === undefined || value === '') return 1;
  const version = Number(value);
  if (!Number.isInteger(version) || version < 1) {
    throw new Error('version_number must be a positive integer');
  }
  return version;
}

function normalizeImportPayload(data = {}) {
  const payload = {};

  const rawPayload = data.payload_json ?? data.payload ?? data.metadata ?? {};
  if (rawPayload && typeof rawPayload === 'object') {
    Object.assign(payload, rawPayload);
  }

  if (data.source_system !== undefined) {
    payload.source_system = data.source_system;
  }
  if (data.source_type !== undefined) {
    payload.source_type = data.source_type;
  }
  if (data.source_id !== undefined) {
    payload.source_id = data.source_id;
  }
  if (data.metadata !== undefined && typeof data.metadata === 'object') {
    Object.assign(payload, data.metadata);
  }

  return payload;
}

function normalizeIntegrationErrorRecord(data = {}, userId) {
  const payload = {
    import_id: data.import_id,
    workspace_id: data.workspace_id,
    user_id: userId,
    error_code: data.error_code ?? data.code ?? 'UNKNOWN_ERROR',
    error_message: data.error_message ?? data.message ?? 'Unknown error',
    error_details: data.error_details ?? data.details ?? null,
  };

  if (!payload.import_id) {
    throw new Error('import_id is required');
  }
  if (!payload.workspace_id) {
    throw new Error('workspace_id is required');
  }
  if (!payload.error_code) {
    payload.error_code = 'UNKNOWN_ERROR';
  }
  if (!payload.error_message) {
    payload.error_message = 'Unknown error';
  }

  return payload;
}

export async function createIntegrationImportService(data, userId) {
  const workspaceId = data?.workspace_id;
  if (!workspaceId) throw new Error('workspace_id is required');
  await assertUserCanAccessWorkspace(userId, workspaceId);

  const importRecord = {
    workspace_id: workspaceId,
    user_id: userId,
    source_system: String(data?.source_system ?? data?.sourceType ?? 'manual').trim() || 'manual',
    import_type: normalizeImportType(data?.import_type ?? data?.type ?? data?.source_type ?? data?.importType),
    status: normalizeImportStatus(data?.status ?? 'pending'),
    payload_json: normalizeImportPayload(data),
  };

  return createIntegrationImportRepo(importRecord);
}

export async function createIntegrationErrorService(data, userId) {
  const workspaceId = data?.workspace_id;
  if (workspaceId) {
    await assertUserCanAccessWorkspace(userId, workspaceId);
  }

  if (data?.import_id) {
    const importRow = await getIntegrationImportByIdRepo(data.import_id);
    if (!importRow) {
      throw new Error('Integration import not found');
    }
    await assertUserCanAccessWorkspace(userId, importRow.workspace_id);
  }

  return createIntegrationErrorRepo(normalizeIntegrationErrorRecord(data, userId));
}

export async function createRrlAssessmentService(data, userId) {
  const workspaceId = data?.workspace_id;
  if (!workspaceId) throw new Error('workspace_id is required');
  if (!userId) throw new Error('Authenticated user is required');
  await assertUserCanAccessWorkspace(userId, workspaceId);

  if (data?.import_id) {
    const importRow = await getIntegrationImportByIdRepo(data.import_id);
    if (!importRow) {
      throw new Error('Referenced integration_import not found');
    }
    if (importRow.workspace_id !== workspaceId) {
      throw new Error('import_id does not belong to the requested workspace');
    }
    if (importRow.user_id !== userId) {
      throw new Error('import_id does not belong to the authenticated user');
    }
  }

  if (data?.gap_id && data.gap_id !== null) {
    const gap = await supabase.from('GapResult').select('id, group_id').eq('id', data.gap_id).maybeSingle();
    if (gap.error) throw new Error('Failed to validate gap: ' + gap.error.message);
    if (!gap.data || gap.data.group_id !== workspaceId) {
      throw new Error('gap_id is not valid for this workspace');
    }
  }

  if (data?.topic_id && data.topic_id !== null) {
    const topic = await supabase.from('Topic').select('id, group_id').eq('id', data.topic_id).maybeSingle();
    if (topic.error) throw new Error('Failed to validate topic: ' + topic.error.message);
    if (!topic.data || topic.data.group_id !== workspaceId) {
      throw new Error('topic_id is not valid for this workspace');
    }
  }

  const assessmentRecord = {
    import_id: data?.import_id ?? null,
    workspace_id: workspaceId,
    user_id: userId,
    gap_id: data?.gap_id ?? null,
    topic_id: data?.topic_id ?? null,
    document_ref: data?.document_ref ?? null,
    assessment_status: normalizeAssessmentStatus(data?.assessment_status ?? 'pending'),
    recency_score: normalizeNumericScore('recency_score', data?.recency_score),
    methodology_alignment_score: normalizeNumericScore('methodology_alignment_score', data?.methodology_alignment_score),
    contribution_significance_score: normalizeNumericScore('contribution_significance_score', data?.contribution_significance_score),
    thematic_relevance_score: normalizeNumericScore('thematic_relevance_score', data?.thematic_relevance_score),
    overall_relevance_score: normalizeNumericScore('overall_relevance_score', data?.overall_relevance_score),
    score_summary: data?.score_summary ?? null,
    raw_result_json: data?.raw_result_json ?? null,
  };

  for (const field of SCORE_FIELDS) {
    if (assessmentRecord[field] !== null && assessmentRecord[field] !== undefined && !(assessmentRecord[field] >= 0 && assessmentRecord[field] <= 1)) {
      throw new Error(`${field} must be between 0 and 1`);
    }
  }

  return createRrlAssessmentRepo(assessmentRecord);
}

export async function createSmartObjectiveService(data, userId) {
  const workspaceId = data?.workspace_id;
  if (!workspaceId) throw new Error('workspace_id is required');
  await assertUserCanAccessWorkspace(userId, workspaceId);

  const objectiveRecord = {
    import_id: data?.import_id ?? null,
    workspace_id: workspaceId,
    user_id: userId,
    gap_id: data?.gap_id ?? null,
    topic_id: data?.topic_id ?? null,
    generation_id: data?.generation_id ?? null,
    version_number: normalizeVersionNumber(data?.version_number),
    is_current: data?.is_current ?? true,
    objective_text: data?.objective_text ?? null,
    objective_type: requireAllowedValue('objective_type', data?.objective_type, ALLOWED_OBJECTIVE_TYPES),
    priority: requireAllowedValue('priority', data?.priority, ALLOWED_PRIORITIES),
    status: requireAllowedValue('status', data?.status, ALLOWED_OBJECTIVE_STATUSES, 'draft'),
    gap_text: data?.gap_text ?? null,
    topic_text: data?.topic_text ?? null,
    metadata_json: data?.metadata_json ?? null,
  };

  return createSmartObjectiveRepo(objectiveRecord);
}

export async function fetchIntegrationImportsByWorkspaceService(workspaceId, userId) {
  await assertUserCanAccessWorkspace(userId, workspaceId);
  return getIntegrationImportsByWorkspaceRepo(workspaceId);
}

export async function fetchIntegrationImportByIdService(importId, userId) {
  const importRow = await getIntegrationImportByIdRepo(importId);
  if (!importRow) {
    throw new Error('Integration import not found');
  }

  await assertUserCanAccessWorkspace(userId, importRow.workspace_id);

  const errors = await getIntegrationErrorsByImportRepo(importId);

  return {
    ...importRow,
    errors,
  };
}

export async function fetchIntegrationErrorsByImportService(importId, userId) {
  const importRow = await getIntegrationImportByIdRepo(importId);
  if (!importRow) {
    throw new Error('Integration import not found');
  }

  await assertUserCanAccessWorkspace(userId, importRow.workspace_id);
  return getIntegrationErrorsByImportRepo(importId);
}

export async function fetchRrlAssessmentsByWorkspaceService(workspaceId, userId) {
  if (!workspaceId) throw new Error('workspace_id is required');
  await assertUserCanAccessWorkspace(userId, workspaceId);
  return getRrlAssessmentsByWorkspaceRepo(workspaceId);
}

export async function fetchRrlAssessmentByIdService(assessmentId, userId) {
  const assessment = await getRrlAssessmentByIdRepo(assessmentId);
  if (!assessment) {
    throw new Error('RRL assessment not found');
  }

  await assertUserCanAccessWorkspace(userId, assessment.workspace_id);
  return assessment;
}

export async function fetchSmartObjectivesByWorkspaceService(workspaceId, userId) {
  if (!workspaceId) throw new Error('workspace_id is required');
  if (!userId) throw new Error('Authenticated user is required');
  await assertUserCanAccessWorkspace(userId, workspaceId);
  return getSmartObjectivesByWorkspaceRepo(workspaceId);
}

export async function fetchSmartObjectiveByIdService(objectiveId, userId) {
  const objective = await getSmartObjectiveByIdRepo(objectiveId);
  if (!objective) throw new Error('Smart objective not found');
  await assertUserCanAccessWorkspace(userId, objective.workspace_id);
  return objective;
}

export async function updateSmartObjectiveService(objectiveId, data, userId) {
  const objective = await fetchSmartObjectiveByIdService(objectiveId, userId);
  const update = {};

  if (data?.status !== undefined) {
    update.status = requireAllowedValue('status', data.status, ALLOWED_OBJECTIVE_STATUSES);
  }
  if (data?.is_current !== undefined) {
    if (typeof data.is_current !== 'boolean') throw new Error('is_current must be a boolean');
    update.is_current = data.is_current;
  }
  if (data?.version_number !== undefined) {
    update.version_number = normalizeVersionNumber(data.version_number);
  }

  if (!Object.keys(update).length) throw new Error('At least one objective field is required');
  return updateSmartObjectiveRepo(objective.id, update);
}

export async function updateRrlAssessmentStatusService(assessmentId, assessmentStatus, userId) {
  const assessment = await getRrlAssessmentByIdRepo(assessmentId);
  if (!assessment) throw new Error('RRL assessment not found');
  await assertUserCanAccessWorkspace(userId, assessment.workspace_id);
  return updateRrlAssessmentStatusRepo(assessmentId, normalizeAssessmentStatus(assessmentStatus));
}
