import {
  createIntegrationImportService,
  createIntegrationErrorService,
  createRrlAssessmentService,
  createSmartObjectiveService,
  fetchIntegrationImportsByWorkspaceService,
  fetchIntegrationImportByIdService,
  fetchIntegrationErrorsByImportService,
  fetchRrlAssessmentByIdService,
  fetchRrlAssessmentsByWorkspaceService,
  fetchSmartObjectivesByWorkspaceService,
  fetchSmartObjectiveByIdService,
  updateSmartObjectiveService,
  updateRrlAssessmentStatusService,
} from './catalyst2.service.js';

export async function createIntegrationImportController(req, res, next) {
  try {
    const data = req.body;
    const result = await createIntegrationImportService(data, req.user.id);
    return res.status(201).json({ success: true, data: result });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ success: false, message: err.message, data: null });
  }
}

export async function createIntegrationErrorController(req, res, next) {
  try {
    const data = req.body;
    const result = await createIntegrationErrorService(data, req.user.id);
    return res.status(201).json({ success: true, data: result });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ success: false, message: err.message, data: null });
  }
}

export async function createRrlAssessmentController(req, res, next) {
  try {
    const data = req.body;
    const result = await createRrlAssessmentService(data, req.user.id);
    return res.status(201).json({ success: true, data: result });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ success: false, message: err.message, data: null });
  }
}

export async function createSmartObjectiveController(req, res, next) {
  try {
    const data = req.body;
    const result = await createSmartObjectiveService(data, req.user.id);
    return res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function updateRrlAssessmentStatusController(req, res, next) {
  try {
    const result = await updateRrlAssessmentStatusService(
      req.params.assessmentId,
      req.body?.assessment_status,
      req.user.id
    );
    return res.json({ success: true, data: result });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ success: false, message: err.message, data: null });
  }
}

export async function getIntegrationImportsByWorkspaceController(req, res, next) {
  try {
    const { workspaceId } = req.params;
    const result = await fetchIntegrationImportsByWorkspaceService(workspaceId, req.user.id);
    return res.json({ success: true, data: result });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ success: false, message: err.message, data: null });
  }
}

export async function getIntegrationImportByIdController(req, res, next) {
  try {
    const { importId } = req.params;
    const result = await fetchIntegrationImportByIdService(importId, req.user.id);
    return res.json({ success: true, data: result });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ success: false, message: err.message, data: null });
  }
}

export async function getIntegrationErrorsByImportController(req, res, next) {
  try {
    const { importId } = req.params;
    const result = await fetchIntegrationErrorsByImportService(importId, req.user.id);
    return res.json({ success: true, data: result });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ success: false, message: err.message, data: null });
  }
}

export async function getRrlAssessmentsByWorkspaceController(req, res, next) {
  try {
    const { workspaceId } = req.params;
    const result = await fetchRrlAssessmentsByWorkspaceService(workspaceId, req.user.id);
    return res.json({ success: true, data: result });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ success: false, message: err.message, data: null });
  }
}

export async function getRrlAssessmentByIdController(req, res, next) {
  try {
    const { assessmentId } = req.params;
    const result = await fetchRrlAssessmentByIdService(assessmentId, req.user.id);
    return res.json({ success: true, data: result });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ success: false, message: err.message, data: null });
  }
}

export async function getSmartObjectivesByWorkspaceController(req, res, next) {
  try {
    const { workspaceId } = req.params;
    const result = await fetchSmartObjectivesByWorkspaceService(workspaceId, req.user.id);
    return res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function getSmartObjectiveByIdController(req, res, next) {
  try {
    const result = await fetchSmartObjectiveByIdService(req.params.objectiveId, req.user.id);
    return res.json({ success: true, data: result });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ success: false, message: err.message, data: null });
  }
}

export async function updateSmartObjectiveController(req, res, next) {
  try {
    const result = await updateSmartObjectiveService(req.params.objectiveId, req.body, req.user.id);
    return res.json({ success: true, data: result });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ success: false, message: err.message, data: null });
  }
}
