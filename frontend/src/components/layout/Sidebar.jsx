import React, { useEffect } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, CreditCard, BarChart2, MessageSquare, Camera,
  TrendingUp, Settings, LogOut, X,
} from 'lucide-react'

const NAV_ITEMS = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/expenses', icon: CreditCard, label: 'Expenses' },
  { path: '/analytics', icon: BarChart2, label: 'Analytics' },
  { path: '/assistant', icon: MessageSquare, label: 'AI Assistant' },
  { path: '/ocr', icon: Camera, label: 'Scan Receipt' },
]

export default function Sidebar({ onLogout, open, onClose }) {
  const location = useLocation()
  const navigate = useNavigate()

  // Close sidebar on route change (mobile)
  useEffect(() => {
    if (onClose) onClose()
  }, [location.pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      {/* Mobile backdrop */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Sidebar — fixed overlay on mobile, static on desktop */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 flex-shrink-0 flex flex-col
        border-r border-surface-700/50 bg-surface-900/95 backdrop-blur-xl
        transition-transform duration-300 ease-in-out
        lg:static lg:translate-x-0 lg:z-auto
        ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>

        {/* ── Logo ── */}
        <div className="px-6 py-6 border-b border-surface-700/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center flex-shrink-0 shadow-lg shadow-brand-900/50">
              <TrendingUp size={18} className="text-white" />
            </div>
            <div>
              <h1 className="font-display font-bold text-white text-base leading-tight">SmartSpent</h1>
              <p className="text-xs text-slate-500">Your Copilot</p>
            </div>
          </div>
          {/* Close button — mobile only */}
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition"
          >
            <X size={18} />
          </button>
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

          <NavLink to="/settings">
            <motion.div
              className={`nav-item ${location.pathname === '/settings' ? 'active' : ''}`}
              whileHover={{ x: 2 }}
              transition={{ duration: 0.15 }}
            >
              <Settings size={18} className="flex-shrink-0" />
              <span>Settings</span>
              {location.pathname === '/settings' && (
                <motion.div
                  className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-400"
                  layoutId="activeIndicator"
                />
              )}
            </motion.div>
          </NavLink>

          <button
            onClick={onLogout}
            className="nav-item w-full text-left text-red-400 hover:text-red-300 hover:bg-red-500/10"
          >
            <LogOut size={18} className="flex-shrink-0" />
            <span>Sign out</span>
          </button>

        </div>
      </aside>
    </>
  )
}
