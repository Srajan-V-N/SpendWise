import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import {
  Plus, Search, Filter, Trash2, Edit2, Upload, X, Download,
  CreditCard, TrendingUp, Calendar, ChevronDown,
} from 'lucide-react'
import BrandLogo from '../../components/ui/BrandLogo'
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns'
import api from '../../api/axios'
import toast from 'react-hot-toast'
import Modal from '../../components/ui/Modal'
import { Input, Select } from '../../components/ui/Input'
import { KPICardSkeleton } from '../../components/ui/Skeleton'

const PAYMENT_METHODS = ['cash', 'card', 'upi', 'netbanking', 'wallet', 'other']

function fmt(n) { return `₹${Number(n || 0).toLocaleString('en-IN')}` }

export default function Expenses() {
  const qc = useQueryClient()
  const location = useLocation()
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'))
  const [page, setPage] = useState(1)
  const [addOpen, setAddOpen] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [importOpen, setImportOpen] = useState(false)
  const [importJob, setImportJob] = useState(null)
  const [form, setForm] = useState({ title: '', amount: '', type: 'expense', date: format(new Date(), 'yyyy-MM-dd'), category_id: '', payment_method: 'upi', merchant: '', note: '' })
  const [formErrors, setFormErrors] = useState({})

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.get('add') === 'true') { setAddOpen(true); window.history.replaceState({}, '', '/expenses') }
  }, [location.search])

  const { data: catData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/expenses/categories').then(r => r.data.data.categories),
    staleTime: Infinity,
  })
  const categories = catData || []

  const filters = { page, limit: 20, search, category_id: catFilter, type: typeFilter, start_date: startDate, end_date: endDate }
  const { data, isLoading } = useQuery({
    queryKey: ['expenses', filters],
    queryFn: () => api.get('/expenses', { params: filters }).then(r => r.data.data),
    keepPreviousData: true,
  })

  const { data: statsData } = useQuery({
    queryKey: ['expenses-stats', startDate, endDate],
    queryFn: () => api.get('/expenses/stats', { params: { start_date: startDate, end_date: endDate } }).then(r => r.data.data),
  })

  const expenses = data?.expenses || []
  const pagination = data?.pagination || {}
  const byCat = statsData?.by_category || []

  const createMut = useMutation({
    mutationFn: (d) => api.post('/expenses', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expenses'] }); qc.invalidateQueries({ queryKey: ['expenses-stats'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); setAddOpen(false); resetForm(); toast.success('Expense added!') },
    onError: (e) => toast.error(e?.response?.data?.error || 'Failed to add'),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, ...d }) => api.patch(`/expenses/${id}`, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expenses'] }); setEditItem(null); toast.success('Updated!') },
    onError: (e) => toast.error(e?.response?.data?.error || 'Failed to update'),
  })

  const deleteMut = useMutation({
    mutationFn: (id) => api.delete(`/expenses/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expenses'] }); qc.invalidateQueries({ queryKey: ['expenses-stats'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); toast.success('Deleted') },
    onError: () => toast.error('Failed to delete'),
  })

  const importMut = useMutation({
    mutationFn: (file) => { const fd = new FormData(); fd.append('file', file); return api.post('/expenses/import', fd, { headers: { 'Content-Type': 'multipart/form-data' } }) },
    onSuccess: (res) => { setImportJob(res.data.data); toast.success(`Parsed ${res.data.data.total_rows} rows`) },
    onError: (e) => toast.error(e?.response?.data?.error || 'Import failed'),
  })

  const confirmImportMut = useMutation({
    mutationFn: (jobId) => api.post(`/expenses/import/${jobId}/confirm`, { skip_duplicates: true }),
    onSuccess: (res) => {
      const { imported, skipped } = res.data.data
      toast.success(`Imported ${imported} transactions${skipped ? `, skipped ${skipped} duplicates` : ''}`)
      setImportOpen(false); setImportJob(null)
      qc.invalidateQueries({ queryKey: ['expenses'] })
    },
    onError: () => toast.error('Import confirmation failed'),
  })

  const resetForm = () => setForm({ title: '', amount: '', type: 'expense', date: format(new Date(), 'yyyy-MM-dd'), category_id: '', payment_method: 'upi', merchant: '', note: '' })

  const openEdit = (exp) => {
    setForm({
      title: exp.title, amount: exp.amount, type: exp.type,
      date: exp.date, category_id: exp.category?.id || '',
      payment_method: exp.payment_method, merchant: exp.merchant || '', note: exp.note || '',
    })
    setEditItem(exp)
  }

  const submitForm = () => {
    const errs = {}
    if (!form.title.trim()) errs.title = 'Title required'
    if (!form.amount || parseFloat(form.amount) <= 0) errs.amount = 'Valid amount required'
    if (Object.keys(errs).length) { setFormErrors(errs); return }
    setFormErrors({})
    const payload = { ...form, amount: parseFloat(form.amount), category_id: form.category_id || null }
    if (editItem) updateMut.mutate({ id: editItem.id, ...payload })
    else createMut.mutate(payload)
  }

  const totalExp = statsData?.by_category?.reduce((s, c) => s + c.total, 0) || 0
  const totalInc = expenses.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0)

  return (
    <div style={{ padding: '1.5rem 2rem', minHeight: 'calc(100vh - var(--topbar-height))' }}>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Spent', value: fmt(totalExp), icon: CreditCard, color: 'var(--color-danger)' },
          { label: 'Transactions', value: pagination.total || 0, icon: TrendingUp, color: 'var(--color-brand)', isNum: true },
          { label: 'Top Category', value: byCat[0]?.name || '—', icon: Filter, color: '#A78BFA' },
          { label: 'Avg / Transaction', value: pagination.total ? fmt(totalExp / pagination.total) : '₹0', icon: Calendar, color: 'var(--color-info)' },
        ].map(k => (
          <motion.div key={k.label} whileHover={{ y: -3 }} className="kpi-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k.label}</span>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: `${k.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <k.icon size={16} style={{ color: k.color }} />
              </div>
            </div>
            <div style={{ fontFamily: 'Clash Display, sans-serif', fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {k.isNum ? k.value.toLocaleString('en-IN') : k.value}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '1.5rem' }} className="exp-grid">

        {/* Table panel */}
        <div>
          {/* Toolbar */}
          <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1rem', display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 0 }}>
              <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
              <input
                className="input" placeholder="Search transactions..."
                value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
                style={{ paddingLeft: 32, paddingTop: 8, paddingBottom: 8, paddingRight: 10, fontSize: '0.875rem' }}
              />
            </div>
            <select className="input" value={catFilter} onChange={e => { setCatFilter(e.target.value); setPage(1) }}
              style={{ padding: '8px 12px', fontSize: '0.8125rem', width: 'auto', cursor: 'pointer' }}>
              <option value="">All Categories</option>
              {categories.filter(c => c.type !== 'income').map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <select className="input" value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1) }}
              style={{ padding: '8px 12px', fontSize: '0.8125rem', width: 'auto', cursor: 'pointer' }}>
              <option value="">All Types</option>
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
            <input type="date" className="input" value={startDate} onChange={e => setStartDate(e.target.value)}
              style={{ padding: '8px 12px', fontSize: '0.8125rem', width: 'auto' }} />
            <input type="date" className="input" value={endDate} onChange={e => setEndDate(e.target.value)}
              style={{ padding: '8px 12px', fontSize: '0.8125rem', width: 'auto' }} />
            <button onClick={() => setImportOpen(true)} className="btn-ghost" style={{ padding: '8px 14px', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Upload size={14} /> Import
            </button>
            <button onClick={() => { resetForm(); setAddOpen(true) }} className="btn-primary" style={{ padding: '8px 14px', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={14} /> Add
            </button>
          </div>

          {/* Table */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    {['Date', 'Title', 'Category', 'Method', 'Amount', ''].map(h => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: h === 'Amount' || h === '' ? 'right' : 'left', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      {[80, 140, 100, 80, 70, 60].map((w, j) => (
                        <td key={j} style={{ padding: '14px 16px' }}>
                          <div className="skeleton" style={{ height: 12, width: w }} />
                        </td>
                      ))}
                    </tr>
                  )) : expenses.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>
                        No transactions found. Add your first expense!
                      </td>
                    </tr>
                  ) : expenses.map((exp) => (
                    <motion.tr
                      key={exp.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.12s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '12px 16px', fontSize: '0.8125rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        {exp.date ? format(parseISO(exp.date), 'dd MMM') : ''}
                      </td>
                      <td style={{ padding: '12px 16px', maxWidth: 220 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <BrandLogo name={exp.merchant || exp.title} size={44} color={exp.category?.color} />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exp.title}</div>
                            {exp.merchant && exp.merchant !== exp.title && <div style={{ fontSize: '0.73rem', color: 'var(--text-tertiary)' }}>{exp.merchant}</div>}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {exp.category && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 99, background: `${exp.category.color}18`, fontSize: '0.75rem', fontWeight: 600, color: exp.category.color }}>
                            {exp.category.name}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '0.8125rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{exp.payment_method}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: '0.9rem', fontWeight: 700, color: exp.type === 'income' ? 'var(--color-brand)' : 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                        {exp.type === 'income' ? '+' : '-'}₹{Number(exp.amount).toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
                          <button onClick={() => openEdit(exp)} style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border-default)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', transition: 'all 0.12s' }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-elevated)'; e.currentTarget.style.color = 'var(--color-brand)' }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' }}>
                            <Edit2 size={13} />
                          </button>
                          <button onClick={() => { if (window.confirm('Delete this expense?')) deleteMut.mutate(exp.id) }}
                            style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border-default)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', transition: 'all 0.12s' }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-danger-bg)'; e.currentTarget.style.color = 'var(--color-danger)' }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' }}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            {pagination.pages > 1 && (
              <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                  Showing {((page - 1) * 20) + 1}–{Math.min(page * 20, pagination.total)} of {pagination.total}
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn-ghost" style={{ padding: '6px 12px', fontSize: '0.8125rem' }}>Prev</button>
                  <button disabled={page >= pagination.pages} onClick={() => setPage(p => p + 1)} className="btn-ghost" style={{ padding: '6px 12px', fontSize: '0.8125rem' }}>Next</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Category Chart */}
        <div>
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontFamily: 'Clash Display, sans-serif', fontWeight: 600, fontSize: '0.9375rem', marginBottom: '1rem' }}>By Category</h3>
            {byCat.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>No data yet</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={byCat} dataKey="total" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} strokeWidth={0}>
                      {byCat.map((c, i) => <Cell key={i} fill={c.color || '#64748B'} />)}
                    </Pie>
                    <Tooltip formatter={(v) => `₹${Number(v).toLocaleString('en-IN')}`} contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-medium)', borderRadius: 10, color: 'var(--text-primary)' }} labelStyle={{ color: 'var(--text-primary)' }} itemStyle={{ color: 'var(--text-primary)' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                  {byCat.slice(0, 5).map((c, i) => (
                    <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.color || '#64748B', flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: '0.78rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                      <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)', flexShrink: 0 }}>{c.percentage}%</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={addOpen || !!editItem}
        onClose={() => { setAddOpen(false); setEditItem(null); resetForm(); setFormErrors({}) }}
        title={editItem ? 'Edit Expense' : 'Add Transaction'}
        footer={
          <>
            <button onClick={() => { setAddOpen(false); setEditItem(null); resetForm() }} className="btn-ghost" style={{ padding: '9px 18px', fontSize: '0.875rem' }}>Cancel</button>
            <button onClick={submitForm} disabled={createMut.isPending || updateMut.isPending} className="btn-primary" style={{ padding: '9px 22px', fontSize: '0.875rem' }}>
              {(createMut.isPending || updateMut.isPending) ? 'Saving...' : editItem ? 'Update' : 'Add'}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>Type</label>
              <select className="input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                style={{ padding: '10px 12px', fontSize: '0.875rem', cursor: 'pointer' }}>
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>Date</label>
              <input type="date" className="input" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                style={{ padding: '10px 12px', fontSize: '0.875rem' }} />
            </div>
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>Title *</label>
            <input className="input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Zomato Dinner" style={{ padding: '10px 12px', fontSize: '0.875rem', borderColor: formErrors.title ? 'var(--color-danger)' : undefined }} />
            {formErrors.title && <div style={{ fontSize: '0.75rem', color: 'var(--color-danger)', marginTop: 3 }}>{formErrors.title}</div>}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>Amount (₹) *</label>
              <input type="number" className="input" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                placeholder="0.00" min="0" step="0.01"
                style={{ padding: '10px 12px', fontSize: '0.875rem', borderColor: formErrors.amount ? 'var(--color-danger)' : undefined }} />
              {formErrors.amount && <div style={{ fontSize: '0.75rem', color: 'var(--color-danger)', marginTop: 3 }}>{formErrors.amount}</div>}
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>Payment Method</label>
              <select className="input" value={form.payment_method} onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}
                style={{ padding: '10px 12px', fontSize: '0.875rem', cursor: 'pointer', textTransform: 'capitalize' }}>
                {PAYMENT_METHODS.map(m => <option key={m} value={m} style={{ textTransform: 'capitalize' }}>{m.toUpperCase()}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>Category</label>
            <select className="input" value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
              style={{ padding: '10px 12px', fontSize: '0.875rem', cursor: 'pointer' }}>
              <option value="">Select category</option>
              {categories.filter(c => c.type === form.type || c.type === 'both').map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>Merchant / Store</label>
            <input className="input" value={form.merchant} onChange={e => setForm(f => ({ ...f, merchant: e.target.value }))}
              placeholder="Optional" style={{ padding: '10px 12px', fontSize: '0.875rem' }} />
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>Note</label>
            <textarea className="input" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
              placeholder="Optional notes..." rows={2} style={{ padding: '10px 12px', fontSize: '0.875rem', resize: 'vertical' }} />
          </div>
        </div>
      </Modal>

      {/* Import Modal */}
      <Modal isOpen={importOpen} onClose={() => { setImportOpen(false); setImportJob(null) }} title="Import Transactions">
        {!importJob ? (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{ width: 64, height: 64, borderRadius: 16, background: 'var(--color-brand-subtle)', border: '1px solid var(--border-medium)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Upload size={28} style={{ color: 'var(--color-brand)' }} />
            </div>
            <h3 style={{ fontFamily: 'Clash Display, sans-serif', marginBottom: 8 }}>Import Transactions</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: 24 }}>
              Supports CSV, XLSX, and PDF bank statements
            </p>
            <label style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '10px 24px', borderRadius: 'var(--radius-md)',
              background: 'var(--gradient-brand)', color: '#001A14',
              fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer',
            }}>
              <Upload size={16} />
              Choose File
              <input type="file" accept=".csv,.xlsx,.xls,.pdf" style={{ display: 'none' }}
                onChange={e => { if (e.target.files?.[0]) importMut.mutate(e.target.files[0]) }} />
            </label>
            {importMut.isPending && <div style={{ marginTop: 16, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Parsing file...</div>}
          </div>
        ) : (
          <div>
            <div style={{ marginBottom: 16, padding: '12px 16px', background: 'var(--color-brand-subtle)', borderRadius: 10, border: '1px solid var(--border-medium)' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                Found {importJob.total_rows} transactions
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {importJob.duplicate_rows} duplicates will be skipped
              </div>
            </div>
            <div style={{ maxHeight: 280, overflowY: 'auto', marginBottom: 16 }}>
              {importJob.preview?.slice(0, 10).map((row, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--border-subtle)', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '0.8375rem', fontWeight: 500, color: 'var(--text-primary)' }}>{row.title}</div>
                    <div style={{ fontSize: '0.73rem', color: 'var(--text-tertiary)' }}>{row.date} · {row.suggested_category}</div>
                  </div>
                  <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', flexShrink: 0 }}>₹{row.amount?.toLocaleString('en-IN')}</span>
                </div>
              ))}
              {importJob.total_rows > 10 && <div style={{ padding: '8px 0', color: 'var(--text-tertiary)', fontSize: '0.8rem', textAlign: 'center' }}>...and {importJob.total_rows - 10} more</div>}
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => { setImportOpen(false); setImportJob(null) }} className="btn-ghost" style={{ padding: '9px 18px', fontSize: '0.875rem' }}>Cancel</button>
              <button onClick={() => confirmImportMut.mutate(importJob.job_id)} disabled={confirmImportMut.isPending} className="btn-primary" style={{ padding: '9px 22px', fontSize: '0.875rem' }}>
                {confirmImportMut.isPending ? 'Importing...' : 'Confirm Import'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <style>{`
        @media (max-width: 900px) { .exp-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  )
}
