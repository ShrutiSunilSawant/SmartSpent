import React, { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { TrendingUp, CheckCircle, XCircle, Loader } from 'lucide-react'
import { authApi } from '@/services/api'

export default function VerifyEmail() {
  const [params] = useSearchParams()
  const token = params.get('token')
  const [status, setStatus] = useState('loading') // loading | success | error
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) { setStatus('error'); setMessage('No verification token found.'); return }
    authApi.verifyEmail(token)
      .then(res => { setStatus('success'); setMessage(res.message) })
      .catch(err => { setStatus('error'); setMessage(err.message || 'Verification failed.') })
  }, [token])

  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        <Link to="/" className="inline-flex items-center gap-2.5 mb-10">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
            <TrendingUp size={16} className="text-white" />
          </div>
          <span className="font-display font-bold text-white text-lg">SmartSpent</span>
        </Link>

        {status === 'loading' && (
          <>
            <Loader size={40} className="text-brand-400 animate-spin mx-auto mb-4" />
            <p className="text-slate-400">Verifying your email…</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle size={48} className="text-green-400 mx-auto mb-4" />
            <h1 className="font-display text-2xl font-bold text-white mb-2">Email verified!</h1>
            <p className="text-slate-400 mb-8">{message}</p>
            <Link to="/login"
              className="inline-block px-8 py-3.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm transition-all">
              Sign In
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle size={48} className="text-red-400 mx-auto mb-4" />
            <h1 className="font-display text-2xl font-bold text-white mb-2">Verification failed</h1>
            <p className="text-slate-400 mb-8">{message}</p>
            <Link to="/register"
              className="inline-block px-8 py-3.5 rounded-xl border border-white/10 hover:border-white/20 text-white font-semibold text-sm transition-all">
              Back to Register
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
