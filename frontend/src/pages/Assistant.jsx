/**
 * pages/Assistant.jsx
 * ---------------------
 * AI Financial Assistant chat interface.
 * 
 * Features:
 * - Conversational chat with the LangGraph AI agent
 * - Shows AI thinking steps (tool calls made)
 * - Quick action prompts
 * - Markdown-like formatting in responses
 * - Conversation history (within session)
 */

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Loader2, Bot, User, Zap, ChevronDown, AlertCircle } from 'lucide-react'
import { aiApi } from '@/services/api'

// ── Quick prompt suggestions ───────────────────────────────────────────────────
const QUICK_PROMPTS = [
  "Why did my expenses increase this month?",
  "Where am I overspending?",
  "Can I afford a $500 vacation next month?",
  "What subscriptions should I cancel?",
  "Give me a budget breakdown",
  "Show me unusual spending patterns",
]

// ── Message bubble ─────────────────────────────────────────────────────────────
function Message({ message, isLast }) {
  const isUser = message.role === 'user'
  const [showSteps, setShowSteps] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
    >
      {!isUser && (
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center flex-shrink-0 mt-1 shadow-lg shadow-brand-900/50">
          <Bot size={15} className="text-white" />
        </div>
      )}

      <div className={`max-w-2xl ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-2`}>
        {/* Message bubble */}
        <div className={isUser ? 'chat-bubble-user' : 'chat-bubble-ai'}>
          {/* Format AI response text with basic markdown */}
          <div className="whitespace-pre-wrap leading-relaxed">
            {formatResponse(message.content)}
          </div>
        </div>

        {/* AI thinking steps (collapsible) */}
        {!isUser && message.thinkingSteps && message.thinkingSteps.length > 0 && (
          <div className="w-full">
            <button
              onClick={() => setShowSteps(!showSteps)}
              className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-400 transition-colors"
            >
              <Zap size={11} />
              <span>{message.thinkingSteps.length} reasoning steps</span>
              <ChevronDown size={11} className={`transition-transform ${showSteps ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {showSteps && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mt-2 pl-3 border-l-2 border-surface-700 space-y-1"
                >
                  {message.thinkingSteps.map((step, i) => (
                    <p key={i} className="text-xs text-slate-600 font-mono">{step}</p>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Tools used */}
        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {message.sources.map((tool) => (
              <span key={tool} className="badge-blue text-xs">
                🔧 {tool}
              </span>
            ))}
          </div>
        )}
      </div>

      {isUser && (
        <div className="w-8 h-8 rounded-xl bg-surface-700 flex items-center justify-center flex-shrink-0 mt-1">
          <User size={15} className="text-slate-400" />
        </div>
      )}
    </motion.div>
  )
}

// ── Format AI response (basic markdown-like) ───────────────────────────────────
function formatResponse(text) {
  // Bold (**text**)
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="text-white font-semibold">{part.slice(2, -2)}</strong>
    }
    return <span key={i}>{part}</span>
  })
}

// ── Main Assistant Page ────────────────────────────────────────────────────────
export default function Assistant() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hi! I'm SmartSpent, your personal finance agent. I can analyze your spending, detect patterns, forecast expenses, and answer any questions about your finances.\n\nTry asking me something like: \"Where am I overspending?\" or \"Can I afford a vacation?\"",
      thinkingSteps: [],
      sources: [],
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (text) => {
    const messageText = text || input.trim()
    if (!messageText || loading) return

    setInput('')
    setError(null)

    // Add user message
    const userMessage = { role: 'user', content: messageText }
    setMessages((prev) => [...prev, userMessage])
    setLoading(true)

    // Build conversation history for the API
    const history = messages.map(({ role, content }) => ({ role, content }))

    try {
      const response = await aiApi.chat(messageText, history)

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: response.response,
          thinkingSteps: response.thinking_steps || [],
          sources: response.sources || [],
        },
      ])
    } catch (err) {
      setError(err.message || 'Failed to get AI response')
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: "⚠️ I couldn't connect to the AI. Please make sure Ollama is running:\n```\nollama serve\n```\nThen try again.",
          thinkingSteps: [],
          sources: [],
        },
      ])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="h-screen flex flex-col max-w-4xl mx-auto">
      {/* ── Header ── */}
      <div className="px-8 pt-8 pb-4 flex-shrink-0">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-lg shadow-brand-900/50">
            <Bot size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-white">SmartSpent</h1>
            <p className="text-sm text-slate-500">Your AI Finance Agent</p>
          </div>
        </div>
      </div>

      {/* ── Quick Prompts ── */}
      <div className="px-8 pb-4 flex-shrink-0">
        <div className="flex flex-wrap gap-2">
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              onClick={() => sendMessage(prompt)}
              disabled={loading}
              className="text-xs px-3 py-1.5 rounded-full border border-surface-600 text-slate-400 hover:border-brand-600/50 hover:text-brand-300 hover:bg-brand-600/5 transition-all disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-8 py-4">
        {messages.map((msg, i) => (
          <Message
            key={i}
            message={msg}
            isLast={i === messages.length - 1}
          />
        ))}

        {/* Loading indicator */}
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-3 mb-4"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center flex-shrink-0">
              <Bot size={15} className="text-white" />
            </div>
            <div className="chat-bubble-ai flex items-center gap-2 py-3">
              <Loader2 size={14} className="animate-spin text-brand-400" />
              <span className="text-sm text-slate-500">Analyzing your finances...</span>
            </div>
          </motion.div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 mb-4 text-sm text-red-300">
            <AlertCircle size={14} />
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Input Bar ── */}
      <div className="px-8 pb-8 flex-shrink-0">
        <div className="glass-card p-3 flex items-end gap-3">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your finances... (Enter to send, Shift+Enter for new line)"
            rows={1}
            className="flex-1 bg-transparent text-slate-100 placeholder-slate-600 text-sm resize-none focus:outline-none max-h-32 leading-relaxed py-1"
            style={{ height: 'auto' }}
            onInput={(e) => {
              e.target.style.height = 'auto'
              e.target.style.height = e.target.scrollHeight + 'px'
            }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            className="btn-primary flex-shrink-0 h-10 w-10 p-0 justify-center disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Send size={16} />
            )}
          </button>
        </div>
        <p className="text-xs text-slate-700 text-center mt-2">
          Responses generated locally by Ollama · Data never leaves your machine
        </p>
      </div>
    </div>
  )
}
