import express from 'express';
import cors from 'cors';
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
  'https://catalyst-nu-gilt.vercel.app'  // Production frontend
];

// Configure CORS middleware
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.indexOf(origin) === -1) {
        const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Session-Id'],
    credentials: true // Enable if using cookies/sessions
  })
);

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