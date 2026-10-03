import { Router } from 'express';
import { store } from '../db/store.ts';
import { requireAuth, requirePermission, AuthenticatedRequest } from '../services/auth.ts';

export const usersRouter = Router();

usersRouter.use(requireAuth);

// Roles list accessible to all authenticated users so role names and capabilities are visible
usersRouter.get('/roles/list', (req, res) => {
  const roles = store.getRoles();
  res.json({ roles });
});

usersRouter.get('/roles', (req, res) => {
  const roles = store.getRoles();
  res.json({ roles });
});

// User management endpoints - restricted to Admin / users:manage
usersRouter.get('/', requirePermission('users:manage'), (req, res) => {
  const users = store.getUsers();
  res.json({ users });
});

usersRouter.post('/', requirePermission('users:manage'), (req: AuthenticatedRequest, res) => {
  const { username, fullName, email, phone, employeeId, roleId, password } = req.body;
  if (!username || !fullName || !email || !roleId || !password) {
    return res.status(400).json({ error: 'Username, full name, email, role, and password are required.' });
  }

  try {
    const newUser = store.createUser({
      username: username.trim(),
      fullName: fullName.trim(),
      email: email.trim(),
      phone,
      employeeId,
      roleId,
      password
    }, {
      id: req.user!.id,
      name: req.user!.fullName
    });

    res.status(201).json({ user: newUser, message: 'User created successfully' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to create user' });
  }
});

usersRouter.put('/:id', requirePermission('users:manage'), (req: AuthenticatedRequest, res) => {
  try {
    const updated = store.updateUser(req.params.id, req.body, {
      id: req.user!.id,
      name: req.user!.fullName
    });
    res.json({ user: updated, message: 'User updated successfully' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to update user' });
  }
});

// Roles mutation endpoints - restricted to Admin / roles:manage
usersRouter.post('/roles', requirePermission('roles:manage'), (req: AuthenticatedRequest, res) => {
  const { name, description, permissions } = req.body;
  if (!name || !permissions || !Array.isArray(permissions)) {
    return res.status(400).json({ error: 'Role name and permissions array are required' });
  }

  try {
    const role = store.createRole({ name: name.trim(), description: description?.trim() || '', permissions }, {
      id: req.user!.id,
      name: req.user!.fullName
    });
    res.status(201).json({ role, message: 'Role created successfully' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to create role' });
  }
});

usersRouter.put('/roles/:id', requirePermission('roles:manage'), (req: AuthenticatedRequest, res) => {
  try {
    const role = store.updateRole(req.params.id, req.body, {
      id: req.user!.id,
      name: req.user!.fullName
    });
    res.json({ role, message: 'Role updated successfully' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to update role' });
  }
});

usersRouter.delete('/roles/:id', requirePermission('roles:manage'), (req: AuthenticatedRequest, res) => {
  try {
    store.deleteRole(req.params.id, {
      id: req.user!.id,
      name: req.user!.fullName
    });
    res.json({ message: 'Role deleted successfully' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to delete role' });
  }
});
