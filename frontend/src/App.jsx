import React, { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { Menu, TrendingUp } from 'lucide-react'

import Sidebar from '@/components/layout/Sidebar'
import Dashboard from '@/pages/Dashboard'
import Expenses from '@/pages/Expenses'
import Analytics from '@/pages/Analytics'
import Assistant from '@/pages/Assistant'
import OCR from '@/pages/OCR'
import Settings from '@/pages/Settings'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import Landing from '@/pages/Landing'
import Product from '@/pages/Product'
import Demo from '@/pages/Demo'
import VerifyEmail from '@/pages/VerifyEmail'
import ForgotPassword from '@/pages/ForgotPassword'
import ResetPassword from '@/pages/ResetPassword'
import { AUTH_TOKEN_STORAGE_KEY } from '@/services/api'

// Route wrappers that inject navigation callbacks into Login/Register
function LoginRoute({ onSuccess }) {
  const navigate = useNavigate()
  return (
    <Login
      onSuccess={() => { onSuccess(); navigate('/dashboard') }}
      onSwitchToRegister={() => navigate('/register')}
    />
  )
}

function RegisterRoute({ onSuccess }) {
  const navigate = useNavigate()
  return (
    <Register
      onSuccess={() => { onSuccess(); navigate('/dashboard') }}
      onSwitchToLogin={() => navigate('/login')}
    />
  )
}

// Protected app shell — sidebar + inner routes
function AppShell({ onLogout }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-surface-950">
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 flex items-center gap-3 px-4 h-14 bg-surface-900/95 backdrop-blur-xl border-b border-surface-700/50">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-surface-800 border border-surface-600 flex items-center justify-center">
            <span className="font-display font-bold text-brand-400 text-sm">$</span>
          </div>
          <span className="font-display font-bold text-white text-sm">SmartSpent</span>
        </div>
      </div>

      <Sidebar onLogout={onLogout} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 overflow-y-auto pt-14 lg:pt-0">
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/expenses"  element={<Expenses />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/assistant" element={<Assistant />} />
            <Route path="/ocr"       element={<OCR />} />
            <Route path="/settings"  element={<Settings />} />
            <Route path="*"          element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </AnimatePresence>
      </main>
    </div>
  )
}

function LogoutHandler({ onLogout }) {
  const navigate = useNavigate()
  const handleLogout = () => {
    onLogout()
    navigate('/', { replace: true })
  }
  return <AppShell onLogout={handleLogout} />
}

export default function App() {
  const [loggedIn, setLoggedIn] = useState(
    Boolean(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY))
  )

  const handleLogout = () => {
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY)
    setLoggedIn(false)
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* ── Public marketing routes ── */}
        <Route path="/"                element={<Landing />} />
        <Route path="/product"         element={<Product />} />
        <Route path="/demo"            element={<Demo />} />
        <Route path="/verify-email"    element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password"  element={<ResetPassword />} />

        {/* ── Auth routes (redirect to /dashboard if already logged in) ── */}
        <Route path="/login"    element={
          loggedIn
            ? <Navigate to="/dashboard" replace />
            : <LoginRoute onSuccess={() => setLoggedIn(true)} />
        } />
        <Route path="/register" element={
          loggedIn
            ? <Navigate to="/dashboard" replace />
            : <RegisterRoute onSuccess={() => setLoggedIn(true)} />
        } />

        {/* ── Protected app routes ── */}
        <Route path="/*" element={
          loggedIn
            ? <LogoutHandler onLogout={handleLogout} />
            : <Navigate to="/login" replace />
        } />
      </Routes>
    </BrowserRouter>
  )
}
