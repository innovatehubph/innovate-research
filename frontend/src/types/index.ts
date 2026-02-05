export interface User {
  id: string
  email: string
  name: string
  role: 'user' | 'admin'
  plan: 'free' | 'starter' | 'pro' | 'enterprise'
  credits: number
  apiKey?: string
  createdAt: string
}

export interface Research {
  id: string
  userId: string
  query: string
  template: string
  status: ResearchStatus
  progress: number
  sourcesFound: number
  report?: string
  sources?: Source[]
  exportFormats: string[]
  webhookUrl?: string
  creditsUsed: number
  createdAt: string
  completedAt?: string
}

export type ResearchStatus = 
  | 'pending'
  | 'searching'
  | 'crawling'
  | 'analyzing'
  | 'generating'
  | 'completed'
  | 'failed'
  | 'cancelled'

export interface Source {
  url: string
  title: string
  snippet: string
  relevance: number
  crawledAt: string
}

export interface Template {
  id: string
  name: string
  description: string
  icon: string
  sections: string[]
  minPlan: 'free' | 'starter' | 'pro' | 'enterprise'
}

export interface Stats {
  totalResearch: number
  completedResearch: number
  creditsUsed: number
  creditsRemaining: number
  apiKeys: number
}

export interface AdminStats {
  totalUsers: number
  activeUsers: number
  totalResearch: number
  completedResearch: number
  revenue: number
  queueSize: number
}

export interface Transaction {
  id: string
  userId: string
  type: 'purchase' | 'usage' | 'refund'
  amount: number
  credits: number
  description: string
  createdAt: string
}

export interface PlanInfo {
  name: string
  price: number
  credits: number
  features: string[]
  popular?: boolean
}
