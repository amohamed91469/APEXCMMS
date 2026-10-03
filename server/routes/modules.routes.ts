import { Router } from 'express';
import { store } from '../db/store.ts';
import { requireAuth, requireAdminOnly, AuthenticatedRequest } from '../services/auth.ts';

export const modulesRouter = Router();

modulesRouter.use(requireAuth);

modulesRouter.get('/', (req, res) => {
  res.json({ modules: store.getModules() });
});

modulesRouter.patch('/:id/toggle', requireAdminOnly, (req: AuthenticatedRequest, res) => {
  const { enabled } = req.body;
  if (typeof enabled !== 'boolean') {
    return res.status(400).json({ error: 'Boolean "enabled" value required' });
  }

  try {
    const mod = store.toggleModule(req.params.id, enabled, {
      id: req.user!.id,
      name: req.user!.fullName
    });
    res.json({ module: mod });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to toggle module' });
  }
});
