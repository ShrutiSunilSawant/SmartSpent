import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User, Lock, Bell, Phone, HelpCircle, ChevronRight,
  Check, AlertCircle, Loader2, Eye, EyeOff, Mail,
  MessageSquare, Shield, ExternalLink, X,
} from 'lucide-react'
import { authApi, AUTH_TOKEN_STORAGE_KEY } from '@/services/api'

// ── Reusable Section Card ──────────────────────────────────────────────────────
function Section({ icon: Icon, title, description, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="glass-card overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-4 px-6 py-5 text-left hover:bg-white/3 transition-colors"
      >
        <div className="w-10 h-10 rounded-xl bg-brand-600/20 flex items-center justify-center flex-shrink-0">
          <Icon size={18} className="text-brand-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">{title}</p>
          {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
        </div>
        <motion.div animate={{ rotate: open ? 90 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronRight size={16} className="text-slate-500" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6 border-t border-surface-700/50 pt-5">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Status Banner ──────────────────────────────────────────────────────────────
function Banner({ type, message }) {
  if (!message) return null
  const isError = type === 'error'
  return (
    <div className={`flex items-center gap-3 rounded-xl px-4 py-3 mb-4 text-sm
      ${isError
        ? 'bg-red-500/10 border border-red-500/25 text-red-300'
        : 'bg-green-500/10 border border-green-500/20 text-green-300'
      }`}
    >
      {isError ? <AlertCircle size={15} className="flex-shrink-0" /> : <Check size={15} className="flex-shrink-0" />}
      {message}
    </div>
  )
}

// ── Change Password ────────────────────────────────────────────────────────────
function ChangePassword() {
  const [form, setForm] = useState({ current: '', next: '', confirm: '' })
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNext, setShowNext] = useState(false)
  const [status, setStatus] = useState(null) // { type, message }
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.next !== form.confirm) {
      setStatus({ type: 'error', message: 'New passwords do not match.' })
      return
    }
    if (form.next.length < 8) {
      setStatus({ type: 'error', message: 'New password must be at least 8 characters.' })
      return
    }
    setLoading(true)
    setStatus(null)
    try {
      const res = await authApi.changePassword(form.current, form.next)
      // Server returns a new token with the incremented version — store it so this session stays valid
      if (res.access_token) {
        localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, res.access_token)
      }
      setStatus({ type: 'success', message: 'Password updated. All other sessions have been signed out.' })
      setForm({ current: '', next: '', confirm: '' })
    } catch (err) {
      setStatus({ type: 'error', message: err.message || 'Failed to update password.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Banner type={status?.type} message={status?.message} />

      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1.5">Current password</label>
        <div className="relative">
          <input
            type={showCurrent ? 'text' : 'password'}
            value={form.current}
            onChange={e => setForm({ ...form, current: e.target.value })}
            placeholder="Your current password"
            autoComplete="current-password"
            required
            className="input-field pr-10"
          />
          <button type="button" onClick={() => setShowCurrent(v => !v)} tabIndex={-1}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition">
            {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1.5">New password</label>
        <div className="relative">
          <input
            type={showNext ? 'text' : 'password'}
            value={form.next}
            onChange={e => setForm({ ...form, next: e.target.value })}
            placeholder="Min. 8 characters"
            autoComplete="new-password"
            required
            className="input-field pr-10"
          />
          <button type="button" onClick={() => setShowNext(v => !v)} tabIndex={-1}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition">
            {showNext ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1.5">Confirm new password</label>
        <input
          type="password"
          value={form.confirm}
          onChange={e => setForm({ ...form, confirm: e.target.value })}
          placeholder="Repeat new password"
          autoComplete="new-password"
          required
          className="input-field"
        />
      </div>

      <button type="submit" disabled={loading} className="btn-primary">
        {loading ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
        Update Password
      </button>
    </form>
  )
}

// ── Phone Number ───────────────────────────────────────────────────────────────
function PhoneNumber({ currentPhone, onUpdated }) {
  const [phone, setPhone] = useState(currentPhone || '')
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => { setPhone(currentPhone || '') }, [currentPhone])

  const save = async (value) => {
    setLoading(true)
    setStatus(null)
    try {
      const res = await authApi.updateProfile({ phone_number: value || null })
      onUpdated(res.phone_number || '')
      setStatus({ type: 'success', message: value ? 'Phone number updated.' : 'Phone number removed.' })
    } catch (err) {
      setStatus({ type: 'error', message: err.message || 'Failed to save phone number.' })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    save(phone.trim())
  }

  const handleRemove = async () => {
    setPhone('')
    await save('')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Banner type={status?.type} message={status?.message} />
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1.5">Phone number</label>
        <input
          type="tel"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          placeholder="+1 (555) 000-0000"
          className="input-field"
        />
        <p className="text-xs text-slate-600 mt-1.5">Used for account recovery only. Never shared.</p>
      </div>
      <div className="flex gap-3">
        <button type="submit" disabled={loading || !phone.trim()} className="btn-primary">
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Phone size={14} />}
          {currentPhone ? 'Update Number' : 'Add Number'}
        </button>
        {currentPhone && (
          <button type="button" disabled={loading} onClick={handleRemove}
            className="btn-ghost text-red-400 hover:text-red-300 hover:bg-red-500/10">
            Remove
          </button>
        )}
      </div>
    </form>
  )
}

// ── Notifications ──────────────────────────────────────────────────────────────
function Toggle({ checked, onChange, label, description }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-surface-800 last:border-0">
      <div>
        <p className="text-sm text-slate-200">{label}</p>
        {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full transition-colors duration-200
          ${checked ? 'bg-brand-600' : 'bg-surface-700'}`}
        role="switch"
        aria-checked={checked}
      >
        <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 mt-0.5
          ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </button>
    </div>
  )
}

function Notifications() {
  const STORAGE_KEY = 'smartspent_notif_prefs'
  const load = () => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {} } catch { return {} }
  }
  const defaults = { anomalies: true, weeklyDigest: false, budgetAlerts: true, tips: false }
  const [prefs, setPrefs] = useState({ ...defaults, ...load() })

  const set = (key, val) => {
    const next = { ...prefs, [key]: val }
    setPrefs(next)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch {}
  }

  return (
    <div>
      <Toggle checked={prefs.anomalies}     onChange={v => set('anomalies', v)}     label="Anomaly alerts"     description="Notify when an unusual expense is detected" />
      <Toggle checked={prefs.budgetAlerts}  onChange={v => set('budgetAlerts', v)}  label="Budget alerts"      description="Warn when spending approaches your limits" />
      <Toggle checked={prefs.weeklyDigest}  onChange={v => set('weeklyDigest', v)}  label="Weekly digest"      description="Summary of spending every Monday" />
      <Toggle checked={prefs.tips}          onChange={v => set('tips', v)}          label="Saving tips"        description="AI suggestions for reducing expenses" />
      <p className="text-xs text-slate-600 mt-4">Notification delivery requires a verified email address.</p>
    </div>
  )
}

// ── Policy Modal ───────────────────────────────────────────────────────────────
function PolicyModal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.18 }}
        className="relative z-10 w-full max-w-lg rounded-2xl border border-surface-700/60 bg-surface-900 shadow-2xl max-h-[80vh] flex flex-col"
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-surface-700/50 flex-shrink-0">
          <h2 className="font-display text-base font-bold text-white">{title}</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition">
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-5 overflow-y-auto text-sm text-slate-400 space-y-4 leading-relaxed">
          {children}
        </div>
      </motion.div>
    </div>
  )
}

const FEEDBACK_EMAIL = import.meta.env.VITE_FEEDBACK_EMAIL || ''

// ── Help and Feedback ──────────────────────────────────────────────────────────
function HelpFeedback() {
  const [feedback, setFeedback] = useState('')
  const [sent, setSent] = useState(false)
  const [policyModal, setPolicyModal] = useState(null) // 'privacy' | 'terms' | null

  const handleSend = (e) => {
    e.preventDefault()
    if (!feedback.trim()) return
    const subject = encodeURIComponent('SmartSpent Feedback')
    const body = encodeURIComponent(feedback.trim())
    window.location.href = `mailto:${FEEDBACK_EMAIL}?subject=${subject}&body=${body}`
    setSent(true)
    setFeedback('')
    setTimeout(() => setSent(false), 5000)
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Resources</p>
        <div className="space-y-1">
          <button onClick={() => setPolicyModal('privacy')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors group">
            <Shield size={15} className="text-slate-500 group-hover:text-brand-400 transition-colors" />
            <span className="text-sm">Privacy policy</span>
            <ExternalLink size={11} className="ml-auto opacity-0 group-hover:opacity-60 transition-opacity" />
          </button>
          <button onClick={() => setPolicyModal('terms')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors group">
            <ExternalLink size={15} className="text-slate-500 group-hover:text-brand-400 transition-colors" />
            <span className="text-sm">Terms of service</span>
            <ExternalLink size={11} className="ml-auto opacity-0 group-hover:opacity-60 transition-opacity" />
          </button>
          <a href="mailto:support@smartspent.app"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors group">
            <MessageSquare size={15} className="text-slate-500 group-hover:text-brand-400 transition-colors" />
            <span className="text-sm">Report a bug</span>
            <ExternalLink size={11} className="ml-auto opacity-0 group-hover:opacity-60 transition-opacity" />
          </a>
        </div>
      </div>

      <AnimatePresence>
        {policyModal === 'privacy' && (
          <PolicyModal title="Privacy Policy" onClose={() => setPolicyModal(null)}>
            <p><strong className="text-slate-200">Last updated:</strong> October 2026</p>
            <p>SmartSpent collects only the data you explicitly provide: your email address, expenses, and optional phone number. We do not sell, share, or transfer your personal data to third parties.</p>
            <p><strong className="text-slate-200">Data storage.</strong> All expense data is stored in your account's private database. Each account is isolated — no other user can see your data.</p>
            <p><strong className="text-slate-200">AI processing.</strong> When you use the AI Assistant or OCR features, your input is processed locally and is not retained after the session ends.</p>
            <p><strong className="text-slate-200">Security.</strong> Passwords are hashed with bcrypt. Authentication uses short-lived JWT tokens. Login attempts are rate-limited and brute-force protected.</p>
            <p><strong className="text-slate-200">Contact.</strong> For data deletion requests or privacy questions, email support@smartspent.app.</p>
          </PolicyModal>
        )}
        {policyModal === 'terms' && (
          <PolicyModal title="Terms of Service" onClose={() => setPolicyModal(null)}>
            <p><strong className="text-slate-200">Last updated:</strong> October 2026</p>
            <p>By using SmartSpent you agree to these terms. SmartSpent is provided as-is for personal expense tracking. It is not a licensed financial advisor and nothing in the app constitutes financial advice.</p>
            <p><strong className="text-slate-200">Your account.</strong> You are responsible for keeping your login credentials secure. Do not share your account with others.</p>
            <p><strong className="text-slate-200">Acceptable use.</strong> You may not use SmartSpent to store illegal content, attempt to breach security, or reverse-engineer the service.</p>
            <p><strong className="text-slate-200">Data.</strong> You own your data. We will not delete your account without notice except in cases of abuse or legal requirement.</p>
            <p><strong className="text-slate-200">Liability.</strong> SmartSpent is not liable for financial decisions made based on insights shown in the app. Always consult a qualified advisor for major financial decisions.</p>
            <p><strong className="text-slate-200">Contact.</strong> Questions? Email support@smartspent.app.</p>
          </PolicyModal>
        )}
      </AnimatePresence>

      <div className="border-t border-surface-700/50 pt-5">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">Send feedback</p>
        {sent ? (
          <div className="flex items-center gap-2 text-green-400 text-sm py-2">
            <Check size={15} /> Thanks, feedback received!
          </div>
        ) : (
          <form onSubmit={handleSend} className="space-y-3">
            <textarea
              value={feedback}
              onChange={e => setFeedback(e.target.value)}
              placeholder="Tell us what you think, what's broken, or what you'd like to see next..."
              rows={4}
              className="input-field resize-none"
            />
            <button type="submit" disabled={!feedback.trim()} className="btn-primary">
              <MessageSquare size={14} /> Send Feedback
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

// ── Main Settings Page ─────────────────────────────────────────────────────────
export default function Settings() {
  const [user, setUser] = useState(null)

  useEffect(() => {
    authApi.me()
      .then(res => setUser(res.data || res))
      .catch(() => {})
  }, [])

  const joined = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'N/A'

  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-3xl font-display font-bold text-white mb-1">Settings</h1>
        <p className="text-slate-500">Manage your account and preferences</p>
      </motion.div>

      {/* Account overview card */}
      {user && (
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="glass-card px-6 py-5 mb-4 flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-full bg-brand-600/25 flex items-center justify-center flex-shrink-0">
            <User size={22} className="text-brand-400" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{user.email}</p>
            <p className="text-xs text-slate-500 mt-0.5">Joined {joined}</p>
          </div>
          {user.phone_number && (
            <div className="ml-auto flex items-center gap-1.5 text-xs text-slate-500">
              <Phone size={12} />
              {user.phone_number}
            </div>
          )}
        </motion.div>
      )}

      <div className="space-y-3">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
          <Section icon={Mail} title="Account" description="Your email address and account info">
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-xl bg-surface-800 px-4 py-3">
                <Mail size={15} className="text-slate-500 flex-shrink-0" />
                <div>
                  <p className="text-xs text-slate-500">Email address</p>
                  <p className="text-sm text-slate-200">{user?.email || 'Loading...'}</p>
                </div>
              </div>
              <p className="text-xs text-slate-600">To change your email address, contact support.</p>
            </div>
          </Section>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.11 }}>
          <Section icon={Lock} title="Change Password" description="Update your account password">
            <ChangePassword />
          </Section>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}>
          <Section
            icon={Phone}
            title={user?.phone_number ? 'Change Phone Number' : 'Add Phone Number'}
            description={user?.phone_number ? user.phone_number : 'Add a number for account recovery'}
          >
            <PhoneNumber
              currentPhone={user?.phone_number || ''}
              onUpdated={(phone) => setUser(u => ({ ...u, phone_number: phone }))}
            />
          </Section>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.17 }}>
          <Section icon={Bell} title="Notifications" description="Choose what alerts you receive">
            <Notifications />
          </Section>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.20 }}>
          <Section icon={HelpCircle} title="Help and Feedback" description="Docs, support, and send feedback">
            <HelpFeedback />
          </Section>
        </motion.div>
      </div>
    </div>
  )
}
