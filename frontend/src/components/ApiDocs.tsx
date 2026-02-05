import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import {
  ArrowLeft,
  Copy,
  Check,
  Code2,
  Key,
  Zap,
  FileText,
  Globe,
  ChevronDown,
  ChevronRight,
  ExternalLink,
} from 'lucide-react'
import toast from 'react-hot-toast'

const endpoints = [
  {
    method: 'POST',
    path: '/api/auth/register',
    description: 'Register a new user account',
    auth: false,
    body: {
      email: 'string',
      password: 'string',
      name: 'string',
    },
    response: {
      user: { id: 'string', email: 'string', name: 'string', plan: 'string', credits: 'number' },
      token: 'string',
      apiKey: 'string',
    },
  },
  {
    method: 'POST',
    path: '/api/auth/login',
    description: 'Login to existing account',
    auth: false,
    body: {
      email: 'string',
      password: 'string',
    },
    response: {
      user: { id: 'string', email: 'string', name: 'string', plan: 'string', credits: 'number' },
      token: 'string',
    },
  },
  {
    method: 'POST',
    path: '/api/research',
    description: 'Start a new research task',
    auth: true,
    body: {
      query: 'string (required)',
      template: 'string (company|competitor|market|product|technology|investment)',
      depth: 'string (quick|standard|deep)',
      exportFormats: 'array (pdf|md|csv|json|rag)',
      webhookUrl: 'string (optional)',
    },
    response: {
      id: 'string',
      status: 'pending',
      message: 'Research started',
    },
  },
  {
    method: 'GET',
    path: '/api/research/:id',
    description: 'Get research details and report',
    auth: true,
    response: {
      id: 'string',
      query: 'string',
      template: 'string',
      status: 'string',
      progress: 'number',
      sourcesFound: 'number',
      report: 'string (markdown)',
      sources: 'array',
    },
  },
  {
    method: 'GET',
    path: '/api/research/:id/status',
    description: 'Get research status (for polling)',
    auth: true,
    response: {
      status: 'string',
      progress: 'number',
      sourcesFound: 'number',
    },
  },
  {
    method: 'GET',
    path: '/api/research/:id/export/:format',
    description: 'Export research in specified format',
    auth: true,
    response: 'Binary file (PDF, MD, CSV, JSON)',
  },
  {
    method: 'POST',
    path: '/api/research/:id/cancel',
    description: 'Cancel an in-progress research task',
    auth: true,
    response: {
      message: 'Research cancelled',
    },
  },
  {
    method: 'GET',
    path: '/api/research',
    description: 'List user research tasks',
    auth: true,
    params: {
      limit: 'number (default: 20)',
      offset: 'number (default: 0)',
      status: 'string (optional)',
    },
    response: {
      research: 'array',
      total: 'number',
    },
  },
]

const codeExamples = {
  curl: `curl -X POST https://research.innovatehub.ph/api/research \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "query": "Tesla market position in electric vehicles",
    "template": "company",
    "depth": "standard",
    "exportFormats": ["pdf", "md"]
  }'`,
  
  javascript: `const response = await fetch('https://research.innovatehub.ph/api/research', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    query: 'Tesla market position in electric vehicles',
    template: 'company',
    depth: 'standard',
    exportFormats: ['pdf', 'md'],
  }),
});

const { id } = await response.json();

// Poll for completion
let status = 'pending';
while (['pending', 'searching', 'crawling', 'analyzing', 'generating'].includes(status)) {
  await new Promise(r => setTimeout(r, 2000));
  const statusRes = await fetch(\`https://research.innovatehub.ph/api/research/\${id}/status\`, {
    headers: { 'Authorization': 'Bearer YOUR_API_KEY' },
  });
  const data = await statusRes.json();
  status = data.status;
}`,

  python: `import requests
import time

API_KEY = "YOUR_API_KEY"
BASE_URL = "https://research.innovatehub.ph/api"

# Start research
response = requests.post(
    f"{BASE_URL}/research",
    headers={"Authorization": f"Bearer {API_KEY}"},
    json={
        "query": "Tesla market position in electric vehicles",
        "template": "company",
        "depth": "standard",
        "exportFormats": ["pdf", "md"]
    }
)
research_id = response.json()["id"]

# Poll for completion
while True:
    status_res = requests.get(
        f"{BASE_URL}/research/{research_id}/status",
        headers={"Authorization": f"Bearer {API_KEY}"}
    )
    status = status_res.json()["status"]
    
    if status in ["completed", "failed", "cancelled"]:
        break
    
    time.sleep(2)

# Download report
report = requests.get(
    f"{BASE_URL}/research/{research_id}",
    headers={"Authorization": f"Bearer {API_KEY}"}
).json()

print(report["report"])`,
}

export default function ApiDocs() {
  const { isAuthenticated } = useAuthStore()
  const [expandedEndpoint, setExpandedEndpoint] = useState<string | null>(null)
  const [activeLanguage, setActiveLanguage] = useState<'curl' | 'javascript' | 'python'>('curl')
  const [copied, setCopied] = useState(false)

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    toast.success('Code copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  const methodColors: Record<string, string> = {
    GET: 'bg-green-600',
    POST: 'bg-blue-600',
    PUT: 'bg-amber-600',
    DELETE: 'bg-red-600',
  }

  return (
    <div className="min-h-screen pt-20 pb-10 px-4 animated-bg">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            to={isAuthenticated ? '/dashboard' : '/'}
            className="p-2 rounded-lg hover:bg-gray-800 transition"
          >
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">API Documentation</h1>
            <p className="text-gray-400 mt-1">
              Integrate Innovate Research into your applications
            </p>
          </div>
        </div>

        {/* Quick Start */}
        <div className="rounded-xl bg-gray-900/50 border border-gray-800 p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary-400" />
            Quick Start
          </h2>
          
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700">
              <div className="w-10 h-10 rounded-lg bg-primary-900/50 flex items-center justify-center mb-3">
                <Key className="w-5 h-5 text-primary-400" />
              </div>
              <div className="font-medium text-white mb-1">1. Get API Key</div>
              <p className="text-sm text-gray-400">
                {isAuthenticated
                  ? 'Your API key is in your dashboard'
                  : 'Register to get your API key'}
              </p>
            </div>
            
            <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700">
              <div className="w-10 h-10 rounded-lg bg-primary-900/50 flex items-center justify-center mb-3">
                <Code2 className="w-5 h-5 text-primary-400" />
              </div>
              <div className="font-medium text-white mb-1">2. Make Request</div>
              <p className="text-sm text-gray-400">
                POST to /api/research with your query
              </p>
            </div>
            
            <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700">
              <div className="w-10 h-10 rounded-lg bg-primary-900/50 flex items-center justify-center mb-3">
                <FileText className="w-5 h-5 text-primary-400" />
              </div>
              <div className="font-medium text-white mb-1">3. Get Report</div>
              <p className="text-sm text-gray-400">
                Poll for status or use webhooks
              </p>
            </div>
          </div>

          {/* Code Examples */}
          <div className="rounded-lg bg-gray-900 border border-gray-800 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-800">
              {(['curl', 'javascript', 'python'] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setActiveLanguage(lang)}
                  className={`px-3 py-1 rounded text-sm font-medium transition ${
                    activeLanguage === lang
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {lang.charAt(0).toUpperCase() + lang.slice(1)}
                </button>
              ))}
              <button
                onClick={() => copyCode(codeExamples[activeLanguage])}
                className="ml-auto p-1.5 text-gray-400 hover:text-white transition"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <pre className="p-4 text-sm text-gray-300 overflow-x-auto">
              <code>{codeExamples[activeLanguage]}</code>
            </pre>
          </div>
        </div>

        {/* Authentication */}
        <div className="rounded-xl bg-gray-900/50 border border-gray-800 p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Key className="w-5 h-5 text-primary-400" />
            Authentication
          </h2>
          
          <p className="text-gray-400 mb-4">
            All API requests require authentication using a Bearer token. Include your API key in the Authorization header:
          </p>
          
          <div className="p-4 rounded-lg bg-gray-900 border border-gray-800 font-mono text-sm">
            <span className="text-gray-500">Authorization:</span>{' '}
            <span className="text-primary-400">Bearer</span>{' '}
            <span className="text-green-400">YOUR_API_KEY</span>
          </div>
          
          {!isAuthenticated && (
            <div className="mt-4 p-4 rounded-lg bg-primary-900/20 border border-primary-700/50">
              <p className="text-sm text-primary-300">
                <Link to="/register" className="font-semibold hover:underline">
                  Create an account
                </Link>
                {' '}to get your API key and start making requests.
              </p>
            </div>
          )}
        </div>

        {/* Endpoints */}
        <div className="rounded-xl bg-gray-900/50 border border-gray-800 overflow-hidden mb-8">
          <div className="p-6 border-b border-gray-800">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary-400" />
              API Endpoints
            </h2>
          </div>
          
          <div className="divide-y divide-gray-800">
            {endpoints.map((endpoint) => {
              const isExpanded = expandedEndpoint === endpoint.path
              
              return (
                <div key={endpoint.path}>
                  <button
                    onClick={() => setExpandedEndpoint(isExpanded ? null : endpoint.path)}
                    className="w-full flex items-center gap-4 p-4 hover:bg-gray-800/50 transition"
                  >
                    <span className={`px-2 py-0.5 rounded text-xs font-bold text-white ${methodColors[endpoint.method]}`}>
                      {endpoint.method}
                    </span>
                    <code className="text-sm text-gray-300 font-mono">{endpoint.path}</code>
                    <span className="text-sm text-gray-500 flex-1 text-left hidden sm:block">
                      {endpoint.description}
                    </span>
                    {endpoint.auth && (
                      <span className="text-xs px-2 py-0.5 bg-amber-900/50 text-amber-400 rounded">
                        Auth
                      </span>
                    )}
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                  
                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-4">
                      <p className="text-gray-400 sm:hidden">{endpoint.description}</p>
                      
                      {endpoint.body && (
                        <div>
                          <div className="text-sm font-medium text-gray-400 mb-2">Request Body</div>
                          <pre className="p-3 rounded-lg bg-gray-900 border border-gray-800 text-sm text-gray-300 overflow-x-auto">
                            {JSON.stringify(endpoint.body, null, 2)}
                          </pre>
                        </div>
                      )}
                      
                      {endpoint.params && (
                        <div>
                          <div className="text-sm font-medium text-gray-400 mb-2">Query Parameters</div>
                          <pre className="p-3 rounded-lg bg-gray-900 border border-gray-800 text-sm text-gray-300 overflow-x-auto">
                            {JSON.stringify(endpoint.params, null, 2)}
                          </pre>
                        </div>
                      )}
                      
                      <div>
                        <div className="text-sm font-medium text-gray-400 mb-2">Response</div>
                        <pre className="p-3 rounded-lg bg-gray-900 border border-gray-800 text-sm text-gray-300 overflow-x-auto">
                          {typeof endpoint.response === 'string'
                            ? endpoint.response
                            : JSON.stringify(endpoint.response, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Rate Limits */}
        <div className="rounded-xl bg-gray-900/50 border border-gray-800 p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Rate Limits</h2>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-400">Plan</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-400">Requests/min</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-400">Concurrent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                <tr>
                  <td className="px-4 py-3 text-gray-300">Free</td>
                  <td className="px-4 py-3 text-gray-300">10</td>
                  <td className="px-4 py-3 text-gray-300">1</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-gray-300">Starter</td>
                  <td className="px-4 py-3 text-gray-300">30</td>
                  <td className="px-4 py-3 text-gray-300">3</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-gray-300">Pro</td>
                  <td className="px-4 py-3 text-gray-300">100</td>
                  <td className="px-4 py-3 text-gray-300">10</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-gray-300">Enterprise</td>
                  <td className="px-4 py-3 text-gray-300">Unlimited</td>
                  <td className="px-4 py-3 text-gray-300">Unlimited</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer CTA */}
        {!isAuthenticated && (
          <div className="text-center p-8 rounded-xl bg-gradient-to-r from-primary-900/50 to-purple-900/50 border border-primary-700/50">
            <h3 className="text-xl font-semibold text-white mb-2">
              Ready to start building?
            </h3>
            <p className="text-gray-400 mb-4">
              Create a free account and get your API key instantly.
            </p>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 rounded-lg font-semibold transition"
            >
              Get Started Free
              <ExternalLink className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
