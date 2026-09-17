/**
 * components/layout/Sidebar.jsx
 * --------------------------------
 * Left sidebar with:
 * - App logo/branding
 * - Navigation links
 * - AI status indicator
 * - Animated active state
 */

import React, { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  CreditCard,
  BarChart2,
  MessageSquare,
  Camera,
  Zap,
  Circle,
  TrendingUp,
} from 'lucide-react'
import { aiApi } from '@/services/api'

const NAV_ITEMS = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/expenses', icon: CreditCard, label: 'Expenses' },
  { path: '/analytics', icon: BarChart2, label: 'Analytics' },
  { path: '/assistant', icon: MessageSquare, label: 'AI Assistant' },
  { path: '/ocr', icon: Camera, label: 'Scan Receipt' },
]

export default function Sidebar() {
  const location = useLocation()
  const [aiOnline, setAiOnline] = useState(null)
  const [aiModel, setAiModel] = useState('ollama')

  // Check if Ollama AI is running
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const status = await aiApi.status()
        setAiOnline(status.ollama_running)
        setAiModel(status.configured_model || 'ollama')
      } catch {
        setAiOnline(false)
      }
    }
    checkStatus()
    // Re-check every 30 seconds
    const interval = setInterval(checkStatus, 30_000)
    return () => clearInterval(interval)
  }, [])

  return (
    <aside className="w-64 flex-shrink-0 h-screen flex flex-col border-r border-surface-700/50 bg-surface-900/80 backdrop-blur-xl">
      {/* ── Logo ── */}
      <div className="px-6 py-6 border-b border-surface-700/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center flex-shrink-0 shadow-lg shadow-brand-900/50">
            <TrendingUp size={18} className="text-white" />
          </div>
          <div>
            <h1 className="font-display font-bold text-white text-base leading-tight">
              SmartSpent
            </h1>
            <p className="text-xs text-slate-500">Your Copilot</p>
          </div>
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="px-3 mb-3 text-xs font-medium text-slate-600 uppercase tracking-wider">
          Menu
        </p>
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

      {/* ── AI Status ── */}
      <div className="px-4 py-4 border-t border-surface-700/50">
        <div className="glass-card px-4 py-3">
          <div className="flex items-center gap-3">
            <div className={`relative w-2.5 h-2.5 rounded-full flex-shrink-0
              ${aiOnline === null ? 'bg-amber-400' : aiOnline ? 'bg-green-400' : 'bg-red-400'}`}
            >
              {aiOnline && (
                <span className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-75" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-300 truncate">
                {aiOnline === null ? 'Checking AI...' : aiOnline ? 'Ollama Online' : 'Ollama Offline'}
              </p>
              <p className="text-xs text-slate-600">
                {aiOnline ? `${aiModel} ready` : 'Run: ollama serve'}
              </p>
            </div>
            <Zap size={14} className={`flex-shrink-0 ml-auto
              ${aiOnline ? 'text-green-400' : 'text-slate-600'}`}
            />
          </div>
        </div>
      </div>
    </aside>
  )
}
