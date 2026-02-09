import { supabase } from './supabase'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

async function request(endpoint, options = {}) {
  // Get token from Supabase session
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  const { timeout, ...fetchOptions } = options

  const headers = {
    'Content-Type': 'application/json',
    ...fetchOptions.headers,
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  // Set up AbortController for timeout
  let controller
  let timeoutId
  if (timeout) {
    controller = new AbortController()
    timeoutId = setTimeout(() => controller.abort(), timeout)
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...fetchOptions,
      headers,
      signal: controller?.signal,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }))
      throw new Error(error.error || 'Request failed')
    }

    return response.json()
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
}

export const api = {
  // Auth
  signup: (data) => request('/api/auth/signup', { method: 'POST', body: JSON.stringify(data) }),
  login: (data) => request('/api/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
  me: () => request('/api/auth/me'),
  deleteAccount: () => request('/api/auth/account', { method: 'DELETE' }),

  // Data
  importData: (connections) => request('/api/data/import', { method: 'POST', body: JSON.stringify({ connections }) }),
  getConnections: (params) => request(`/api/data/connections?${new URLSearchParams(params)}`),
  getStats: () => request('/api/data/stats'),
  deleteAllData: () => request('/api/data/all', { method: 'DELETE' }),
  archiveAndReset: () => request('/api/data/archive', { method: 'POST' }),
  getArchives: () => request('/api/data/archives'),
  saveAnalyticsCache: (analytics) => request('/api/data/analytics-cache', { method: 'POST', body: JSON.stringify({ analytics }) }),
  getAnalyticsCache: () => request('/api/data/analytics-cache'),
  getTracker: () => request('/api/data/tracker'),
  addToTracker: (entry) => request('/api/data/tracker', { method: 'POST', body: JSON.stringify(entry) }),
  updateTracker: (id, updates) => request(`/api/data/tracker/${id}`, { method: 'PATCH', body: JSON.stringify(updates) }),
  removeFromTracker: (id) => request(`/api/data/tracker/${id}`, { method: 'DELETE' }),

  // AI
  analyzeNetwork: (data) => request('/api/ai/analyze', {
    method: 'POST',
    body: JSON.stringify(data),
    timeout: 180000,
  }),
  generateOutreach: (data) => request('/api/ai/outreach-draft', { method: 'POST', body: JSON.stringify(data) }),
  generateStrategy: (data) => request('/api/ai/strategy', { method: 'POST', body: JSON.stringify(data) }),
  getInsights: () => request('/api/ai/insights'),
  chatMessage: (data) => request('/api/ai/chat', { method: 'POST', body: JSON.stringify(data) }),
  generateOutreachMessages: (data) => request('/api/ai/outreach-messages', { method: 'POST', body: JSON.stringify(data) }),

  // Settings
  getSettings: () => request('/api/settings'),
  updateSettings: (data) => request('/api/settings', { method: 'PATCH', body: JSON.stringify(data) }),
  getUsageQuota: () => request('/api/settings/quota'),
  redeemCode: (code) => request('/api/settings/redeem-code', { method: 'POST', body: JSON.stringify({ code }) }),
  submitFeedback: (data) => request('/api/settings/feedback', { method: 'POST', body: JSON.stringify(data) }),

  // Admin
  getAdminCodes: () => request('/api/admin/invite-codes'),
  createAdminCodes: (data) => request('/api/admin/invite-codes', { method: 'POST', body: JSON.stringify(data) }),
  getAdminUsers: (search) => request(`/api/admin/users${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  updateAdminUser: (id, data) => request(`/api/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  getAdminAnalytics: () => request('/api/admin/analytics'),
  getAdminAIUsage: () => request('/api/admin/ai-usage'),
  getAdminAIConfig: () => request('/api/admin/ai-config'),
  updateAdminAIConfig: (data) => request('/api/admin/ai-config', { method: 'PUT', body: JSON.stringify(data) }),
}
