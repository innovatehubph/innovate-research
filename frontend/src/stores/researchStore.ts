import { create } from 'zustand'

export interface Research {
  id: string
  query: string
  template: string
  status: 'pending' | 'searching' | 'crawling' | 'analyzing' | 'generating' | 'completed' | 'failed' | 'cancelled'
  progress: number
  sourcesFound: number
  createdAt: string
  completedAt?: string
  report?: string
  sources?: Source[]
  exportFormats: string[]
}

export interface Source {
  url: string
  title: string
  snippet: string
  relevance: number
}

interface ResearchState {
  currentResearch: Research | null
  recentResearch: Research[]
  setCurrentResearch: (research: Research | null) => void
  updateCurrentResearch: (updates: Partial<Research>) => void
  setRecentResearch: (research: Research[]) => void
  addResearch: (research: Research) => void
}

export const useResearchStore = create<ResearchState>((set) => ({
  currentResearch: null,
  recentResearch: [],
  
  setCurrentResearch: (research) => set({ currentResearch: research }),
  
  updateCurrentResearch: (updates) => set((state) => ({
    currentResearch: state.currentResearch 
      ? { ...state.currentResearch, ...updates }
      : null,
  })),
  
  setRecentResearch: (research) => set({ recentResearch: research }),
  
  addResearch: (research) => set((state) => ({
    recentResearch: [research, ...state.recentResearch].slice(0, 20),
  })),
}))
