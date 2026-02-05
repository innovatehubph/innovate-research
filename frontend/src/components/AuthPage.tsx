import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { authApi } from '../lib/api'
import { Eye, EyeOff, ArrowLeft, Copy, Check, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'

interface AuthPageProps {
  mode: 'login' | 'register'
}

export default function AuthPage({ mode }: AuthPageProps) {
  const [isLogin, setIsLogin] = useState(mode === 'login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (isLogin) {
        const response = await authApi.login({ email, password })
        setAuth(response.user, response.token)
        toast.success('Welcome back!')
        navigate('/dashboard')
      } else {
        const response = await authApi.register({ email, password, name })
        setAuth(response.user, response.token)
        setApiKey(response.apiKey)
        toast.success('Account created successfully!')
      }
    } catch (error) {
      // Error handled by interceptor
    } finally {
      setLoading(false)
    }
  }

  const copyApiKey = () => {
    if (apiKey) {
      navigator.clipboard.writeText(apiKey)
      setCopied(true)
      toast.success('API key copied!')
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const continueTodasboard = () => {
    navigate('/dashboard')
  }

  // Show API key after registration
  if (apiKey) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 animated-bg">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <img
              src="/innovatehub-logo.png"
              alt="InnovateHub"
              className="h-16 w-16 mx-auto mb-4"
              onError={(e) => {
                e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%238b5cf6" width="100" height="100" rx="20"/><text x="50" y="65" text-anchor="middle" fill="white" font-size="50" font-weight="bold">I</text></svg>'
              }}
            />
            <h1 className="text-2xl font-bold text-white mb-2">
              Welcome to Innovate Research!
            </h1>
            <p className="text-gray-400">
              Your account has been created. Here's your API key.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-gray-900/50 border border-gray-800">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Your API Key
              </label>
              <div className="flex items-center gap-2">
                <code className="flex-1 p-3 bg-gray-800 rounded-lg text-primary-400 text-sm font-mono break-all">
                  {apiKey}
                </code>
                <button
                  onClick={copyApiKey}
                  className="p-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition"
                >
                  {copied ? (
                    <Check className="w-5 h-5 text-green-400" />
                  ) : (
                    <Copy className="w-5 h-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            <div className="p-4 bg-amber-900/20 border border-amber-700/50 rounded-lg mb-6">
              <p className="text-sm text-amber-300">
                <strong>Important:</strong> Save this API key now. You won't be able to see it again.
              </p>
            </div>

            <button
              onClick={continueTodasboard}
              className="w-full py-3 bg-primary-600 hover:bg-primary-700 rounded-lg font-semibold transition"
            >
              Continue to Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 animated-bg">
      <div className="w-full max-w-md">
        {/* Back Link */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>

        {/* Logo & Title */}
        <div className="text-center mb-8">
          <img
            src="/innovatehub-logo.png"
            alt="InnovateHub"
            className="h-16 w-16 mx-auto mb-4"
            onError={(e) => {
              e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%238b5cf6" width="100" height="100" rx="20"/><text x="50" y="65" text-anchor="middle" fill="white" font-size="50" font-weight="bold">I</text></svg>'
            }}
          />
          <h1 className="text-2xl font-bold text-white mb-2">
            {isLogin ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className="text-gray-400">
            {isLogin
              ? 'Sign in to continue to Innovate Research'
              : 'Start researching with AI today'}
          </p>
        </div>

        {/* Auth Form */}
        <div className="p-6 rounded-2xl bg-gray-900/50 border border-gray-800">
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  required
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 transition"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={8}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 transition pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {isLogin && (
              <div className="text-right">
                <a href="#" className="text-sm text-primary-400 hover:text-primary-300">
                  Forgot password?
                </a>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-800 disabled:cursor-not-allowed rounded-lg font-semibold transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  {isLogin ? 'Signing in...' : 'Creating account...'}
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  {isLogin ? 'Sign In' : 'Create Account'}
                </>
              )}
            </button>
          </form>

          {/* Toggle Mode */}
          <div className="mt-6 text-center">
            <p className="text-gray-400">
              {isLogin ? "Don't have an account?" : 'Already have an account?'}
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="ml-2 text-primary-400 hover:text-primary-300 font-medium"
              >
                {isLogin ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-gray-500">
          By continuing, you agree to our{' '}
          <a href="#" className="text-primary-400 hover:underline">Terms of Service</a>
          {' '}and{' '}
          <a href="#" className="text-primary-400 hover:underline">Privacy Policy</a>
        </p>
      </div>
    </div>
  )
}
