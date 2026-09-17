/**
 * pages/Expenses.jsx
 * -------------------
 * Full expense management: list, create, edit, delete, search.
 */

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Search, Trash2, Edit2, X, Check, Filter,
  AlertTriangle, ChevronDown, Loader2
} from 'lucide-react'
import { expenseApi } from '@/services/api'
import { format } from 'date-fns'

const CATEGORIES = [
  'Food', 'Transport', 'Entertainment', 'Healthcare',
  'Shopping', 'Utilities', 'Education', 'Finance', 'Travel', 'Other'
]

const CATEGORY_EMOJI = {
  Food: '🍔', Transport: '🚗', Entertainment: '🎬', Healthcare: '💊',
  Shopping: '🛍️', Utilities: '⚡', Education: '📚', Finance: '💰',
  Travel: '✈️', Other: '📝'
}

// ── Expense Form ───────────────────────────────────────────────────────────────
function ExpenseForm({ initial = {}, onSave, onCancel, saving }) {
  const [form, setForm] = useState({
    amount: initial.amount || '',
    category: initial.category || 'Other',
    merchant: initial.merchant || '',
    description: initial.description || '',
    currency: initial.currency || 'USD',
    date: initial.date
      ? format(new Date(initial.date), "yyyy-MM-dd'T'HH:mm")
      : format(new Date(), "yyyy-MM-dd'T'HH:mm"),
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave({
      ...form,
      amount: parseFloat(form.amount),
      date: new Date(form.date).toISOString(),
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Amount *</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            required
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            className="input-field"
            placeholder="0.00"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Category</label>
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="input-field"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{CATEGORY_EMOJI[c]} {c}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1.5">Merchant</label>
        <input
          type="text"
          value={form.merchant}
          onChange={(e) => setForm({ ...form, merchant: e.target.value })}
          className="input-field"
          placeholder="Starbucks, Uber, Netflix..."
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1.5">Description</label>
        <input
          type="text"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="input-field"
          placeholder="Optional note"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Date *</label>
          <input
            type="datetime-local"
            required
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            className="input-field"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Currency</label>
          <select
            value={form.currency}
            onChange={(e) => setForm({ ...form, currency: e.target.value })}
            className="input-field"
          >
            {['USD', 'EUR', 'GBP', 'JPY', 'CAD'].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          {initial.id ? 'Save Changes' : 'Add Expense'}
        </button>
        <button type="button" onClick={onCancel} className="btn-ghost">
          <X size={14} /> Cancel
        </button>
      </div>
    </form>
  )
}

// ── Main Expenses Page ─────────────────────────────────────────────────────────
export default function Expenses() {
  const [expenses, setExpenses] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  const loadExpenses = useCallback(async () => {
    setLoading(true)
    try {
      const result = await expenseApi.list({
        limit: 50,
        search: search || undefined,
        category: categoryFilter || undefined,
      })
      setExpenses(result.expenses || [])
      setTotal(result.total || 0)
    } catch (err) {
      console.error('Failed to load expenses:', err)
    } finally {
      setLoading(false)
    }
  }, [search, categoryFilter])

  useEffect(() => {
    const timer = setTimeout(loadExpenses, 300) // debounce search
    return () => clearTimeout(timer)
  }, [loadExpenses])

  const handleCreate = async (data) => {
    setSaving(true)
    try {
      await expenseApi.create(data)
      setShowAddForm(false)
      loadExpenses()
    } catch (err) {
      alert('Failed to create expense: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async (id, data) => {
    setSaving(true)
    try {
      await expenseApi.update(id, data)
      setEditingId(null)
      loadExpenses()
    } catch (err) {
      alert('Failed to update expense: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this expense?')) return
    setDeletingId(id)
    try {
      await expenseApi.delete(id)
      loadExpenses()
    } catch (err) {
      alert('Failed to delete: ' + err.message)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-3xl font-display font-bold text-white mb-1">Expenses</h1>
        <p className="text-slate-500">{total} total records</p>
      </motion.div>

      {/* ── Controls ── */}
      <div className="flex flex-wrap gap-4 mb-6">
        {/* Search */}
        <div className="relative flex-1 min-w-64">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search merchant, description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10"
          />
        </div>

        {/* Category filter */}
        <div className="relative">
          <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="input-field pl-9 pr-8 appearance-none cursor-pointer"
          >
            <option value="">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Add button */}
        <button onClick={() => setShowAddForm(true)} className="btn-primary">
          <Plus size={16} /> Add Expense
        </button>
      </div>

      {/* ── Add Form (modal-like inline) ── */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="glass-card p-6 mb-6"
          >
            <h2 className="font-display font-semibold text-white mb-4">New Expense</h2>
            <ExpenseForm
              onSave={handleCreate}
              onCancel={() => setShowAddForm(false)}
              saving={saving}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Expense List ── */}
      <div className="glass-card overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 px-6 py-3 border-b border-surface-700/50">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Merchant</span>
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Category</span>
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Date</span>
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider text-right">Amount</span>
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</span>
        </div>

        {loading ? (
          <div className="p-12 flex items-center justify-center">
            <Loader2 size={24} className="animate-spin text-brand-400" />
          </div>
        ) : expenses.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-slate-500">No expenses found.</p>
            <button onClick={() => setShowAddForm(true)} className="btn-primary mt-4 mx-auto">
              <Plus size={14} /> Add your first expense
            </button>
          </div>
        ) : (
          <div className="divide-y divide-surface-700/50">
            {expenses.map((expense) => (
              <div key={expense.id}>
                {editingId === expense.id ? (
                  // Inline edit form
                  <div className="p-6 bg-surface-800/50">
                    <ExpenseForm
                      initial={expense}
                      onSave={(data) => handleUpdate(expense.id, data)}
                      onCancel={() => setEditingId(null)}
                      saving={saving}
                    />
                  </div>
                ) : (
                  // Normal row
                  <motion.div
                    layout
                    className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 px-6 py-4 hover:bg-surface-800/30 transition-colors items-center"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{CATEGORY_EMOJI[expense.category] || '💳'}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-200 truncate">
                            {expense.merchant || 'Unknown'}
                          </p>
                          {expense.description && (
                            <p className="text-xs text-slate-500 truncate">{expense.description}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div>
                      <span className="badge-blue text-xs">{expense.category}</span>
                    </div>
                    <div>
                      <p className="text-sm text-slate-400">
                        {expense.date ? format(new Date(expense.date), 'MMM d, yyyy') : '—'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-white">
                        ${expense.amount.toFixed(2)}
                      </p>
                      {expense.is_anomaly && (
                        <div className="flex items-center justify-end gap-1 mt-0.5">
                          <AlertTriangle size={10} className="text-amber-400" />
                          <span className="text-xs text-amber-400">anomaly</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditingId(expense.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-brand-400 hover:bg-brand-600/10 transition-colors"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => handleDelete(expense.id)}
                        disabled={deletingId === expense.id}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-600/10 transition-colors disabled:opacity-50"
                      >
                        {deletingId === expense.id
                          ? <Loader2 size={13} className="animate-spin" />
                          : <Trash2 size={13} />}
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
