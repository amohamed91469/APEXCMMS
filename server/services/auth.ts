import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { store } from '../db/store.ts';
import { User, Role } from '../../src/types/cmms.ts';

// In-memory active session store
interface SessionData {
  userId: string;
  createdAt: number;
  expiresAt: number;
}

const sessions = new Map<string, SessionData>();

// Session TTL: 7 days
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface AuthenticatedRequest extends Request {
  user?: User & { permissions: string[] };
}

export function createSession(userId: string): string {
  const token = crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  sessions.set(token, {
    userId,
    createdAt: now,
    expiresAt: now + SESSION_TTL_MS
  });
  return token;
}

export function destroySession(token: string) {
  sessions.delete(token);
}

export function getUserFromToken(token?: string): (User & { permissions: string[] }) | null {
  if (!token) return null;
  const session = sessions.get(token);
  if (!session) return null;

  if (Date.now() > session.expiresAt) {
    sessions.delete(token);
    return null;
  }

  const rawUser = store.getUserById(session.userId);
  if (!rawUser || rawUser.status !== 'active') {
    return null;
  }

  const roles = store.getRoles();
  const role = roles.find(r => r.id === rawUser.roleId);
  const permissions = role ? role.permissions : [];

  const { passwordHash: _, ...safeUser } = rawUser;
  return {
    ...safeUser,
    roleName: role?.name || rawUser.roleId,
    permissions
  };
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined;

  const user = getUserFromToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized. Valid login session required.' });
  }

  req.user = user;
  next();
}

export function requirePermission(permission: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    // Role admin has all permissions
    if (req.user.roleId === 'role_admin' || req.user.permissions.includes('*') || req.user.permissions.includes(permission)) {
      return next();
    }

    return res.status(403).json({
      error: `Forbidden. Missing required permission: "${permission}"`
    });
  };
}

export function requireAdminOnly(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || (req.user.roleId !== 'role_admin' && !req.user.permissions.includes('users:manage'))) {
    return res.status(403).json({
      error: 'Access denied. Administrative privileges required to manage users and roles.'
    });
  }
  next();
}
