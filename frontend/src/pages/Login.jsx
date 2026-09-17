/**
 * pages/Login.jsx
 * -----------------
 * Email + password login. On success, saves the JWT returned by the
 * backend to localStorage — the axios interceptor in services/api.js
 * attaches it as `Authorization: Bearer <token>` on every request.
 */

import React, { useState } from 'react'
import { authApi, AUTH_TOKEN_STORAGE_KEY } from '@/services/api'

export default function Login({ onSuccess, onSwitchToRegister }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim() || !password) return

    setSubmitting(true)
    setError('')

    try {
      const { access_token } = await authApi.login(email.trim(), password)
      localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, access_token)
      onSuccess()
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-surface-950">
      <form onSubmit={handleSubmit} className="glass-card w-full max-w-sm space-y-4 p-8">
        <h1 className="text-xl font-semibold text-white">SmartSpent</h1>
        <p className="text-sm text-surface-400">Log in to see your expenses.</p>

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          autoFocus
          className="w-full rounded-lg bg-surface-800 px-4 py-2 text-white outline-none ring-1 ring-surface-700 focus:ring-2 focus:ring-primary-500"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full rounded-lg bg-surface-800 px-4 py-2 text-white outline-none ring-1 ring-surface-700 focus:ring-2 focus:ring-primary-500"
        />

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-primary-600 px-4 py-2 font-medium text-white disabled:opacity-50"
        >
          {submitting ? 'Logging in…' : 'Log In'}
        </button>

        <p className="text-center text-sm text-surface-400">
          No account?{' '}
          <button
            type="button"
            onClick={onSwitchToRegister}
            className="text-primary-400 hover:underline"
          >
            Sign up
          </button>
        </p>
      </form>
    </div>
  )
}
