import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import {
  Search,
  LayoutDashboard,
  FileText,
  Book,
  Settings,
  LogOut,
  Menu,
  X,
  User,
  ChevronDown,
  Shield,
  Key,
} from 'lucide-react'

const navLinks = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/research/new', icon: Search, label: 'New Research' },
  { to: '/docs', icon: Book, label: 'API Docs' },
]

export default function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const { user, logout } = useAuthStore()
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const planColors = {
    free: 'bg-gray-600',
    starter: 'bg-blue-600',
    pro: 'bg-primary-600',
    enterprise: 'bg-amber-600',
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/dashboard" className="flex items-center gap-3">
            <img
              src="/innovatehub-logo.png"
              alt="InnovateHub"
              className="h-9 w-9"
              onError={(e) => {
                e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%238b5cf6" width="100" height="100" rx="20"/><text x="50" y="65" text-anchor="middle" fill="white" font-size="50" font-weight="bold">I</text></svg>'
              }}
            />
            <span className="text-lg font-bold hidden sm:block">
              <span className="text-white">Innovate</span>
              <span className="text-primary-400">Research</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.to
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                    isActive
                      ? 'bg-primary-600/20 text-primary-400'
                      : 'text-gray-300 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  <link.icon className="w-4 h-4" />
                  {link.label}
                </Link>
              )
            })}
            
            {user?.role === 'admin' && (
              <Link
                to="/admin"
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                  location.pathname === '/admin'
                    ? 'bg-primary-600/20 text-primary-400'
                    : 'text-gray-300 hover:text-white hover:bg-gray-800'
                }`}
              >
                <Shield className="w-4 h-4" />
                Admin
              </Link>
            )}
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-4">
            {/* Credits Badge */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gray-800 rounded-lg">
              <div className="w-2 h-2 rounded-full bg-primary-500"></div>
              <span className="text-sm text-gray-300">
                <span className="font-semibold text-white">{user?.credits || 0}</span> credits
              </span>
            </div>

            {/* User Dropdown */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-800 transition"
              >
                <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <span className="hidden sm:block text-sm text-gray-300">
                  {user?.name || 'User'}
                </span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>

              {userMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setUserMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-64 bg-gray-900 border border-gray-800 rounded-xl shadow-xl z-20 overflow-hidden">
                    <div className="p-4 border-b border-gray-800">
                      <div className="font-semibold text-white">{user?.name}</div>
                      <div className="text-sm text-gray-400">{user?.email}</div>
                      <div className="mt-2 flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium text-white ${planColors[user?.plan || 'free']}`}>
                          {user?.plan?.toUpperCase()}
                        </span>
                        <span className="text-xs text-gray-500">
                          {user?.credits} credits
                        </span>
                      </div>
                    </div>
                    
                    <div className="p-2">
                      <Link
                        to="/dashboard"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 rounded-lg transition"
                      >
                        <LayoutDashboard className="w-4 h-4" />
                        Dashboard
                      </Link>
                      <Link
                        to="/research/new"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 rounded-lg transition"
                      >
                        <FileText className="w-4 h-4" />
                        New Research
                      </Link>
                      <button
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 rounded-lg transition"
                      >
                        <Key className="w-4 h-4" />
                        API Keys
                      </button>
                      <button
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 rounded-lg transition"
                      >
                        <Settings className="w-4 h-4" />
                        Settings
                      </button>
                    </div>
                    
                    <div className="p-2 border-t border-gray-800">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:bg-red-900/20 rounded-lg transition"
                      >
                        <LogOut className="w-4 h-4" />
                        Logout
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-gray-400 hover:text-white"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-800 bg-gray-900">
          <div className="px-4 py-4 space-y-2">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.to
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition ${
                    isActive
                      ? 'bg-primary-600/20 text-primary-400'
                      : 'text-gray-300 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  <link.icon className="w-5 h-5" />
                  {link.label}
                </Link>
              )
            })}
            
            {user?.role === 'admin' && (
              <Link
                to="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800 transition"
              >
                <Shield className="w-5 h-5" />
                Admin Panel
              </Link>
            )}
            
            <div className="pt-2 mt-2 border-t border-gray-800">
              <div className="flex items-center gap-2 px-4 py-2 text-sm text-gray-400">
                <div className="w-2 h-2 rounded-full bg-primary-500"></div>
                {user?.credits} credits remaining
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
