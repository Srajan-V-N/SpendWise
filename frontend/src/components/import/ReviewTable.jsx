import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react'

function ConfidenceBadge({ value }) {
  const pct = Math.round(value * 100)
  let cls = 'badge-success'
  if (pct < 65) cls = 'badge-danger'
  else if (pct < 85) cls = 'badge-warning'
  return (
    <span className={cls} style={{ fontSize: '0.6875rem', padding: '2px 7px' }}>
      {pct}%
    </span>
  )
}

function TypeToggle({ value, onChange }) {
  const isExpense = value === 'expense'
  return (
    <button
      onClick={() => onChange(isExpense ? 'income' : 'expense')}
      style={{
        padding: '3px 10px',
        borderRadius: 20,
        border: 'none',
        cursor: 'pointer',
        fontSize: '0.6875rem',
        fontWeight: 600,
        letterSpacing: '0.03em',
        background: isExpense ? 'rgba(255,90,107,0.12)' : 'rgba(0,255,221,0.1)',
        color: isExpense ? 'var(--color-danger)' : 'var(--color-brand)',
        transition: 'all 0.15s',
      }}
    >
      {isExpense ? 'Expense' : 'Income'}
    </button>
  )
}

export default function ReviewTable({
  rows,
  categories,
  onRowChange,
  onSelectRow,
  onSelectAll,
  selectedRows,
  onConfirm,
  onCancel,
  isConfirming,
  jobStats,
}) {
  const [visibleCount, setVisibleCount] = useState(50)
  const allSelected = rows.length > 0 && rows.every(r => selectedRows.has(r.row))
  const someSelected = rows.some(r => selectedRows.has(r.row))
  const dupCount = rows.filter(r => r.is_duplicate).length
  const selectedCount = selectedRows.size

  const expenseCategories = useMemo(() =>
    (categories || []).filter(c => c.type === 'expense' || c.type === 'both'),
    [categories]
  )
  const incomeCategories = useMemo(() =>
    (categories || []).filter(c => c.type === 'income' || c.type === 'both'),
    [categories]
  )

  const visibleRows = rows.slice(0, visibleCount)

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div>
          <div style={{ fontFamily: 'Clash Display, sans-serif', fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Review Transactions
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: 2 }}>
            {jobStats.total_rows} found · {dupCount} duplicates · Select rows to import
          </div>
        </div>

        {dupCount > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 12px',
            borderRadius: 20,
            background: 'rgba(255,194,71,0.1)',
            border: '1px solid rgba(255,194,71,0.2)',
            fontSize: '0.75rem',
            color: 'var(--color-warning)',
            fontWeight: 600,
          }}>
            <AlertTriangle size={13} />
            {dupCount} duplicate{dupCount !== 1 ? 's' : ''} detected
          </div>
        )}
      </div>

      {/* Table */}
      <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 860 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>
                <th style={{ width: 40, padding: '11px 14px' }}>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={el => { if (el) el.indeterminate = someSelected && !allSelected }}
                    onChange={e => onSelectAll(e.target.checked)}
                    style={{ cursor: 'pointer', accentColor: 'var(--color-brand)', width: 15, height: 15 }}
                  />
                </th>
                {['Date', 'Title / Merchant', 'Category', 'Type', 'Amount', 'Confidence', 'Status'].map(h => (
                  <th key={h} style={{
                    padding: '11px 12px',
                    textAlign: 'left',
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    color: 'var(--text-tertiary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.07em',
                    whiteSpace: 'nowrap',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {visibleRows.map((row, idx) => {
                  const isSelected = selectedRows.has(row.row)
                  const isDup = row.is_duplicate
                  const cats = row.type === 'income' ? incomeCategories : expenseCategories
                  return (
                    <motion.tr
                      key={row.row}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: Math.min(idx * 0.018, 0.4) }}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        background: isDup
                          ? 'rgba(255,194,71,0.03)'
                          : isSelected
                          ? 'rgba(0,255,221,0.025)'
                          : 'transparent',
                        opacity: !isSelected ? 0.55 : 1,
                        transition: 'background 0.15s, opacity 0.15s',
                      }}
                    >
                      {/* Checkbox */}
                      <td style={{ padding: '9px 14px' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={e => onSelectRow(row.row, e.target.checked)}
                          style={{ cursor: 'pointer', accentColor: 'var(--color-brand)', width: 15, height: 15 }}
                        />
                      </td>

                      {/* Date */}
                      <td style={{ padding: '9px 12px', fontSize: '0.75rem', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
                        {row.date}
                      </td>

                      {/* Title / Merchant */}
                      <td style={{ padding: '9px 12px', minWidth: 200 }}>
                        <input
                          defaultValue={row.title}
                          onBlur={e => onRowChange(row.row, 'title', e.target.value)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            outline: 'none',
                            color: 'var(--text-primary)',
                            fontSize: '0.8125rem',
                            fontWeight: 500,
                            width: '100%',
                            fontFamily: 'General Sans, sans-serif',
                          }}
                          onFocus={e => e.target.style.background = 'var(--bg-input)'}
                        />
                        {row.merchant && row.merchant !== row.title && (
                          <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', marginTop: 1 }}>
                            {row.merchant}
                          </div>
                        )}
                      </td>

                      {/* Category */}
                      <td style={{ padding: '9px 12px' }}>
                        <select
                          value={row.suggested_category_id || ''}
                          onChange={e => onRowChange(row.row, 'suggested_category_id', e.target.value ? parseInt(e.target.value) : null)}
                          style={{
                            background: 'var(--bg-input)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 8,
                            color: 'var(--text-primary)',
                            fontSize: '0.75rem',
                            padding: '4px 8px',
                            cursor: 'pointer',
                            fontFamily: 'General Sans, sans-serif',
                            maxWidth: 160,
                          }}
                        >
                          <option value="">— None —</option>
                          {cats.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </td>

                      {/* Type */}
                      <td style={{ padding: '9px 12px' }}>
                        <TypeToggle
                          value={row.type}
                          onChange={val => onRowChange(row.row, 'type', val)}
                        />
                      </td>

                      {/* Amount */}
                      <td style={{ padding: '9px 12px', whiteSpace: 'nowrap' }}>
                        <span style={{
                          fontFamily: 'Clash Display, sans-serif',
                          fontSize: '0.9rem',
                          fontWeight: 700,
                          color: row.type === 'income' ? 'var(--color-brand)' : 'var(--text-primary)',
                        }}>
                          ₹{Number(row.amount).toLocaleString('en-IN')}
                        </span>
                      </td>

                      {/* Confidence */}
                      <td style={{ padding: '9px 12px' }}>
                        <ConfidenceBadge value={row.confidence} />
                      </td>

                      {/* Status */}
                      <td style={{ padding: '9px 12px' }}>
                        {isDup ? (
                          <span className="badge-warning" style={{ fontSize: '0.6875rem', display: 'flex', alignItems: 'center', gap: 4, width: 'fit-content', padding: '2px 8px' }}>
                            <AlertTriangle size={10} /> Duplicate
                          </span>
                        ) : isSelected ? (
                          <span className="badge-success" style={{ fontSize: '0.6875rem', display: 'flex', alignItems: 'center', gap: 4, width: 'fit-content', padding: '2px 8px' }}>
                            <CheckCircle2 size={10} /> Import
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', padding: '2px 8px' }}>
                            Skip
                          </span>
                        )}
                      </td>
                    </motion.tr>
                  )
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {rows.length > visibleCount && (
          <div style={{ padding: '12px 16px', textAlign: 'center', borderTop: '1px solid var(--border-subtle)' }}>
            <button
              onClick={() => setVisibleCount(v => v + 50)}
              className="btn-ghost"
              style={{ fontSize: '0.8125rem', gap: 6, display: 'inline-flex', alignItems: 'center' }}
            >
              <ChevronDown size={14} />
              Show more ({rows.length - visibleCount} remaining)
            </button>
          </div>
        )}
      </div>

      {/* Footer action bar */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: '1rem',
          padding: '14px 20px',
          borderRadius: 'var(--radius-lg)',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{selectedCount}</span> selected
          {dupCount > 0 && (
            <span style={{ marginLeft: 8, color: 'var(--color-warning)' }}>
              · {dupCount} duplicates (unselected by default)
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn-ghost"
            onClick={onCancel}
            style={{
              display: 'flex', alignItems: 'center',
              height: 36, padding: '0 16px',
              fontSize: '0.875rem', borderRadius: 9,
            }}
          >
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={onConfirm}
            disabled={isConfirming || selectedCount === 0}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              height: 36, padding: '0 18px',
              fontSize: '0.875rem', borderRadius: 9,
              opacity: selectedCount === 0 ? 0.5 : 1,
            }}
          >
            {isConfirming ? (
              <>
                <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                Importing...
              </>
            ) : (
              `Import ${selectedCount} Transaction${selectedCount !== 1 ? 's' : ''}`
            )}
          </button>
        </div>
      </motion.div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </motion.div>
  )
}
