import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Validation schema
const webhookSchema = z.object({
  url: z.string().url('Invalid URL'),
  events: z.array(z.enum([
    'research.started',
    'research.completed',
    'research.failed',
    'export.ready'
  ])).min(1, 'At least one event required')
});

// GET / - List user's webhooks
router.get('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const webhooks = await prisma.webhook.findMany({
      where: { userId: req.user!.id },
      select: {
        id: true,
        url: true,
        events: true,
        active: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json({ webhooks });
  } catch (error) {
    console.error('List webhooks error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST / - Create webhook
router.post('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validation = webhookSchema.safeParse(req.body);
    
    if (!validation.success) {
      res.status(400).json({ 
        error: 'Validation Error', 
        details: validation.error.errors 
      });
      return;
    }
    
    const { url, events } = validation.data;
    
    // Check webhook limit
    const webhookCount = await prisma.webhook.count({ 
      where: { userId: req.user!.id } 
    });
    
    const limits: Record<string, number> = {
      FREE: 1,
      STARTER: 3,
      PRO: 10,
      ENTERPRISE: 100
    };
    
    if (webhookCount >= (limits[req.user!.plan] || 1)) {
      res.status(403).json({ 
        error: 'Forbidden', 
        message: `Webhook limit reached for ${req.user!.plan} plan` 
      });
      return;
    }
    
    const webhook = await prisma.webhook.create({
      data: {
        userId: req.user!.id,
        url,
        events,
        secret: `whsec_${uuidv4().replace(/-/g, '')}`
      }
    });
    
    res.status(201).json({
      message: 'Webhook created',
      webhook: {
        id: webhook.id,
        url: webhook.url,
        events: webhook.events,
        secret: webhook.secret, // Only shown once
        active: webhook.active
      }
    });
  } catch (error) {
    console.error('Create webhook error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// PATCH /:id - Update webhook
router.patch('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const webhook = await prisma.webhook.findFirst({
      where: { id: req.params.id, userId: req.user!.id }
    });
    
    if (!webhook) {
      res.status(404).json({ error: 'Not Found', message: 'Webhook not found' });
      return;
    }
    
    const { url, events, active } = req.body;
    
    const updated = await prisma.webhook.update({
      where: { id: req.params.id },
      data: {
        ...(url && { url }),
        ...(events && { events }),
        ...(typeof active === 'boolean' && { active })
      }
    });
    
    res.json({ 
      message: 'Webhook updated',
      webhook: {
        id: updated.id,
        url: updated.url,
        events: updated.events,
        active: updated.active
      }
    });
  } catch (error) {
    console.error('Update webhook error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// DELETE /:id - Delete webhook
router.delete('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const webhook = await prisma.webhook.findFirst({
      where: { id: req.params.id, userId: req.user!.id }
    });
    
    if (!webhook) {
      res.status(404).json({ error: 'Not Found', message: 'Webhook not found' });
      return;
    }
    
    await prisma.webhook.delete({ where: { id: req.params.id } });
    
    res.json({ message: 'Webhook deleted' });
  } catch (error) {
    console.error('Delete webhook error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
