import React, { useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { TrendingUp, CheckCircle } from 'lucide-react'
import { authApi } from '@/services/api'

export default function ResetPassword() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = params.get('token')

  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]       = useState('')
  const [done, setDone]         = useState(false)

  const strength = password.length === 0 ? 0 : password.length < 8 ? 1 : password.length < 12 ? 2 : 3
  const strengthColor = ['', 'bg-red-500', 'bg-yellow-400', 'bg-green-500']
  const strengthLabel = ['', 'Weak', 'Good', 'Strong']
  const strengthText  = ['', 'text-red-400', 'text-yellow-400', 'text-green-400']

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }
    if (!token) { setError('Invalid reset link.'); return }
    setSubmitting(true)
    setError('')
    try {
      await authApi.resetPassword(token, password)
      setDone(true)
      setTimeout(() => navigate('/login'), 3000)
    } catch (err) {
      setError(err.message || 'Reset failed.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-surface-950 flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-red-400 mb-4">Invalid reset link.</p>
          <Link to="/forgot-password" className="text-brand-400 hover:text-brand-300 underline">Request a new one</Link>
        </div>
      </div>
    )
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

        {done ? (
          <div className="text-center">
            <CheckCircle size={48} className="text-green-400 mx-auto mb-4" />
            <h1 className="font-display text-2xl font-bold text-white mb-2">Password updated!</h1>
            <p className="text-slate-400">Redirecting you to sign in…</p>
          </div>
        ) : (
          <>
            <h1 className="font-display text-3xl font-bold text-white mb-2">Set new password</h1>
            <p className="text-slate-400 mb-8">Choose a strong password for your account.</p>

            <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-300 tracking-wide uppercase">New password</label>
                <div className="relative">
                  <svg className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    autoComplete="new-password"
                    className="w-full rounded-xl bg-surface-800 border border-white/8 pl-12 pr-12 py-3.5 text-base text-white placeholder-slate-500 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30"
                  />
                  <button type="button" onClick={() => setShowPw(v => !v)} tabIndex={-1}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      {showPw
                        ? <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        : <><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></>}
                    </svg>
                  </button>
                </div>
                {password.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex gap-1">
                      {[1,2,3].map(i => (
                        <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= strength ? strengthColor[strength] : 'bg-surface-700'}`} />
                      ))}
                    </div>
                    <p className={`text-xs font-medium ${strengthText[strength]}`}>{strengthLabel[strength]} password</p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-300 tracking-wide uppercase">Confirm password</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Repeat your password"
                  autoComplete="new-password"
                  className="w-full rounded-xl bg-surface-800 border border-white/8 px-4 py-3.5 text-base text-white placeholder-slate-500 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30"
                />
              </div>

              {error && (
                <div className="flex items-center gap-3 rounded-xl bg-red-500/10 border border-red-500/25 px-4 py-3">
                  <p className="text-sm text-red-300">{error}</p>
                </div>
              )}

              <button type="submit" disabled={submitting || !password || !confirm}
                className="w-full rounded-xl bg-primary-600 px-4 py-4 text-base font-bold text-white shadow-lg shadow-primary-600/30 transition hover:bg-primary-500 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed">
                {submitting ? 'Updating…' : 'Update password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
