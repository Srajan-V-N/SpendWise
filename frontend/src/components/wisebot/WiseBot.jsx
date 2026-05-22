import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send, RotateCcw } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import ReactMarkdown from 'react-markdown'
import api from '../../api/axios'
import { useLocation } from 'react-router-dom'

const QUICK_PROMPTS = [
  "How's my spending this month?",
  "Where can I save money?",
  "Am I on track with my goals?",
  "Analyze my top expenses",
]

const PAGE_MAP = {
  '/dashboard': 'dashboard',
  '/expenses': 'expenses',
  '/budgets': 'budgets',
  '/goals': 'goals',
  '/reports': 'reports',
  '/subscriptions': 'subscriptions',
}

export default function WiseBot() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sessionKey] = useState(() => Math.random().toString(36).slice(2))
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const location = useLocation()

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      inputRef.current?.focus()
    }
  }, [messages, open])

  const mutation = useMutation({
    mutationFn: (msg) => api.post('/wisebot/chat', {
      message: msg,
      session_key: sessionKey,
      context_page: PAGE_MAP[location.pathname] || 'general',
    }),
    onSuccess: (res) => {
      const { reply, suggestions } = res.data.data
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: reply,
        suggestions,
      }])
    },
    onError: (error) => {
      const code = error.response?.data?.error_code
      const msg = code === 'rate_limit'
        ? "I'm getting a lot of requests right now — please try again in a moment."
        : error.response?.data?.error || "I'm having trouble connecting right now. Please try again in a moment."
      setMessages(prev => [...prev, { role: 'assistant', content: msg }])
    },
  })

  const sendMessage = (text) => {
    const msg = text || input.trim()
    if (!msg || mutation.isPending) return

    setMessages(prev => [...prev, { role: 'user', content: msg }])
    setInput('')
    mutation.mutate(msg)
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const clearChat = () => {
    setMessages([])
  }

  return (
    <>
      {/* Floating button */}
      <AnimatePresence>
        {!open && (
          <motion.button
            className="wisebot-bubble"
            onClick={() => setOpen(true)}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            title="Chat with WiseBot"
          >
            <div style={{ position: 'relative', width: '100%', height: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{
                fontFamily: 'Clash Display, sans-serif', fontWeight: 700,
                fontSize: 17, color: '#001A14', lineHeight: 1, letterSpacing: '-0.02em',
              }}>WB</span>
              <span style={{ position: 'absolute', top: 10, right: 10, fontSize: 10, color: '#001A14', lineHeight: 1 }}>✦</span>
              <span style={{ position: 'absolute', bottom: 10, left: 10, fontSize: 9,  color: '#001A14', lineHeight: 1 }}>✦</span>
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Drawer */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="wisebot-drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
          >
            {/* Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex', alignItems: 'center', gap: 12,
              background: 'var(--bg-elevated)',
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: '50%',
                background: 'var(--gradient-brand)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <span style={{
                  fontFamily: 'Clash Display, sans-serif', fontWeight: 700,
                  fontSize: 13, color: '#001A14', lineHeight: 1, letterSpacing: '-0.02em',
                }}>WB</span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'Clash Display, sans-serif', fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
                  WiseBot
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                  Your AI finance advisor
                </div>
              </div>
              <button onClick={clearChat} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 6, borderRadius: 6 }} title="Clear chat">
                <RotateCcw size={15} />
              </button>
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 6, borderRadius: 6 }}>
                <X size={18} />
              </button>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 8px' }}>
              {messages.length === 0 && (
                <WelcomeState onPrompt={sendMessage} />
              )}

              {messages.map((msg, i) => (
                <MessageBubble key={i} msg={msg} onSuggestion={sendMessage} />
              ))}

              {mutation.isPending && <TypingIndicator />}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div style={{
              padding: '12px 16px',
              borderTop: '1px solid var(--border-subtle)',
              background: 'var(--bg-surface)',
            }}>
              <div style={{
                display: 'flex', gap: 8, alignItems: 'flex-end',
                background: 'var(--bg-elevated)', borderRadius: 14,
                border: '1px solid var(--border-default)',
                padding: '8px 12px',
              }}>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Ask WiseBot anything..."
                  rows={1}
                  style={{
                    flex: 1, resize: 'none', background: 'transparent', border: 'none',
                    color: 'var(--text-primary)', fontFamily: 'General Sans, sans-serif',
                    fontSize: '0.875rem', outline: 'none', maxHeight: 100, overflowY: 'auto',
                  }}
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || mutation.isPending}
                  style={{
                    width: 34, height: 34, borderRadius: 10,
                    background: input.trim() ? 'var(--gradient-brand)' : 'var(--border-subtle)',
                    border: 'none', cursor: input.trim() ? 'pointer' : 'not-allowed',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: input.trim() ? '#001A14' : 'var(--text-tertiary)',
                    transition: 'all 0.15s', flexShrink: 0,
                  }}
                >
                  <Send size={15} />
                </button>
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)', textAlign: 'center', marginTop: 6 }}>
                Powered by Gemini AI · Not financial advice
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

function WelcomeState({ onPrompt }) {
  return (
    <div style={{ textAlign: 'center', padding: '1rem 0 1.5rem' }}>
      <div style={{ position: 'relative', display: 'inline-block', margin: '0 auto 8px', textAlign: 'center' }}>
        <span style={{
          fontFamily: 'Clash Display, sans-serif', fontWeight: 700,
          fontSize: 34, color: 'var(--color-brand)',
          display: 'block', lineHeight: 1, letterSpacing: '-0.03em',
        }}>WB</span>
        <span style={{ position: 'absolute', top: 0,  right: -13, fontSize: 12, color: 'var(--color-brand)', lineHeight: 1 }}>✦</span>
        <span style={{ position: 'absolute', bottom: 0, left: -11,  fontSize: 10, color: 'var(--color-brand)', lineHeight: 1 }}>✦</span>
      </div>
      <div style={{ fontFamily: 'Clash Display, sans-serif', fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
        Hi! I'm WiseBot
      </div>
      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.5 }}>
        Your personal AI finance advisor. Ask me anything about your money.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {QUICK_PROMPTS.map(p => (
          <button
            key={p}
            onClick={() => onPrompt(p)}
            style={{
              background: 'var(--color-brand-subtle)', border: '1px solid var(--border-medium)',
              borderRadius: 10, padding: '9px 14px', cursor: 'pointer',
              color: 'var(--color-brand)', fontSize: '0.8rem', fontFamily: 'General Sans, sans-serif',
              fontWeight: 500, textAlign: 'left', transition: 'all 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--color-brand-glow)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--color-brand-subtle)'}
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  )
}

function MessageBubble({ msg, onSuggestion }) {
  const isUser = msg.role === 'user'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      style={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        marginBottom: 14,
      }}
    >
      <div style={{ maxWidth: '85%' }}>
        <div style={{
          padding: '10px 14px',
          borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
          background: isUser ? 'var(--gradient-brand)' : 'var(--bg-elevated)',
          color: isUser ? '#001A14' : 'var(--text-primary)',
          border: isUser ? 'none' : '1px solid var(--border-subtle)',
          fontSize: '0.8375rem',
          fontFamily: 'General Sans, sans-serif',
          lineHeight: 1.55,
        }}>
          {isUser ? msg.content : (
            <div className="prose-sm" style={{ lineHeight: 1.6 }}>
              <ReactMarkdown
                components={{
                  p: ({ children }) => <p style={{ margin: '0 0 8px' }}>{children}</p>,
                  strong: ({ children }) => <strong style={{ color: 'var(--color-brand)', fontWeight: 700 }}>{children}</strong>,
                  ul: ({ children }) => <ul style={{ paddingLeft: 16, margin: '6px 0' }}>{children}</ul>,
                  li: ({ children }) => <li style={{ marginBottom: 3 }}>{children}</li>,
                  code: ({ children }) => <code style={{ background: 'var(--border-subtle)', padding: '1px 4px', borderRadius: 4, fontSize: '0.8em' }}>{children}</code>,
                }}
              >
                {msg.content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {!isUser && msg.suggestions && msg.suggestions.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {msg.suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => onSuggestion(s)}
                style={{
                  background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
                  borderRadius: 20, padding: '4px 12px', cursor: 'pointer',
                  color: 'var(--text-secondary)', fontSize: '0.7375rem',
                  fontFamily: 'General Sans, sans-serif', transition: 'all 0.12s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-brand)'; e.currentTarget.style.color = 'var(--color-brand)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}

function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 14 }}
    >
      <div style={{
        padding: '12px 16px', borderRadius: '14px 14px 14px 4px',
        background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
        display: 'flex', alignItems: 'center', gap: 5,
      }}>
        {[0, 0.15, 0.3].map((delay, i) => (
          <motion.div
            key={i}
            style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--color-brand)' }}
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 0.7, repeat: Infinity, delay }}
          />
        ))}
      </div>
    </motion.div>
  )
}
