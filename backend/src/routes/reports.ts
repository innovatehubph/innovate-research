/**
 * Reports Routes
 * Handles report CRUD and sharing endpoints
 */

import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authMiddleware, AuthenticatedRequest, optionalAuthMiddleware } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';
import { nanoid } from 'nanoid';

const router = Router();

// Types
interface ReportQuery {
  page?: string;
  limit?: string;
  status?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  tags?: string;
}

interface ShareRequest {
  expiresIn?: number;  // Hours until expiration
  allowDownload?: boolean;
  password?: string;
}

/**
 * GET /reports
 * List user's completed reports
 */
router.get(
  '/',
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      const {
        page = '1',
        limit = '20',
        status,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        tags,
      } = req.query as ReportQuery;

      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
      const skip = (pageNum - 1) * limitNum;

      // Build where clause
      const where: any = { userId };

      if (status) {
        where.status = status;
      }

      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { query: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (tags) {
        const tagList = tags.split(',').map(t => t.trim());
        where.tags = { hasSome: tagList };
      }

      // Fetch reports
      const [reports, total] = await Promise.all([
        prisma.report.findMany({
          where,
          select: {
            id: true,
            title: true,
            query: true,
            status: true,
            summary: true,
            tags: true,
            createdAt: true,
            updatedAt: true,
            model: true,
            isPublic: true,
            _count: {
              select: {
                sources: true,
                sections: true,
              },
            },
          },
          orderBy: { [sortBy]: sortOrder },
          skip,
          take: limitNum,
        }),
        prisma.report.count({ where }),
      ]);

      const formattedReports = reports.map(report => ({
        id: report.id,
        title: report.title,
        query: report.query,
        status: report.status,
        summary: report.summary ? report.summary.substring(0, 200) + '...' : null,
        tags: report.tags,
        createdAt: report.createdAt,
        updatedAt: report.updatedAt,
        model: report.model,
        isPublic: report.isPublic,
        sourcesCount: report._count.sources,
        sectionsCount: report._count.sections,
      }));

      res.json({
        success: true,
        reports: formattedReports,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
          hasMore: skip + reports.length < total,
        },
      });
    } catch (error) {
      console.error('List reports error:', error);
      res.status(500).json({ error: 'Failed to fetch reports' });
    }
  }
);

/**
 * GET /reports/:id
 * Get full report content
 */
router.get(
  '/:id',
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      const report = await prisma.report.findFirst({
        where: {
          id,
          OR: [
            { userId },
            { isPublic: true },
            { sharedWith: { has: userId } },
          ],
        },
        include: {
          sources: {
            orderBy: { createdAt: 'asc' },
          },
          sections: {
            orderBy: { order: 'asc' },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      if (!report) {
        return res.status(404).json({ error: 'Report not found' });
      }

      // Track view
      await prisma.reportView.create({
        data: {
          reportId: id,
          userId,
        },
      }).catch(() => {}); // Ignore if view tracking fails

      res.json({
        success: true,
        report: {
          id: report.id,
          title: report.title,
          query: report.query,
          summary: report.summary,
          status: report.status,
          model: report.model,
          tags: report.tags,
          keyFindings: report.keyFindings,
          recommendations: report.recommendations,
          processingTime: report.processingTime,
          createdAt: report.createdAt,
          updatedAt: report.updatedAt,
          isPublic: report.isPublic,
          isOwner: report.userId === userId,
          author: {
            id: report.user.id,
            name: report.user.name,
          },
          sections: report.sections.map(s => ({
            id: s.id,
            title: s.title,
            content: s.content,
            order: s.order,
            tables: s.tables,
            charts: s.charts,
            subsections: s.subsections,
          })),
          sources: report.sources.map(s => ({
            id: s.id,
            title: s.title,
            url: s.url,
            snippet: s.snippet,
            reliability: s.reliability,
            accessedAt: s.accessedAt,
          })),
        },
      });
    } catch (error) {
      console.error('Get report error:', error);
      res.status(500).json({ error: 'Failed to fetch report' });
    }
  }
);

/**
 * POST /reports/:id/share
 * Create a shareable link for the report
 */
router.post(
  '/:id/share',
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const { expiresIn, allowDownload = true, password } = req.body as ShareRequest;

      // Verify ownership
      const report = await prisma.report.findFirst({
        where: { id, userId },
      });

      if (!report) {
        return res.status(404).json({ error: 'Report not found' });
      }

      if (report.status !== 'completed') {
        return res.status(400).json({ error: 'Cannot share incomplete report' });
      }

      // Generate share ID
      const shareId = nanoid(12);

      // Calculate expiration
      const expiresAt = expiresIn 
        ? new Date(Date.now() + expiresIn * 60 * 60 * 1000)
        : null;

      // Create share record
      const share = await prisma.reportShare.create({
        data: {
          id: shareId,
          reportId: id,
          createdBy: userId!,
          expiresAt,
          allowDownload,
          password: password ? await hashPassword(password) : null,
        },
      });

      // Generate share URL
      const baseUrl = process.env.FRONTEND_URL || 'https://research.innovatehub.ph';
      const shareUrl = `${baseUrl}/shared/${shareId}`;

      res.json({
        success: true,
        share: {
          id: shareId,
          url: shareUrl,
          expiresAt: share.expiresAt,
          allowDownload: share.allowDownload,
          hasPassword: !!password,
        },
      });
    } catch (error) {
      console.error('Share report error:', error);
      res.status(500).json({ error: 'Failed to create share link' });
    }
  }
);

/**
 * GET /shared/:shareId
 * Public access to shared report
 */
router.get(
  '/shared/:shareId',
  optionalAuthMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { shareId } = req.params;
      const { password } = req.query as { password?: string };

      // Find share record
      const share = await prisma.reportShare.findUnique({
        where: { id: shareId },
        include: {
          report: {
            include: {
              sources: true,
              sections: { orderBy: { order: 'asc' } },
              user: {
                select: { name: true },
              },
            },
          },
        },
      });

      if (!share) {
        return res.status(404).json({ error: 'Share link not found' });
      }

      // Check expiration
      if (share.expiresAt && share.expiresAt < new Date()) {
        return res.status(410).json({ error: 'Share link has expired' });
      }

      // Check password
      if (share.password) {
        if (!password) {
          return res.status(401).json({ 
            error: 'Password required',
            requiresPassword: true,
          });
        }
        
        const isValid = await verifyPassword(password, share.password);
        if (!isValid) {
          return res.status(401).json({ error: 'Invalid password' });
        }
      }

      // Increment view count
      await prisma.reportShare.update({
        where: { id: shareId },
        data: { views: { increment: 1 } },
      });

      const report = share.report;

      res.json({
        success: true,
        report: {
          id: report.id,
          title: report.title,
          query: report.query,
          summary: report.summary,
          tags: report.tags,
          keyFindings: report.keyFindings,
          createdAt: report.createdAt,
          author: report.user.name,
          sections: report.sections.map(s => ({
            title: s.title,
            content: s.content,
            order: s.order,
          })),
          sources: report.sources.map(s => ({
            title: s.title,
            url: s.url,
            snippet: s.snippet,
          })),
        },
        share: {
          allowDownload: share.allowDownload,
          expiresAt: share.expiresAt,
        },
      });
    } catch (error) {
      console.error('Get shared report error:', error);
      res.status(500).json({ error: 'Failed to fetch shared report' });
    }
  }
);

/**
 * GET /reports/:id/shares
 * List all share links for a report
 */
router.get(
  '/:id/shares',
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      // Verify ownership
      const report = await prisma.report.findFirst({
        where: { id, userId },
      });

      if (!report) {
        return res.status(404).json({ error: 'Report not found' });
      }

      const shares = await prisma.reportShare.findMany({
        where: { reportId: id },
        orderBy: { createdAt: 'desc' },
      });

      const baseUrl = process.env.FRONTEND_URL || 'https://research.innovatehub.ph';

      res.json({
        success: true,
        shares: shares.map(share => ({
          id: share.id,
          url: `${baseUrl}/shared/${share.id}`,
          expiresAt: share.expiresAt,
          allowDownload: share.allowDownload,
          hasPassword: !!share.password,
          views: share.views,
          createdAt: share.createdAt,
          isExpired: share.expiresAt ? share.expiresAt < new Date() : false,
        })),
      });
    } catch (error) {
      console.error('List shares error:', error);
      res.status(500).json({ error: 'Failed to list shares' });
    }
  }
);

/**
 * DELETE /reports/:id/shares/:shareId
 * Revoke a share link
 */
router.delete(
  '/:id/shares/:shareId',
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id, shareId } = req.params;
      const userId = req.user?.id;

      // Verify ownership
      const report = await prisma.report.findFirst({
        where: { id, userId },
      });

      if (!report) {
        return res.status(404).json({ error: 'Report not found' });
      }

      await prisma.reportShare.delete({
        where: { id: shareId, reportId: id },
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Delete share error:', error);
      res.status(500).json({ error: 'Failed to delete share' });
    }
  }
);

/**
 * PATCH /reports/:id
 * Update report metadata
 */
router.patch(
  '/:id',
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const { title, tags, isPublic } = req.body;

      const report = await prisma.report.findFirst({
        where: { id, userId },
      });

      if (!report) {
        return res.status(404).json({ error: 'Report not found' });
      }

      const updated = await prisma.report.update({
        where: { id },
        data: {
          ...(title && { title }),
          ...(tags && { tags }),
          ...(typeof isPublic === 'boolean' && { isPublic }),
          updatedAt: new Date(),
        },
      });

      res.json({
        success: true,
        report: {
          id: updated.id,
          title: updated.title,
          tags: updated.tags,
          isPublic: updated.isPublic,
          updatedAt: updated.updatedAt,
        },
      });
    } catch (error) {
      console.error('Update report error:', error);
      res.status(500).json({ error: 'Failed to update report' });
    }
  }
);

/**
 * DELETE /reports/:id
 * Delete a report
 */
router.delete(
  '/:id',
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      const report = await prisma.report.findFirst({
        where: { id, userId },
      });

      if (!report) {
        return res.status(404).json({ error: 'Report not found' });
      }

      // Delete related records
      await prisma.$transaction([
        prisma.reportShare.deleteMany({ where: { reportId: id } }),
        prisma.reportView.deleteMany({ where: { reportId: id } }),
        prisma.export.deleteMany({ where: { reportId: id } }),
        prisma.source.deleteMany({ where: { reportId: id } }),
        prisma.section.deleteMany({ where: { reportId: id } }),
        prisma.report.delete({ where: { id } }),
      ]);

      res.json({ success: true });
    } catch (error) {
      console.error('Delete report error:', error);
      res.status(500).json({ error: 'Failed to delete report' });
    }
  }
);

/**
 * GET /reports/stats
 * Get user's report statistics
 */
router.get(
  '/stats',
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;

      const [
        totalReports,
        completedReports,
        totalSources,
        totalExports,
        recentReports,
      ] = await Promise.all([
        prisma.report.count({ where: { userId } }),
        prisma.report.count({ where: { userId, status: 'completed' } }),
        prisma.source.count({
          where: { report: { userId } },
        }),
        prisma.export.count({ where: { userId } }),
        prisma.report.findMany({
          where: { userId },
          select: { createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 30,
        }),
      ]);

      // Calculate reports per day for last 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const reportsPerDay = recentReports
        .filter(r => r.createdAt > thirtyDaysAgo)
        .reduce((acc, r) => {
          const day = r.createdAt.toISOString().split('T')[0];
          acc[day] = (acc[day] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

      res.json({
        success: true,
        stats: {
          totalReports,
          completedReports,
          pendingReports: totalReports - completedReports,
          totalSources,
          totalExports,
          averageSourcesPerReport: completedReports > 0 
            ? Math.round(totalSources / completedReports) 
            : 0,
          reportsLast30Days: Object.values(reportsPerDay).reduce((a, b) => a + b, 0),
        },
      });
    } catch (error) {
      console.error('Get stats error:', error);
      res.status(500).json({ error: 'Failed to fetch statistics' });
    }
  }
);

// Helper functions
async function hashPassword(password: string): Promise<string> {
  const bcrypt = await import('bcrypt');
  return bcrypt.hash(password, 10);
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const bcrypt = await import('bcrypt');
  return bcrypt.compare(password, hash);
}

export default router;
