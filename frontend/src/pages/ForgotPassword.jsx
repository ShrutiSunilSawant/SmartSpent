import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { TrendingUp, Mail, ArrowLeft } from 'lucide-react'
import { authApi } from '@/services/api'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [devLink, setDevLink] = useState('') // shown only in DEBUG mode
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim()) return
    setSubmitting(true)
    setError('')
    try {
      const res = await authApi.forgotPassword(email.trim())
      // In dev mode the server returns the reset URL directly in the message
      if (res?.message?.startsWith('[DEV]')) {
        const url = res.message.replace('[DEV] Reset link: ', '').trim()
        setDevLink(url)
      }
      setSent(true)
    } catch (err) {
      setError(err.message || 'Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center px-6">
      <div className="max-w-md w-full">
        <Link to="/" className="inline-flex items-center gap-2.5 mb-10">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
            <TrendingUp size={16} className="text-white" />
          </div>
          <span className="font-display font-bold text-white text-lg">SmartSpent</span>
        </Link>

        {sent ? (
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center mx-auto mb-6">
              <Mail size={24} className="text-brand-400" />
            </div>
            <h1 className="font-display text-2xl font-bold text-white mb-3">Check your email</h1>
            <p className="text-slate-400 leading-relaxed mb-8">
              If <span className="text-white">{email}</span> is registered, we sent a reset link.
              Check your inbox and follow the instructions.
            </p>
            {devLink && (
              <div className="mb-6 rounded-xl bg-amber-500/10 border border-amber-500/25 px-4 py-3 text-left">
                <p className="text-xs font-semibold text-amber-400 mb-1">DEV MODE — email not configured</p>
                <a href={devLink} className="text-xs text-amber-300 underline break-all">{devLink}</a>
              </div>
            )}
            <Link to="/login" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition">
              <ArrowLeft size={14} /> Back to Sign In
            </Link>
          </div>
        ) : (
          <>
            <h1 className="font-display text-3xl font-bold text-white mb-2">Forgot password?</h1>
            <p className="text-slate-400 mb-8">Enter your email and we'll send you a reset link.</p>

            <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-300 tracking-wide uppercase">Email address</label>
                <div className="relative">
                  <svg className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoFocus
                    autoComplete="off"
                    className="w-full rounded-xl bg-surface-800 border border-white/8 pl-12 pr-4 py-3.5 text-base text-white placeholder-slate-500 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30"
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-3 rounded-xl bg-red-500/10 border border-red-500/25 px-4 py-3">
                  <p className="text-sm text-red-300">{error}</p>
                </div>
              )}

              <button type="submit" disabled={submitting || !email.trim()}
                className="w-full rounded-xl bg-primary-600 px-4 py-4 text-base font-bold text-white shadow-lg shadow-primary-600/30 transition hover:bg-primary-500 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed">
                {submitting ? 'Sending…' : 'Send reset link'}
              </button>
            </form>

            <Link to="/login" className="mt-6 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300 transition">
              <ArrowLeft size={14} /> Back to Sign In
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
