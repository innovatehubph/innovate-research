import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Export research report
router.get('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { format = 'json' } = req.query;
    const researchId = req.params.id;

    // Get research
    const research = await prisma.research.findFirst({
      where: {
        id: researchId,
        userId: req.user!.id,
      },
    });

    if (!research) {
      return res.status(404).json({ error: 'Research not found' });
    }

    if (research.status !== 'COMPLETED') {
      return res.status(400).json({ error: 'Research is not completed yet' });
    }

    const report = research.report as any;
    if (!report) {
      return res.status(400).json({ error: 'No report available' });
    }

    // Export based on format
    switch (format) {
      case 'json':
        res.json({
          id: research.id,
          query: research.query,
          template: research.template,
          report,
          sources: research.sources,
          analysis: research.analysis,
          generatedAt: research.completedAt,
        });
        break;

      case 'markdown':
      case 'md':
        const md = generateMarkdown(report, research);
        res.setHeader('Content-Type', 'text/markdown');
        res.setHeader('Content-Disposition', `attachment; filename="${research.query.replace(/\s+/g, '-')}.md"`);
        res.send(md);
        break;

      case 'csv':
        const csv = generateCSV(report);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${research.query.replace(/\s+/g, '-')}.csv"`);
        res.send(csv);
        break;

      case 'rag':
      case 'jsonl':
        const jsonl = generateRAG(report, research);
        res.setHeader('Content-Type', 'application/jsonl');
        res.setHeader('Content-Disposition', `attachment; filename="${research.query.replace(/\s+/g, '-')}.jsonl"`);
        res.send(jsonl);
        break;

      default:
        res.status(400).json({ error: `Unsupported format: ${format}` });
    }
  } catch (error: any) {
    console.error('Export error:', error);
    res.status(500).json({ error: error.message });
  }
});

function generateMarkdown(report: any, research: any): string {
  const lines: string[] = [];
  
  lines.push(`# ${report.title || research.query}`);
  lines.push('');
  lines.push(`> Generated: ${research.completedAt}`);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Executive Summary');
  lines.push('');
  lines.push(report.summary || '');
  lines.push('');

  if (report.sections) {
    for (const section of report.sections) {
      lines.push(`## ${section.title}`);
      lines.push('');
      lines.push(section.content || '');
      lines.push('');
    }
  }

  lines.push('---');
  lines.push('');
  lines.push('## Sources');
  lines.push('');
  if (report.sources) {
    for (const source of report.sources) {
      lines.push(`- [${source.title}](${source.url})`);
    }
  }

  return lines.join('\n');
}

function generateCSV(report: any): string {
  const lines: string[] = [];
  lines.push('Section,Title,Content');
  
  lines.push(`Summary,Executive Summary,"${(report.summary || '').replace(/"/g, '""')}"`);
  
  if (report.sections) {
    for (const section of report.sections) {
      lines.push(`Section,${section.title},"${(section.content || '').replace(/"/g, '""')}"`);
    }
  }

  return lines.join('\n');
}

function generateRAG(report: any, research: any): string {
  const chunks: string[] = [];
  let chunkIndex = 0;

  // Summary chunk
  chunks.push(JSON.stringify({
    type: 'chunk',
    chunk_id: `${research.id}-summary-${chunkIndex++}`,
    text: report.summary || '',
    metadata: {
      section: 'Executive Summary',
      research_id: research.id,
      query: research.query,
    },
  }));

  // Section chunks
  if (report.sections) {
    for (const section of report.sections) {
      chunks.push(JSON.stringify({
        type: 'chunk',
        chunk_id: `${research.id}-${section.id}-${chunkIndex++}`,
        text: section.content || '',
        metadata: {
          section: section.title,
          research_id: research.id,
          query: research.query,
        },
      }));
    }
  }

  return chunks.join('\n');
}

export default router;
