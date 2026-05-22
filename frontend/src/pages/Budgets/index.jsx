import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit2, Trash2, Target, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react'
import api from '../../api/axios'
import toast from 'react-hot-toast'
import Modal from '../../components/ui/Modal'
import { format } from 'date-fns'

function fmt(n) { return `₹${Number(n || 0).toLocaleString('en-IN')}` }

const STATUS_COLORS = { safe: 'var(--color-brand)', warning: 'var(--color-warning)', exceeded: 'var(--color-danger)' }
const STATUS_BG = { safe: 'var(--color-success-bg)', warning: 'var(--color-warning-bg)', exceeded: 'var(--color-danger-bg)' }
const STATUS_LABEL = { safe: 'On Track', warning: 'Warning', exceeded: 'Exceeded' }

export default function Budgets() {
  const qc = useQueryClient()
  const [addOpen, setAddOpen] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState({ name: '', amount: '', category_id: '', period: 'monthly', start_date: format(new Date(), 'yyyy-MM-01'), alert_at_pct: 80 })
  const [formErrors, setFormErrors] = useState({})

  const { data: catData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/expenses/categories').then(r => r.data.data.categories),
    staleTime: Infinity,
  })
  const categories = catData || []

  const { data, isLoading } = useQuery({
    queryKey: ['budgets'],
    queryFn: () => api.get('/budgets').then(r => r.data.data),
  })

  const budgets = data?.budgets || []
  const summary = data?.summary || {}

  const createMut = useMutation({
    mutationFn: (d) => api.post('/budgets', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['budgets'] }); setAddOpen(false); resetForm(); toast.success('Budget created!') },
    onError: (e) => toast.error(e?.response?.data?.error || 'Failed'),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, ...d }) => api.patch(`/budgets/${id}`, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['budgets'] }); setEditItem(null); toast.success('Updated!') },
    onError: () => toast.error('Failed to update'),
  })

  const deleteMut = useMutation({
    mutationFn: (id) => api.delete(`/budgets/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['budgets'] }); toast.success('Deleted') },
    onError: () => toast.error('Failed'),
  })

  const resetForm = () => setForm({ name: '', amount: '', category_id: '', period: 'monthly', start_date: format(new Date(), 'yyyy-MM-01'), alert_at_pct: 80 })

  const openEdit = (b) => {
    setForm({ name: b.name, amount: b.amount, category_id: b.category?.id || '', period: b.period, start_date: b.start_date || '', alert_at_pct: b.alert_at_pct })
    setEditItem(b)
  }

  const submitForm = () => {
    const errs = {}
    if (!form.name.trim()) errs.name = 'Name required'
    if (!form.amount || parseFloat(form.amount) <= 0) errs.amount = 'Valid amount required'
    if (Object.keys(errs).length) { setFormErrors(errs); return }
    setFormErrors({})
    const payload = { ...form, amount: parseFloat(form.amount), category_id: form.category_id || null, alert_at_pct: parseInt(form.alert_at_pct) }
    if (editItem) updateMut.mutate({ id: editItem.id, ...payload })
    else createMut.mutate(payload)
  }

  const onTrack = budgets.filter(b => b.status === 'safe').length
  const warning = budgets.filter(b => b.status === 'warning').length
  const exceeded = budgets.filter(b => b.status === 'exceeded').length

  return (
    <div style={{ padding: '1.5rem 2rem', minHeight: 'calc(100vh - var(--topbar-height))' }}>

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Budgeted', value: fmt(summary.total_budgeted), color: 'var(--color-brand)', icon: Target },
          { label: 'Total Spent', value: fmt(summary.total_spent), color: 'var(--color-danger)', icon: TrendingUp },
          { label: 'Remaining', value: fmt(summary.total_remaining), color: 'var(--color-info)', icon: CheckCircle },
          { label: 'Overall Used', value: `${summary.overall_percentage || 0}%`, color: summary.overall_percentage > 80 ? 'var(--color-danger)' : 'var(--color-brand)', icon: AlertTriangle },
        ].map(k => (
          <motion.div key={k.label} whileHover={{ y: -3 }} className="kpi-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k.label}</span>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: `${k.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <k.icon size={16} style={{ color: k.color }} />
              </div>
            </div>
            <div style={{ fontFamily: 'Clash Display, sans-serif', fontSize: '1.4rem', fontWeight: 700, color: k.color }}>{k.value}</div>
          </motion.div>
        ))}
      </div>

      {/* Status badges */}
      <div style={{ display: 'flex', gap: 10, marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <span className="badge badge-success"><CheckCircle size={10} /> {onTrack} On Track</span>
          {warning > 0 && <span className="badge badge-warning"><AlertTriangle size={10} /> {warning} Warning</span>}
          {exceeded > 0 && <span className="badge badge-danger"><AlertTriangle size={10} /> {exceeded} Exceeded</span>}
        </div>
        <button onClick={() => { resetForm(); setAddOpen(true) }} className="btn-primary" style={{ padding: '9px 16px', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={15} /> Create Budget
        </button>
      </div>

      {/* Budget Cards */}
      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card" style={{ padding: '1.5rem' }}>
              <div className="skeleton" style={{ height: 16, width: '60%', marginBottom: 12 }} />
              <div className="skeleton" style={{ height: 8, marginBottom: 8 }} />
              <div className="skeleton" style={{ height: 12, width: '40%' }} />
            </div>
          ))}
        </div>
      ) : budgets.length === 0 ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          style={{ textAlign: 'center', padding: '5rem 2rem', background: 'var(--bg-surface)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-default)' }}>
          <Target size={48} style={{ color: 'var(--text-tertiary)', margin: '0 auto 16px', display: 'block' }} />
          <h3 style={{ fontFamily: 'Clash Display, sans-serif', fontSize: '1.25rem', marginBottom: 8 }}>No budgets yet</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: 20 }}>Create budgets to track your spending by category</p>
          <button onClick={() => setAddOpen(true)} className="btn-primary" style={{ padding: '10px 24px' }}>Create First Budget</button>
        </motion.div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
          {budgets.map((b, idx) => (
            <motion.div
              key={b.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.06 }}
              whileHover={{ y: -4 }}
              className="card"
              style={{ padding: '1.5rem', cursor: 'default' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <div style={{ fontFamily: 'Clash Display, sans-serif', fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)', marginBottom: 4 }}>{b.name}</div>
                  <div style={{ fontSize: '0.775rem', color: 'var(--text-tertiary)' }}>{b.category?.name || 'All Categories'} · {b.period}</div>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => openEdit(b)} style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border-default)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}><Edit2 size={13} /></button>
                  <button onClick={() => { if (window.confirm('Delete budget?')) deleteMut.mutate(b.id) }} style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border-default)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}><Trash2 size={13} /></button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 }}>
                <div>
                  <div style={{ fontFamily: 'Clash Display, sans-serif', fontSize: '1.375rem', fontWeight: 700, color: 'var(--text-primary)' }}>{fmt(b.spent)}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>of {fmt(b.amount)}</div>
                </div>
                <span style={{
                  padding: '4px 10px', borderRadius: 99, fontSize: '0.75rem', fontWeight: 700,
                  background: STATUS_BG[b.status], color: STATUS_COLORS[b.status],
                }}>
                  {STATUS_LABEL[b.status]}
                </span>
              </div>

              <div className="progress-track" style={{ height: 8, marginBottom: 8 }}>
                <motion.div
                  className="progress-fill"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, b.percentage)}%` }}
                  transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1], delay: idx * 0.08 }}
                  style={{ background: STATUS_COLORS[b.status] }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
                <span>{b.percentage}% used</span>
                <span>{fmt(b.remaining)} left</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={addOpen || !!editItem}
        onClose={() => { setAddOpen(false); setEditItem(null); resetForm(); setFormErrors({}) }}
        title={editItem ? 'Edit Budget' : 'Create Budget'}
        footer={
          <>
            <button onClick={() => { setAddOpen(false); setEditItem(null); resetForm() }} className="btn-ghost" style={{ padding: '9px 18px', fontSize: '0.875rem' }}>Cancel</button>
            <button onClick={submitForm} disabled={createMut.isPending || updateMut.isPending} className="btn-primary" style={{ padding: '9px 22px', fontSize: '0.875rem' }}>
              {(createMut.isPending || updateMut.isPending) ? 'Saving...' : editItem ? 'Update' : 'Create'}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>Budget Name *</label>
            <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Food Budget" style={{ padding: '10px 12px', fontSize: '0.875rem', borderColor: formErrors.name ? 'var(--color-danger)' : undefined }} />
            {formErrors.name && <div style={{ fontSize: '0.75rem', color: 'var(--color-danger)', marginTop: 3 }}>{formErrors.name}</div>}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>Amount (₹) *</label>
              <input type="number" className="input" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                placeholder="10000" min="1" style={{ padding: '10px 12px', fontSize: '0.875rem', borderColor: formErrors.amount ? 'var(--color-danger)' : undefined }} />
              {formErrors.amount && <div style={{ fontSize: '0.75rem', color: 'var(--color-danger)', marginTop: 3 }}>{formErrors.amount}</div>}
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>Period</label>
              <select className="input" value={form.period} onChange={e => setForm(f => ({ ...f, period: e.target.value }))}
                style={{ padding: '10px 12px', fontSize: '0.875rem', cursor: 'pointer' }}>
                <option value="monthly">Monthly</option>
                <option value="weekly">Weekly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>Category (optional)</label>
            <select className="input" value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
              style={{ padding: '10px 12px', fontSize: '0.875rem', cursor: 'pointer' }}>
              <option value="">All Expenses</option>
              {categories.filter(c => c.type === 'expense' || c.type === 'both').map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>
              Alert Threshold: {form.alert_at_pct}%
            </label>
            <input type="range" min="50" max="100" step="5" value={form.alert_at_pct}
              onChange={e => setForm(f => ({ ...f, alert_at_pct: e.target.value }))}
              style={{ width: '100%', accentColor: 'var(--color-brand)', cursor: 'pointer' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: 3 }}>
              <span>50%</span><span>100%</span>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
