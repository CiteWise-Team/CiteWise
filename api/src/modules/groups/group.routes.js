import express from 'express';
import { groupCreation,getGroupDetails,getJoinCode, joinGroup,getGroupsById, setRequestStatus, updateGroup, deleteGroup     } from './group.controller.js';
import requireAuth from '../../common/middlewares/auth.middleware.js';

const router = express.Router();

// Every route here exposes or mutates a workspace, including its private join
// code, so none of them may be reached without a session.
router.use(requireAuth);

router.post('/create', groupCreation);
// router.get('/:groupId', getGroupDetails);
router.get('/join/:joinCode', getJoinCode);
router.post('/join', joinGroup);
router.get('/:id', getGroupsById);


router.post('/accept/:requestId', setRequestStatus);
router.put('/update/:id', updateGroup);
router.delete('/delete/:id', deleteGroup);


export default router;