import express from 'express';
import requireAuth from '../../common/middlewares/auth.middleware.js';
import {
  createIntegrationImportController,
  createIntegrationErrorController,
  createRrlAssessmentController,
  createSmartObjectiveController,
  getIntegrationImportsByWorkspaceController,
  getIntegrationImportByIdController,
  getIntegrationErrorsByImportController,
  getRrlAssessmentsByWorkspaceController,
  getRrlAssessmentByIdController,
  updateRrlAssessmentStatusController,
  getSmartObjectivesByWorkspaceController,
  getSmartObjectiveByIdController,
  updateSmartObjectiveController,
} from './catalyst2.controller.js';

const router = express.Router();

router.use(requireAuth);

router.post('/integration-imports', createIntegrationImportController);
router.get('/integration-imports/workspace/:workspaceId', getIntegrationImportsByWorkspaceController);
router.get('/integration-imports/:importId', getIntegrationImportByIdController);

router.post('/integration-errors', createIntegrationErrorController);
router.get('/integration-errors/import/:importId', getIntegrationErrorsByImportController);

router.post('/rrl-assessments', createRrlAssessmentController);
router.get('/rrl-assessments/workspace/:workspaceId', getRrlAssessmentsByWorkspaceController);
router.get('/rrl-assessments/:assessmentId', getRrlAssessmentByIdController);
router.patch('/rrl-assessments/:assessmentId/status', updateRrlAssessmentStatusController);

router.post('/smart-objectives', createSmartObjectiveController);
router.get('/smart-objectives/workspace/:workspaceId', getSmartObjectivesByWorkspaceController);
router.get('/smart-objectives/:objectiveId', getSmartObjectiveByIdController);
router.patch('/smart-objectives/:objectiveId', updateSmartObjectiveController);

export default router;
