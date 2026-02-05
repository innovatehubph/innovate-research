/**
 * Shared Types for Innovate Research
 */

// Report types
export interface Report {
  id: string;
  title: string;
  query: string;
  summary?: string;
  status: ReportStatus;
  model?: string;
  tags?: string[];
  userId?: string;
  createdAt: Date;
  updatedAt?: Date;
  sections?: Section[];
  sources?: Source[];
  keyFindings?: string[];
  recommendations?: string[];
  processingTime?: number;
  isPublic?: boolean;
  sharedWith?: string[];
}

export type ReportStatus = 
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

// Section types
export interface Section {
  id?: string;
  title?: string;
  content: string;
  order?: number;
  subsections?: Subsection[];
  tables?: TableData[];
  charts?: ChartData[];
  codeBlocks?: CodeBlock[];
}

export interface Subsection {
  title: string;
  content: string;
}

export interface TableData {
  title?: string;
  headers: string[];
  rows: string[][];
}

export interface ChartData {
  title: string;
  type: 'bar' | 'line' | 'pie' | 'area' | 'scatter';
  data?: unknown;
}

export interface CodeBlock {
  language?: string;
  code: string;
  caption?: string;
}

// Source types
export interface Source {
  id?: string;
  title?: string;
  url?: string;
  snippet?: string;
  content?: string;
  reliability?: 'high' | 'medium' | 'low';
  accessedAt?: Date;
  domain?: string;
  author?: string;
  publishedAt?: Date;
}

// Export types
export interface ExportOptions {
  format?: string;
  includeMetadata?: boolean;
  includeSources?: boolean;
}

// User types
export interface User {
  id: string;
  email: string;
  name?: string;
  role?: UserRole;
  createdAt: Date;
}

export type UserRole = 'user' | 'admin' | 'researcher';

// API Response types
export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp?: string;
}

export interface PaginatedResponse<T> extends APIResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

// Research Job types
export interface ResearchJob {
  id: string;
  query: string;
  status: JobStatus;
  progress: number;
  reportId?: string;
  userId: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

export type JobStatus = 
  | 'queued'
  | 'searching'
  | 'analyzing'
  | 'generating'
  | 'completed'
  | 'failed';

// Share types
export interface Share {
  id: string;
  reportId: string;
  createdBy: string;
  expiresAt?: Date;
  allowDownload: boolean;
  hasPassword: boolean;
  views: number;
  createdAt: Date;
}

// Export tracking
export interface ExportRecord {
  id: string;
  reportId: string;
  userId: string;
  format: string;
  filename: string;
  size: number;
  createdAt: Date;
}
