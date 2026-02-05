import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { authMiddleware, AuthenticatedRequest, generateToken } from '../middleware/auth';

type AuthenticatedRequest = AuthenticatedRequest;
const JWT_SECRET = process.env.JWT_SECRET || 'innovate_research_jwt_secret_2026_super_secure';

const router = Router();
const prisma = new PrismaClient();

// Validation schemas
const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters')
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

const apiKeySchema = z.object({
  name: z.string().min(1, 'API key name is required').max(50)
});

// Generate JWT token
const generateToken = (userId: string, email: string): string => {
  return jwt.sign(
    { userId, email },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// Generate API key
const generateApiKey = (): string => {
  return `ir_${uuidv4().replace(/-/g, '')}`;
};

// POST /register - Register new user
router.post('/register', async (req, res: Response) => {
  try {
    const validation = registerSchema.safeParse(req.body);
    
    if (!validation.success) {
      res.status(400).json({ 
        error: 'Validation Error', 
        details: validation.error.errors 
      });
      return;
    }
    
    const { email, password, name } = validation.data;
    
    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(409).json({ error: 'Conflict', message: 'Email already registered' });
      return;
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Create user with default API key
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        plan: 'FREE',
        credits: 10,
        apiKeys: {
          create: {
            key: generateApiKey(),
            name: 'Default API Key'
          }
        }
      },
      include: {
        apiKeys: true
      }
    });
    
    // Generate JWT
    const token = generateToken(user.id, user.email);
    
    res.status(201).json({
      message: 'Registration successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        credits: user.credits
      },
      token,
      apiKey: user.apiKeys[0].key
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: 'Registration failed' });
  }
});

// POST /login - Login user
router.post('/login', async (req, res: Response) => {
  try {
    const validation = loginSchema.safeParse(req.body);
    
    if (!validation.success) {
      res.status(400).json({ 
        error: 'Validation Error', 
        details: validation.error.errors 
      });
      return;
    }
    
    const { email, password } = validation.data;
    
    // Find user
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Invalid credentials' });
      return;
    }
    
    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      res.status(401).json({ error: 'Unauthorized', message: 'Invalid credentials' });
      return;
    }
    
    // Generate JWT
    const token = generateToken(user.id, user.email);
    
    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        credits: user.credits
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: 'Login failed' });
  }
});

// GET /me - Get current user profile
router.get('/me', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        name: true,
        plan: true,
        credits: true,
        createdAt: true,
        _count: {
          select: {
            researches: true,
            apiKeys: true
          }
        }
      }
    });
    
    if (!user) {
      res.status(404).json({ error: 'Not Found', message: 'User not found' });
      return;
    }
    
    res.json({ user });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to get profile' });
  }
});

// POST /api-keys - Create new API key
router.post('/api-keys', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validation = apiKeySchema.safeParse(req.body);
    
    if (!validation.success) {
      res.status(400).json({ 
        error: 'Validation Error', 
        details: validation.error.errors 
      });
      return;
    }
    
    const { name } = validation.data;
    
    // Check API key limit based on plan
    const keyCount = await prisma.apiKey.count({ where: { userId: req.user!.id } });
    const limits: Record<string, number> = {
      FREE: 2,
      STARTER: 5,
      PRO: 10,
      ENTERPRISE: 100
    };
    
    if (keyCount >= (limits[req.user!.plan] || 2)) {
      res.status(403).json({ 
        error: 'Forbidden', 
        message: `API key limit reached for ${req.user!.plan} plan` 
      });
      return;
    }
    
    const apiKey = await prisma.apiKey.create({
      data: {
        key: generateApiKey(),
        name,
        userId: req.user!.id
      }
    });
    
    res.status(201).json({
      message: 'API key created',
      apiKey: {
        id: apiKey.id,
        key: apiKey.key,
        name: apiKey.name,
        createdAt: apiKey.createdAt
      }
    });
  } catch (error) {
    console.error('Create API key error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to create API key' });
  }
});

// GET /api-keys - List user's API keys
router.get('/api-keys', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const apiKeys = await prisma.apiKey.findMany({
      where: { userId: req.user!.id },
      select: {
        id: true,
        key: true,
        name: true,
        createdAt: true,
        lastUsed: true
      },
      orderBy: { createdAt: 'desc' }
    });
    
    // Mask keys for security (show only last 8 chars)
    const maskedKeys = apiKeys.map(key => ({
      ...key,
      key: `ir_${'*'.repeat(24)}${key.key.slice(-8)}`
    }));
    
    res.json({ apiKeys: maskedKeys });
  } catch (error) {
    console.error('List API keys error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to list API keys' });
  }
});

// DELETE /api-keys/:id - Delete API key
router.delete('/api-keys/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    // Verify ownership
    const apiKey = await prisma.apiKey.findFirst({
      where: { id, userId: req.user!.id }
    });
    
    if (!apiKey) {
      res.status(404).json({ error: 'Not Found', message: 'API key not found' });
      return;
    }
    
    // Check if it's the last key
    const keyCount = await prisma.apiKey.count({ where: { userId: req.user!.id } });
    if (keyCount <= 1) {
      res.status(400).json({ 
        error: 'Bad Request', 
        message: 'Cannot delete the last API key' 
      });
      return;
    }
    
    await prisma.apiKey.delete({ where: { id } });
    
    res.json({ message: 'API key deleted' });
  } catch (error) {
    console.error('Delete API key error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to delete API key' });
  }
});

export default router;
