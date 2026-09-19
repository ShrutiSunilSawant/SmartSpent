/**
 * services/api.js
 * ----------------
 * Centralized API client for the FastAPI backend.
 * 
 * Uses axios for HTTP requests with:
 * - Base URL configured once
 * - Request/response interceptors for error handling
 * - All endpoints defined as named functions
 * 
 * Import and use anywhere:
 *   import { expenseApi, analyticsApi } from '@/services/api'
 *   const expenses = await expenseApi.list()
 */

import axios from 'axios'

export const AUTH_TOKEN_STORAGE_KEY = 'smartspent_auth_token'

// ─── Axios Instance ────────────────────────────────────────────────────────────
const api = axios.create({
  // In dev, Vite proxies /api to localhost:8001 (see vite.config.js)
  // In production, change this to your deployed API URL
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 180000, // 3 minute timeout (local LLM can be slow)
})

// ─── Request Interceptor ───────────────────────────────────────────────────────
// Attaches the JWT saved at login to every outgoing request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`
  }
  return config
})

// ─── Response Interceptor ──────────────────────────────────────────────────────
// Centralized error handling
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401 && !error.config?.url?.includes('/auth/')) {
      // Saved token is missing/expired — clear it and force back to the login screen
      localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY)
      window.location.reload()
    }
    const message = error.response?.data?.detail || error.message || 'API request failed'
    console.error('API Error:', message, error.config?.url)
    throw new Error(message)
  }
)

// ─── Auth API ──────────────────────────────────────────────────────────────────
export const authApi = {
  /** Create an account. Returns { access_token, token_type } */
  register: (email, password) => api.post('/auth/register', { email, password }),

  /**
   * Login. The backend uses OAuth2's standard form encoding (not JSON),
   * so this sends a form body with 'username' set to the email.
   */
  login: (email, password) => {
    const form = new URLSearchParams()
    form.append('username', email)
    form.append('password', password)
    return api.post('/auth/login', form, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
  },

  /** Get the logged-in user's profile */
  me: () => api.get('/auth/me'),
}

// ─── Expense API ───────────────────────────────────────────────────────────────
export const expenseApi = {
  /** List expenses with optional filters */
  list: (params = {}) => api.get('/expenses/', { params }),

  /** Get a single expense by ID */
  get: (id) => api.get(`/expenses/${id}`),

  /** Create a new expense */
  create: (data) => api.post('/expenses/', data),

  /** Update an expense (partial update) */
  update: (id, data) => api.put(`/expenses/${id}`, data),

  /** Delete an expense */
  delete: (id) => api.delete(`/expenses/${id}`),
}

// ─── Analytics API ─────────────────────────────────────────────────────────────
export const analyticsApi = {
  /** Get spending summary */
  summary: (months = 1) => api.get('/analytics/summary', { params: { months } }),

  /** Get monthly trends for charts */
  trends: (months = 6) => api.get('/analytics/trends', { params: { months } }),

  /** Get daily spending for the last N days (for the trend chart) */
  daily: (days = 30) => api.get('/analytics/daily', { params: { days } }),

  /** Get category breakdown */
  categories: (months = 1) => api.get('/analytics/categories', { params: { months } }),

  /** Get anomalous expenses */
  anomalies: (limit = 20) => api.get('/analytics/anomalies', { params: { limit } }),

  /** Get savings insights */
  insights: () => api.get('/analytics/insights'),
}

// ─── AI API ────────────────────────────────────────────────────────────────────
export const aiApi = {
  /**
   * Send a message to the AI assistant
   * @param {string} message - User's question
   * @param {Array} conversationHistory - Previous messages [{role, content}]
   */
  chat: (message, conversationHistory = []) =>
    api.post('/ai/chat', { message, conversation_history: conversationHistory }),

  /** Check if Ollama is running */
  status: () => api.get('/ai/status'),
}

// ─── OCR API ───────────────────────────────────────────────────────────────────
export const ocrApi = {
  /**
   * Upload a receipt image for OCR processing
   * @param {File} file - Image file
   * Returns OCRResult (not auto-saved — user must confirm)
   */
  scan: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/ocr/scan', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}

// ─── Forecasting API ───────────────────────────────────────────────────────────
export const forecastingApi = {
  /** Get expense forecast */
  predict: (daysAhead = 30) =>
    api.get('/forecasting/predict', { params: { days_ahead: daysAhead } }),
}

export default api
