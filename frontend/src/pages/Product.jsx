import React, { useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, useInView } from 'framer-motion'
import {
  Brain, AlertTriangle, TrendingUp, Camera, Zap, Shield,
  ArrowRight, Check, MessageSquare, BarChart2,
  Lock, Users, Server, Database
} from 'lucide-react'
import Navbar from '@/components/marketing/Navbar'
import Footer from '@/components/marketing/Footer'

function FadeIn({ children, delay = 0, className = '' }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, delay, ease: 'easeOut' }}
      className={className}>
      {children}
    </motion.div>
  )
}

// Alternating feature section
function FeatureSection({ icon: Icon, color, badge, title, problem, solution, bullets, visual, flip }) {
  const colorMap = {
    blue: 'bg-brand-500/10 text-brand-400 border-brand-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    green: 'bg-green-500/10 text-green-400 border-green-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    pink: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
    cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  }
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })

  return (
    <div ref={ref} className="py-20 px-5 border-b border-white/5 last:border-0">
      <div className={`max-w-6xl mx-auto grid lg:grid-cols-2 gap-14 items-center ${flip ? 'lg:grid-flow-dense' : ''}`}>
        <motion.div initial={{ opacity: 0, x: flip ? 20 : -20 }}
          animate={inView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.6 }}
          className={flip ? 'lg:col-start-2' : ''}>
          <div className={`w-12 h-12 rounded-xl border flex items-center justify-center mb-5 ${colorMap[color]}`}>
            <Icon size={22} />
          </div>
          <span className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2 block">{badge}</span>
          <h2 className="font-display text-3xl font-bold text-white mb-5 leading-tight">{title}</h2>
          <div className="space-y-4 mb-6">
            <div>
              <p className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-1">The Problem</p>
              <p className="text-slate-400 text-sm leading-relaxed">{problem}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-green-400 uppercase tracking-wider mb-1">The Solution</p>
              <p className="text-slate-400 text-sm leading-relaxed">{solution}</p>
            </div>
          </div>
          <ul className="space-y-2">
            {bullets.map(b => (
              <li key={b} className="flex items-start gap-2.5 text-sm text-slate-300">
                <Check size={14} className="text-green-400 mt-0.5 flex-shrink-0" />
                {b}
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: flip ? -20 : 20 }}
          animate={inView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.1 }}
          className={flip ? 'lg:col-start-1 lg:row-start-1' : ''}>
          {visual}
        </motion.div>
      </div>
    </div>
  )
}

// Mini visual cards used as "visuals" in feature sections
function CodeBlock({ lines }) {
  return (
    <div className="glass-card font-mono text-xs leading-relaxed overflow-hidden">
      <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-white/5 bg-surface-900">
        <div className="w-2 h-2 rounded-full bg-red-500/60" />
        <div className="w-2 h-2 rounded-full bg-amber-500/60" />
        <div className="w-2 h-2 rounded-full bg-green-500/60" />
        <span className="ml-2 text-slate-600 text-xs">SmartSpent: AI Agent</span>
      </div>
      <div className="p-5 space-y-1 text-slate-400 overflow-x-auto">
        {lines.map((l, i) => (
          <div key={i} className={l.highlight ? 'text-brand-300' : l.dim ? 'text-slate-600' : ''}>{l.text}</div>
        ))}
      </div>
    </div>
  )
}

function AnomalyCard() {
  return (
    <div className="glass-card p-5 space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle size={15} className="text-amber-400" />
        <span className="text-sm font-semibold text-white">Anomalous Expenses</span>
      </div>
      {[
        { merchant: 'Netflix', cat: 'Entertainment', amount: '$500.00', reason: '31× avg for category' },
        { merchant: 'Delta Airlines', cat: 'Travel', amount: '$450.00', reason: 'Unusual at this time' },
      ].map((e, i) => (
        <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
          <div>
            <p className="text-sm font-medium text-white">{e.merchant}</p>
            <p className="text-xs text-slate-500">{e.cat} · {e.reason}</p>
          </div>
          <span className="text-sm font-bold text-amber-400">{e.amount}</span>
        </div>
      ))}
      <div className="pt-2 border-t border-white/5">
        <p className="text-xs text-slate-600">Detected automatically, flagged based on your personal spending baseline</p>
      </div>
    </div>
  )
}

function ForecastCard() {
  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp size={15} className="text-green-400" />
          <span className="text-sm font-semibold text-white">30-Day Forecast</span>
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400">AI-Powered</span>
      </div>
      <div className="space-y-3">
        {[
          { label: 'Predicted Total', val: '$1,240', color: 'text-white' },
          { label: 'Daily Average', val: '$41.33', color: 'text-white' },
          { label: 'Confidence', val: 'High', color: 'text-green-400' },
          { label: 'Trend', val: 'Stable ↗', color: 'text-brand-400' },
        ].map(r => (
          <div key={r.label} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
            <span className="text-sm text-slate-500">{r.label}</span>
            <span className={`text-sm font-semibold ${r.color}`}>{r.val}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function PrivacyCard() {
  return (
    <div className="glass-card p-5 space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center">
          <Shield size={15} className="text-green-400" />
        </div>
        <span className="text-sm font-semibold text-white">Security Status</span>
        <span className="ml-auto text-xs text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full">✓ Secure</span>
      </div>
      {[
        { icon: Lock, label: 'Passwords', val: 'Securely hashed, never stored in plaintext' },
        { icon: Shield, label: 'Sessions', val: 'Secure tokens with automatic expiry' },
        { icon: Users, label: 'Data Isolation', val: "Each account's data is fully separate" },
        { icon: Server, label: 'AI Processing', val: 'Runs on your device, not a remote server' },
        { icon: Database, label: 'Storage', val: 'Stored locally, never synced to the cloud' },
      ].map(({ icon: Icon, label, val }) => (
        <div key={label} className="flex items-start gap-3 py-2 border-b border-white/5 last:border-0">
          <div className="w-7 h-7 rounded-lg bg-surface-800 flex items-center justify-center flex-shrink-0">
            <Icon size={12} className="text-slate-400" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-300">{label}</p>
            <p className="text-xs text-slate-600">{val}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Product() {
  return (
    <div className="min-h-screen bg-surface-950 text-slate-100">
      <Navbar />

      {/* Hero */}
      <section className="pt-32 pb-16 px-5 text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full bg-brand-600/10 blur-[100px]" />
        </div>
        <div className="relative max-w-3xl mx-auto">
          <FadeIn>
            <span className="text-xs font-semibold text-brand-400 uppercase tracking-widest">Product Overview</span>
            <h1 className="font-display text-5xl font-bold text-white mt-4 mb-6 leading-tight">
              How SmartSpent works
            </h1>
            <p className="text-lg text-slate-400 leading-relaxed mb-8">
              SmartSpent goes beyond a spreadsheet. It tracks your expenses, flags unusual charges automatically,
              predicts what you'll spend, and answers financial questions in plain English. Here's how each piece works.
            </p>
            <div className="flex gap-3 justify-center">
              <Link to="/demo"
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm transition-all shadow-lg">
                See It in Action <ArrowRight size={14} />
              </Link>
              <Link to="/register"
                className="flex items-center gap-2 px-6 py-3 rounded-xl border border-white/10 hover:border-white/20 text-white text-sm font-semibold transition hover:bg-white/5">
                Get Started Free
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Target audience */}
      <section className="py-12 px-5 border-y border-white/5 bg-surface-900/20">
        <div className="max-w-5xl mx-auto">
          <FadeIn>
            <p className="text-center text-xs font-semibold text-slate-500 uppercase tracking-widest mb-8">Built for</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: '🏠', label: 'Households', desc: 'Track shared expenses and understand where money goes each month' },
                { icon: '🔒', label: 'Privacy-Conscious Users', desc: 'Who want financial insights without uploading data to third parties' },
                { icon: '📊', label: 'Data-Driven People', desc: 'Who want real analysis and forecasts, not just charts' },
                { icon: '💼', label: 'Freelancers', desc: 'Managing irregular income and wanting visibility on spending patterns' },
              ].map(({ icon, label, desc }) => (
                <div key={label} className="glass-card p-5 text-center">
                  <div className="text-2xl mb-3">{icon}</div>
                  <p className="font-display font-semibold text-white text-sm mb-1">{label}</p>
                  <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Feature deep-dives */}
      <div>
        <FeatureSection
          icon={Brain} color="blue" badge="AI Assistant" flip={false}
          title="AI Financial Assistant"
          problem="Finance apps give you data. What you actually need is interpretation. Something that reads your spending and tells you what it means and what to do about it."
          solution="SmartSpent's AI assistant understands your actual transaction history. When you ask a question, it analyzes your real data (spending totals, unusual charges, and upcoming trends) and responds in plain English."
          bullets={[
            'Remembers context across your conversations',
            'Sees your real expenses, anomalies, and forecasts',
            'Responds with specific numbers, not generic advice',
            'Ask anything: "Can I afford a vacation?" or "Where did my money go?"',
          ]}
          visual={<CodeBlock lines={[
            { text: 'You: Where am I overspending?', highlight: true },
            { text: '' },
            { text: 'SmartSpent: You\'ve spent $500 on Entertainment', dim: false },
            { text: 'Primarily the Netflix charge, which is 31x', dim: false },
            { text: 'your typical entertainment spend.', dim: false },
            { text: '' },
            { text: 'Food is healthy at $174 total. Your biggest', dim: false },
            { text: 'opportunity is reviewing subscriptions.', highlight: true },
          ]} />}
        />

        <FeatureSection
          icon={AlertTriangle} color="amber" badge="Smart Alerts" flip={true}
          title="Automatic Anomaly Detection"
          problem="You can't review every transaction manually. Unusual charges (an unexpected subscription, a duplicate charge, a one-off spike) are easy to miss in a long list."
          solution="SmartSpent automatically learns what 'normal' looks like for your spending, then flags anything that breaks the pattern. It works without you needing to set thresholds or rules."
          bullets={[
            'Learns your personal spending baseline over time',
            'Flags large one-off charges and out-of-pattern amounts',
            'Starts working automatically as your history grows',
            'Every anomaly shows up highlighted with an explanation',
          ]}
          visual={<AnomalyCard />}
        />

        <FeatureSection
          icon={TrendingUp} color="green" badge="Spending Forecast" flip={false}
          title="Know what you'll spend before you spend it"
          problem="Knowing what you spent last month is useful. Knowing what you'll spend next month is actionable. It lets you adjust behavior before you overspend."
          solution="SmartSpent analyzes your spending history and projects the next 30 days, automatically picking the best forecasting approach for your data. The result is a daily prediction you can actually plan around."
          bullets={[
            'Predicts your next 30 days based on your real patterns',
            'Adapts as you add more spending history',
            'Shows daily average so you can set a day-by-day budget',
            'Updates automatically whenever you add new expenses',
          ]}
          visual={<ForecastCard />}
        />

        <FeatureSection
          icon={Camera} color="pink" badge="Receipt Scanner" flip={true}
          title="Scan receipts, skip the manual entry"
          problem="Manually entering receipts is tedious and error-prone. Even a few seconds of friction per transaction means most people stop tracking."
          solution="Drag-and-drop a photo or PDF receipt and SmartSpent extracts the amount, merchant, date, and category automatically. Review and confirm, then it's saved. No typing required."
          bullets={[
            'Supports photos (JPEG, PNG) and PDF invoices',
            'Works on dark, blurry, or crumpled receipts',
            'Auto-fills merchant, amount, date, and category',
            'Editable form lets you confirm before saving',
          ]}
          visual={
            <div className="glass-card p-5 space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <Camera size={15} className="text-pink-400" />
                <span className="text-sm font-semibold text-white">Receipt Scanner</span>
              </div>
              <div className="rounded-xl border-2 border-dashed border-pink-500/20 bg-pink-500/5 py-10 flex flex-col items-center gap-2">
                <Camera size={28} className="text-pink-400/50" />
                <p className="text-sm text-slate-500">Drop receipt here or click to upload</p>
                <p className="text-xs text-slate-700">JPG, PNG, PDF · max 10 MB</p>
              </div>
              <div className="space-y-2 pt-2">
                {[
                  { label: 'Merchant', val: 'Whole Foods Market' },
                  { label: 'Amount', val: '$87.50' },
                  { label: 'Date', val: '2026-10-01' },
                  { label: 'Category', val: 'Food (auto)' },
                  { label: 'OCR Confidence', val: '94%' },
                ].map(({ label, val }) => (
                  <div key={label} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0 text-sm">
                    <span className="text-slate-500">{label}</span>
                    <span className="text-white font-medium">{val}</span>
                  </div>
                ))}
              </div>
            </div>
          }
        />

        <FeatureSection
          icon={Shield} color="cyan" badge="Privacy & Security" flip={false}
          title="Your finances stay private"
          problem="Every cloud-based finance app has an implicit deal: they store your sensitive transaction data in exchange for the service. That data can be breached, sold, or subpoenaed."
          solution="SmartSpent is designed so your financial data never leaves your device. No cloud sync, no third-party analytics, no profiling. You get the AI insights without giving up the data."
          bullets={[
            'Passwords are hashed and never stored in plaintext',
            'Secure authentication with automatic session expiry',
            'Account lockout after repeated failed login attempts',
            "Every user's data is fully isolated from other accounts",
          ]}
          visual={<PrivacyCard />}
        />
      </div>

      {/* Why SmartSpent */}
      <section className="py-20 px-5 bg-surface-900/20 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <FadeIn>
            <div className="text-center mb-12">
              <span className="text-xs font-semibold text-brand-400 uppercase tracking-widest">Why SmartSpent</span>
              <h2 className="font-display text-3xl font-bold text-white mt-3 mb-3">Designed around your needs</h2>
              <p className="text-slate-500 text-sm">Everything in SmartSpent is built to give you clarity without complexity.</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: Zap, label: 'Instant insights', desc: 'Every expense is categorized and analyzed the moment you add it', color: 'text-brand-400' },
                { icon: Shield, label: 'Private by default', desc: 'Your data lives on your device and is never sent to third parties', color: 'text-green-400' },
                { icon: BarChart2, label: 'Forward-looking', desc: 'See where your spending is headed, not just where it\'s been', color: 'text-purple-400' },
                { icon: MessageSquare, label: 'Ask anything', desc: 'An AI that answers questions about your actual finances', color: 'text-amber-400' },
              ].map(({ icon: Icon, label, desc, color }) => (
                <div key={label} className="glass-card p-5 text-center">
                  <div className={`w-10 h-10 rounded-xl bg-surface-800 flex items-center justify-center mx-auto mb-3 ${color}`}>
                    <Icon size={18} />
                  </div>
                  <p className="font-display font-semibold text-white text-sm mb-1">{label}</p>
                  <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-5 text-center">
        <FadeIn>
          <h2 className="font-display text-3xl font-bold text-white mb-4">Ready to try it?</h2>
          <p className="text-slate-500 mb-8 text-base">Explore the interactive demo or create an account to use the full app.</p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link to="/demo"
              className="flex items-center gap-2 px-7 py-3.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm transition-all shadow-lg hover:scale-[1.02]">
              Interactive Demo <ArrowRight size={14} />
            </Link>
            <Link to="/register"
              className="flex items-center gap-2 px-7 py-3.5 rounded-xl border border-white/10 hover:border-white/20 text-white text-sm font-semibold transition hover:bg-white/5">
              Get Started Free
            </Link>
          </div>
        </FadeIn>
      </section>

      <Footer />
    </div>
  )
}
