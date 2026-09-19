/**
 * App.jsx
 * --------
 * Root application component with:
 * - React Router for page navigation
 * - Sidebar layout (always visible)
 * - Page content area (changes based on route)
 * - Toast notifications
 */

import React, { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'

import Sidebar from '@/components/layout/Sidebar'
import Dashboard from '@/pages/Dashboard'
import Expenses from '@/pages/Expenses'
import Analytics from '@/pages/Analytics'
import Assistant from '@/pages/Assistant'
import OCR from '@/pages/OCR'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import { AUTH_TOKEN_STORAGE_KEY } from '@/services/api'

function App() {
  const [loggedIn, setLoggedIn] = useState(
    Boolean(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY))
  )
  const [showRegister, setShowRegister] = useState(false)

  if (!loggedIn) {
    return showRegister ? (
      <Register
        onSuccess={() => setLoggedIn(true)}
        onSwitchToLogin={() => setShowRegister(false)}
      />
    ) : (
      <Login
        onSuccess={() => setLoggedIn(true)}
        onSwitchToRegister={() => setShowRegister(true)}
      />
    )
  }

  return (
    <BrowserRouter>
      <div className="flex h-screen overflow-hidden bg-surface-950">
        {/* ── Sidebar Navigation (always visible) ── */}
        <Sidebar onLogout={() => {
          localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY)
          setLoggedIn(false)
        }} />

        {/* ── Main Content Area ── */}
        <main className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/expenses" element={<Expenses />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/assistant" element={<Assistant />} />
              <Route path="/ocr" element={<OCR />} />
            </Routes>
          </AnimatePresence>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
