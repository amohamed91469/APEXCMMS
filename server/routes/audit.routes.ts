import { Router } from 'express';
import { store } from '../db/store.ts';
import { requireAuth, requirePermission } from '../services/auth.ts';

export const auditRouter = Router();

auditRouter.use(requireAuth);
auditRouter.use(requirePermission('audit:view'));

// Query audit logs
auditRouter.get('/', (req, res) => {
  const { module, action, limit, offset } = req.query;
  const result = store.getAuditLogs({
    module: module as string,
    action: action as string,
    limit: limit ? parseInt(limit as string, 10) : 100,
    offset: offset ? parseInt(offset as string, 10) : 0
  });

  res.json(result);
});
