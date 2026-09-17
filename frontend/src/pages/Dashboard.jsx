/**
 * pages/Dashboard.jsx
 * ---------------------
 * Main dashboard showing:
 * - Key financial metrics (stat cards)
 * - Monthly spending trend chart
 * - Category breakdown (pie/donut)
 * - Recent expenses
 * - Anomaly alerts
 * - Savings insights
 */

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  TrendingUp, TrendingDown, AlertTriangle, DollarSign,
  ShoppingBag, Zap, ArrowUpRight, Calendar
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts'
import { analyticsApi, expenseApi } from '@/services/api'
import { format } from 'date-fns'

// ── Animation variants ─────────────────────────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
}
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
}

// ── Category colors ────────────────────────────────────────────────────────────
const CATEGORY_COLORS = {
  Food: '#5567f3',
  Transport: '#22d3ee',
  Entertainment: '#a78bfa',
  Healthcare: '#34d399',
  Shopping: '#fbbf24',
  Utilities: '#f87171',
  Education: '#fb923c',
  Finance: '#60a5fa',
  Travel: '#e879f9',
  Other: '#94a3b8',
}

// ── Stat Card Component ────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, trend, color = 'blue', loading }) {
  const colorMap = {
    blue: 'text-brand-400',
    green: 'text-green-400',
    amber: 'text-amber-400',
    red: 'text-red-400',
  }

  if (loading) {
    return (
      <div className="stat-card">
        <div className="skeleton h-4 w-24 mb-3 bg-surface-700" />
        <div className="skeleton h-8 w-32 bg-surface-700" />
      </div>
    )
  }

  return (
    <motion.div variants={itemVariants} className="stat-card glass-card-hover">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl bg-surface-700 flex items-center justify-center ${colorMap[color]}`}>
          <Icon size={20} />
        </div>
        {trend !== undefined && (
          <span className={`text-xs font-medium ${trend >= 0 ? 'text-amber-400' : 'text-green-400'}`}>
            {trend >= 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <p className="text-2xl font-display font-bold text-white mb-1">{value}</p>
      <p className="text-sm text-slate-500">{label}</p>
    </motion.div>
  )
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [summary, setSummary] = useState(null)
  const [trends, setTrends] = useState([])
  const [categories, setCategories] = useState([])
  const [anomalies, setAnomalies] = useState([])
  const [insights, setInsights] = useState([])
  const [recentExpenses, setRecentExpenses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const [sum, trend, cats, anom, ins, recent] = await Promise.allSettled([
          analyticsApi.summary(1),
          analyticsApi.trends(6),
          analyticsApi.categories(1),
          analyticsApi.anomalies(5),
          analyticsApi.insights(),
          expenseApi.list({ limit: 8 }),
        ])

        if (sum.status === 'fulfilled') setSummary(sum.value)
        if (trend.status === 'fulfilled') setTrends(trend.value || [])
        if (cats.status === 'fulfilled') setCategories(cats.value || [])
        if (anom.status === 'fulfilled') setAnomalies(anom.value || [])
        if (ins.status === 'fulfilled') setInsights(ins.value?.insights || [])
        if (recent.status === 'fulfilled') setRecentExpenses(recent.value?.expenses || [])
      } catch (err) {
        console.error('Dashboard load error:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const formatCurrency = (n) => `$${(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center gap-2 mb-1">
          <Calendar size={14} className="text-slate-500" />
          <span className="text-sm text-slate-500">
            {format(new Date(), 'MMMM yyyy')}
          </span>
        </div>
        <h1 className="text-3xl font-display font-bold text-white">Financial Overview</h1>
        <p className="text-slate-500 mt-1">Your money at a glance</p>
      </motion.div>

      {/* ── Stat Cards ── */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8"
      >
        <StatCard
          label="Total Spent This Month"
          value={formatCurrency(summary?.total)}
          icon={DollarSign}
          color="blue"
          loading={loading}
        />
        <StatCard
          label="Transactions"
          value={summary?.count ?? 0}
          icon={ShoppingBag}
          color="green"
          loading={loading}
        />
        <StatCard
          label="Anomalies Detected"
          value={summary?.anomaly_count ?? 0}
          icon={AlertTriangle}
          color="amber"
          loading={loading}
        />
        <StatCard
          label="Daily Average"
          value={formatCurrency(summary?.avg_daily)}
          icon={TrendingUp}
          color="blue"
          loading={loading}
        />
      </motion.div>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
        {/* Monthly Trend Chart */}
        <motion.div
          variants={itemVariants}
          initial="hidden"
          animate="show"
          className="xl:col-span-2 glass-card p-6"
        >
          <h2 className="font-display font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-brand-400" />
            Monthly Spending Trend
          </h2>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trends} margin={{ left: -10 }}>
              <defs>
                <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#5567f3" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#5567f3" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false}
                tickFormatter={(v) => `$${v}`} />
              <Tooltip
                formatter={(v) => [`$${v.toFixed(2)}`, 'Total']}
                contentStyle={{ background: '#131c2e', border: '1px solid #1a2540', borderRadius: '12px' }}
              />
              <Area type="monotone" dataKey="total" stroke="#5567f3" strokeWidth={2}
                fill="url(#spendGrad)" dot={{ fill: '#5567f3', r: 3 }} activeDot={{ r: 5 }} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Category Pie Chart */}
        <motion.div
          variants={itemVariants}
          initial="hidden"
          animate="show"
          className="glass-card p-6"
        >
          <h2 className="font-display font-semibold text-white mb-4 flex items-center gap-2">
            <ShoppingBag size={16} className="text-brand-400" />
            By Category
          </h2>
          {categories.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={categories.slice(0, 6)}
                  cx="50%" cy="50%"
                  innerRadius={55} outerRadius={80}
                  dataKey="total"
                  nameKey="category"
                  paddingAngle={3}
                >
                  {categories.slice(0, 6).map((entry) => (
                    <Cell
                      key={entry.category}
                      fill={CATEGORY_COLORS[entry.category] || '#94a3b8'}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v, name) => [`$${v.toFixed(2)}`, name]}
                  contentStyle={{ background: '#131c2e', border: '1px solid #1a2540', borderRadius: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-slate-600 text-sm">
              No data yet — add some expenses!
            </div>
          )}
        </motion.div>
      </div>

      {/* ── Bottom Row ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Recent Expenses */}
        <motion.div
          variants={itemVariants}
          initial="hidden"
          animate="show"
          className="glass-card p-6"
        >
          <h2 className="font-display font-semibold text-white mb-4">Recent Expenses</h2>
          <div className="space-y-3">
            {recentExpenses.length === 0 ? (
              <p className="text-slate-500 text-sm">No expenses yet.</p>
            ) : (
              recentExpenses.map((expense) => (
                <div key={expense.id} className="flex items-center gap-3 py-2 border-b border-surface-700/50 last:border-0">
                  <div className="w-9 h-9 rounded-xl bg-surface-700 flex items-center justify-center text-base flex-shrink-0">
                    {getCategoryEmoji(expense.category)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate">
                      {expense.merchant || 'Unknown'}
                    </p>
                    <p className="text-xs text-slate-500">{expense.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-white">${expense.amount.toFixed(2)}</p>
                    {expense.is_anomaly && (
                      <span className="text-xs text-amber-400">⚠ anomaly</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Insights */}
        <motion.div
          variants={itemVariants}
          initial="hidden"
          animate="show"
          className="glass-card p-6"
        >
          <h2 className="font-display font-semibold text-white mb-4 flex items-center gap-2">
            <Zap size={16} className="text-brand-400" />
            Smart Insights
          </h2>
          <div className="space-y-3">
            {insights.map((insight, i) => (
              <div key={i} className="flex gap-3 p-3 rounded-xl bg-surface-800/50 border border-surface-700/50">
                <p className="text-sm text-slate-300 leading-relaxed">{insight}</p>
              </div>
            ))}
            {insights.length === 0 && (
              <p className="text-slate-500 text-sm">Add more expenses to get personalized insights.</p>
            )}
          </div>

          {/* Anomaly Alerts */}
          {anomalies.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-amber-400 mb-2 flex items-center gap-1">
                <AlertTriangle size={14} /> Anomaly Alerts
              </h3>
              {anomalies.slice(0, 3).map((a, i) => (
                <div key={i} className="flex items-center gap-2 py-2 text-sm">
                  <span className="text-amber-400">⚠</span>
                  <span className="text-slate-400">
                    Unusual {a.category} expense: <span className="text-white font-medium">${a.amount}</span>
                    {a.merchant ? ` at ${a.merchant}` : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}

function getCategoryEmoji(category) {
  const map = {
    Food: '🍔', Transport: '🚗', Entertainment: '🎬',
    Healthcare: '💊', Shopping: '🛍️', Utilities: '⚡',
    Education: '📚', Finance: '💰', Travel: '✈️', Other: '📝',
  }
  return map[category] || '💳'
}
