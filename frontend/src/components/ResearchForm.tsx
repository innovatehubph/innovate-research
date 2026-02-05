import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Building, Swords, TrendingUp, User, Package, 
  Factory, Grid2X2, FileCheck, ArrowRight, Loader2, Lock
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import api from '../lib/api';
import toast from 'react-hot-toast';

interface Template {
  id: string;
  name: string;
  description: string;
  icon: string;
  requiredPlan: string;
  available: boolean;
}

const iconMap: Record<string, any> = {
  building: Building,
  swords: Swords,
  'trending-up': TrendingUp,
  user: User,
  package: Package,
  factory: Factory,
  'grid-2x2': Grid2X2,
  'file-check': FileCheck,
};

export default function ResearchForm() {
  const navigate = useNavigate();
  const { token, user } = useAuthStore();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [query, setQuery] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [depth, setDepth] = useState<'quick' | 'standard' | 'deep'>('standard');
  const [includeNews, setIncludeNews] = useState(true);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const res = await api.get('/templates', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      setTemplates(res.data);
    } catch (error) {
      console.error('Load templates error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!query.trim()) {
      toast.error('Enter a research query');
      return;
    }
    
    if (!selectedTemplate) {
      toast.error('Select a research template');
      return;
    }

    setSubmitting(true);
    
    try {
      const res = await api.post('/research', {
        query: query.trim(),
        template: selectedTemplate,
        options: {
          depth,
          includeNews,
        },
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast.success('Research started!');
      navigate(`/research/${res.data.id}`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to start research');
    } finally {
      setSubmitting(false);
    }
  };

  const getIcon = (iconName: string) => {
    const Icon = iconMap[iconName] || Search;
    return Icon;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">New Research</h1>
        <p className="text-gray-400">Start a new AI-powered deep research project</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Query Input */}
        <div className="bg-gray-800/50 rounded-xl p-6">
          <label className="block text-white font-medium mb-3">
            What do you want to research?
          </label>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g., InnovateHub Inc., Tesla competitors, AI market trends..."
              className="w-full pl-12 pr-4 py-4 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:border-violet-500 focus:outline-none text-lg"
              autoFocus
            />
          </div>
        </div>

        {/* Template Selection */}
        <div className="bg-gray-800/50 rounded-xl p-6">
          <label className="block text-white font-medium mb-4">
            Research Template
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {loading ? (
              <div className="col-span-2 flex justify-center py-8">
                <Loader2 className="h-6 w-6 text-violet-500 animate-spin" />
              </div>
            ) : (
              templates.map((template) => {
                const Icon = getIcon(template.icon);
                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => template.available && setSelectedTemplate(template.id)}
                    disabled={!template.available}
                    className={`relative flex items-start gap-3 p-4 rounded-xl border transition text-left ${
                      selectedTemplate === template.id
                        ? 'border-violet-500 bg-violet-500/10'
                        : template.available
                        ? 'border-gray-700 hover:border-gray-600 bg-gray-700/30'
                        : 'border-gray-800 bg-gray-800/30 opacity-60 cursor-not-allowed'
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${
                      selectedTemplate === template.id ? 'bg-violet-500/20' : 'bg-gray-600'
                    }`}>
                      <Icon className={`h-5 w-5 ${
                        selectedTemplate === template.id ? 'text-violet-400' : 'text-gray-300'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`font-medium ${
                          selectedTemplate === template.id ? 'text-violet-400' : 'text-white'
                        }`}>
                          {template.name}
                        </p>
                        {!template.available && (
                          <Lock className="h-3 w-3 text-gray-500" />
                        )}
                      </div>
                      <p className="text-gray-400 text-sm line-clamp-2">{template.description}</p>
                      {!template.available && (
                        <p className="text-xs text-violet-400 mt-1">{template.requiredPlan}+ required</p>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Options */}
        <div className="bg-gray-800/50 rounded-xl p-6">
          <label className="block text-white font-medium mb-4">
            Research Options
          </label>
          
          <div className="space-y-4">
            {/* Depth */}
            <div>
              <p className="text-gray-400 text-sm mb-2">Research Depth</p>
              <div className="flex gap-2">
                {(['quick', 'standard', 'deep'] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDepth(d)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                      depth === d
                        ? 'bg-violet-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {d.charAt(0).toUpperCase() + d.slice(1)}
                  </button>
                ))}
              </div>
              <p className="text-gray-500 text-xs mt-2">
                {depth === 'quick' && '~5 sources, fastest results'}
                {depth === 'standard' && '~10 sources, balanced coverage'}
                {depth === 'deep' && '~20 sources, comprehensive analysis'}
              </p>
            </div>

            {/* Include News */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={includeNews}
                onChange={(e) => setIncludeNews(e.target.checked)}
                className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-violet-600 focus:ring-violet-500"
              />
              <div>
                <p className="text-white">Include recent news</p>
                <p className="text-gray-500 text-sm">Search news articles from the past month</p>
              </div>
            </label>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-between">
          <p className="text-gray-400 text-sm">
            This will use 1 credit from your {user?.plan || 'FREE'} plan
          </p>
          <button
            type="submit"
            disabled={submitting || !query.trim() || !selectedTemplate}
            className="flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-xl font-medium transition"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                Start Research
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
