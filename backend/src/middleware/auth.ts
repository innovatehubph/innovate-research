/**
 * Authentication Middleware
 * Handles JWT verification and user context
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'innovate_research_jwt_secret_2026_super_secure';

// Extend Express Request with user
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    plan: string;
    credits: number;
  };
  token?: string;
}

// JWT payload type
interface JWTPayload {
  userId?: string;
  sub?: string;
  email: string;
  iat?: number;
  exp?: number;
}

function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  return null;
}

function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Required authentication middleware
 */
export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = extractToken(req);

    if (!token) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'NO_TOKEN',
      });
    }

    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({
        error: 'Invalid or expired token',
        code: 'INVALID_TOKEN',
      });
    }

    // Get user ID from token (support both 'userId' and 'sub')
    const userId = decoded.userId || decoded.sub;
    
    if (!userId) {
      return res.status(401).json({
        error: 'Invalid token payload',
        code: 'INVALID_TOKEN',
      });
    }

    // Verify user exists in database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        plan: true,
        credits: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND',
      });
    }

    // Attach user to request
    req.user = user;
    req.token = token;

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      error: 'Authentication failed',
      code: 'AUTH_ERROR',
    });
  }
};

/**
 * Optional auth - doesn't fail if no token
 */
export const optionalAuthMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = extractToken(req);
    if (token) {
      const decoded = verifyToken(token);
      if (decoded) {
        const userId = decoded.userId || decoded.sub;
        if (userId) {
          const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, name: true, plan: true, credits: true },
          });
          if (user) {
            req.user = user;
            req.token = token;
          }
        }
      }
    }
    next();
  } catch {
    next();
  }
};

/**
 * Admin middleware - checks if user is admin
 */
export const adminMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  // For now, admin is determined by email domain
  if (req.user.email.endsWith('@innovatehub.ph')) {
    return next();
  }
  
  return res.status(403).json({ error: 'Admin access required' });
};

/**
 * Generate JWT token
 */
export function generateToken(userId: string, email: string): string {
  return jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '7d' });
}

export function generateRefreshToken(userId: string): string {
  return jwt.sign({ userId, type: 'refresh' }, JWT_SECRET, { expiresIn: '30d' });
}

export function verifyRefreshToken(token: string): string | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (decoded.type === 'refresh') {
      return decoded.userId;
    }
    return null;
  } catch {
    return null;
  }
}
