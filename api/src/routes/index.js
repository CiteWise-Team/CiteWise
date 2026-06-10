import express from 'express';
const router = express.Router();

// modules

// default health check
router.get('/', (req, res) => res.json({ ok: true, version: '1.0' }));

export default router;
