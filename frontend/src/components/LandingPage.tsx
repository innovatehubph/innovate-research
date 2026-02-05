import { Link } from 'react-router-dom'
import {
  Search,
  Brain,
  FileDown,
  Code2,
  Zap,
  Globe,
  Shield,
  ArrowRight,
  Check,
  Sparkles,
} from 'lucide-react'

const features = [
  {
    icon: Globe,
    title: 'Multi-Source Intelligence',
    description: 'Automatically crawls and analyzes 50+ sources including news, research papers, and industry reports.',
  },
  {
    icon: Brain,
    title: 'AI-Powered Analysis',
    description: 'Advanced AI synthesizes information into coherent, actionable insights with source citations.',
  },
  {
    icon: FileDown,
    title: 'Multiple Export Formats',
    description: 'Export reports as PDF, Markdown, CSV, JSON, or RAG-ready chunks for AI applications.',
  },
  {
    icon: Code2,
    title: 'Developer API',
    description: 'Full REST API with webhooks. Integrate research capabilities into your applications.',
  },
]

const plans = [
  {
    name: 'FREE',
    price: 0,
    credits: 10,
    features: [
      '10 research credits/month',
      'Quick depth only',
      'PDF & Markdown export',
      'Email support',
    ],
  },
  {
    name: 'STARTER',
    price: 29,
    credits: 100,
    features: [
      '100 research credits/month',
      'Standard depth',
      'All export formats',
      'API access',
      'Priority support',
    ],
  },
  {
    name: 'PRO',
    price: 99,
    credits: 500,
    popular: true,
    features: [
      '500 research credits/month',
      'Deep research mode',
      'Webhook notifications',
      'RAG export format',
      'Dedicated support',
      'Custom templates',
    ],
  },
  {
    name: 'ENTERPRISE',
    price: -1,
    credits: -1,
    features: [
      'Unlimited research',
      'Custom AI models',
      'On-premise deployment',
      'SLA guarantee',
      'Account manager',
      'Custom integrations',
    ],
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen animated-bg">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <img
                src="/innovatehub-logo.png"
                alt="InnovateHub"
                className="h-10 w-10"
                onError={(e) => {
                  e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%238b5cf6" width="100" height="100" rx="20"/><text x="50" y="65" text-anchor="middle" fill="white" font-size="50" font-weight="bold">I</text></svg>'
                }}
              />
              <span className="text-xl font-bold">
                <span className="text-white">Innovate</span>
                <span className="text-primary-400">Research</span>
              </span>
            </div>
            
            <div className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-gray-300 hover:text-white transition">Features</a>
              <a href="#pricing" className="text-gray-300 hover:text-white transition">Pricing</a>
              <Link to="/docs" className="text-gray-300 hover:text-white transition">API Docs</Link>
              <Link
                to="/login"
                className="text-gray-300 hover:text-white transition"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 rounded-lg font-medium transition"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-900/50 rounded-full border border-primary-700/50 mb-8">
            <Sparkles className="w-4 h-4 text-primary-400" />
            <span className="text-sm text-primary-300">Powered by InnovateHub</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            <span className="gradient-text">AI-Powered</span>
            <br />
            <span className="text-white">Deep Research</span>
          </h1>
          
          <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-10">
            Transform any query into comprehensive, well-sourced research reports.
            From market analysis to competitor intelligence — automated and accurate.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="flex items-center gap-2 px-8 py-4 bg-primary-600 hover:bg-primary-700 rounded-xl font-semibold text-lg transition glow-violet"
            >
              Start Researching Free
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              to="/docs"
              className="flex items-center gap-2 px-8 py-4 bg-gray-800 hover:bg-gray-700 rounded-xl font-semibold text-lg transition border border-gray-700"
            >
              <Code2 className="w-5 h-5" />
              View API Docs
            </Link>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto mt-16">
            <div>
              <div className="text-3xl font-bold text-white">50+</div>
              <div className="text-gray-500">Sources Analyzed</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white">10K+</div>
              <div className="text-gray-500">Reports Generated</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white">99.9%</div>
              <div className="text-gray-500">Uptime SLA</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Research at the Speed of AI
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Everything you need to gather, analyze, and synthesize information
              from across the web.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="p-6 rounded-2xl bg-gray-900/50 border border-gray-800 hover:border-primary-700/50 transition group"
              >
                <div className="w-12 h-12 rounded-xl bg-primary-900/50 flex items-center justify-center mb-4 group-hover:bg-primary-800/50 transition">
                  <feature.icon className="w-6 h-6 text-primary-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-400 text-sm">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 bg-gray-900/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              How It Works
            </h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary-600 flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-white" />
              </div>
              <div className="text-2xl font-bold text-primary-400 mb-2">1. Query</div>
              <p className="text-gray-400">
                Enter your research question or topic. Choose a template for structured output.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary-600 flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <div className="text-2xl font-bold text-primary-400 mb-2">2. Process</div>
              <p className="text-gray-400">
                AI searches, crawls, and analyzes multiple sources automatically.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary-600 flex items-center justify-center mx-auto mb-4">
                <FileDown className="w-8 h-8 text-white" />
              </div>
              <div className="text-2xl font-bold text-primary-400 mb-2">3. Report</div>
              <p className="text-gray-400">
                Receive a comprehensive report with citations. Export in any format.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-gray-400 text-lg">
              Start free, scale as you grow.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative p-6 rounded-2xl ${
                  plan.popular
                    ? 'bg-primary-900/30 border-2 border-primary-500'
                    : 'bg-gray-900/50 border border-gray-800'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary-600 rounded-full text-xs font-semibold">
                    MOST POPULAR
                  </div>
                )}
                
                <div className="text-sm font-semibold text-primary-400 mb-2">
                  {plan.name}
                </div>
                
                <div className="mb-4">
                  {plan.price === -1 ? (
                    <span className="text-3xl font-bold text-white">Custom</span>
                  ) : (
                    <>
                      <span className="text-3xl font-bold text-white">${plan.price}</span>
                      <span className="text-gray-400">/mo</span>
                    </>
                  )}
                </div>
                
                <div className="text-sm text-gray-400 mb-6">
                  {plan.credits === -1 ? 'Unlimited' : `${plan.credits} credits/month`}
                </div>
                
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary-400 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Link
                  to="/register"
                  className={`block text-center py-3 rounded-lg font-medium transition ${
                    plan.popular
                      ? 'bg-primary-600 hover:bg-primary-700 text-white'
                      : 'bg-gray-800 hover:bg-gray-700 text-white'
                  }`}
                >
                  {plan.price === -1 ? 'Contact Sales' : 'Get Started'}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="p-12 rounded-3xl bg-gradient-to-r from-primary-900/50 to-purple-900/50 border border-primary-700/50">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to Supercharge Your Research?
            </h2>
            <p className="text-gray-300 text-lg mb-8">
              Join thousands of researchers, analysts, and developers using Innovate Research.
            </p>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-gray-900 hover:bg-gray-100 rounded-xl font-semibold text-lg transition"
            >
              Start Free Trial
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-gray-800">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <img
                src="/innovatehub-logo.png"
                alt="InnovateHub"
                className="h-8 w-8"
                onError={(e) => {
                  e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%238b5cf6" width="100" height="100" rx="20"/><text x="50" y="65" text-anchor="middle" fill="white" font-size="50" font-weight="bold">I</text></svg>'
                }}
              />
              <span className="text-gray-400">
                A product of <span className="text-primary-400 font-semibold">InnovateHub</span>
              </span>
            </div>
            
            <div className="flex items-center gap-6">
              <Link to="/docs" className="text-gray-400 hover:text-white transition">API Docs</Link>
              <a href="#" className="text-gray-400 hover:text-white transition">Privacy</a>
              <a href="#" className="text-gray-400 hover:text-white transition">Terms</a>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-green-500" />
                <span className="text-sm text-gray-400">SOC 2 Compliant</span>
              </div>
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t border-gray-800 text-center text-gray-500 text-sm">
            © 2024 InnovateHub. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
