import express from 'express';
import { signup, login, refresh, logout } from './auth.controller.js';
import requireAuth from '../../common/middlewares/auth.middleware.js';

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', requireAuth, logout);

export default router;
