import { motion } from 'framer-motion'
import { Sparkles, TrendingUp, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const SEVERITY_CONFIG = {
  success: { color: 'var(--color-brand)', icon: CheckCircle2, bg: 'rgba(0,255,221,0.07)', border: 'rgba(0,255,221,0.18)' },
  warning: { color: 'var(--color-warning)', icon: AlertTriangle, bg: 'rgba(255,194,71,0.07)', border: 'rgba(255,194,71,0.2)' },
  info:    { color: 'var(--color-info)', icon: Info, bg: 'rgba(77,163,255,0.07)', border: 'rgba(77,163,255,0.2)' },
  alert:   { color: 'var(--color-danger)', icon: AlertTriangle, bg: 'rgba(255,90,107,0.07)', border: 'rgba(255,90,107,0.2)' },
}

export default function InsightsPanel({ insights, importedCount, onDismiss, onImportAnother }) {
  const navigate = useNavigate()

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
    >
      {/* Success header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={{
          textAlign: 'center',
          padding: '2.5rem 2rem',
          background: 'var(--bg-surface)',
          border: '1px solid rgba(0,255,221,0.15)',
          borderRadius: 'var(--radius-xl)',
          marginBottom: '1.5rem',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 300, damping: 20 }}
          style={{
            width: 64,
            height: 64,
            borderRadius: 20,
            background: 'rgba(0,255,221,0.12)',
            border: '1.5px solid rgba(0,255,221,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}
        >
          <CheckCircle2 size={28} style={{ color: 'var(--color-brand)' }} />
        </motion.div>

        <div style={{
          fontFamily: 'Clash Display, sans-serif',
          fontSize: '1.5rem',
          fontWeight: 700,
          color: 'var(--text-primary)',
          marginBottom: 6,
        }}>
          {importedCount} Transaction{importedCount !== 1 ? 's' : ''} Imported
        </div>
        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Your data has been added to SpendWise
        </div>
      </motion.div>

      {/* AI Insights */}
      {insights && insights.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-xl)',
            overflow: 'hidden',
            marginBottom: '1.5rem',
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border-subtle)',
          }}>
            <div style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: 'rgba(0,255,221,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Sparkles size={16} style={{ color: 'var(--color-brand)' }} />
            </div>
            <div>
              <div style={{ fontFamily: 'Clash Display, sans-serif', fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                AI Import Insights
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                Generated from your imported data
              </div>
            </div>
          </div>

          <div style={{ padding: '1rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            {insights.map((insight, i) => {
              const cfg = SEVERITY_CONFIG[insight.severity] || SEVERITY_CONFIG.info
              const IconComp = cfg.icon
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.35 + i * 0.08 }}
                  style={{
                    display: 'flex',
                    gap: 12,
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: cfg.bg,
                    border: `1px solid ${cfg.border}`,
                    borderLeft: `3px solid ${cfg.color}`,
                  }}
                >
                  <IconComp size={16} style={{ color: cfg.color, flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <div style={{ fontSize: '0.8375rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 3 }}>
                      {insight.title}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      {insight.body}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </motion.div>
      )}

      {/* Action buttons */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        style={{ display: 'flex', gap: 12, justifyContent: 'center' }}
      >
        <button
          className="btn-primary"
          onClick={() => navigate('/expenses')}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            height: 36, padding: '0 18px', borderRadius: 9,
            fontSize: '0.875rem',
          }}
        >
          <TrendingUp size={15} />
          View Expenses
        </button>
        <button
          className="btn-ghost"
          onClick={onImportAnother}
          style={{
            display: 'flex', alignItems: 'center',
            height: 36, padding: '0 16px', borderRadius: 9,
            fontSize: '0.875rem',
          }}
        >
          Import Another File
        </button>
      </motion.div>
    </motion.div>
  )
}
