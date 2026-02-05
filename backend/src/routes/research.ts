import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { addResearchJob, getJobStatus, cancelJob } from '../services/queue';
import { getTemplate, getTemplatesForPlan } from '../templates';

const router = Router();
const prisma = new PrismaClient();

// Start new research
router.post('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { query, template, options } = req.body;
    const userId = req.user!.id;

    if (!query?.trim()) {
      return res.status(400).json({ error: 'Query is required' });
    }

    // Validate template
    const templateData = getTemplate(template || 'company-profile');
    if (!templateData) {
      return res.status(400).json({ error: 'Invalid template' });
    }

    // Check if user has access to template
    const availableTemplates = getTemplatesForPlan(req.user!.plan);
    if (!availableTemplates.some(t => t.id === templateData.id)) {
      return res.status(403).json({ error: `Template '${template}' requires a higher plan` });
    }

    // Check credits
    if (req.user!.credits <= 0) {
      return res.status(402).json({ error: 'Insufficient credits. Please upgrade your plan.' });
    }

    // Create research record
    const research = await prisma.research.create({
      data: {
        userId,
        query: query.trim(),
        template: template || 'company-profile',
        status: 'PENDING',
        progress: 0,
      },
    });

    // Deduct credit
    await prisma.user.update({
      where: { id: userId },
      data: { credits: { decrement: 1 } },
    });

    // Add to queue
    await addResearchJob({
      researchId: research.id,
      userId,
      query: query.trim(),
      templateId: template || 'company-profile',
      options: options || {},
    });

    res.status(201).json({
      id: research.id,
      query: research.query,
      template: research.template,
      status: research.status,
      progress: research.progress,
      createdAt: research.createdAt,
    });
  } catch (error: any) {
    console.error('Create research error:', error);
    res.status(500).json({ error: error.message });
  }
});

// List user's research
router.get('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { limit = 20, offset = 0, status } = req.query;
    
    const where: any = { userId: req.user!.id };
    if (status) where.status = status;

    const research = await prisma.research.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
      skip: Number(offset),
      select: {
        id: true,
        query: true,
        template: true,
        status: true,
        progress: true,
        createdAt: true,
        completedAt: true,
      },
    });

    res.json(research);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get single research with details
router.get('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const research = await prisma.research.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.id,
      },
    });

    if (!research) {
      return res.status(404).json({ error: 'Research not found' });
    }

    res.json(research);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get research status (SSE for real-time updates)
router.get('/:id/status', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const researchId = req.params.id;

  // Verify ownership
  const research = await prisma.research.findFirst({
    where: { id: researchId, userId: req.user!.id },
  });

  if (!research) {
    return res.status(404).json({ error: 'Research not found' });
  }

  // Set up SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Send current status
  const sendStatus = async () => {
    const current = await prisma.research.findUnique({
      where: { id: researchId },
      select: { status: true, progress: true, error: true },
    });
    
    if (current) {
      res.write(`data: ${JSON.stringify(current)}\n\n`);
    }
    
    return current;
  };

  // Initial status
  await sendStatus();

  // Poll for updates
  const interval = setInterval(async () => {
    const status = await sendStatus();
    if (status && ['COMPLETED', 'FAILED'].includes(status.status)) {
      clearInterval(interval);
      res.end();
    }
  }, 2000);

  // Clean up on close
  req.on('close', () => {
    clearInterval(interval);
  });
});

// Cancel research
router.delete('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const research = await prisma.research.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.id,
      },
    });

    if (!research) {
      return res.status(404).json({ error: 'Research not found' });
    }

    if (['COMPLETED', 'FAILED'].includes(research.status)) {
      return res.status(400).json({ error: 'Cannot cancel completed or failed research' });
    }

    // Cancel job
    await cancelJob(research.id);

    // Update status
    await prisma.research.update({
      where: { id: research.id },
      data: { status: 'FAILED', error: 'Cancelled by user' },
    });

    // Refund credit
    await prisma.user.update({
      where: { id: req.user!.id },
      data: { credits: { increment: 1 } },
    });

    res.json({ success: true, message: 'Research cancelled' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
