import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { store } from '../db/store.ts';
import { createSession, destroySession, requireAuth, AuthenticatedRequest } from '../services/auth.ts';

export const authRouter = Router();

// Check system initialization state
authRouter.get('/status', (req, res) => {
  const users = store.getUsers();
  const hasAdmin = users.some(u => u.roleId === 'role_admin' && u.status === 'active');
  const settings = store.getSettings();
  const isInitialized = hasAdmin || Boolean(settings.isInitialized);

  res.json({
    isInitialized,
    hasAdmin,
    settings: {
      ...settings,
      isInitialized
    }
  });
});

// First-run installation wizard endpoint
authRouter.post('/setup', (req, res) => {
  const users = store.getUsers();
  const hasAdmin = users.some(u => u.roleId === 'role_admin');
  if (hasAdmin) {
    return res.status(400).json({ error: 'System has already been initialized with an administrator. Please sign in with your credentials.' });
  }

  const {
    organization,
    structure,
    masterData,
    admin
  } = req.body;

  if (!admin?.username || !admin?.password || !admin?.email) {
    return res.status(400).json({ error: 'Administrator username, email, and password are required.' });
  }

  if (admin.password.length < 6) {
    return res.status(400).json({ error: 'Administrator password must be at least 6 characters long.' });
  }

  try {
    store.transaction((tx) => {
      // 1. Update organization settings
      if (organization) {
        tx.updateSettings({
          organizationName: organization.name || 'Metro Transit Maintenance',
          maintenanceDepartment: organization.department || 'Maintenance Division',
          timeZone: organization.timeZone || 'UTC',
          dateFormat: organization.dateFormat || 'YYYY-MM-DD',
          language: organization.language || 'en',
          currency: organization.currency || 'USD',
          isInitialized: true
        }, { id: 'setup_wizard', name: admin.fullName || admin.username });
      }

      // 2. Set structure levels
      if (structure?.levels && Array.isArray(structure.levels) && structure.levels.length > 0) {
        tx.setStructureLevels(structure.levels, { id: 'setup_wizard', name: admin.fullName || admin.username });
      }

      // 3. Create initial master data or demonstration data
      if (masterData?.seedSampleData) {
        tx.seedInitialMetroDemonstrationData(admin.fullName || admin.username);
      } else {
        // Create custom equipment types if provided
        if (masterData?.equipmentTypes && Array.isArray(masterData.equipmentTypes)) {
          for (const eqType of masterData.equipmentTypes) {
            tx.createEquipmentType({
              code: eqType.code,
              name: eqType.name,
              description: eqType.description,
              status: 'active'
            }, { id: 'setup_wizard', name: admin.fullName || admin.username });
          }
        }
      }

      // 4. Create the first administrator
      const newAdmin = tx.createUser({
        username: admin.username.trim(),
        fullName: admin.fullName?.trim() || admin.username.trim(),
        email: admin.email.trim(),
        roleId: 'role_admin',
        password: admin.password
      }, { id: 'setup_wizard', name: 'First-Run Setup Wizard' });

      // Record audit
      tx.logAudit({
        user: newAdmin.username,
        userName: newAdmin.fullName,
        action: 'SYSTEM_INITIALIZATION',
        module: 'Administration',
        entity: 'System',
        entityId: 'root',
        newValue: 'INITIALIZED',
        details: `Initial setup completed. First administrator account created for ${newAdmin.username}.`
      });

      // Create session for immediate login
      const token = createSession(newAdmin.id);

      const adminRole = store.getRoles().find(r => r.id === 'role_admin');

      return res.status(201).json({
        message: 'System successfully initialized',
        token,
        user: {
          ...newAdmin,
          roleName: adminRole?.name || 'Administrator',
          permissions: adminRole?.permissions || ['*']
        }
      });
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Initialization failed' });
  }
});

// Login
authRouter.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const rawUser = store.getUserByUsername(username);
  if (!rawUser) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  if (rawUser.status !== 'active') {
    return res.status(403).json({ error: `Account is ${rawUser.status}. Contact an administrator.` });
  }

  const isMatch = bcrypt.compareSync(password, rawUser.passwordHash);
  if (!isMatch) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  // Update last login
  store.updateUser(rawUser.id, { lastLogin: new Date().toISOString() }, { id: rawUser.id, name: rawUser.fullName });

  const token = createSession(rawUser.id);
  const roles = store.getRoles();
  const role = roles.find(r => r.id === rawUser.roleId);

  const { passwordHash: _, ...safeUser } = rawUser;

  res.json({
    token,
    user: {
      ...safeUser,
      roleName: role?.name || rawUser.roleId,
      permissions: role?.permissions || []
    }
  });
});

// Quick switch user endpoint for testing & role simulation
authRouter.post('/switch-user', (req, res) => {
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }

  const rawUser = store.getUserByUsername(username);
  if (!rawUser) {
    return res.status(404).json({ error: `User "${username}" not found in system` });
  }

  if (rawUser.status !== 'active') {
    return res.status(403).json({ error: `Account "${username}" is ${rawUser.status}` });
  }

  const token = createSession(rawUser.id);
  const roles = store.getRoles();
  const role = roles.find(r => r.id === rawUser.roleId);

  const { passwordHash: _, ...safeUser } = rawUser;

  res.json({
    token,
    user: {
      ...safeUser,
      roleName: role?.name || rawUser.roleId,
      permissions: role?.permissions || []
    }
  });
});

// Logout
authRouter.post('/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined;
  if (token) {
    destroySession(token);
  }
  res.json({ message: 'Logged out successfully' });
});

// Get current user profile
authRouter.get('/me', requireAuth, (req: AuthenticatedRequest, res) => {
  res.json({ user: req.user });
});
