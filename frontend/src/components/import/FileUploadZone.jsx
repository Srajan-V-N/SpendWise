import { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { UploadCloud, FileText, Table2, Image, AlertCircle } from 'lucide-react'

const FILE_TYPES = [
  { label: 'IMAGE', icon: Image, color: '#00FFDD', exts: ['PNG', 'JPG', 'JPEG', 'WEBP'] },
  { label: 'PDF', icon: FileText, color: '#4DA3FF', exts: ['PDF'] },
  { label: 'SPREADSHEET', icon: Table2, color: '#A78BFA', exts: ['CSV', 'XLSX'] },
]

const ACCEPT = '.csv,.xlsx,.xls,.pdf,.png,.jpg,.jpeg,.webp'

export default function FileUploadZone({ onFileSelected, isLoading, error }) {
  const inputRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) onFileSelected(file)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragging(false)
    }
  }

  const handleChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      onFileSelected(file)
      e.target.value = ''
    }
  }

  return (
    <div>
      <motion.div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !isLoading && inputRef.current?.click()}
        animate={{
          borderColor: isDragging
            ? 'rgba(0, 255, 221, 0.7)'
            : isLoading
            ? 'rgba(0, 255, 221, 0.3)'
            : 'rgba(255, 255, 255, 0.10)',
          background: isDragging
            ? 'rgba(0, 255, 221, 0.06)'
            : 'var(--bg-surface)',
          boxShadow: isDragging
            ? '0 0 40px rgba(0, 255, 221, 0.15), inset 0 0 30px rgba(0, 255, 221, 0.04)'
            : 'none',
        }}
        transition={{ duration: 0.2 }}
        style={{
          border: '2px dashed rgba(255,255,255,0.10)',
          borderRadius: 'var(--radius-xl)',
          padding: '3.5rem 2rem',
          cursor: isLoading ? 'default' : 'pointer',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
          userSelect: 'none',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          style={{ display: 'none' }}
          onChange={handleChange}
        />

        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: '50%',
                  border: '3px solid rgba(0,255,221,0.15)',
                  borderTopColor: 'var(--color-brand)',
                }}
              />
              <div>
                <div style={{ fontFamily: 'Clash Display, sans-serif', fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                  Uploading & Scanning
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>
                  Our AI is analyzing your file...
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}
            >
              <motion.div
                animate={isDragging ? { scale: 1.1, y: -4 } : { scale: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 20,
                  background: 'rgba(0,255,221,0.08)',
                  border: '1.5px solid rgba(0,255,221,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: isDragging ? '0 0 28px rgba(0,255,221,0.2)' : 'none',
                  transition: 'box-shadow 0.2s',
                }}
              >
                <UploadCloud size={32} style={{ color: 'var(--color-brand)' }} />
              </motion.div>

              <div>
                <div style={{ fontFamily: 'Clash Display, sans-serif', fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
                  {isDragging ? 'Release to scan' : 'Drop your file here'}
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: 4 }}>
                  or <span style={{ color: 'var(--color-brand)', fontWeight: 600 }}>click to browse</span> from your device
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                  Screenshots · PDFs · Bank statements · CSV · Excel · UPI exports
                </div>
              </div>

              {/* File type badges */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 4 }}>
                {FILE_TYPES.map(ft => (
                  <div
                    key={ft.label}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '4px 10px',
                      borderRadius: 20,
                      background: `${ft.color}12`,
                      border: `1px solid ${ft.color}28`,
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                      color: ft.color,
                      letterSpacing: '0.04em',
                    }}
                  >
                    <ft.icon size={11} />
                    {ft.exts.join(' · ')}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginTop: 12,
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(255,90,107,0.08)',
              border: '1px solid rgba(255,90,107,0.2)',
              color: 'var(--color-danger)',
              fontSize: '0.8125rem',
            }}
          >
            <AlertCircle size={15} />
            {error}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
