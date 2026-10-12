import React, { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, CreditCard, BarChart2, MessageSquare,
  DollarSign, ShoppingBag, AlertTriangle, TrendingUp,
  Plus, RefreshCw, ArrowRight, Check, X, ChevronRight,
  ChevronLeft, Brain, Shield, Zap
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'
import Navbar from '@/components/marketing/Navbar'
import Footer from '@/components/marketing/Footer'

// ── Sample data ──────────────────────────────────────────────────────────────
const INIT_EXPENSES = [
  { id: 1,  merchant: 'Whole Foods Market', category: 'Food',          amount: 87.50,  date: '2026-10-01', is_anomaly: false },
  { id: 2,  merchant: 'Netflix',            category: 'Entertainment', amount: 500.00, date: '2026-10-01', is_anomaly: true  },
  { id: 3,  merchant: 'Shell Gas Station',  category: 'Transport',     amount: 45.20,  date: '2026-10-02', is_anomaly: false },
  { id: 4,  merchant: 'Starbucks',          category: 'Food',          amount: 8.75,   date: '2026-10-02', is_anomaly: false },
  { id: 5,  merchant: 'Amazon',             category: 'Shopping',      amount: 234.99, date: '2026-10-03', is_anomaly: false },
  { id: 6,  merchant: 'Uber',               category: 'Transport',     amount: 22.50,  date: '2026-10-04', is_anomaly: false },
  { id: 7,  merchant: 'CVS Pharmacy',       category: 'Healthcare',    amount: 34.80,  date: '2026-10-04', is_anomaly: false },
  { id: 8,  merchant: 'Spotify',            category: 'Entertainment', amount: 9.99,   date: '2026-10-05', is_anomaly: false },
  { id: 9,  merchant: 'Chipotle',           category: 'Food',          amount: 15.50,  date: '2026-10-05', is_anomaly: false },
  { id: 10, merchant: 'ConEd Electric',     category: 'Utilities',     amount: 125.00, date: '2026-10-06', is_anomaly: false },
  { id: 11, merchant: "Trader Joe's",       category: 'Food',          amount: 62.30,  date: '2026-10-07', is_anomaly: false },
  { id: 12, merchant: 'Delta Airlines',     category: 'Travel',        amount: 450.00, date: '2026-10-08', is_anomaly: true  },
]

const DAILY_DATA = [
  { label: 'Oct 1', total: 587.5 },
  { label: 'Oct 2', total: 53.95 },
  { label: 'Oct 3', total: 234.99 },
  { label: 'Oct 4', total: 57.30 },
  { label: 'Oct 5', total: 25.49 },
  { label: 'Oct 6', total: 125.00 },
  { label: 'Oct 7', total: 62.30 },
  { label: 'Oct 8', total: 450.00 },
]

const FORECAST_DATA = Array.from({ length: 14 }, (_, i) => ({
  date: `Oct ${9 + i}`,
  predicted: Math.round(60 + Math.sin(i * 0.7) * 20 + Math.random() * 15),
}))

const CATEGORIES = ['Food', 'Transport', 'Entertainment', 'Healthcare', 'Shopping', 'Utilities', 'Education', 'Finance', 'Travel', 'Other']
const CAT_COLORS = { Food:'#5567f3', Transport:'#22d3ee', Entertainment:'#a78bfa', Healthcare:'#34d399', Shopping:'#fbbf24', Utilities:'#f87171', Education:'#fb923c', Finance:'#60a5fa', Travel:'#e879f9', Other:'#94a3b8' }
const CAT_EMOJI = { Food:'🍔', Transport:'🚗', Entertainment:'🎬', Healthcare:'💊', Shopping:'🛍️', Utilities:'⚡', Education:'📚', Finance:'💰', Travel:'✈️', Other:'📝' }

// ── AI chat simulation ───────────────────────────────────────────────────────
const AI_RESPONSES = {
  default: "I've analyzed your spending data. You've spent $1,596.53 across 12 transactions. Netflix ($500) and Delta Airlines ($450) are flagged as anomalies. Together they account for 59% of your total spending.",
  overspend: "Your biggest overspend area is Entertainment. The $500 Netflix charge is 31x your average entertainment spend. Food is healthy at $174.05 total. I'd recommend reviewing subscription charges.",
  forecast: "Based on your pattern, I forecast around $41/day for the next 30 days. Excluding the two anomalies, your baseline daily spend is about $25, well within a typical budget.",
  anomaly: "Two anomalies detected this period: Netflix $500 (31x avg entertainment), and Delta Airlines $450 (unusual travel spike). Neither appears fraudulent, but both warrant review.",
  compare: "Oct 1 was your heaviest day at $587.50 (largely due to Netflix). Oct 5 was your lightest at $25.49. Your daily spending is highly variable. The AI recommends smoothing discretionary purchases.",
}

const QUICK_PROMPTS = [
  { label: 'Where am I overspending?', key: 'overspend' },
  { label: 'What are the anomalies?', key: 'anomaly' },
  { label: 'Forecast next month', key: 'forecast' },
  { label: 'Compare my days', key: 'compare' },
]

// ── Tour steps ────────────────────────────────────────────────────────────────
const TOUR_STEPS = [
  { tab: 'dashboard', title: 'Financial Overview',    desc: 'Your spending at a glance. Stat cards show total, transaction count, anomaly alerts, and daily average.' },
  { tab: 'expenses',  title: 'Expense Tracker',       desc: 'All transactions in one place. Anomalies are highlighted in amber. Try adding a new expense below.' },
  { tab: 'analytics', title: 'Daily Spending Chart',  desc: 'See your daily spending pattern. Notice the Oct 1 spike ($587.50). That is the Netflix anomaly.' },
  { tab: 'analytics', title: 'Spending Forecast',     desc: 'See a 14-day prediction of your daily spending based on your recent history. SmartSpent adapts the forecast as your data grows.' },
  { tab: 'chat',      title: 'AI Financial Assistant', desc: 'Ask the AI any question about your finances. It has full context of your expenses, anomalies, and forecast.' },
]

// ── Tabs ──────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'expenses',  icon: CreditCard,      label: 'Expenses' },
  { id: 'analytics', icon: BarChart2,       label: 'Analytics' },
  { id: 'chat',      icon: MessageSquare,   label: 'AI Chat' },
]

// ── Dashboard tab ─────────────────────────────────────────────────────────────
function DashboardTab({ expenses }) {
  const total = expenses.reduce((s, e) => s + e.amount, 0)
  const anomalies = expenses.filter(e => e.is_anomaly)
  const avgDaily = total / 8

  const catTotals = Object.entries(
    expenses.reduce((acc, e) => { acc[e.category] = (acc[e.category] || 0) + e.amount; return acc }, {})
  ).map(([category, total]) => ({ category, total })).sort((a, b) => b.total - a.total)

  return (
    <div className="space-y-5">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Spent', val: `$${total.toFixed(2)}`, icon: DollarSign, color: 'text-brand-400' },
          { label: 'Transactions', val: expenses.length, icon: ShoppingBag, color: 'text-green-400' },
          { label: 'Anomalies', val: anomalies.length, icon: AlertTriangle, color: 'text-amber-400' },
          { label: 'Daily Avg', val: `$${avgDaily.toFixed(2)}`, icon: TrendingUp, color: 'text-blue-400' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            className="glass-card p-5">
            <div className="flex items-start justify-between mb-3">
              <div className={`w-9 h-9 rounded-xl bg-surface-700 flex items-center justify-center ${s.color}`}>
                <s.icon size={18} />
              </div>
            </div>
            <p className="text-2xl font-display font-bold text-white">{s.val}</p>
            <p className="text-sm text-slate-500 mt-1">{s.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Daily chart */}
        <div className="lg:col-span-2 glass-card p-5">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2 text-sm">
            <TrendingUp size={14} className="text-brand-400" /> Daily Spending (Oct 1 to 8)
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={DAILY_DATA} margin={{ left: -10 }}>
              <defs>
                <linearGradient id="dg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#5567f3" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#5567f3" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="label" tick={{ fill:'#64748b', fontSize:10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill:'#64748b', fontSize:10 }} axisLine={false} tickLine={false} tickFormatter={v=>`$${v}`} />
              <Tooltip formatter={v=>[`$${v.toFixed(2)}`, 'Total']} contentStyle={{ background:'#131c2e', border:'1px solid #1a2540', borderRadius:8, fontSize:11 }} />
              <Area type="monotone" dataKey="total" stroke="#5567f3" strokeWidth={2} fill="url(#dg)" dot={{ fill:'#5567f3', r:3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Category pie */}
        <div className="glass-card p-5">
          <h3 className="font-semibold text-white mb-4 text-sm flex items-center gap-2">
            <ShoppingBag size={14} className="text-brand-400" /> By Category
          </h3>
          <ResponsiveContainer width="100%" height={130}>
            <PieChart>
              <Pie data={catTotals.slice(0, 6)} cx="50%" cy="50%" innerRadius={35} outerRadius={58} dataKey="total" nameKey="category" paddingAngle={3}>
                {catTotals.slice(0, 6).map(e => <Cell key={e.category} fill={CAT_COLORS[e.category] || '#94a3b8'} />)}
              </Pie>
              <Tooltip formatter={(v, n) => [`$${v.toFixed(2)}`, n]} contentStyle={{ background:'#131c2e', border:'1px solid #1a2540', borderRadius:8, fontSize:11 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1 mt-3">
            {catTotals.slice(0, 4).map(c => (
              <div key={c.category} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: CAT_COLORS[c.category] || '#94a3b8' }} />
                  <span className="text-slate-400">{c.category}</span>
                </div>
                <span className="text-slate-300 font-medium">${c.total.toFixed(0)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent */}
      <div className="glass-card p-5">
        <h3 className="font-semibold text-white mb-4 text-sm">Recent Expenses</h3>
        <div className="space-y-2.5">
          {expenses.slice(0, 5).map(e => (
            <div key={e.id} className={`flex items-center gap-3 py-2 border-b last:border-0 ${e.is_anomaly ? 'border-amber-500/10' : 'border-white/5'}`}>
              <span className="text-lg flex-shrink-0">{CAT_EMOJI[e.category] || '💳'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-200 truncate">{e.merchant}</p>
                <p className="text-xs text-slate-500">{e.category} · {e.date}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-white">${e.amount.toFixed(2)}</p>
                {e.is_anomaly && <p className="text-xs text-amber-400">⚠ anomaly</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Expenses tab ──────────────────────────────────────────────────────────────
function ExpensesTab({ expenses, onAdd }) {
  const [form, setForm] = useState({ merchant: '', category: 'Food', amount: '' })
  const [added, setAdded] = useState(null)
  const [showForm, setShowForm] = useState(false)

  const handleAdd = () => {
    if (!form.merchant || !form.amount) return
    const isAnomaly = Number(form.amount) > 200
    const newExp = {
      id: Date.now(),
      merchant: form.merchant,
      category: form.category,
      amount: Number(form.amount),
      date: '2026-10-09',
      is_anomaly: isAnomaly,
    }
    onAdd(newExp)
    setAdded(newExp)
    setForm({ merchant: '', category: 'Food', amount: '' })
    setShowForm(false)
    setTimeout(() => setAdded(null), 4000)
  }

  return (
    <div className="space-y-4">
      {/* Add expense */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-white text-sm">Expense Tracker</h3>
          <button onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white transition">
            <Plus size={12} /> Add Expense
          </button>
        </div>

        <AnimatePresence>
          {showForm && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-4">
              <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-surface-800/50 border border-white/5">
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Merchant</label>
                  <input value={form.merchant} onChange={e => setForm(f => ({ ...f, merchant: e.target.value }))}
                    placeholder="e.g. Amazon" className="w-full bg-surface-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-brand-500/50" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Category</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full bg-surface-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-brand-500/50">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Amount ($)</label>
                  <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                    placeholder="0.00" className="w-full bg-surface-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-brand-500/50" />
                </div>
                <div className="col-span-3 flex gap-2 justify-end mt-1">
                  <button onClick={() => setShowForm(false)} className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-white transition">Cancel</button>
                  <button onClick={handleAdd} className="text-xs px-4 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-semibold transition">
                    Add &amp; Analyze
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-600 mt-2 px-1">Demo: amounts over $200 will be flagged as anomalies by the ML model.</p>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {added && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className={`mb-4 flex items-center gap-3 px-4 py-3 rounded-xl text-sm ${
                added.is_anomaly
                  ? 'bg-amber-500/10 border border-amber-500/25 text-amber-300'
                  : 'bg-green-500/10 border border-green-500/25 text-green-300'
              }`}>
              {added.is_anomaly
                ? <><AlertTriangle size={15} /> Added and flagged as anomaly. ${added.amount} is unusually high.</>
                : <><Check size={15} /> Added "{added.merchant}". Looks normal, no anomaly detected.</>}}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-left">
                <th className="pb-2 text-xs text-slate-500 font-medium">Merchant</th>
                <th className="pb-2 text-xs text-slate-500 font-medium">Category</th>
                <th className="pb-2 text-xs text-slate-500 font-medium text-right">Amount</th>
                <th className="pb-2 text-xs text-slate-500 font-medium">Date</th>
                <th className="pb-2 text-xs text-slate-500 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map(e => (
                <tr key={e.id} className={`border-b last:border-0 ${e.is_anomaly ? 'border-amber-500/10 bg-amber-500/3' : 'border-white/5'}`}>
                  <td className="py-2.5 pr-4">
                    <div className="flex items-center gap-2">
                      <span>{CAT_EMOJI[e.category]}</span>
                      <span className="font-medium text-slate-200">{e.merchant}</span>
                    </div>
                  </td>
                  <td className="py-2.5 pr-4 text-slate-400">{e.category}</td>
                  <td className="py-2.5 pr-4 text-right font-semibold text-white">${e.amount.toFixed(2)}</td>
                  <td className="py-2.5 pr-4 text-slate-500 text-xs">{e.date}</td>
                  <td className="py-2.5">
                    {e.is_anomaly
                      ? <span className="text-xs bg-amber-500/10 border border-amber-500/25 text-amber-400 px-2 py-0.5 rounded-full">⚠ Anomaly</span>
                      : <span className="text-xs text-green-400">✓ Normal</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── Analytics tab ─────────────────────────────────────────────────────────────
function AnalyticsTab({ expenses }) {
  const anomalies = expenses.filter(e => e.is_anomaly)

  return (
    <div className="space-y-5">
      <div className="glass-card p-5">
        <h3 className="font-semibold text-white mb-4 text-sm flex items-center gap-2">
          <TrendingUp size={14} className="text-brand-400" /> Daily Spending (Last 8 Days)
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={DAILY_DATA} margin={{ left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="label" tick={{ fill:'#64748b', fontSize:10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill:'#64748b', fontSize:10 }} axisLine={false} tickLine={false} tickFormatter={v=>`$${v}`} />
            <Tooltip formatter={v=>[`$${v.toFixed(2)}`, 'Spent']} contentStyle={{ background:'#131c2e', border:'1px solid #1a2540', borderRadius:8, fontSize:11 }} />
            <Bar dataKey="total" fill="#5567f3" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Forecast */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white text-sm flex items-center gap-2">
              <TrendingUp size={14} className="text-green-400" /> 14-Day Forecast
            </h3>
            <span className="text-xs bg-green-500/10 border border-green-500/20 text-green-400 px-2 py-0.5 rounded-full">AI-Powered</span>
          </div>
          <ResponsiveContainer width="100%" height={150}>
            <AreaChart data={FORECAST_DATA} margin={{ left: -10 }}>
              <defs>
                <linearGradient id="fg2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="date" tick={{ fill:'#64748b', fontSize:9 }} axisLine={false} tickLine={false} interval={3} />
              <YAxis tick={{ fill:'#64748b', fontSize:9 }} axisLine={false} tickLine={false} tickFormatter={v=>`$${v}`} />
              <Tooltip formatter={v=>[`$${v}/day`, 'Predicted']} contentStyle={{ background:'#131c2e', border:'1px solid #1a2540', borderRadius:8, fontSize:11 }} />
              <Area type="monotone" dataKey="predicted" stroke="#10b981" strokeWidth={1.5} fill="url(#fg2)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
          <p className="text-xs text-slate-600 mt-2">Estimated 14-day total: ~${FORECAST_DATA.reduce((s,d)=>s+d.predicted,0).toFixed(0)}</p>
        </div>

        {/* Anomalies */}
        <div className="glass-card p-5">
          <h3 className="font-semibold text-white text-sm flex items-center gap-2 mb-4">
            <AlertTriangle size={14} className="text-amber-400" /> Anomalous Expenses
          </h3>
          {anomalies.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-slate-600 text-sm gap-2">
              <Shield size={24} /> No anomalies detected
            </div>
          ) : (
            <div className="space-y-2">
              {anomalies.map(a => (
                <div key={a.id} className="flex items-center justify-between p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                  <div>
                    <p className="text-sm font-medium text-white">{a.merchant}</p>
                    <p className="text-xs text-slate-500">{a.category} · {a.date}</p>
                  </div>
                  <span className="text-amber-400 font-bold text-sm">${a.amount.toFixed(2)}</span>
                </div>
              ))}
              <p className="text-xs text-slate-600 mt-2 pt-2 border-t border-white/5">
                Detected automatically based on your spending baseline
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── AI Chat tab ───────────────────────────────────────────────────────────────
function ChatTab() {
  const [messages, setMessages] = useState([
    { role: 'ai', text: AI_RESPONSES.default }
  ])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, thinking])

  const send = (text) => {
    if (thinking) return
    const userMsg = text || input.trim()
    if (!userMsg) return
    setInput('')
    setMessages(m => [...m, { role: 'user', text: userMsg }])
    setThinking(true)
    const key = Object.keys(AI_RESPONSES).find(k => userMsg.toLowerCase().includes(k)) || 'default'
    setTimeout(() => {
      setMessages(m => [...m, { role: 'ai', text: AI_RESPONSES[key] }])
      setThinking(false)
    }, 1200)
  }

  return (
    <div className="glass-card flex flex-col h-[500px]">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5">
        <div className="w-8 h-8 rounded-lg bg-brand-600/20 flex items-center justify-center">
          <Brain size={15} className="text-brand-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white">AI Financial Assistant</p>
          <p className="text-xs text-slate-500">Analyzing your expenses in real time (demo simulation)</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-green-400">Active</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.map((m, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              m.role === 'user'
                ? 'bg-brand-600/30 border border-brand-500/30 text-white rounded-tr-sm'
                : 'bg-surface-800 border border-white/5 text-slate-300 rounded-tl-sm'
            }`}>
              {m.text}
            </div>
          </motion.div>
        ))}
        {thinking && (
          <div className="flex justify-start">
            <div className="bg-surface-800 border border-white/5 rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1.5">
              {[0, 0.2, 0.4].map(d => (
                <motion.div key={d} className="w-1.5 h-1.5 rounded-full bg-brand-400"
                  animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.8, delay: d }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick prompts */}
      <div className="px-5 pb-3 flex gap-2 flex-wrap">
        {QUICK_PROMPTS.map(({ label, key }) => (
          <button key={key} onClick={() => send(label)}
            className="text-xs px-3 py-1.5 rounded-lg border border-white/10 hover:border-brand-500/30 hover:bg-brand-500/10 text-slate-400 hover:text-white transition">
            {label}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="px-5 pb-4">
        <div className="flex gap-2 items-center bg-surface-800 rounded-xl border border-white/10 px-4 py-2">
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            placeholder="Ask about your finances…"
            className="flex-1 bg-transparent text-sm text-white placeholder-slate-600 outline-none" />
          <button onClick={() => send()} disabled={!input.trim() || thinking}
            className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center disabled:opacity-40 transition hover:bg-brand-500">
            <ArrowRight size={13} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Demo page ────────────────────────────────────────────────────────────
export default function Demo() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [expenses, setExpenses] = useState(INIT_EXPENSES)
  const [tourStep, setTourStep] = useState(0)
  const [tourActive, setTourActive] = useState(true)

  const currentStep = TOUR_STEPS[tourStep]

  const nextStep = () => {
    if (tourStep < TOUR_STEPS.length - 1) {
      const next = tourStep + 1
      setTourStep(next)
      setActiveTab(TOUR_STEPS[next].tab)
    } else {
      setTourActive(false)
    }
  }
  const prevStep = () => {
    if (tourStep > 0) {
      const prev = tourStep - 1
      setTourStep(prev)
      setActiveTab(TOUR_STEPS[prev].tab)
    }
  }
  const reset = () => { setTourStep(0); setActiveTab('dashboard'); setTourActive(true); setExpenses(INIT_EXPENSES) }

  return (
    <div className="min-h-screen bg-surface-950 text-slate-100">
      <Navbar />

      {/* Header */}
      <section className="pt-28 pb-10 px-5 text-center">
        <div className="max-w-2xl mx-auto">
          <span className="text-xs font-semibold text-brand-400 uppercase tracking-widest">Interactive Demo</span>
          <h1 className="font-display text-4xl font-bold text-white mt-3 mb-3">
            Try SmartSpent. No account needed.
          </h1>
          <p className="text-slate-400 text-base mb-2">
            Explore the full product with sample data. All interactions are local. Nothing is saved.
          </p>
          <span className="inline-flex items-center gap-1.5 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-full">
            <Zap size={11} /> Demo mode: sample data, simulated AI responses
          </span>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-5 pb-20">
        {/* Tour banner */}
        <AnimatePresence>
          {tourActive && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="mb-5 glass-card p-4 border border-brand-500/20 bg-brand-500/5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <div className="w-7 h-7 rounded-full bg-brand-600 flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">
                    {tourStep + 1}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{currentStep.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{currentStep.desc}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={prevStep} disabled={tourStep === 0} className="p-1.5 rounded-lg border border-white/10 hover:border-white/20 text-slate-400 hover:text-white disabled:opacity-30 transition">
                    <ChevronLeft size={14} />
                  </button>
                  <span className="text-xs text-slate-500">{tourStep + 1}/{TOUR_STEPS.length}</span>
                  <button onClick={nextStep} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white transition font-medium">
                    {tourStep < TOUR_STEPS.length - 1 ? <>Next <ChevronRight size={13} /></> : <><Check size={13} /> Finish</>}
                  </button>
                  <button onClick={() => setTourActive(false)} className="p-1.5 rounded-lg text-slate-600 hover:text-slate-400 transition">
                    <X size={14} />
                  </button>
                </div>
              </div>
              {/* Progress bar */}
              <div className="mt-3 h-1 bg-surface-700 rounded-full overflow-hidden">
                <motion.div className="h-full bg-brand-500 rounded-full"
                  animate={{ width: `${((tourStep + 1) / TOUR_STEPS.length) * 100}%` }}
                  transition={{ duration: 0.3 }} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* App shell */}
        <div className="glass-card overflow-hidden">
          {/* App top bar */}
          <div className="flex items-center gap-1.5 px-5 py-3 border-b border-white/5 bg-surface-900">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
            <span className="ml-3 text-xs text-slate-600 font-mono">SmartSpent: Demo Mode</span>
            <button onClick={reset} className="ml-auto flex items-center gap-1 text-xs text-slate-600 hover:text-slate-400 transition">
              <RefreshCw size={11} /> Reset
            </button>
          </div>

          {/* Tab bar */}
          <div className="flex border-b border-white/5 bg-surface-900/50 overflow-x-auto">
            {TABS.map(({ id, icon: Icon, label }) => (
              <button key={id} onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                  activeTab === id
                    ? 'border-brand-500 text-white bg-brand-500/5'
                    : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}>
                <Icon size={14} />{label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="p-5">
            <AnimatePresence mode="wait">
              <motion.div key={activeTab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
                {activeTab === 'dashboard' && <DashboardTab expenses={expenses} />}
                {activeTab === 'expenses'  && <ExpensesTab expenses={expenses} onAdd={e => setExpenses(prev => [e, ...prev])} />}
                {activeTab === 'analytics' && <AnalyticsTab expenses={expenses} />}
                {activeTab === 'chat'      && <ChatTab />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Post-demo CTA */}
        {!tourActive && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="mt-8 text-center glass-card p-8">
            <div className="w-12 h-12 rounded-2xl bg-brand-600/20 border border-brand-500/20 flex items-center justify-center mx-auto mb-4">
              <TrendingUp size={22} className="text-brand-400" />
            </div>
            <h3 className="font-display text-2xl font-bold text-white mb-2">Ready for the real thing?</h3>
            <p className="text-slate-400 text-sm mb-6">Create a free account and start tracking your actual expenses with full ML and AI features.</p>
            <div className="flex gap-3 justify-center flex-wrap">
              <Link to="/register"
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm transition-all shadow-lg hover:scale-[1.02]">
                Create Free Account <ArrowRight size={14} />
              </Link>
              <button onClick={reset} className="flex items-center gap-2 px-6 py-3 rounded-xl border border-white/10 hover:border-white/20 text-white text-sm font-semibold transition hover:bg-white/5">
                <RefreshCw size={14} /> Restart Demo
              </button>
            </div>
          </motion.div>
        )}
      </div>

      <Footer />
    </div>
  )
}
