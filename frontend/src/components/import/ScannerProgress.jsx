import { motion, AnimatePresence } from 'framer-motion'
import { Check, X } from 'lucide-react'

export default function ScannerProgress({ steps, currentMessage }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-xl)',
        padding: '2.5rem',
        maxWidth: 480,
        margin: '0 auto',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{
          fontFamily: 'Clash Display, sans-serif',
          fontSize: '1.25rem',
          fontWeight: 700,
          color: 'var(--text-primary)',
          marginBottom: 6,
        }}>
          Scanning your file
        </div>
        <div style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>
          AI-powered extraction in progress
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {steps.map((step, idx) => {
          const isLast = idx === steps.length - 1
          const isDone = step.status === 'done'
          const isActive = step.status === 'active'
          const isError = step.status === 'error'
          const isPending = step.status === 'pending'

          return (
            <div key={step.id} style={{ display: 'flex', gap: 16 }}>
              {/* Indicator column */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ position: 'relative', width: 28, height: 28, flexShrink: 0 }}>
                  {isActive && (
                    <motion.div
                      animate={{ scale: [1, 1.5, 1], opacity: [0.4, 0, 0.4] }}
                      transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                      style={{
                        position: 'absolute',
                        inset: -4,
                        borderRadius: '50%',
                        background: 'rgba(0,255,221,0.25)',
                      }}
                    />
                  )}
                  <motion.div
                    animate={{
                      background: isDone
                        ? 'var(--color-brand)'
                        : isActive
                        ? 'rgba(0,255,221,0.15)'
                        : isError
                        ? 'rgba(255,90,107,0.15)'
                        : 'var(--bg-elevated)',
                      borderColor: isDone
                        ? 'var(--color-brand)'
                        : isActive
                        ? 'var(--color-brand)'
                        : isError
                        ? 'var(--color-danger)'
                        : 'var(--border-default)',
                    }}
                    transition={{ duration: 0.3 }}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      border: '2px solid',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {isDone && <Check size={13} strokeWidth={2.5} style={{ color: 'var(--text-inverse)' }} />}
                    {isActive && (
                      <motion.div
                        animate={{ scale: [0.8, 1.1, 0.8] }}
                        transition={{ duration: 1, repeat: Infinity }}
                        style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-brand)' }}
                      />
                    )}
                    {isError && <X size={13} strokeWidth={2.5} style={{ color: 'var(--color-danger)' }} />}
                    {isPending && (
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text-tertiary)' }} />
                    )}
                  </motion.div>
                </div>

                {!isLast && (
                  <motion.div
                    animate={{ background: isDone ? 'var(--color-brand)' : 'var(--border-subtle)' }}
                    transition={{ duration: 0.4 }}
                    style={{ width: 2, flex: 1, minHeight: 20, margin: '4px 0', borderRadius: 9999 }}
                  />
                )}
              </div>

              {/* Label */}
              <div style={{ paddingBottom: isLast ? 0 : 20, paddingTop: 4 }}>
                <motion.span
                  animate={{
                    color: isDone
                      ? 'var(--text-primary)'
                      : isActive
                      ? 'var(--color-brand)'
                      : isError
                      ? 'var(--color-danger)'
                      : 'var(--text-tertiary)',
                    fontWeight: isActive || isDone ? 600 : 450,
                  }}
                  transition={{ duration: 0.2 }}
                  style={{ fontSize: '0.875rem', fontFamily: 'General Sans, sans-serif' }}
                >
                  {step.label}
                </motion.span>
              </div>
            </div>
          )
        })}
      </div>

      <AnimatePresence mode="wait">
        {currentMessage && (
          <motion.div
            key={currentMessage}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
            style={{
              marginTop: '1.5rem',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(0,255,221,0.06)',
              border: '1px solid rgba(0,255,221,0.12)',
              fontSize: '0.8125rem',
              color: 'var(--color-brand)',
              textAlign: 'center',
            }}
          >
            {currentMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
