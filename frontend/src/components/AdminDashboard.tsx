import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { adminApi } from '../lib/api'
import {
  Users,
  FileText,
  DollarSign,
  Activity,
  ArrowLeft,
  Search,
  Loader2,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react'

interface AdminStats {
  totalUsers: number
  activeUsers: number
  totalResearch: number
  completedResearch: number
  revenue: number
  queueSize: number
}

interface User {
  id: string
  email: string
  name: string
  plan: string
  credits: number
  createdAt: string
}

interface Research {
  id: string
  userId: string
  query: string
  status: string
  createdAt: string
}

interface Transaction {
  id: string
  userId: string
  type: string
  amount: number
  credits: number
  description: string
  createdAt: string
}

type Tab = 'overview' | 'users' | 'research' | 'transactions'

const planColors: Record<string, string> = {
  free: 'bg-gray-600',
  starter: 'bg-blue-600',
  pro: 'bg-primary-600',
  enterprise: 'bg-amber-600',
}

const statusConfig: Record<string, { icon: typeof Clock; color: string; bg: string }> = {
  pending: { icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  searching: { icon: Loader2, color: 'text-blue-400', bg: 'bg-blue-400/10' },
  crawling: { icon: Loader2, color: 'text-blue-400', bg: 'bg-blue-400/10' },
  analyzing: { icon: Loader2, color: 'text-purple-400', bg: 'bg-purple-400/10' },
  generating: { icon: Loader2, color: 'text-primary-400', bg: 'bg-primary-400/10' },
  completed: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-400/10' },
  failed: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-400/10' },
  cancelled: { icon: XCircle, color: 'text-gray-400', bg: 'bg-gray-400/10' },
}

export default function AdminDashboard() {
  const [tab, setTab] = useState<Tab>('overview')
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [research, setResearch] = useState<Research[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadData()
  }, [tab])

  const loadData = async () => {
    setLoading(true)
    try {
      if (tab === 'overview' || !stats) {
        const statsData = await adminApi.getStats()
        setStats(statsData)
      }
      
      if (tab === 'users') {
        const usersData = await adminApi.getUsers({ limit: 50 })
        setUsers(usersData.users || [])
      }
      
      if (tab === 'research') {
        const researchData = await adminApi.getResearch({ limit: 50 })
        setResearch(researchData.research || [])
      }
      
      if (tab === 'transactions') {
        const transactionsData = await adminApi.getTransactions({ limit: 50 })
        setTransactions(transactionsData.transactions || [])
      }
    } catch (error) {
      // Error handled by interceptor
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'research', label: 'Research', icon: FileText },
    { id: 'transactions', label: 'Transactions', icon: DollarSign },
  ]

  return (
    <div className="min-h-screen pt-20 pb-10 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            to="/dashboard"
            className="p-2 rounded-lg hover:bg-gray-800 transition"
          >
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
            <p className="text-gray-400 mt-1">Manage users, research, and transactions</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as Tab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                tab === t.id
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>

        {loading && tab !== 'overview' ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <>
            {/* Overview Tab */}
            {tab === 'overview' && stats && (
              <div className="space-y-6">
                {/* Stats Cards */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-6 rounded-xl bg-gray-900/50 border border-gray-800">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-blue-900/50 flex items-center justify-center">
                        <Users className="w-6 h-6 text-blue-400" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-white">{stats.totalUsers}</div>
                        <div className="text-sm text-gray-400">Total Users</div>
                      </div>
                    </div>
                    <div className="mt-3 text-xs text-green-400">
                      {stats.activeUsers} active this month
                    </div>
                  </div>

                  <div className="p-6 rounded-xl bg-gray-900/50 border border-gray-800">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-primary-900/50 flex items-center justify-center">
                        <FileText className="w-6 h-6 text-primary-400" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-white">{stats.totalResearch}</div>
                        <div className="text-sm text-gray-400">Total Research</div>
                      </div>
                    </div>
                    <div className="mt-3 text-xs text-green-400">
                      {stats.completedResearch} completed
                    </div>
                  </div>

                  <div className="p-6 rounded-xl bg-gray-900/50 border border-gray-800">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-green-900/50 flex items-center justify-center">
                        <DollarSign className="w-6 h-6 text-green-400" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-white">
                          {formatCurrency(stats.revenue)}
                        </div>
                        <div className="text-sm text-gray-400">Revenue</div>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 rounded-xl bg-gray-900/50 border border-gray-800">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-amber-900/50 flex items-center justify-center">
                        <Activity className="w-6 h-6 text-amber-400" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-white">{stats.queueSize}</div>
                        <div className="text-sm text-gray-400">Queue Size</div>
                      </div>
                    </div>
                    <div className="mt-3 text-xs text-gray-400">
                      Research in progress
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <button
                    onClick={() => setTab('users')}
                    className="p-4 rounded-xl bg-gray-900/50 border border-gray-800 hover:border-gray-700 transition text-left"
                  >
                    <Users className="w-6 h-6 text-blue-400 mb-2" />
                    <div className="font-medium text-white">Manage Users</div>
                    <div className="text-sm text-gray-400">View and edit user accounts</div>
                  </button>
                  
                  <button
                    onClick={() => setTab('research')}
                    className="p-4 rounded-xl bg-gray-900/50 border border-gray-800 hover:border-gray-700 transition text-left"
                  >
                    <FileText className="w-6 h-6 text-primary-400 mb-2" />
                    <div className="font-medium text-white">Research Queue</div>
                    <div className="text-sm text-gray-400">Monitor research jobs</div>
                  </button>
                  
                  <button
                    onClick={() => setTab('transactions')}
                    className="p-4 rounded-xl bg-gray-900/50 border border-gray-800 hover:border-gray-700 transition text-left"
                  >
                    <DollarSign className="w-6 h-6 text-green-400 mb-2" />
                    <div className="font-medium text-white">Transactions</div>
                    <div className="text-sm text-gray-400">View payment history</div>
                  </button>
                </div>
              </div>
            )}

            {/* Users Tab */}
            {tab === 'users' && (
              <div className="rounded-xl bg-gray-900/50 border border-gray-800 overflow-hidden">
                <div className="p-4 border-b border-gray-800 flex items-center gap-4">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary-500"
                    />
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-800">
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">User</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Plan</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Credits</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Joined</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {users
                        .filter(u => 
                          u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          u.email.toLowerCase().includes(searchQuery.toLowerCase())
                        )
                        .map((user) => (
                        <tr key={user.id} className="hover:bg-gray-800/50">
                          <td className="px-4 py-4">
                            <div className="font-medium text-white">{user.name}</div>
                            <div className="text-sm text-gray-400">{user.email}</div>
                          </td>
                          <td className="px-4 py-4">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium text-white ${planColors[user.plan] || 'bg-gray-600'}`}>
                              {user.plan.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-gray-300">{user.credits}</td>
                          <td className="px-4 py-4 text-gray-400 text-sm">{formatDate(user.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Research Tab */}
            {tab === 'research' && (
              <div className="rounded-xl bg-gray-900/50 border border-gray-800 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-800">
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Query</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Created</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {research.map((r) => {
                        const status = statusConfig[r.status] || statusConfig.pending
                        const StatusIcon = status.icon
                        
                        return (
                          <tr key={r.id} className="hover:bg-gray-800/50">
                            <td className="px-4 py-4">
                              <div className="text-white max-w-md truncate">{r.query}</div>
                              <div className="text-xs text-gray-500 mt-1">{r.id.slice(0, 8)}</div>
                            </td>
                            <td className="px-4 py-4">
                              <div className={`inline-flex items-center gap-2 px-2 py-1 rounded ${status.bg}`}>
                                <StatusIcon className={`w-4 h-4 ${status.color}`} />
                                <span className={`text-sm capitalize ${status.color}`}>{r.status}</span>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-gray-400 text-sm">{formatDate(r.createdAt)}</td>
                            <td className="px-4 py-4">
                              <Link
                                to={`/research/${r.id}`}
                                className="text-primary-400 hover:text-primary-300 text-sm"
                              >
                                View
                              </Link>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Transactions Tab */}
            {tab === 'transactions' && (
              <div className="rounded-xl bg-gray-900/50 border border-gray-800 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-800">
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Description</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Type</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Amount</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Credits</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {transactions.map((t) => (
                        <tr key={t.id} className="hover:bg-gray-800/50">
                          <td className="px-4 py-4 text-white">{t.description}</td>
                          <td className="px-4 py-4">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${
                              t.type === 'purchase'
                                ? 'bg-green-900/50 text-green-400'
                                : t.type === 'refund'
                                ? 'bg-red-900/50 text-red-400'
                                : 'bg-blue-900/50 text-blue-400'
                            }`}>
                              {t.type}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-gray-300">
                            {t.amount > 0 ? formatCurrency(t.amount) : '-'}
                          </td>
                          <td className="px-4 py-4 text-gray-300">
                            {t.credits > 0 ? `+${t.credits}` : t.credits}
                          </td>
                          <td className="px-4 py-4 text-gray-400 text-sm">{formatDate(t.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
