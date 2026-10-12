import React from 'react'
import { Link } from 'react-router-dom'
import { TrendingUp } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="border-t border-white/5 bg-surface-950">
      <div className="max-w-7xl mx-auto px-5 py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-lg">
                <TrendingUp size={16} className="text-white" />
              </div>
              <span className="font-display font-bold text-white text-base">SmartSpent</span>
            </Link>
            <p className="text-sm text-slate-500 leading-relaxed max-w-xs">
              Your AI-powered finance copilot. Track expenses, detect anomalies,
              forecast spending, and get insights, all in one place.
            </p>
          </div>

          {/* Product */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Product</p>
            <ul className="space-y-2.5">
              {[
                { label: 'Features', href: '/#features' },
                { label: 'How It Works', href: '/#how-it-works' },
                { label: 'Product Overview', href: '/product' },
                { label: 'Interactive Demo', href: '/demo' },
              ].map(({ label, href }) => (
                <li key={href}>
                  <a href={href} className="text-sm text-slate-500 hover:text-white transition-colors">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Get started */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Get Started</p>
            <ul className="space-y-2.5">
              {[
                { label: 'Create Account', href: '/register' },
                { label: 'Sign In', href: '/login' },
                { label: 'Interactive Demo', href: '/demo' },
                { label: 'Product Overview', href: '/product' },
              ].map(({ label, href }) => (
                <li key={href}>
                  <Link to={href} className="text-sm text-slate-500 hover:text-white transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-600">© 2026 SmartSpent. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-xs text-slate-600 hover:text-slate-400 transition-colors">Sign In</Link>
            <Link to="/register" className="text-xs text-slate-600 hover:text-slate-400 transition-colors">Register</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
