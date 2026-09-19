import React, { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, CreditCard, BarChart2, MessageSquare, Camera,
  TrendingUp, Settings, User, Shield, LogOut, ChevronUp, X,
  Mail, Lock,
} from 'lucide-react'
import { authApi } from '@/services/api'

const NAV_ITEMS = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/expenses', icon: CreditCard, label: 'Expenses' },
  { path: '/analytics', icon: BarChart2, label: 'Analytics' },
  { path: '/assistant', icon: MessageSquare, label: 'AI Assistant' },
  { path: '/ocr', icon: Camera, label: 'Scan Receipt' },
]

function Modal({ open, onClose, title, children }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.18 }}
        className="relative z-10 w-full max-w-md rounded-2xl border border-surface-700/60 bg-surface-900 shadow-2xl"
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-surface-700/50">
          <h2 className="font-display text-base font-bold text-white">{title}</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition">
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </motion.div>
    </div>
  )
}

function Row({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-surface-800 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-surface-800 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon size={14} className="text-slate-400" />
      </div>
      <div>
        <p className="text-xs text-slate-500 mb-0.5">{label}</p>
        <p className="text-sm text-slate-200">{value}</p>
      </div>
    </div>
  )
}

export default function Sidebar({ onLogout }) {
  const location = useLocation()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [userCreatedAt, setUserCreatedAt] = useState('')
  const [modal, setModal] = useState(null) // 'account' | 'security' | 'about'

  useEffect(() => {
    authApi.me()
      .then(res => {
        const u = res.data || res
        setUserEmail(u.email || '')
        setUserCreatedAt(u.created_at || '')
      })
      .catch(() => {})
  }, [])

  const joined = userCreatedAt
    ? new Date(userCreatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : '—'

  return (
    <>
      <aside className="w-64 flex-shrink-0 h-screen flex flex-col border-r border-surface-700/50 bg-surface-900/80 backdrop-blur-xl">

        {/* ── Logo ── */}
        <div className="px-6 py-6 border-b border-surface-700/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center flex-shrink-0 shadow-lg shadow-brand-900/50">
              <TrendingUp size={18} className="text-white" />
            </div>
            <div>
              <h1 className="font-display font-bold text-white text-base leading-tight">SmartSpent</h1>
              <p className="text-xs text-slate-500">Your Copilot</p>
            </div>
          </div>
        </div>

        {/* ── Navigation ── */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <p className="px-3 mb-3 text-xs font-medium text-slate-600 uppercase tracking-wider">Menu</p>
          {NAV_ITEMS.map(({ path, icon: Icon, label }) => {
            const isActive = location.pathname === path
            return (
              <NavLink key={path} to={path}>
                <motion.div
                  className={`nav-item ${isActive ? 'active' : ''}`}
                  whileHover={{ x: 2 }}
                  transition={{ duration: 0.15 }}
                >
                  <Icon size={18} className="flex-shrink-0" />
                  <span>{label}</span>
                  {isActive && (
                    <motion.div
                      className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-400"
                      layoutId="activeIndicator"
                    />
                  )}
                </motion.div>
              </NavLink>
            )
          })}
        </nav>

        {/* ── Bottom: Settings + Sign out ── */}
        <div className="px-3 pb-4 border-t border-surface-700/50 pt-3 space-y-1">

          <button
            onClick={() => setSettingsOpen(v => !v)}
            className="nav-item w-full text-left"
          >
            <Settings size={18} className="flex-shrink-0" />
            <span>Settings</span>
            <motion.div className="ml-auto" animate={{ rotate: settingsOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronUp size={15} className="text-slate-500" />
            </motion.div>
          </button>

          <AnimatePresence>
            {settingsOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="ml-2 pl-4 border-l border-surface-700/60 space-y-1 py-1">

                  <button onClick={() => setModal('account')} className="nav-item w-full text-left text-sm py-2 text-slate-400 hover:text-slate-200">
                    <User size={15} className="flex-shrink-0 text-slate-500" />
                    <span>Account</span>
                  </button>

                  <button onClick={() => setModal('security')} className="nav-item w-full text-left text-sm py-2 text-slate-400 hover:text-slate-200">
                    <Shield size={15} className="flex-shrink-0 text-slate-500" />
                    <span>Security</span>
                  </button>

                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={onLogout}
            className="nav-item w-full text-left text-red-400 hover:text-red-300 hover:bg-red-500/10"
          >
            <LogOut size={18} className="flex-shrink-0" />
            <span>Sign out</span>
          </button>

        </div>
      </aside>

      {/* ── Modals ── */}
      <AnimatePresence>

        {/* Account modal */}
        {modal === 'account' && (
          <Modal open title="Account" onClose={() => setModal(null)}>
            <div className="flex items-center gap-4 mb-5 pb-5 border-b border-surface-800">
              <div className="w-12 h-12 rounded-full bg-brand-600/30 flex items-center justify-center flex-shrink-0">
                <User size={22} className="text-brand-400" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">{userEmail || 'Your account'}</p>
                <p className="text-xs text-slate-500">Joined {joined}</p>
              </div>
            </div>
            <Row icon={Mail} label="Email address" value={userEmail || '—'} />
            <Row icon={Lock} label="Password" value="••••••••  (secured with bcrypt)" />
            <p className="mt-4 text-xs text-slate-600">Your data is stored locally and never shared with third parties.</p>
          </Modal>
        )}

        {/* Security modal */}
        {modal === 'security' && (
          <Modal open title="Security" onClose={() => setModal(null)}>
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-xl bg-green-500/10 border border-green-500/20 px-4 py-3">
                <Shield size={16} className="text-green-400 flex-shrink-0" />
                <p className="text-sm text-green-300 font-medium">Your account is secure</p>
              </div>
              <Row icon={Lock} label="Password hashing" value="bcrypt (industry standard)" />
              <Row icon={Shield} label="Authentication" value="JWT — expires after 7 days" />
              <Row icon={Shield} label="Brute-force protection" value="5 failed attempts → 15 min lockout" />
              <Row icon={Shield} label="Rate limiting" value="10 login attempts / minute per IP" />
              <p className="mt-2 text-xs text-slate-600">All data is processed locally. No data is sent to external servers.</p>
            </div>
          </Modal>
        )}

      </AnimatePresence>
    </>
  )
}
