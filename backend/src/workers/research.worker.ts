import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { PrismaClient } from '@prisma/client';
import { ResearchJobData, addWebhookJob } from '../services/queue.js';
import BraveSearch from '../services/search/brave.js';
import { contentExtractor } from '../services/crawler/extractor.js';
import { llmAnalyzer } from '../services/analysis/llm.js';
import { getTemplate } from '../templates/index.js';
import axios from 'axios';

const prisma = new PrismaClient();
const braveSearch = new BraveSearch();
const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

interface CrawledPage {
  url: string;
  title: string;
  content: string;
  metadata: any;
}

async function crawlUrl(url: string): Promise<CrawledPage | null> {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'InnovateResearch/1.0 (research crawler)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      timeout: 10000,
      maxRedirects: 3,
    });

    const extracted = contentExtractor.extractAll(response.data, url);
    
    return {
      url,
      title: extracted.title,
      content: extracted.mainContent,
      metadata: {
        description: extracted.description,
        author: extracted.author,
        publishedDate: extracted.publishedDate,
        openGraph: extracted.openGraph,
      },
    };
  } catch (error: any) {
    console.log(`Failed to crawl ${url}: ${error.message}`);
    return null;
  }
}

async function processResearch(job: Job<ResearchJobData>): Promise<any> {
  const { researchId, userId, query, templateId, options } = job.data;

  // Check if cancelled
  const research = await prisma.research.findUnique({ where: { id: researchId } });
  if (!research || research.status === 'FAILED') {
    throw new Error('Research was cancelled');
  }

  const template = getTemplate(templateId);
  if (!template) {
    throw new Error(`Template ${templateId} not found`);
  }

  const depth = options?.depth || 'standard';
  const maxSources = options?.maxSources || (depth === 'quick' ? 5 : depth === 'deep' ? 20 : 10);

  try {
    // Phase 1: Searching (0-30%)
    await prisma.research.update({
      where: { id: researchId },
      data: { status: 'SEARCHING', progress: 5 },
    });
    await job.updateProgress(5);

    // Run searches based on template queries
    const searchQueries = template.searchQueries.map(q => q.replace('{query}', query));
    const allResults: Array<{ title: string; url: string; snippet: string }> = [];

    for (let i = 0; i < searchQueries.length; i++) {
      const results = await BraveSearch.searchWeb(searchQueries[i], {
        count: 5,
        freshness: options?.includeNews ? 'pm' : undefined,
      });
      allResults.push(...results);
      
      const progress = 5 + Math.floor((i + 1) / searchQueries.length * 25);
      await job.updateProgress(progress);
      await prisma.research.update({
        where: { id: researchId },
        data: { progress },
      });
    }

    // Deduplicate by URL
    const uniqueResults = [...new Map(allResults.map(r => [r.url, r])).values()];
    console.log(`Found ${uniqueResults.length} unique search results`);

    // Phase 2: Crawling (30-60%)
    await prisma.research.update({
      where: { id: researchId },
      data: { status: 'CRAWLING', progress: 30 },
    });
    await job.updateProgress(30);

    const crawledPages: CrawledPage[] = [];
    const urlsToCrawl = uniqueResults.slice(0, maxSources);

    for (let i = 0; i < urlsToCrawl.length; i++) {
      const page = await crawlUrl(urlsToCrawl[i].url);
      if (page && page.content.length > 100) {
        crawledPages.push(page);
      }

      const progress = 30 + Math.floor((i + 1) / urlsToCrawl.length * 30);
      await job.updateProgress(progress);
      await prisma.research.update({
        where: { id: researchId },
        data: { progress },
      });
    }

    console.log(`Crawled ${crawledPages.length} pages successfully`);

    // Phase 3: Analyzing (60-85%)
    await prisma.research.update({
      where: { id: researchId },
      data: { status: 'ANALYZING', progress: 60 },
    });
    await job.updateProgress(60);

    // Analyze content relevance
    const relevantPages: CrawledPage[] = [];
    for (const page of crawledPages) {
      const relevance = await llmAnalyzer.assessRelevance(page.content, query);
      if (relevance.relevant && relevance.score > 0.5) {
        relevantPages.push(page);
      }
    }

    await job.updateProgress(75);
    await prisma.research.update({
      where: { id: researchId },
      data: { progress: 75 },
    });

    // Extract entities from all relevant content
    const combinedContent = relevantPages.map(p => p.content).join('\n\n');
    const entities = await llmAnalyzer.extractEntities(combinedContent);

    await job.updateProgress(85);

    // Phase 4: Generating Report (85-100%)
    await prisma.research.update({
      where: { id: researchId },
      data: { status: 'GENERATING', progress: 85 },
    });

    const report = await llmAnalyzer.generateReport(
      relevantPages.map(p => ({ url: p.url, title: p.title, content: p.content })),
      template,
      query
    );

    await job.updateProgress(95);

    // Save results
    const finalData = {
      status: 'COMPLETED' as const,
      progress: 100,
      sources: {
        searched: uniqueResults.length,
        crawled: crawledPages.length,
        relevant: relevantPages.length,
        urls: relevantPages.map(p => ({ url: p.url, title: p.title })),
      },
      analysis: {
        entities,
        summary: report.summary,
      },
      report: report,
      completedAt: new Date(),
    };

    await prisma.research.update({
      where: { id: researchId },
      data: finalData as any,
    });

    await job.updateProgress(100);

    // Send webhook if configured
    const webhooks = await prisma.webhook.findMany({
      where: {
        userId,
        active: true,
        events: { has: 'research.completed' },
      },
    });

    for (const webhook of webhooks) {
      await addWebhookJob({
        url: webhook.url,
        event: 'research.completed',
        payload: {
          researchId,
          query,
          status: 'completed',
          report: report.title,
          sources: relevantPages.length,
        },
        secret: webhook.secret,
      });
    }

    return finalData;
  } catch (error: any) {
    console.error(`Research ${researchId} failed:`, error);
    
    await prisma.research.update({
      where: { id: researchId },
      data: {
        status: 'FAILED',
        error: error.message,
      },
    });

    throw error;
  }
}

// Create worker
const worker = new Worker<ResearchJobData>('research', processResearch, {
  connection,
  concurrency: 2,
  limiter: {
    max: 5,
    duration: 60000, // 5 jobs per minute
  },
});

worker.on('completed', (job) => {
  console.log(`Research job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`Research job ${job?.id} failed:`, err.message);
});

worker.on('progress', (job, progress) => {
  console.log(`Research job ${job.id} progress: ${progress}%`);
});

console.log('Research worker started');

// Graceful shutdown
process.on('SIGTERM', async () => {
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
});

export default worker;
