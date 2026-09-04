import catalyst2Supabase from '../../common/config/catalyst2SupabaseClient.js';

export async function createIntegrationImportRepo(data) {
  const { data: result, error } = await catalyst2Supabase
    .from('integration_imports')
    .insert([data])
    .select()
    .single();

  if (error) throw new Error('Error creating integration_imports row: ' + error.message);
  return result;
}

export async function getIntegrationImportByIdRepo(importId) {
  const { data, error } = await catalyst2Supabase
    .from('integration_imports')
    .select('*')
    .eq('id', importId)
    .maybeSingle();

  if (error) throw new Error('Error fetching integration_imports row: ' + error.message);
  return data;
}

export async function createIntegrationErrorRepo(data) {
  const { data: result, error } = await catalyst2Supabase
    .from('integration_errors')
    .insert([data])
    .select()
    .single();

  if (error) throw new Error('Error creating integration_errors row: ' + error.message);
  return result;
}

export async function createRrlAssessmentRepo(data) {
  const { data: result, error } = await catalyst2Supabase
    .from('rrl_assessments')
    .insert([data])
    .select()
    .single();

  if (error) throw new Error('Error creating rrl_assessments row: ' + error.message);
  return result;
}

export async function getRrlAssessmentByIdRepo(assessmentId) {
  const { data, error } = await catalyst2Supabase
    .from('rrl_assessments')
    .select('*')
    .eq('id', assessmentId)
    .maybeSingle();

  if (error) throw new Error('Error fetching rrl_assessments row: ' + error.message);
  return data;
}

export async function updateRrlAssessmentStatusRepo(assessmentId, assessmentStatus) {
  const { data, error } = await catalyst2Supabase
    .from('rrl_assessments')
    .update({ assessment_status: assessmentStatus })
    .eq('id', assessmentId)
    .select()
    .single();

  if (error) throw new Error('Error updating rrl_assessments status: ' + error.message);
  return data;
}

export async function createSmartObjectiveRepo(data) {
  const { data: result, error } = await catalyst2Supabase
    .from('smart_objectives')
    .insert([data])
    .select()
    .single();

  if (error) throw new Error('Error creating smart_objectives row: ' + error.message);
  return result;
}

export async function getIntegrationImportsByWorkspaceRepo(workspaceId) {
  const { data, error } = await catalyst2Supabase
    .from('integration_imports')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });

  if (error) throw new Error('Error fetching integration_imports: ' + error.message);
  return data;
}

export async function getIntegrationErrorsByImportRepo(importId) {
  const { data, error } = await catalyst2Supabase
    .from('integration_errors')
    .select('*')
    .eq('import_id', importId)
    .order('created_at', { ascending: false });

  if (error) throw new Error('Error fetching integration_errors: ' + error.message);
  return data;
}

export async function getRrlAssessmentsByWorkspaceRepo(workspaceId) {
  const { data, error } = await catalyst2Supabase
    .from('rrl_assessments')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });

  if (error) throw new Error('Error fetching rrl_assessments: ' + error.message);
  return data;
}

export async function getSmartObjectivesByWorkspaceRepo(workspaceId) {
  const { data, error } = await catalyst2Supabase
    .from('smart_objectives')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });

  if (error) throw new Error('Error fetching smart_objectives: ' + error.message);
  return data;
}

export async function getSmartObjectiveByIdRepo(objectiveId) {
  const { data, error } = await catalyst2Supabase
    .from('smart_objectives')
    .select('*')
    .eq('id', objectiveId)
    .maybeSingle();

  if (error) throw new Error('Error fetching smart_objectives row: ' + error.message);
  return data;
}

export async function updateSmartObjectiveRepo(objectiveId, data) {
  const { data: result, error } = await catalyst2Supabase
    .from('smart_objectives')
    .update(data)
    .eq('id', objectiveId)
    .select()
    .single();

  if (error) throw new Error('Error updating smart_objectives row: ' + error.message);
  return result;
}
