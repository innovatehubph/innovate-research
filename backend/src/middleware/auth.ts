/**
 * Authentication Middleware
 * Handles JWT verification and user context
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';

// Extend Express Request with user
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name?: string;
    role?: string;
  };
  token?: string;
}

// JWT payload type
interface JWTPayload {
  sub: string;
  email: string;
  name?: string;
  role?: string;
  iat?: number;
  exp?: number;
}

/**
 * Required authentication middleware
 * Returns 401 if not authenticated
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

    // Verify user exists in database
    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        error: 'Account is disabled',
        code: 'ACCOUNT_DISABLED',
      });
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name || undefined,
      role: user.role || undefined,
    };
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
 * Optional authentication middleware
 * Continues even if not authenticated
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
        const user = await prisma.user.findUnique({
          where: { id: decoded.sub },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            isActive: true,
          },
        });

        if (user && user.isActive) {
          req.user = {
            id: user.id,
            email: user.email,
            name: user.name || undefined,
            role: user.role || undefined,
          };
          req.token = token;
        }
      }
    }

    next();
  } catch (error) {
    // Continue without auth on error
    next();
  }
};

/**
 * Admin-only middleware
 * Requires user to have admin role
 */
export const adminMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  // First check if authenticated
  await authMiddleware(req, res, () => {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        error: 'Admin access required',
        code: 'NOT_ADMIN',
      });
    }
    next();
  });
};

/**
 * API Key authentication middleware
 * For machine-to-machine authentication
 */
export const apiKeyMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
      return res.status(401).json({
        error: 'API key required',
        code: 'NO_API_KEY',
      });
    }

    // Verify API key in database
    const key = await prisma.apiKey.findUnique({
      where: { key: apiKey },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            isActive: true,
          },
        },
      },
    });

    if (!key) {
      return res.status(401).json({
        error: 'Invalid API key',
        code: 'INVALID_API_KEY',
      });
    }

    if (!key.isActive) {
      return res.status(401).json({
        error: 'API key is disabled',
        code: 'API_KEY_DISABLED',
      });
    }

    if (key.expiresAt && key.expiresAt < new Date()) {
      return res.status(401).json({
        error: 'API key has expired',
        code: 'API_KEY_EXPIRED',
      });
    }

    // Update last used
    await prisma.apiKey.update({
      where: { id: key.id },
      data: { lastUsedAt: new Date() },
    });

    req.user = {
      id: key.user.id,
      email: key.user.email,
      name: key.user.name || undefined,
      role: key.user.role || undefined,
    };

    next();
  } catch (error) {
    console.error('API key middleware error:', error);
    return res.status(500).json({
      error: 'Authentication failed',
      code: 'AUTH_ERROR',
    });
  }
};

/**
 * Combined auth middleware (JWT or API Key)
 */
export const flexibleAuthMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const hasApiKey = !!req.headers['x-api-key'];
  const hasToken = !!extractToken(req);

  if (hasApiKey) {
    return apiKeyMiddleware(req, res, next);
  }

  if (hasToken) {
    return authMiddleware(req, res, next);
  }

  return res.status(401).json({
    error: 'Authentication required',
    code: 'NO_AUTH',
  });
};

/**
 * Extract JWT token from request
 */
function extractToken(req: Request): string | null {
  // Check Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  // Check cookie
  const cookieToken = req.cookies?.token;
  if (cookieToken) {
    return cookieToken;
  }

  // Check query parameter (for websockets)
  const queryToken = req.query.token as string;
  if (queryToken) {
    return queryToken;
  }

  return null;
}

/**
 * Verify and decode JWT token
 */
function verifyToken(token: string): JWTPayload | null {
  try {
    const secret = process.env.JWT_SECRET || 'your-secret-key';
    const decoded = jwt.verify(token, secret) as JWTPayload;
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Generate JWT token
 */
export function generateToken(
  user: { id: string; email: string; name?: string; role?: string },
  expiresIn: string = '7d'
): string {
  const secret = process.env.JWT_SECRET || 'your-secret-key';

  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    secret,
    { expiresIn }
  );
}

/**
 * Generate refresh token
 */
export function generateRefreshToken(userId: string): string {
  const secret = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret';

  return jwt.sign(
    { sub: userId, type: 'refresh' },
    secret,
    { expiresIn: '30d' }
  );
}

/**
 * Verify refresh token
 */
export function verifyRefreshToken(token: string): string | null {
  try {
    const secret = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret';
    const decoded = jwt.verify(token, secret) as { sub: string; type: string };
    
    if (decoded.type !== 'refresh') {
      return null;
    }
    
    return decoded.sub;
  } catch {
    return null;
  }
}
