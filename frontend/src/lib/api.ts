import axios from 'axios'
import { useAuthStore } from '../stores/authStore'
import toast from 'react-hot-toast'

// Create axios instance
const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor - add auth token
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.error || error.message || 'An error occurred'
    
    if (error.response?.status === 401) {
      useAuthStore.getState().logout()
      toast.error('Session expired. Please login again.')
      window.location.href = '/login'
    } else if (error.response?.status === 403) {
      toast.error('Access denied')
    } else if (error.response?.status === 429) {
      toast.error('Rate limit exceeded. Please wait.')
    } else {
      toast.error(message)
    }
    
    return Promise.reject(error)
  }
)

// Auth API
export const authApi = {
  register: async (data: { email: string; password: string; name: string }) => {
    const response = await api.post('/auth/register', data)
    return response.data
  },
  
  login: async (data: { email: string; password: string }) => {
    const response = await api.post('/auth/login', data)
    return response.data
  },
  
  getProfile: async () => {
    const response = await api.get('/auth/profile')
    return response.data
  },
  
  regenerateApiKey: async () => {
    const response = await api.post('/auth/regenerate-key')
    return response.data
  },
}

// Research API
export const researchApi = {
  create: async (data: {
    query: string
    template: string
    depth?: 'quick' | 'standard' | 'deep'
    exportFormats?: string[]
    webhookUrl?: string
  }) => {
    const response = await api.post('/research', data)
    return response.data
  },
  
  get: async (id: string) => {
    const response = await api.get(`/research/${id}`)
    return response.data
  },
  
  getStatus: async (id: string) => {
    const response = await api.get(`/research/${id}/status`)
    return response.data
  },
  
  list: async (params?: { limit?: number; offset?: number; status?: string }) => {
    const response = await api.get('/research', { params })
    return response.data
  },
  
  cancel: async (id: string) => {
    const response = await api.post(`/research/${id}/cancel`)
    return response.data
  },
  
  export: async (id: string, format: string) => {
    const response = await api.get(`/research/${id}/export/${format}`, {
      responseType: format === 'json' ? 'json' : 'blob',
    })
    return response.data
  },
}

// Templates API
export const templatesApi = {
  list: async () => {
    const response = await api.get('/templates')
    return response.data
  },
}

// User API
export const userApi = {
  getStats: async () => {
    const response = await api.get('/user/stats')
    return response.data
  },
  
  getUsage: async () => {
    const response = await api.get('/user/usage')
    return response.data
  },
  
  getApiKeys: async () => {
    const response = await api.get('/user/api-keys')
    return response.data
  },
}

// Admin API
export const adminApi = {
  getStats: async () => {
    const response = await api.get('/admin/stats')
    return response.data
  },
  
  getUsers: async (params?: { limit?: number; offset?: number; plan?: string }) => {
    const response = await api.get('/admin/users', { params })
    return response.data
  },
  
  getResearch: async (params?: { limit?: number; offset?: number; status?: string }) => {
    const response = await api.get('/admin/research', { params })
    return response.data
  },
  
  getTransactions: async (params?: { limit?: number; offset?: number }) => {
    const response = await api.get('/admin/transactions', { params })
    return response.data
  },
  
  updateUserPlan: async (userId: string, plan: string) => {
    const response = await api.patch(`/admin/users/${userId}/plan`, { plan })
    return response.data
  },
  
  addCredits: async (userId: string, credits: number) => {
    const response = await api.post(`/admin/users/${userId}/credits`, { credits })
    return response.data
  },
}

export default api
