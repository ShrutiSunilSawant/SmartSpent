import React, { useState } from 'react'
import { TrendingUp } from 'lucide-react'
import { authApi, AUTH_TOKEN_STORAGE_KEY } from '@/services/api'

export default function Register({ onSuccess, onSwitchToLogin }) {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [error, setError]       = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim() || password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const { access_token } = await authApi.register(email.trim(), password)
      localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, access_token)
      onSuccess()
    } catch (err) {
      setError(err.message || 'Registration failed')
    } finally {
      setSubmitting(false)
    }
  }

  const strength = password.length === 0 ? 0 : password.length < 8 ? 1 : password.length < 12 ? 2 : 3
  const strengthLabel = ['', 'Weak', 'Good', 'Strong']
  const strengthColor = ['', 'bg-red-500', 'bg-yellow-400', 'bg-green-500']
  const strengthText  = ['', 'text-red-400', 'text-yellow-400', 'text-green-400']

  return (
    <div className="flex h-screen w-full overflow-hidden bg-surface-950">

      {/* ── Left branding panel ── */}
      <div className="hidden lg:flex lg:w-[52%] flex-col justify-between p-14 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-primary-600/25 blur-[120px]" />
          <div className="absolute bottom-10 right-10 w-[350px] h-[350px] rounded-full bg-indigo-500/15 blur-[100px]" />
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center flex-shrink-0 shadow-lg shadow-brand-900/50">
            <TrendingUp size={18} className="text-white" />
          </div>
          <span className="font-display text-2xl font-bold text-white tracking-tight">SmartSpent</span>
        </div>

        <div className="relative z-10 space-y-7">
          <h2 className="font-display text-5xl font-bold text-white leading-[1.2]">
            Start tracking
            <br />
            <span style={{background: 'linear-gradient(90deg, #818cf8, #a5b4fc, #6366f1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', display: 'block', marginTop: '4px'}}>
              smarter today.
            </span>
          </h2>
          <p className="text-lg text-slate-300 leading-relaxed max-w-sm">
            Create your free account and get AI-powered insights into your spending in minutes.
          </p>
        </div>

        <div />
      </div>

      {/* ── Right form panel ── */}
      <div className="flex w-full lg:w-[48%] flex-col items-center justify-center px-10 py-14 bg-surface-900/50 border-l border-white/5">
        <div className="w-full max-w-[400px]">

          {/* mobile logo */}
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-lg shadow-brand-900/50">
              <TrendingUp size={16} className="text-white" />
            </div>
            <span className="font-display text-xl font-bold text-white">SmartSpent</span>
          </div>

          <div className="mb-9">
            <h1 className="font-display text-3xl font-bold text-white">Create your account</h1>
            <p className="mt-2 text-base text-slate-400">Your expenses are private — nobody else can see them</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* email */}
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
                  className="w-full rounded-xl bg-surface-800 border border-white/8 pl-12 pr-4 py-3.5 text-base text-white placeholder-slate-500 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30"
                />
              </div>
            </div>

            {/* password */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-300 tracking-wide uppercase">Password</label>
              <div className="relative">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  className="w-full rounded-xl bg-surface-800 border border-white/8 pl-12 pr-12 py-3.5 text-base text-white placeholder-slate-500 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30"
                />
                <button type="button" onClick={() => setShowPw(v => !v)} tabIndex={-1}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition">
                  {showPw
                    ? <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                    : <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  }
                </button>
              </div>

              {/* strength bar */}
              {password.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex gap-1.5">
                    {[1,2,3].map(i => (
                      <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i <= strength ? strengthColor[strength] : 'bg-surface-700'}`} />
                    ))}
                  </div>
                  <p className={`text-sm font-medium ${strengthText[strength]}`}>{strengthLabel[strength]} password</p>
                </div>
              )}
            </div>

            {error && (
              <div className="flex items-center gap-3 rounded-xl bg-red-500/10 border border-red-500/25 px-4 py-3">
                <svg className="h-5 w-5 text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}

            <button type="submit" disabled={submitting}
              className="w-full rounded-xl bg-primary-600 px-4 py-4 text-base font-bold text-white shadow-lg shadow-primary-600/30 transition hover:bg-primary-500 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mt-2">
              {submitting
                ? <span className="flex items-center justify-center gap-2">
                    <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                    Creating account…
                  </span>
                : 'Create free account'}
            </button>
          </form>

          <p className="mt-8 text-center text-base text-slate-500">
            Already have an account?{' '}
            <button type="button" onClick={onSwitchToLogin}
              className="font-semibold text-primary-400 hover:text-primary-300 transition hover:underline">
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
