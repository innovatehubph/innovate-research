import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { researchApi, userApi } from '../lib/api'
import {
  Search,
  FileText,
  Key,
  Zap,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  ArrowRight,
  TrendingUp,
  ChevronRight,
} from 'lucide-react'

interface Stats {
  totalResearch: number
  completedResearch: number
  creditsUsed: number
  creditsRemaining: number
  apiKeys: number
}

interface Research {
  id: string
  query: string
  template: string
  status: string
  progress: number
  createdAt: string
}

const statusConfig: Record<string, { icon: any; color: string; bg: string; animate?: boolean }> = {
  pending: { icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-400/10', animate: false },
  searching: { icon: Loader2, color: 'text-blue-400', bg: 'bg-blue-400/10', animate: true },
  crawling: { icon: Loader2, color: 'text-blue-400', bg: 'bg-blue-400/10', animate: true },
  analyzing: { icon: Loader2, color: 'text-purple-400', bg: 'bg-purple-400/10', animate: true },
  generating: { icon: Loader2, color: 'text-violet-400', bg: 'bg-violet-400/10', animate: true },
  completed: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-400/10', animate: false },
  failed: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-400/10', animate: false },
  cancelled: { icon: XCircle, color: 'text-gray-400', bg: 'bg-gray-400/10', animate: false },
}

export default function Dashboard() {
  const { user } = useAuthStore()
  const [stats, setStats] = useState<Stats | null>(null)
  const [research, setResearch] = useState<Research[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [statsRes, researchRes] = await Promise.all([
        userApi.getStats(),
        researchApi.list({ limit: 10 }),
      ])
      setStats(statsRes)
      setResearch(researchRes.research || [])
    } catch (error) {
      // Error handled by interceptor
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin" />
          Loading dashboard...
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-20 pb-10 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">
              Welcome back, {user?.name?.split(' ')[0]}!
            </h1>
            <p className="text-gray-400 mt-1">
              Here's what's happening with your research.
            </p>
          </div>
          <Link
            to="/research/new"
            className="flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 rounded-lg font-semibold transition"
          >
            <Plus className="w-5 h-5" />
            New Research
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="p-6 rounded-xl bg-gray-900/50 border border-gray-800">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary-900/50 flex items-center justify-center">
                <FileText className="w-6 h-6 text-primary-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">
                  {stats?.totalResearch || 0}
                </div>
                <div className="text-sm text-gray-400">Total Research</div>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-xl bg-gray-900/50 border border-gray-800">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-900/50 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">
                  {stats?.completedResearch || 0}
                </div>
                <div className="text-sm text-gray-400">Completed</div>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-xl bg-gray-900/50 border border-gray-800">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-900/50 flex items-center justify-center">
                <Zap className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">
                  {user?.credits || 0}
                </div>
                <div className="text-sm text-gray-400">Credits Left</div>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-xl bg-gray-900/50 border border-gray-800">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-900/50 flex items-center justify-center">
                <Key className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">
                  {stats?.apiKeys || 1}
                </div>
                <div className="text-sm text-gray-400">API Keys</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Recent Research */}
          <div className="lg:col-span-2">
            <div className="rounded-xl bg-gray-900/50 border border-gray-800 overflow-hidden">
              <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Recent Research</h2>
                <Link
                  to="/research/new"
                  className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1"
                >
                  View all
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>

              {research.length === 0 ? (
                <div className="p-8 text-center">
                  <Search className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">No research yet</h3>
                  <p className="text-gray-400 mb-4">
                    Start your first research to see it here.
                  </p>
                  <Link
                    to="/research/new"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 rounded-lg text-sm font-medium transition"
                  >
                    <Plus className="w-4 h-4" />
                    New Research
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-gray-800">
                  {research.map((item) => {
                    const status = statusConfig[item.status as keyof typeof statusConfig] || statusConfig.pending
                    const StatusIcon = status.icon
                    
                    return (
                      <Link
                        key={item.id}
                        to={`/research/${item.id}`}
                        className="flex items-center gap-4 p-4 hover:bg-gray-800/50 transition"
                      >
                        <div className={`p-2 rounded-lg ${status.bg}`}>
                          <StatusIcon
                            className={`w-5 h-5 ${status.color} ${status.animate ? 'animate-spin' : ''}`}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-white font-medium truncate">
                            {item.query}
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-gray-500 capitalize">
                              {item.template}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatDate(item.createdAt)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {item.status !== 'completed' && item.status !== 'failed' && (
                            <div className="w-24 h-2 bg-gray-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary-500 rounded-full transition-all"
                                style={{ width: `${item.progress}%` }}
                              />
                            </div>
                          )}
                          <ArrowRight className="w-4 h-4 text-gray-500" />
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions & Usage */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="rounded-xl bg-gray-900/50 border border-gray-800 p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
              <div className="space-y-3">
                <Link
                  to="/research/new"
                  className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary-900/50 flex items-center justify-center">
                    <Plus className="w-5 h-5 text-primary-400" />
                  </div>
                  <div>
                    <div className="text-white font-medium">New Research</div>
                    <div className="text-xs text-gray-400">Start a new research query</div>
                  </div>
                </Link>
                
                <Link
                  to="/docs"
                  className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition"
                >
                  <div className="w-10 h-10 rounded-lg bg-blue-900/50 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <div className="text-white font-medium">View Reports</div>
                    <div className="text-xs text-gray-400">Browse past research reports</div>
                  </div>
                </Link>
                
                <Link
                  to="/docs"
                  className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition"
                >
                  <div className="w-10 h-10 rounded-lg bg-green-900/50 flex items-center justify-center">
                    <Key className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <div className="text-white font-medium">API Documentation</div>
                    <div className="text-xs text-gray-400">Integrate with your apps</div>
                  </div>
                </Link>
              </div>
            </div>

            {/* Usage Chart Placeholder */}
            <div className="rounded-xl bg-gray-900/50 border border-gray-800 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Usage This Month</h2>
                <TrendingUp className="w-5 h-5 text-green-400" />
              </div>
              
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">Credits Used</span>
                    <span className="text-white">{stats?.creditsUsed || 0} / {(stats?.creditsUsed || 0) + (user?.credits || 0)}</span>
                  </div>
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary-500 rounded-full"
                      style={{
                        width: `${((stats?.creditsUsed || 0) / ((stats?.creditsUsed || 0) + (user?.credits || 0) || 1)) * 100}%`
                      }}
                    />
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">Research Completed</span>
                    <span className="text-white">{stats?.completedResearch || 0}</span>
                  </div>
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full"
                      style={{ width: `${Math.min(((stats?.completedResearch || 0) / 20) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
              
              <div className="mt-4 p-3 rounded-lg bg-primary-900/20 border border-primary-700/30">
                <div className="text-sm text-primary-300">
                  <strong className="text-primary-200">{user?.plan?.toUpperCase()}</strong> plan
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {user?.credits} credits remaining this month
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
