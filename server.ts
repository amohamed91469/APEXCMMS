import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

import { authRouter } from './server/routes/auth.routes.ts';
import { structureRouter } from './server/routes/structure.routes.ts';
import { equipmentRouter } from './server/routes/equipment.routes.ts';
import { faultsRouter } from './server/routes/faults.routes.ts';
import { analyticsRouter } from './server/routes/analytics.routes.ts';
import { importExportRouter } from './server/routes/import-export.routes.ts';
import { usersRouter } from './server/routes/users.routes.ts';
import { masterDataRouter } from './server/routes/masterdata.routes.ts';
import { auditRouter } from './server/routes/audit.routes.ts';
import { settingsRouter } from './server/routes/settings.routes.ts';
import { modulesRouter } from './server/routes/modules.routes.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const isProd = process.env.NODE_ENV === 'production';

  // Body parsers with large limits for Excel imports
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // API Routes
  app.use('/api/auth', authRouter);
  app.use('/api/structure', structureRouter);
  app.use('/api/equipment', equipmentRouter);
  app.use('/api/faults', faultsRouter);
  app.use('/api/analytics', analyticsRouter);
  app.use('/api/data', importExportRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/masterdata', masterDataRouter);
  app.use('/api/audit', auditRouter);
  app.use('/api/settings', settingsRouter);
  app.use('/api/modules', modulesRouter);

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`ApexCMMS server running on http://0.0.0.0:${port}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start ApexCMMS server:', err);
  process.exit(1);
});
