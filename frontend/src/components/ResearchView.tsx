import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Search, Globe, Brain, FileText, CheckCircle, XCircle,
  Loader2, Download, ArrowLeft, ExternalLink, Copy, Check, Clock
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import api from '../lib/api';
import toast from 'react-hot-toast';

interface Research {
  id: string;
  query: string;
  template: string;
  status: string;
  progress: number;
  sources?: {
    searched: number;
    crawled: number;
    relevant: number;
    urls: Array<{ url: string; title: string }>;
  };
  report?: {
    title: string;
    summary: string;
    sections: Array<{ id: string; title: string; content: string }>;
    sources: Array<{ url: string; title: string }>;
    generatedAt: string;
  };
  error?: string;
  createdAt: string;
}

const statusSteps = [
  { id: 'PENDING', label: 'Queued', icon: Clock },
  { id: 'SEARCHING', label: 'Searching', icon: Search },
  { id: 'CRAWLING', label: 'Crawling', icon: Globe },
  { id: 'ANALYZING', label: 'Analyzing', icon: Brain },
  { id: 'GENERATING', label: 'Generating', icon: FileText },
  { id: 'COMPLETED', label: 'Complete', icon: CheckCircle },
];

export default function ResearchView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useAuthStore();
  
  const [research, setResearch] = useState<Research | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadResearch();
  }, [id]);

  const loadResearch = async () => {
    try {
      const res = await api.get(`/research/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setResearch(res.data);
      if (res.data.report?.sections?.length > 0) {
        setActiveSection(res.data.report.sections[0].id);
      }
    } catch {
      toast.error('Failed to load research');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: string) => {
    setExporting(format);
    try {
      const res = await api.get(`/reports/${id}/export`, {
        params: { format },
        headers: { Authorization: `Bearer ${token}` },
        responseType: format === 'json' ? 'json' : 'blob',
      });
      
      const blob = format === 'json' 
        ? new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' })
        : res.data;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${research?.query?.replace(/\s+/g, '-')}.${format === 'markdown' ? 'md' : format}`;
      a.click();
      toast.success(`Exported as ${format.toUpperCase()}`);
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(null);
    }
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Link copied!');
  };

  const getCurrentStep = () => {
    if (!research) return 0;
    const index = statusSteps.findIndex(s => s.id === research.status);
    return index >= 0 ? index : 0;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 text-violet-500 animate-spin" />
      </div>
    );
  }

  if (!research) return null;

  const isInProgress = !['COMPLETED', 'FAILED'].includes(research.status);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </button>
          <h1 className="text-2xl font-bold text-white">{research.query}</h1>
          <p className="text-gray-400">{research.template} Research</p>
        </div>
        
        {research.status === 'COMPLETED' && (
          <div className="flex items-center gap-2">
            <button
              onClick={copyShareLink}
              className="flex items-center gap-2 px-3 py-2 text-gray-400 hover:text-white border border-gray-700 rounded-lg transition"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              Share
            </button>
            <div className="relative group">
              <button className="flex items-center gap-2 px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition">
                <Download className="h-4 w-4" />
                Export
              </button>
              <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-xl border border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                {['pdf', 'markdown', 'json', 'csv', 'rag'].map((format) => (
                  <button
                    key={format}
                    onClick={() => handleExport(format)}
                    disabled={exporting !== null}
                    className="w-full flex items-center justify-between px-4 py-2 text-left text-gray-300 hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg"
                  >
                    {format.toUpperCase()}
                    {exporting === format && <Loader2 className="h-4 w-4 animate-spin" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Progress */}
      {isInProgress && (
        <div className="bg-gray-800/50 rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Research in Progress</h3>
            <span className="text-violet-400 font-medium">{research.progress}%</span>
          </div>
          
          <div className="h-2 bg-gray-700 rounded-full mb-6 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all duration-500"
              style={{ width: `${research.progress}%` }}
            />
          </div>

          <div className="flex items-center justify-between">
            {statusSteps.slice(0, -1).map((step, i) => {
              const currentStep = getCurrentStep();
              const isActive = i === currentStep;
              const isComplete = i < currentStep;
              const Icon = step.icon;
              
              return (
                <div key={step.id} className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    isComplete ? 'bg-green-500' : isActive ? 'bg-violet-500' : 'bg-gray-700'
                  }`}>
                    {isActive && step.id !== 'COMPLETED' ? (
                      <Loader2 className="h-5 w-5 text-white animate-spin" />
                    ) : isComplete ? (
                      <CheckCircle className="h-5 w-5 text-white" />
                    ) : (
                      <Icon className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                  <span className={`text-xs mt-2 ${
                    isActive ? 'text-violet-400' : isComplete ? 'text-green-400' : 'text-gray-500'
                  }`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Error */}
      {research.status === 'FAILED' && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 mb-8">
          <div className="flex items-center gap-3">
            <XCircle className="h-6 w-6 text-red-500" />
            <div>
              <h3 className="text-lg font-semibold text-red-400">Research Failed</h3>
              <p className="text-gray-400">{research.error || 'An unknown error occurred'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Report */}
      {research.status === 'COMPLETED' && research.report && (
        <div className="flex gap-6">
          <aside className="w-64 flex-shrink-0 hidden lg:block">
            <div className="sticky top-24 bg-gray-800/50 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Contents</h4>
              <nav className="space-y-1">
                <button
                  onClick={() => setActiveSection('summary')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                    activeSection === 'summary' ? 'bg-violet-500/20 text-violet-400' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Executive Summary
                </button>
                {research.report.sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                      activeSection === section.id ? 'bg-violet-500/20 text-violet-400' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {section.title}
                  </button>
                ))}
                <button
                  onClick={() => setActiveSection('sources')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                    activeSection === 'sources' ? 'bg-violet-500/20 text-violet-400' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Sources ({research.report.sources.length})
                </button>
              </nav>
            </div>
          </aside>

          <main className="flex-1 min-w-0">
            <div className="bg-gray-800/50 rounded-xl p-6 lg:p-8">
              <h2 className="text-2xl font-bold text-white mb-6">{research.report.title}</h2>
              
              {(activeSection === 'summary' || !activeSection) && (
                <div className="prose prose-invert max-w-none">
                  <h3 className="text-xl font-semibold text-violet-400 mb-4">Executive Summary</h3>
                  <p className="text-gray-300 whitespace-pre-wrap">{research.report.summary}</p>
                </div>
              )}

              {research.report.sections.map((section) => (
                activeSection === section.id && (
                  <div key={section.id} className="prose prose-invert max-w-none mt-8">
                    <h3 className="text-xl font-semibold text-violet-400 mb-4">{section.title}</h3>
                    <div className="text-gray-300 whitespace-pre-wrap">{section.content}</div>
                  </div>
                )
              ))}

              {activeSection === 'sources' && (
                <div className="mt-8">
                  <h3 className="text-xl font-semibold text-violet-400 mb-4">Sources</h3>
                  <div className="space-y-2">
                    {research.report.sources.map((source, i) => (
                      <a
                        key={i}
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-3 bg-gray-700/30 hover:bg-gray-700/50 rounded-lg transition"
                      >
                        <span className="text-gray-300">{source.title}</span>
                        <ExternalLink className="h-4 w-4 text-gray-500" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      )}
    </div>
  );
}
