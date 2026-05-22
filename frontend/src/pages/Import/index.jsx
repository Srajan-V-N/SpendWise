import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

import api from '../../api/axios'
import FileUploadZone from '../../components/import/FileUploadZone'
import ScannerProgress from '../../components/import/ScannerProgress'
import ReviewTable from '../../components/import/ReviewTable'
import InsightsPanel from '../../components/import/InsightsPanel'
import ImportHistory from '../../components/import/ImportHistory'

const SCAN_STEPS = [
  { id: 'upload',      label: 'Uploading file' },
  { id: 'detect',      label: 'Detecting file type' },
  { id: 'parse',       label: 'Extracting transactions' },
  { id: 'categorize',  label: 'Auto-categorizing' },
  { id: 'dedup',       label: 'Checking duplicates' },
  { id: 'complete',    label: 'Scan complete' },
]

function resetSteps() {
  return SCAN_STEPS.map(s => ({ ...s, status: 'pending' }))
}

async function animateSteps(setScanSteps, setCurrentMessage, messages) {
  for (let i = 0; i < SCAN_STEPS.length - 1; i++) {
    const stepId = SCAN_STEPS[i].id
    setScanSteps(prev => prev.map(s => s.id === stepId ? { ...s, status: 'active' } : s))
    if (messages[i]) setCurrentMessage(messages[i])
    await new Promise(r => setTimeout(r, 240))
    setScanSteps(prev => prev.map(s => s.id === stepId ? { ...s, status: 'done' } : s))
  }
  setScanSteps(prev => prev.map(s => s.id === 'complete' ? { ...s, status: 'active' } : s))
  await new Promise(r => setTimeout(r, 180))
  setScanSteps(prev => prev.map(s => s.id === 'complete' ? { ...s, status: 'done' } : s))
}

export default function ImportPage() {
  const qc = useQueryClient()
  const [phase, setPhase] = useState('idle')
  const [scanSteps, setScanSteps] = useState(resetSteps)
  const [currentMessage, setCurrentMessage] = useState('')
  const [jobData, setJobData] = useState(null)
  const [editedRows, setEditedRows] = useState([])
  const [selectedRows, setSelectedRows] = useState(new Set())
  const [insights, setInsights] = useState([])
  const [importedCount, setImportedCount] = useState(0)
  const [scanError, setScanError] = useState(null)

  const { data: historyData, isLoading: historyLoading, refetch: refetchHistory } = useQuery({
    queryKey: ['import-history'],
    queryFn: () => api.get('/imports').then(r => r.data.data),
  })

  const { data: catData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/expenses/categories').then(r => r.data.data.categories),
    staleTime: Infinity,
  })

  const categories = catData || []

  const scanMut = useMutation({
    mutationFn: (file) => {
      const fd = new FormData()
      fd.append('file', file)
      return api.post('/imports/scan', fd, { timeout: 90000 })
    },
    onMutate: () => {
      setScanError(null)
      setPhase('scanning')
      setScanSteps(resetSteps())
      setCurrentMessage('Sending file to AI scanner...')
    },
    onSuccess: async (res) => {
      const data = res.data.data
      const messages = [
        'File received successfully',
        `Detected: ${(data.file_type || '').toUpperCase()} file`,
        `Found ${data.total_rows} transaction${data.total_rows !== 1 ? 's' : ''}`,
        'Categories assigned automatically',
        `${data.duplicate_rows} duplicate${data.duplicate_rows !== 1 ? 's' : ''} flagged`,
      ]
      await animateSteps(setScanSteps, setCurrentMessage, messages)
      setCurrentMessage('')

      const rows = data.preview || []
      setJobData(data)
      setEditedRows(rows.map(r => ({ ...r })))
      const nonDups = new Set(rows.filter(r => !r.is_duplicate).map(r => r.row))
      setSelectedRows(nonDups)

      await new Promise(r => setTimeout(r, 300))
      setPhase('review')
    },
    onError: (e) => {
      setScanSteps(prev => prev.map(s => s.status === 'active' ? { ...s, status: 'error' } : s))
      const msg = e?.response?.data?.error || 'Scan failed. Please try another file.'
      setScanError(msg)
      toast.error(msg)
      setTimeout(() => setPhase('idle'), 400)
    },
  })

  const confirmMut = useMutation({
    mutationFn: ({ jobId, selectedRows, overrides }) =>
      api.post(`/imports/${jobId}/confirm`, {
        skip_duplicates: false,
        selected_rows: Array.from(selectedRows),
        overrides,
      }),
    onSuccess: (res) => {
      const data = res.data.data
      setInsights(data.insights || [])
      setImportedCount(data.imported)
      setPhase('insights')
      refetchHistory()
      qc.invalidateQueries({ queryKey: ['expenses'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success(`${data.imported} transaction${data.imported !== 1 ? 's' : ''} imported!`)
    },
    onError: (e) => {
      toast.error(e?.response?.data?.error || 'Import failed. Please try again.')
    },
  })

  const handleRowChange = useCallback((rowIdx, field, value) => {
    setEditedRows(prev => prev.map(r =>
      r.row === rowIdx ? { ...r, [field]: value } : r
    ))
  }, [])

  const handleSelectRow = useCallback((rowIdx, selected) => {
    setSelectedRows(prev => {
      const next = new Set(prev)
      if (selected) next.add(rowIdx)
      else next.delete(rowIdx)
      return next
    })
  }, [])

  const handleSelectAll = useCallback((selected) => {
    if (selected) {
      setSelectedRows(new Set(editedRows.map(r => r.row)))
    } else {
      setSelectedRows(new Set())
    }
  }, [editedRows])

  const handleConfirm = () => {
    if (!jobData) return
    const overrides = editedRows
      .filter(r => selectedRows.has(r.row))
      .map(r => ({
        row: r.row,
        category_id: r.suggested_category_id,
        title: r.title,
        type: r.type,
      }))
    confirmMut.mutate({ jobId: jobData.job_id, selectedRows, overrides })
  }

  const handleReset = () => {
    setPhase('idle')
    setScanSteps(resetSteps())
    setCurrentMessage('')
    setJobData(null)
    setEditedRows([])
    setSelectedRows(new Set())
    setInsights([])
    setScanError(null)
  }

  return (
    <div style={{ padding: '1.5rem 2rem', minHeight: 'calc(100vh - var(--topbar-height, 64px))', maxWidth: 1200, margin: '0 auto' }}>
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: '2rem' }}
      >
        <div style={{ fontFamily: 'Clash Display, sans-serif', fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
          Smart Import & Scanner
        </div>
        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Upload screenshots, PDFs, bank statements or spreadsheets — our AI extracts transactions automatically.
        </div>
      </motion.div>

      {/* Main content */}
      <AnimatePresence mode="wait">
        {phase === 'idle' && (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ marginBottom: '2.5rem' }}
          >
            <FileUploadZone
              onFileSelected={file => scanMut.mutate(file)}
              isLoading={false}
              error={scanError}
            />

            {/* Supported sources hint */}
            <div style={{
              marginTop: '1.25rem',
              padding: '14px 18px',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '6px 16px',
              alignItems: 'center',
            }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Supported Sources:
              </span>
              {['Google Pay', 'PhonePe', 'Paytm', 'HDFC', 'ICICI', 'SBI', 'Amazon Pay', 'CRED', 'UPI Screenshots', 'SMS', 'Bank Statements'].map(s => (
                <span key={s} style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {s}
                </span>
              ))}
            </div>
          </motion.div>
        )}

        {phase === 'scanning' && (
          <motion.div
            key="scanning"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ marginBottom: '2.5rem' }}
          >
            <ScannerProgress steps={scanSteps} currentMessage={currentMessage} />
          </motion.div>
        )}

        {phase === 'review' && jobData && (
          <motion.div
            key="review"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ marginBottom: '2.5rem' }}
          >
            <ReviewTable
              rows={editedRows}
              categories={categories}
              onRowChange={handleRowChange}
              onSelectRow={handleSelectRow}
              onSelectAll={handleSelectAll}
              selectedRows={selectedRows}
              onConfirm={handleConfirm}
              onCancel={handleReset}
              isConfirming={confirmMut.isPending}
              jobStats={{ total_rows: jobData.total_rows, duplicate_rows: jobData.duplicate_rows }}
            />
          </motion.div>
        )}

        {phase === 'insights' && (
          <motion.div
            key="insights"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ marginBottom: '2.5rem', maxWidth: 640, margin: '0 auto 2.5rem' }}
          >
            <InsightsPanel
              insights={insights}
              importedCount={importedCount}
              onDismiss={handleReset}
              onImportAnother={handleReset}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Import History */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ fontFamily: 'Clash Display, sans-serif', fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Import History
          </div>
          {historyData?.imports?.length > 0 && (
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>
              {historyData.pagination?.total || 0} total import{historyData.pagination?.total !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        <ImportHistory
          imports={historyData?.imports || []}
          isLoading={historyLoading}
          onViewJob={null}
        />
      </motion.div>
    </div>
  )
}
