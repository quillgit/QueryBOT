import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import swaggerUi from 'swagger-ui-express';
import openapi from './docs/openapi.js';
import js2xmlparser from 'js2xmlparser';
import { fileURLToPath } from 'url';
import queryRoutes from './routes/queryRoutes.js';
import authRoutes from './routes/authRoutes.js';
import { loadActiveJobs } from './scheduler.js';
import db, { ensureSchema, createDatabaseIfNotExists } from './db.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err?.message || err);
});
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason?.message || reason);
});

app.use(cors());
app.use(express.json({ limit: '2mb' }));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api', queryRoutes);

// Swagger UI and spec endpoints
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapi));
app.get('/swagger.json', (_req, res) => res.json(openapi));
app.get('/swagger.yaml', (_req, res) => {
  res.type('text/yaml');
  res.send(`# OpenAPI served as YAML is not implemented; use /swagger.json or /swagger.xml`);
});
app.get('/swagger.xml', (_req, res) => {
  try {
    const xml = js2xmlparser.parse('openapi', openapi);
    res.type('application/xml').send(xml);
  } catch (e) {
    res.status(500).json({ error: 'Failed to generate XML' });
  }
});

// Serve built frontend if available; otherwise, skip (use Vite dev server separately)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDist = path.join(__dirname, 'frontend', 'dist');
const indexHtml = path.join(frontendDist, 'index.html');
if (fs.existsSync(indexHtml)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    return res.sendFile(indexHtml);
  });
} else {
  console.warn('Frontend build not found, skipping static serving:', indexHtml);
  console.warn('Run the frontend dev server (npm run frontend) at http://localhost:5173/ or build the frontend.');
}

app.listen(port, async () => {
  console.log(`Server listening on http://localhost:${port}`);
  try {
    await createDatabaseIfNotExists();
    await ensureSchema();
    console.log('Database schema ensured');
    await loadActiveJobs();
    console.log('Active jobs loaded');
  } catch (e) {
    console.error('Startup error:', e.message);
  }
});