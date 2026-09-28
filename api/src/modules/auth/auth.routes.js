import express from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { signup, login, refresh, logout } from './auth.controller.js';
import requireAuth from '../../common/middlewares/auth.middleware.js';

const router = express.Router();

// Keyed on IP + email so one campus NAT full of students does not share a
// single budget, while guessing passwords for one account is still throttled.
// Only failed attempts count.
const credentialLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => `${ipKeyGenerator(req.ip)}:${String(req.body?.email || '').trim().toLowerCase()}`,
  message: { error: 'Too many attempts. Please wait 15 minutes and try again.', message: 'Too many attempts. Please wait 15 minutes and try again.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/signup', credentialLimiter, signup);
router.post('/login', credentialLimiter, login);
router.post('/refresh', refresh);
router.post('/logout', requireAuth, logout);

export default router;
