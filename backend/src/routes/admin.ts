import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthenticatedRequest, adminMiddleware } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// All admin routes require authentication and admin privileges
router.use(authMiddleware);
router.use(adminMiddleware);

// GET /stats - Get platform statistics
router.get('/stats', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const [
      totalUsers,
      totalResearches,
      completedResearches,
      totalRevenue
    ] = await Promise.all([
      prisma.user.count(),
      prisma.research.count(),
      prisma.research.count({ where: { status: 'COMPLETED' } }),
      prisma.transaction.aggregate({
        where: { status: 'completed' },
        _sum: { amount: true }
      })
    ]);
    
    const usersByPlan = await prisma.user.groupBy({
      by: ['plan'],
      _count: true
    });
    
    const recentResearches = await prisma.research.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { email: true, name: true } }
      }
    });
    
    res.json({
      stats: {
        totalUsers,
        totalResearches,
        completedResearches,
        successRate: totalResearches > 0 
          ? Math.round((completedResearches / totalResearches) * 100) 
          : 0,
        totalRevenue: totalRevenue._sum.amount || 0
      },
      usersByPlan: usersByPlan.reduce((acc, item) => {
        acc[item.plan] = item._count;
        return acc;
      }, {} as Record<string, number>),
      recentResearches
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /users - List all users
router.get('/users', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          plan: true,
          credits: true,
          createdAt: true,
          _count: {
            select: { researches: true }
          }
        }
      }),
      prisma.user.count()
    ]);
    
    res.json({
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Admin list users error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// PATCH /users/:id - Update user
router.patch('/users/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { plan, credits } = req.body;
    
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      res.status(404).json({ error: 'Not Found', message: 'User not found' });
      return;
    }
    
    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(plan && { plan }),
        ...(typeof credits === 'number' && { credits })
      },
      select: {
        id: true,
        email: true,
        name: true,
        plan: true,
        credits: true
      }
    });
    
    res.json({ message: 'User updated', user: updated });
  } catch (error) {
    console.error('Admin update user error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// DELETE /users/:id - Delete user
router.delete('/users/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    // Prevent self-deletion
    if (id === req.user!.id) {
      res.status(400).json({ error: 'Bad Request', message: 'Cannot delete yourself' });
      return;
    }
    
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      res.status(404).json({ error: 'Not Found', message: 'User not found' });
      return;
    }
    
    await prisma.user.delete({ where: { id } });
    
    res.json({ message: 'User deleted' });
  } catch (error) {
    console.error('Admin delete user error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /researches - List all researches
router.get('/researches', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;
    const skip = (page - 1) * limit;
    
    const where = status ? { status: status as any } : {};
    
    const [researches, total] = await Promise.all([
      prisma.research.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { email: true, name: true } }
        }
      }),
      prisma.research.count({ where })
    ]);
    
    res.json({
      researches,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Admin list researches error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
