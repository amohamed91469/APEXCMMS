import { Router } from 'express';
import { store } from '../db/store.ts';
import { requireAuth, requirePermission, AuthenticatedRequest, destroyAllSessions } from '../services/auth.ts';

export const settingsRouter = Router();

settingsRouter.use(requireAuth);

settingsRouter.get('/', (req, res) => {
  res.json({ settings: store.getSettings() });
});

settingsRouter.put('/', requirePermission('settings:manage'), (req: AuthenticatedRequest, res) => {
  try {
    const updated = store.updateSettings(req.body, { id: req.user!.id, name: req.user!.fullName });
    res.json({ settings: updated, message: 'Settings saved' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to update settings' });
  }
});

// Widgets
settingsRouter.get('/widgets', (req, res) => {
  res.json({ widgets: store.getDashboardWidgets() });
});

settingsRouter.put('/widgets', requirePermission('settings:manage'), (req, res) => {
  const { widgets } = req.body;
  if (!Array.isArray(widgets)) {
    return res.status(400).json({ error: 'Widgets array expected' });
  }
  const updated = store.updateDashboardWidgets(widgets);
  res.json({ widgets: updated });
});

// Sample Data Management
settingsRouter.post('/clear-sample-data', requirePermission('settings:manage'), (req: AuthenticatedRequest, res) => {
  try {
    store.clearSampleData({ id: req.user!.id, name: req.user!.fullName });
    res.json({ message: 'All demonstration records have been cleared from the database.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to clear sample data' });
  }
});

settingsRouter.post('/seed-sample-data', requirePermission('settings:manage'), (req: AuthenticatedRequest, res) => {
  try {
    store.seedInitialMetroDemonstrationData(req.user!.fullName);
    res.json({ message: 'Metro AFC demonstration dataset has been loaded.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to seed sample data' });
  }
});

// Full System Factory Reset & Data Purge (Clears all records, users, and hierarchy, restarts installation wizard)
settingsRouter.post('/factory-reset', requirePermission('settings:manage'), (req: AuthenticatedRequest, res) => {
  try {
    const actorName = req.user ? `${req.user.fullName} (${req.user.username})` : 'Administrator';
    store.factoryReset(actorName);
    destroyAllSessions();
    res.json({ success: true, message: 'System has been completely reset. All data cleared. Installation wizard will now launch.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to factory reset system' });
  }
});
