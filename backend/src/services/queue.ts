import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';

// Redis connection
const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

// Queue definitions
export const researchQueue = new Queue('research', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: {
      age: 3600 * 24, // Keep completed jobs for 24 hours
      count: 1000,
    },
    removeOnFail: {
      age: 3600 * 24 * 7, // Keep failed jobs for 7 days
    },
  },
});

export const exportQueue = new Queue('export', {
  connection,
  defaultJobOptions: {
    attempts: 2,
    removeOnComplete: {
      age: 3600 * 2, // 2 hours
      count: 500,
    },
  },
});

export const webhookQueue = new Queue('webhook', {
  connection,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
});

// Job types
export interface ResearchJobData {
  researchId: string;
  userId: string;
  query: string;
  templateId: string;
  options?: {
    depth?: 'quick' | 'standard' | 'deep';
    maxSources?: number;
    includeNews?: boolean;
  };
}

export interface ExportJobData {
  researchId: string;
  userId: string;
  format: 'pdf' | 'markdown' | 'csv' | 'json' | 'rag';
  options?: Record<string, any>;
}

export interface WebhookJobData {
  url: string;
  event: string;
  payload: any;
  secret: string;
}

// Add jobs
export async function addResearchJob(data: ResearchJobData): Promise<Job<ResearchJobData>> {
  return researchQueue.add('process', data, {
    jobId: data.researchId,
  });
}

export async function addExportJob(data: ExportJobData): Promise<Job<ExportJobData>> {
  return exportQueue.add('generate', data, {
    jobId: `${data.researchId}-${data.format}`,
  });
}

export async function addWebhookJob(data: WebhookJobData): Promise<Job<WebhookJobData>> {
  return webhookQueue.add('send', data);
}

// Get job status
export async function getJobStatus(jobId: string, queueName: 'research' | 'export' = 'research'): Promise<{
  status: string;
  progress: number;
  data?: any;
  error?: string;
} | null> {
  const queue = queueName === 'research' ? researchQueue : exportQueue;
  const job = await queue.getJob(jobId);
  
  if (!job) {
    return null;
  }

  const state = await job.getState();
  const progress = job.progress || 0;

  return {
    status: state,
    progress: typeof progress === 'number' ? progress : 0,
    data: job.returnvalue,
    error: job.failedReason,
  };
}

// Cancel job
export async function cancelJob(jobId: string, queueName: 'research' | 'export' = 'research'): Promise<boolean> {
  const queue = queueName === 'research' ? researchQueue : exportQueue;
  const job = await queue.getJob(jobId);
  
  if (!job) {
    return false;
  }

  const state = await job.getState();
  
  if (state === 'active') {
    // Can't cancel active job, but we can set a flag
    await job.updateData({ ...job.data, cancelled: true });
    return true;
  } else if (['waiting', 'delayed'].includes(state)) {
    await job.remove();
    return true;
  }
  
  return false;
}

// Get queue stats
export async function getQueueStats(): Promise<{
  research: { waiting: number; active: number; completed: number; failed: number };
  export: { waiting: number; active: number; completed: number; failed: number };
}> {
  const [researchCounts, exportCounts] = await Promise.all([
    researchQueue.getJobCounts(),
    exportQueue.getJobCounts(),
  ]);

  return {
    research: {
      waiting: researchCounts.waiting,
      active: researchCounts.active,
      completed: researchCounts.completed,
      failed: researchCounts.failed,
    },
    export: {
      waiting: exportCounts.waiting,
      active: exportCounts.active,
      completed: exportCounts.completed,
      failed: exportCounts.failed,
    },
  };
}

// Graceful shutdown
export async function closeQueues(): Promise<void> {
  await Promise.all([
    researchQueue.close(),
    exportQueue.close(),
    webhookQueue.close(),
    connection.quit(),
  ]);
}

export default {
  researchQueue,
  exportQueue,
  webhookQueue,
  addResearchJob,
  addExportJob,
  addWebhookJob,
  getJobStatus,
  cancelJob,
  getQueueStats,
  closeQueues,
};
