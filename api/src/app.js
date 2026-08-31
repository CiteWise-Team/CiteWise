import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import routes from './routes/index.js';
import authRoutes from './modules/auth/auth.routes.js';
import errorHandler from './common/middlewares/errorHandler.js';
import groupRoutes from './modules/groups/group.routes.js';
import extractorRoutes from './modules/extractor/extractor.routes.js';
import summarizerRoutes from './modules/summarizer/summarizer.router.js';
import gapRoutes from './modules/gap/gap.routes.js';
import topicRoutes from './modules/topic/topic.routes.js';

// CiteWise modules (ported from Spring Boot)
import catalystCwRoutes  from './modules/citewise/catalyst.routes.js';
import rrlRoutes         from './modules/citewise/rrl.routes.js';
import documentsRoutes   from './modules/citewise/documents.routes.js';
import synthesisRoutes   from './modules/citewise/synthesis.routes.js';

const app = express();

// Define allowed origins for CORS
const allowedOrigins = [
  'http://localhost:5173',               // Local development
  'http://localhost:3000',
  'https://catalyst-nu-gilt.vercel.app',  // Production frontend
  'https://citewise-seven.vercel.app'
];

if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

// Configure CORS middleware
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (e.g. same-server health checks)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'), false);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Session-Id'],
    credentials: true // Enable if using cookies/sessions
  })
);

// Rate limiting is mounted AFTER cors() on purpose. When a limiter rejects a
// request before the CORS headers are attached, the browser discards the 429 and
// the frontend only ever sees an opaque "TypeError: Failed to fetch" instead of
// the "Too many requests" message. Preflights are answered by cors() above and
// never reach the limiter, so they no longer consume a client's budget either.

// General API budget. The CiteWise assessment dashboard polls document status
// every 5s (~120 req / 10 min per open tab), so this ceiling has to sit well
// clear of normal polling or ordinary use trips it within minutes.
const apiLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 1200,
  message: { success: false, message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS',
});

// The endpoints that actually cost AI credits get their own, much tighter budget.
// This is what the original global limiter was trying to protect.
const aiLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 40,
  message: { success: false, message: 'Too many AI requests in a short period. Please wait a few minutes before generating again.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS',
});

app.use('/api', apiLimiter);
app.use('/api/v1/synthesis/generate', aiLimiter);
app.use('/api/v1/synthesis/paraphrase', aiLimiter);
app.use('/api/v1/documents/assess-batch', aiLimiter);

app.get('/status', (_req, res) => {
  res.json({
    status: 'Running',
    timestamp: new Date().toISOString()
  });
});

app.get('/', (_req, res) => {
  res.send('Backend is running!');
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/api', routes);
app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/extractor', extractorRoutes);
app.use('/api/summarizer', summarizerRoutes);
app.use('/api/gap', gapRoutes);
app.use('/api/topic', topicRoutes);

// CiteWise routes
app.use('/api/catalyst', catalystCwRoutes);
app.use('/api/rrl',      rrlRoutes);
app.use('/api/v1/documents', documentsRoutes);
app.use('/api/v1/synthesis', synthesisRoutes);

app.use(errorHandler);

export default app;