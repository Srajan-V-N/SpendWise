import { motion } from 'framer-motion'
import { FileText, Table2, Image, Upload, CheckCircle2, AlertCircle, Clock, Loader2 } from 'lucide-react'

const STATUS_CONFIG = {
  confirmed: { label: 'Imported', cls: 'badge-success', icon: CheckCircle2 },
  preview:   { label: 'Pending',  cls: 'badge-warning', icon: Clock },
  failed:    { label: 'Failed',   cls: 'badge-danger',  icon: AlertCircle },
  processing:{ label: 'Scanning', cls: 'badge-info',    icon: Loader2 },
  queued:    { label: 'Queued',   cls: 'badge-info',    icon: Clock },
}

const FILE_ICONS = {
  pdf:  { icon: FileText, color: '#4DA3FF' },
  csv:  { icon: Table2, color: '#A78BFA' },
  xlsx: { icon: Table2, color: '#A78BFA' },
  xls:  { icon: Table2, color: '#A78BFA' },
  png:  { icon: Image, color: '#00FFDD' },
  jpg:  { icon: Image, color: '#00FFDD' },
  jpeg: { icon: Image, color: '#00FFDD' },
  webp: { icon: Image, color: '#00FFDD' },
}

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function HistorySkeleton() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
      {[1, 2, 3].map(i => (
        <div key={i} className="card" style={{ padding: '1.25rem' }}>
          <div className="skeleton" style={{ width: '60%', height: 14, borderRadius: 6, marginBottom: 10 }} />
          <div className="skeleton" style={{ width: '40%', height: 12, borderRadius: 6, marginBottom: 16 }} />
          <div className="skeleton" style={{ width: '80%', height: 10, borderRadius: 6 }} />
        </div>
      ))}
    </div>
  )
}

export default function ImportHistory({ imports, isLoading, onViewJob }) {
  if (isLoading) return <HistorySkeleton />

  if (!imports || imports.length === 0) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '3rem 2rem',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-xl)',
        background: 'var(--bg-surface)',
      }}>
        <div style={{
          width: 52,
          height: 52,
          borderRadius: 16,
          background: 'rgba(0,255,221,0.07)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 14px',
        }}>
          <Upload size={24} style={{ color: 'var(--color-brand)', opacity: 0.6 }} />
        </div>
        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
          No imports yet
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
          Upload your first bank statement or screenshot above
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '1rem' }}>
      {imports.map((job, idx) => {
        const ext = (job.file_type || 'csv').toLowerCase()
        const fileInfo = FILE_ICONS[ext] || FILE_ICONS.csv
        const FileIcon = fileInfo.icon
        const statusCfg = STATUS_CONFIG[job.status] || STATUS_CONFIG.queued
        const StatusIcon = statusCfg.icon

        const fileName = job.file_name || 'Unknown file'
        const truncatedName = fileName.length > 32 ? fileName.slice(0, 29) + '...' : fileName

        return (
          <motion.div
            key={job.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            whileHover={{ y: -2 }}
            className="card"
            style={{ padding: '1.25rem', cursor: 'default' }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: `${fileInfo.color}12`,
                  border: `1px solid ${fileInfo.color}22`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <FileIcon size={18} style={{ color: fileInfo.color }} />
                </div>
                <div>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                    {truncatedName}
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', marginTop: 2 }}>
                    {timeAgo(job.created_at)}
                  </div>
                </div>
              </div>

              <span className={statusCfg.cls} style={{ fontSize: '0.6563rem', display: 'flex', alignItems: 'center', gap: 4, padding: '2px 8px', flexShrink: 0 }}>
                <StatusIcon size={9} />
                {statusCfg.label}
              </span>
            </div>

            {job.status !== 'failed' && job.total_rows != null && (
              <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', marginBottom: 2 }}>Total</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Clash Display, sans-serif' }}>
                    {job.total_rows}
                  </div>
                </div>
                {job.imported_rows != null && (
                  <div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', marginBottom: 2 }}>Imported</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-brand)', fontFamily: 'Clash Display, sans-serif' }}>
                      {job.imported_rows}
                    </div>
                  </div>
                )}
                {job.duplicate_rows != null && job.duplicate_rows > 0 && (
                  <div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', marginBottom: 2 }}>Skipped</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-warning)', fontFamily: 'Clash Display, sans-serif' }}>
                      {job.duplicate_rows}
                    </div>
                  </div>
                )}
              </div>
            )}

            {job.status === 'failed' && job.error_message && (
              <div style={{ fontSize: '0.75rem', color: 'var(--color-danger)', marginBottom: 10, opacity: 0.8 }}>
                {job.error_message.slice(0, 80)}
              </div>
            )}

            {onViewJob && job.status === 'preview' && (
              <button
                className="btn-ghost"
                onClick={() => onViewJob(job.id)}
                style={{ fontSize: '0.75rem', width: '100%', justifyContent: 'center', marginTop: 4 }}
              >
                Continue Review
              </button>
            )}
          </motion.div>
        )
      })}
    </div>
  )
}
