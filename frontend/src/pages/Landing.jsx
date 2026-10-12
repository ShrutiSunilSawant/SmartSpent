import React, { useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, useInView } from 'framer-motion'
import {
  TrendingUp, AlertTriangle, Camera, Brain, Shield, Zap,
  BarChart2, MessageSquare, ArrowRight, Check,
  DollarSign, ShoppingBag, Lock
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts'
import Navbar from '@/components/marketing/Navbar'
import Footer from '@/components/marketing/Footer'

// ── Floating dashboard preview ───────────────────────────────────────────────
const CHART_DATA = [
  { d: 'Sep 1', v: 42 }, { d: 'Sep 3', v: 65 }, { d: 'Sep 5', v: 38 },
  { d: 'Sep 7', v: 88 }, { d: 'Sep 9', v: 55 }, { d: 'Sep 11', v: 120 },
  { d: 'Sep 13', v: 72 }, { d: 'Sep 15', v: 95 }, { d: 'Sep 17', v: 60 },
  { d: 'Sep 19', v: 145 },
]
const EXPENSES = [
  { merchant: 'Whole Foods', cat: '🍔 Food', amount: '$87.50', anomaly: false },
  { merchant: 'Netflix', cat: '🎬 Entertainment', amount: '$500.00', anomaly: true },
  { merchant: 'Shell Gas', cat: '🚗 Transport', amount: '$45.20', anomaly: false },
]

function DashboardPreview() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40, rotateX: 8 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ duration: 0.9, delay: 0.3, ease: 'easeOut' }}
      style={{ perspective: 1000 }}
      className="relative"
    >
      {/* Glow behind */}
      <div className="absolute -inset-4 rounded-3xl bg-brand-600/10 blur-2xl pointer-events-none" />

      <div className="relative rounded-2xl border border-white/10 bg-surface-900/90 backdrop-blur-xl shadow-2xl overflow-hidden">
        {/* Window chrome */}
        <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/5 bg-surface-900">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
          <span className="ml-3 text-xs text-slate-600 font-mono">SmartSpent: Financial Overview</span>
        </div>

        <div className="p-5">
          {/* Stat cards */}
          <div className="grid grid-cols-4 gap-3 mb-5">
            {[
              { label: 'Total Spent', icon: DollarSign, val: '$1,243', color: 'text-brand-400' },
              { label: 'Transactions', icon: ShoppingBag, val: '23', color: 'text-green-400' },
              { label: 'Anomalies', icon: AlertTriangle, val: '1', color: 'text-amber-400' },
              { label: 'Daily Avg', icon: TrendingUp, val: '$41', color: 'text-blue-400' },
            ].map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.08 }}
                className="rounded-xl bg-surface-800 border border-white/5 p-3"
              >
                <div className={`${s.color} mb-1.5`}><s.icon size={14} /></div>
                <p className="text-base font-bold text-white font-display">{s.val}</p>
                <p className="text-xs text-slate-600 mt-0.5">{s.label}</p>
              </motion.div>
            ))}
          </div>

          {/* Chart */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="rounded-xl bg-surface-800/60 border border-white/5 p-3 mb-5"
          >
            <p className="text-xs font-medium text-slate-400 mb-3 flex items-center gap-1.5">
              <TrendingUp size={12} className="text-brand-400" /> Spending This Month
            </p>
            <ResponsiveContainer width="100%" height={90}>
              <AreaChart data={CHART_DATA} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#5567f3" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#5567f3" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="d" tick={{ fill: '#475569', fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#475569', fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                <Tooltip contentStyle={{ background: '#0e1420', border: '1px solid #1a2540', borderRadius: 8, fontSize: 10 }} />
                <Area type="monotone" dataKey="v" stroke="#5567f3" strokeWidth={1.5} fill="url(#pg)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Expense rows */}
          <div className="space-y-1.5">
            {EXPENSES.map((e, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.0 + i * 0.1 }}
                className={`flex items-center justify-between px-3 py-2 rounded-lg ${
                  e.anomaly ? 'bg-amber-500/5 border border-amber-500/20' : 'bg-surface-800/40 border border-white/3'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-sm">{e.cat.split(' ')[0]}</span>
                  <div>
                    <p className="text-xs font-medium text-slate-200">{e.merchant}</p>
                    <p className="text-xs text-slate-600">{e.cat.split(' ').slice(1).join(' ')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {e.anomaly && <span className="text-xs text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded-md">⚠ anomaly</span>}
                  <span className="text-xs font-semibold text-white">{e.amount}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* AI badge floating over */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8, x: 20 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          transition={{ delay: 1.4, type: 'spring' }}
          className="absolute -right-3 top-24 bg-surface-800 border border-brand-500/30 rounded-xl px-3 py-2 shadow-xl"
        >
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-brand-500/20 flex items-center justify-center">
              <Brain size={11} className="text-brand-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-white">AI Detected</p>
              <p className="text-xs text-amber-400">Netflix: $500 is unusual</p>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}

// ── Section wrapper with scroll-in ─────────────────────────────────────────
function Section({ id, children, className = '' }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  return (
    <motion.section
      id={id}
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.section>
  )
}

// ── Feature card ──────────────────────────────────────────────────────────────
function FeatureCard({ icon: Icon, title, desc, color, delay = 0 }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })
  const colorMap = {
    blue: 'bg-brand-500/10 text-brand-400 border-brand-500/20',
    green: 'bg-green-500/10 text-green-400 border-green-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    pink: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
    cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  }
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay }}
      className="glass-card-hover p-6 group"
    >
      <div className={`w-11 h-11 rounded-xl border flex items-center justify-center mb-4 ${colorMap[color]}`}>
        <Icon size={20} />
      </div>
      <h3 className="font-display font-semibold text-white mb-2 text-base">{title}</h3>
      <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
    </motion.div>
  )
}

// ── Step ──────────────────────────────────────────────────────────────────────
function Step({ num, title, desc, isLast }) {
  return (
    <div className="flex gap-5">
      <div className="flex flex-col items-center">
        <div className="w-9 h-9 rounded-full bg-brand-600 border border-brand-500 flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-bold text-white">{num}</span>
        </div>
        {!isLast && <div className="w-px flex-1 bg-gradient-to-b from-brand-600/50 to-transparent mt-2" />}
      </div>
      <div className="pb-10">
        <h3 className="font-display font-semibold text-white text-base mb-1.5">{title}</h3>
        <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
      </div>
    </div>
  )
}

// ── Main Landing ──────────────────────────────────────────────────────────────
export default function Landing() {
  return (
    <div className="min-h-screen bg-surface-950 text-slate-100">
      <Navbar />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative pt-24 lg:pt-32 pb-16 lg:pb-20 px-5 overflow-hidden">
        {/* Background glows */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full bg-brand-600/12 blur-[120px]" />
          <div className="absolute top-60 -right-20 w-[300px] h-[300px] rounded-full bg-purple-600/8 blur-[90px]" />
          <div className="absolute bottom-0 left-10 w-[200px] h-[200px] rounded-full bg-cyan-600/6 blur-[80px]" />
        </div>

        <div className="relative max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-14 items-center">
            {/* Left copy */}
            <div>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.12] mb-6"
              >
                <span style={{
                  background: 'linear-gradient(135deg, #818cf8 0%, #a5b4fc 40%, #6366f1 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}>
                  SmartSpent.
                </span>
                <br />
                Your AI Finance Copilot.
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-lg text-slate-400 leading-relaxed mb-10 max-w-md"
              >
                Track expenses, detect anomalies, forecast your spending, and chat with an AI that
                understands your actual finances. Smart insights, total privacy.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="flex flex-wrap gap-3 mb-10"
              >
                <Link to="/demo"
                  className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm transition-all shadow-lg shadow-brand-900/40 hover:shadow-brand-500/20 hover:scale-[1.02] active:scale-[0.98]">
                  Try the Demo <ArrowRight size={15} />
                </Link>
                <Link to="/register"
                  className="flex items-center gap-2 px-6 py-3.5 rounded-xl border border-white/10 hover:border-white/20 text-white font-semibold text-sm transition-all hover:bg-white/5">
                  Get Started Free
                </Link>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="flex flex-wrap gap-x-5 gap-y-2"
              >
                {[
                  'Free to use',
                  'No credit card needed',
                  'Your data stays private',
                  'AI-powered insights',
                ].map(t => (
                  <span key={t} className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Check size={11} className="text-green-400" /> {t}
                  </span>
                ))}
              </motion.div>
            </div>

            {/* Right: dashboard preview — desktop only */}
            <div className="relative hidden lg:block">
              <DashboardPreview />
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────────────── */}
      <Section id="features" className="py-24 px-5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-xs font-semibold text-brand-400 uppercase tracking-widest">Features</span>
            <h2 className="font-display text-4xl font-bold text-white mt-3 mb-4">
              Everything you need, nothing you don't
            </h2>
            <p className="text-slate-500 max-w-lg mx-auto text-base">
              A complete financial intelligence layer, built to give you clarity on every dollar you spend.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <FeatureCard delay={0} icon={Brain} color="blue" title="AI Financial Assistant"
              desc="Chat with an AI connected to your real spending data. Ask 'Where am I overspending?' and get clear, actionable answers based on your actual transactions." />
            <FeatureCard delay={0.05} icon={AlertTriangle} color="amber" title="Anomaly Detection"
              desc="Unusual charges are flagged the moment they're added. Large one-off expenses, out-of-pattern amounts, and duplicate charges stand out immediately." />
            <FeatureCard delay={0.1} icon={BarChart2} color="purple" title="Spending Forecast"
              desc="See where your spending is headed. SmartSpent predicts your next 30 days based on your real patterns so you can plan ahead with confidence." />
            <FeatureCard delay={0.15} icon={Camera} color="pink" title="Receipt Scanner"
              desc="Snap a photo or upload a receipt PDF. SmartSpent automatically extracts the amount, merchant, date, and category. No manual entry needed." />
            <FeatureCard delay={0.2} icon={Zap} color="green" title="Auto Categorization"
              desc="Every expense is instantly sorted into the right category (Food, Transport, Entertainment, and more) so your reports are always organized." />
            <FeatureCard delay={0.25} icon={Shield} color="cyan" title="Your Data, Private"
              desc="Your financial data is encrypted and never shared. No third-party analytics, no ads, no profiling. What's yours stays yours." />
          </div>
        </div>
      </Section>

      {/* ── How it works ──────────────────────────────────────────────────── */}
      <Section id="how-it-works" className="py-24 px-5 bg-surface-900/20">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-14 items-center">
            <div>
              <span className="text-xs font-semibold text-brand-400 uppercase tracking-widest">How It Works</span>
              <h2 className="font-display text-4xl font-bold text-white mt-3 mb-10">
                From setup to insights in minutes
              </h2>
              <Step num="1" title="Create a free account"
                desc="Sign up with your email and password in seconds. Your data is encrypted, stored locally, and never shared with anyone." />
              <Step num="2" title="Add your expenses"
                desc="Enter expenses manually or scan a receipt photo. Every entry is instantly auto-categorized and scored for anomalies by the ML models." />
              <Step num="3" title="Get AI-powered insights" isLast
                desc='Ask the AI assistant anything: "Where am I overspending?" or "Can I afford a vacation?" It analyzes your real data and responds in plain English.' />
            </div>

            {/* Right: AI chat mockup */}
            <div>
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7 }}
                className="glass-card overflow-hidden"
              >
                <div className="px-5 py-4 border-b border-white/5 flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-brand-600/20 flex items-center justify-center">
                    <MessageSquare size={13} className="text-brand-400" />
                  </div>
                  <span className="text-sm font-medium text-white">AI Assistant</span>
                  <div className="ml-auto flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-xs text-green-400">Active</span>
                  </div>
                </div>
                <div className="p-5 space-y-4">
                  {[
                    { role: 'user', msg: 'Where am I overspending this month?' },
                    { role: 'ai', msg: "You've spent $87.50 on Food and $500 on Entertainment. That Netflix charge of $500 is flagged as anomalous. It is 31x your average entertainment spend. Your biggest opportunity is cutting subscription charges." },
                    { role: 'user', msg: 'How does my spending compare to last week?' },
                    { role: 'ai', msg: 'This week you spent $782 vs $623 last week, a 25% increase. The jump is almost entirely from the anomalous Netflix charge. Without it, you\'re 3% under last week.' },
                  ].map((m, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 8 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.15 }}
                      className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                        m.role === 'user'
                          ? 'bg-brand-600/30 border border-brand-500/30 text-white rounded-tr-sm'
                          : 'bg-surface-800 border border-white/5 text-slate-300 rounded-tl-sm'
                      }`}>
                        {m.msg}
                      </div>
                    </motion.div>
                  ))}
                  {/* Typing indicator */}
                  <div className="flex gap-1.5 pl-1">
                    {[0, 0.15, 0.3].map(d => (
                      <motion.div key={d} className="w-1.5 h-1.5 rounded-full bg-brand-400"
                        animate={{ y: [0, -4, 0] }}
                        transition={{ repeat: Infinity, duration: 1, delay: d }} />
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </Section>

      {/* ── Final CTA ─────────────────────────────────────────────────────── */}
      <Section className="py-24 px-5">
        <div className="max-w-3xl mx-auto">
          <div className="relative rounded-3xl border border-white/10 bg-gradient-to-br from-surface-800 to-surface-900 p-8 sm:p-12 text-center overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] rounded-full bg-brand-600/15 blur-[80px]" />
            </div>
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-brand-900/50">
                <TrendingUp size={24} className="text-white" />
              </div>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4">
                Take control of your finances
              </h2>
              <p className="text-slate-400 text-base mb-8 max-w-md mx-auto leading-relaxed">
                Start tracking, detecting, and forecasting today. Free account, no credit card, no data shared.
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <Link to="/demo"
                  className="flex items-center gap-2 px-7 py-3.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm transition-all shadow-lg hover:scale-[1.02]">
                  Try the Demo <ArrowRight size={15} />
                </Link>
                <Link to="/register"
                  className="flex items-center gap-2 px-7 py-3.5 rounded-xl border border-white/10 hover:border-white/20 text-white font-semibold text-sm transition-all hover:bg-white/5">
                  Create Free Account
                </Link>
              </div>
              <div className="mt-8 flex items-center justify-center gap-2 text-slate-600 text-xs">
                <Lock size={11} />
                <span>Your financial data is private and encrypted</span>
              </div>
            </div>
          </div>
        </div>
      </Section>

      <Footer />
    </div>
  )
}
