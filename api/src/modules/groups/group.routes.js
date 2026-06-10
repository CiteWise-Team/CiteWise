import express from 'express';
import { groupCreation,getGroupDetails,getJoinCode, joinGroup,getGroupsById, setRequestStatus, updateGroup, deleteGroup     } from './group.controller.js';

const router = express.Router();

router.post('/create', groupCreation);
// router.get('/:groupId', getGroupDetails);
router.get('/join/:joinCode', getJoinCode);
router.post('/join', joinGroup);
router.get('/:id', getGroupsById);


router.post('/accept/:requestId', setRequestStatus);
router.put('/update/:id', updateGroup);
router.delete('/delete/:id', deleteGroup);


export default router;