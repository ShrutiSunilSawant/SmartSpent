import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { TrendingUp, Menu, X } from 'lucide-react'

const LINKS = [
  { href: '/#features', label: 'Features' },
  { href: '/#how-it-works', label: 'How It Works' },
  { href: '/product', label: 'Product' },
  { href: '/demo', label: 'Demo' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => setMobileOpen(false), [location.pathname])

  const handleHashLink = (e, href) => {
    if (href.startsWith('/#')) {
      e.preventDefault()
      const id = href.slice(2)
      if (location.pathname !== '/') {
        window.location.href = href
        return
      }
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    }
    setMobileOpen(false)
  }

  return (
    <>
      <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-surface-950/90 backdrop-blur-xl border-b border-white/5' : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-5 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-surface-800 border border-surface-600 flex items-center justify-center shadow-lg shadow-brand-900/50 group-hover:scale-105 transition-transform">
              <span className="font-display font-bold text-brand-400 text-sm">$</span>
            </div>
            <span className="font-display font-bold text-white text-base">SmartSpent</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {LINKS.map(({ href, label }) => (
              <a
                key={href}
                href={href}
                onClick={e => handleHashLink(e, href)}
                className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-all"
              >
                {label}
              </a>
            ))}
          </nav>

          {/* CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Link to="/login" className="text-sm text-slate-400 hover:text-white transition-colors px-3 py-2">
              Sign In
            </Link>
            <Link
              to="/register"
              className="text-sm font-semibold px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white transition-all shadow-lg shadow-brand-900/30 hover:shadow-brand-500/20"
            >
              Get Started
            </Link>
          </div>

          {/* Mobile: Sign In + hamburger */}
          <div className="md:hidden flex items-center gap-2">
            <Link to="/login" className="text-sm text-slate-300 hover:text-white transition-colors px-3 py-1.5">
              Sign In
            </Link>
            <Link to="/register" className="text-sm font-semibold px-4 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white transition-all">
              Sign Up
            </Link>
            <button
              onClick={() => setMobileOpen(v => !v)}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.18 }}
            className="fixed top-16 inset-x-0 z-40 bg-surface-900/95 backdrop-blur-xl border-b border-white/5 md:hidden"
          >
            <div className="px-5 py-4 space-y-1">
              {LINKS.map(({ href, label }) => (
                <a
                  key={href}
                  href={href}
                  onClick={e => handleHashLink(e, href)}
                  className="block px-4 py-3 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 transition text-sm"
                >
                  {label}
                </a>
              ))}
              <div className="pt-3 border-t border-white/5 space-y-2">
                <Link to="/login" onClick={() => setMobileOpen(false)}
                  className="block px-4 py-3 rounded-xl text-slate-400 hover:text-white text-sm transition">
                  Sign In
                </Link>
                <Link to="/register" onClick={() => setMobileOpen(false)}
                  className="block px-4 py-3 rounded-xl bg-brand-600 text-white font-semibold text-sm text-center">
                  Get Started Free
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
