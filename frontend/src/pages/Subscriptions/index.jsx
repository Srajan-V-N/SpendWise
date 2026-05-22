import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  RefreshCw, Plus, Edit2, Trash2, Zap, Calendar, DollarSign,
  AlertTriangle, CheckCircle, Clock, Loader,
} from 'lucide-react'
import api from '../../api/axios'
import toast from 'react-hot-toast'
import Modal from '../../components/ui/Modal'
import BrandLogo from '../../components/ui/BrandLogo'
import { format, parseISO, differenceInDays } from 'date-fns'

function fmt(n) { return `₹${Number(n || 0).toLocaleString('en-IN')}` }

const CYCLE_LABELS = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', quarterly: 'Quarterly', yearly: 'Yearly' }
const CYCLE_MULT   = { daily: 30, weekly: 4.33, monthly: 1, quarterly: 1 / 3, yearly: 1 / 12 }

function catName(s) { return s?.category?.name || 'Other' }

const STATUS_STYLE = {
  active:    { bg: 'var(--color-success-bg)', color: 'var(--color-brand)',   label: 'Active' },
  paused:    { bg: 'var(--color-warning-bg)', color: 'var(--color-warning)', label: 'Paused' },
  cancelled: { bg: 'var(--color-danger-bg)',  color: 'var(--color-danger)',  label: 'Cancelled' },
}

const EMPTY_FORM = {
  name: '', amount: '', billing_cycle: 'monthly',
  next_billing_date: '', status: 'active', note: '', provider: '',
}

function daysUntilLabel(dateStr) {
  if (!dateStr) return null
  const d = differenceInDays(parseISO(dateStr), new Date())
  if (d < 0)   return 'Overdue'
  if (d === 0) return 'Today'
  if (d === 1) return 'Tomorrow'
  return `${d} days`
}
function daysColor(dateStr) {
  if (!dateStr) return 'var(--text-tertiary)'
  const d = differenceInDays(parseISO(dateStr), new Date())
  return d <= 1 ? 'var(--color-danger)' : d <= 3 ? 'var(--color-warning)' : 'var(--color-brand)'
}

export default function Subscriptions() {
  const qc = useQueryClient()
  const [addOpen, setAddOpen]       = useState(false)
  const [editItem, setEditItem]     = useState(null)
  const [form, setForm]             = useState(EMPTY_FORM)
  const [formErrors, setFormErrors] = useState({})
  const [detecting, setDetecting]   = useState(false)
  const [filterStatus, setFilter]   = useState('all')

  const { data, isLoading } = useQuery({
    queryKey: ['subscriptions'],
    queryFn: () => api.get('/subscriptions').then(r => r.data.data),
  })

  const allSubs       = data?.subscriptions || []
  const subscriptions = filterStatus === 'all' ? allSubs : allSubs.filter(s => s.status === filterStatus)

  const monthlyTotal = allSubs
    .filter(s => s.status === 'active')
    .reduce((sum, s) => sum + parseFloat(s.amount) * (CYCLE_MULT[s.billing_cycle] || 1), 0)
  const annualTotal  = monthlyTotal * 12
  const activeCount  = allSubs.filter(s => s.status === 'active').length

  const upcoming = allSubs.filter(s => {
    if (s.status !== 'active' || !s.next_billing_date) return false
    const d = differenceInDays(parseISO(s.next_billing_date), new Date())
    return d >= 0 && d <= 7
  }).sort((a, b) => parseISO(a.next_billing_date) - parseISO(b.next_billing_date))

  const createMut = useMutation({
    mutationFn: (d) => api.post('/subscriptions', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['subscriptions'] }); setAddOpen(false); resetForm(); toast.success('Subscription added!') },
    onError: (e) => toast.error(e?.response?.data?.error || 'Failed to create'),
  })
  const updateMut = useMutation({
    mutationFn: ({ id, ...d }) => api.patch(`/subscriptions/${id}`, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['subscriptions'] }); setEditItem(null); toast.success('Updated!') },
    onError: () => toast.error('Failed to update'),
  })
  const deleteMut = useMutation({
    mutationFn: (id) => api.delete(`/subscriptions/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['subscriptions'] }); toast.success('Removed') },
    onError: () => toast.error('Failed to delete'),
  })

  const resetForm = () => { setForm(EMPTY_FORM); setFormErrors({}) }

  const openEdit = (s) => {
    setForm({
      name: s.name, amount: s.amount,
      billing_cycle: s.billing_cycle || 'monthly',
      next_billing_date: s.next_billing_date || '',
      status: s.status || 'active',
      note: s.note || '', provider: s.provider || '',
    })
    setEditItem(s)
  }

  const submitForm = () => {
    const errs = {}
    if (!form.name.trim()) errs.name = 'Name required'
    if (!form.amount || parseFloat(form.amount) <= 0) errs.amount = 'Valid amount required'
    if (Object.keys(errs).length) { setFormErrors(errs); return }
    setFormErrors({})
    const payload = {
      name: form.name.trim(),
      amount: parseFloat(form.amount),
      billing_cycle: form.billing_cycle,
      next_billing_date: form.next_billing_date || null,
      status: form.status,
      note: form.note || '',
      provider: form.provider || '',
    }
    if (editItem) updateMut.mutate({ id: editItem.id, ...payload })
    else createMut.mutate(payload)
  }

  const handleDetect = async () => {
    setDetecting(true)
    try {
      const res = await api.post('/subscriptions/detect')
      const detected = res.data.data?.detected || []
      if (detected.length === 0) { toast.success('No new recurring charges detected'); return }
      let created = 0
      for (const d of detected) {
        try {
          await api.post('/subscriptions', {
            name: d.name, amount: d.amount, billing_cycle: d.frequency,
            status: 'active',
            note: `Auto-detected (${Math.round(d.confidence * 100)}% confidence)`,
            provider: d.name,
          })
          created++
        } catch { /* skip duplicates */ }
      }
      if (created > 0) {
        toast.success(`Added ${created} subscription(s) automatically!`)
        qc.invalidateQueries({ queryKey: ['subscriptions'] })
      } else {
        toast.success('All detected subscriptions already exist')
      }
    } catch {
      toast.error('Detection failed')
    } finally {
      setDetecting(false)
    }
  }

  const catBreakdown = Object.entries(
    allSubs
      .filter(s => s.status === 'active')
      .reduce((acc, s) => {
        const cat = catName(s)
        acc[cat] = (acc[cat] || 0) + parseFloat(s.amount) * (CYCLE_MULT[s.billing_cycle] || 1)
        return acc
      }, {})
  ).sort(([, a], [, b]) => b - a)

  return (
    <div style={{ padding: '1.75rem 2rem 2.5rem', minHeight: 'calc(100vh - var(--topbar-height))' }}>

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
        {[
          { label: 'Monthly Total',  value: fmt(monthlyTotal),     color: 'var(--color-brand)',   icon: DollarSign },
          { label: 'Annual Spend',   value: fmt(annualTotal),      color: 'var(--color-danger)',  icon: Calendar },
          { label: 'Active',         value: `${activeCount}`,      color: 'var(--color-info)',    icon: CheckCircle },
          { label: 'Due This Week',  value: `${upcoming.length}`,  color: upcoming.length > 0 ? 'var(--color-warning)' : 'var(--color-brand)', icon: AlertTriangle },
        ].map((k, i) => (
          <motion.div
            key={k.label}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }} whileHover={{ y: -3 }}
            className="kpi-card"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <span style={{ fontSize: '0.73rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {k.label}
              </span>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: `${k.color}18`, border: `1px solid ${k.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <k.icon size={15} style={{ color: k.color }} />
              </div>
            </div>
            <div style={{ fontFamily: 'Clash Display, sans-serif', fontSize: '1.4rem', fontWeight: 700, color: k.color, letterSpacing: '-0.02em' }}>
              {k.value}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {['all', 'active', 'paused', 'cancelled'].map(s => (
            <button key={s} onClick={() => setFilter(s)} style={{
              padding: '6px 14px', borderRadius: 99, fontSize: '0.78rem', fontWeight: 600,
              cursor: 'pointer', border: '1px solid', transition: 'all 0.15s',
              borderColor: filterStatus === s ? 'var(--color-brand)' : 'var(--border-default)',
              background:  filterStatus === s ? 'var(--color-brand)' : 'transparent',
              color:       filterStatus === s ? '#001A14' : 'var(--text-secondary)',
            }}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleDetect} disabled={detecting} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', fontSize: '0.8rem',
            background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 10,
            color: 'var(--text-secondary)', cursor: detecting ? 'not-allowed' : 'pointer',
            fontWeight: 600, opacity: detecting ? 0.7 : 1, fontFamily: 'General Sans, sans-serif',
          }}>
            {detecting
              ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}><Loader size={13} /></motion.div>
              : <Zap size={13} />}
            {detecting ? 'Detecting…' : 'Auto-Detect'}
          </button>
          <button onClick={() => { resetForm(); setAddOpen(true) }} className="btn-primary" style={{ padding: '9px 16px', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 6, borderRadius: 10 }}>
            <Plus size={15} /> Add Subscription
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '1.25rem', alignItems: 'start' }} className="subs-layout">

        {/* Cards Grid */}
        <div>
          {isLoading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="card" style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                    <div className="skeleton" style={{ width: 44, height: 44, borderRadius: 11, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div className="skeleton" style={{ height: 13, width: '55%', marginBottom: 8 }} />
                      <div className="skeleton" style={{ height: 10, width: '35%' }} />
                    </div>
                  </div>
                  <div className="skeleton" style={{ height: 26, width: '45%', marginBottom: 8 }} />
                  <div className="skeleton" style={{ height: 10, width: '65%' }} />
                </div>
              ))}
            </div>
          ) : subscriptions.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              style={{ textAlign: 'center', padding: '5rem 2rem', background: 'var(--bg-surface)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-default)' }}
            >
              <RefreshCw size={44} style={{ color: 'var(--text-tertiary)', margin: '0 auto 16px', display: 'block', opacity: 0.4 }} />
              <h3 style={{ fontFamily: 'Clash Display, sans-serif', fontSize: '1.25rem', marginBottom: 8, color: 'var(--text-primary)' }}>
                No subscriptions found
              </h3>
              <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem', marginBottom: 24, maxWidth: 340, margin: '0 auto 24px' }}>
                Add subscriptions manually or use Auto-Detect to find recurring charges from your expenses
              </p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button onClick={handleDetect} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', fontSize: '0.875rem', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 10, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  <Zap size={14} /> Auto-Detect
                </button>
                <button onClick={() => setAddOpen(true)} className="btn-primary" style={{ padding: '10px 24px', borderRadius: 10 }}>
                  Add Subscription
                </button>
              </div>
            </motion.div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
              <AnimatePresence>
                {subscriptions.map((s, idx) => {
                  const ss = STATUS_STYLE[s.status] || STATUS_STYLE.active
                  const monthlyEq = parseFloat(s.amount) * (CYCLE_MULT[s.billing_cycle] || 1)

                  return (
                    <motion.div
                      key={s.id} layout
                      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: idx * 0.04 }} whileHover={{ y: -4 }}
                      className="card" style={{ padding: '1.25rem', cursor: 'default' }}
                    >
                      {/* Header row */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                          <BrandLogo name={s.name} color={s.category?.color} size={44} />
                          <div style={{ minWidth: 0 }}>
                            <div style={{
                              fontFamily: 'Clash Display, sans-serif', fontWeight: 600,
                              fontSize: '0.9375rem', color: 'var(--text-primary)',
                              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                              maxWidth: 130,
                            }}>
                              {s.name}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: 2 }}>
                              {catName(s)}{s.provider && s.provider !== s.name ? ` · ${s.provider}` : ''}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 4, flexShrink: 0, marginLeft: 4 }}>
                          <button
                            onClick={() => openEdit(s)}
                            style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid var(--border-default)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', transition: 'all 0.12s ease' }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-elevated)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-tertiary)' }}
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            onClick={() => { if (window.confirm('Remove this subscription?')) deleteMut.mutate(s.id) }}
                            style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid var(--border-default)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', transition: 'all 0.12s ease' }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-danger-bg)'; e.currentTarget.style.color = 'var(--color-danger)'; e.currentTarget.style.borderColor = 'var(--color-danger)' }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-tertiary)'; e.currentTarget.style.borderColor = 'var(--border-default)' }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>

                      {/* Amount + status */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: s.next_billing_date ? 10 : 0 }}>
                        <div>
                          <div style={{ fontFamily: 'Clash Display, sans-serif', fontSize: '1.375rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                            {fmt(s.amount)}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: 1 }}>
                            / {CYCLE_LABELS[s.billing_cycle] || s.billing_cycle}
                            {s.billing_cycle !== 'monthly' && (
                              <span style={{ marginLeft: 5, color: 'var(--text-tertiary)' }}>
                                · {fmt(monthlyEq)}/mo
                              </span>
                            )}
                          </div>
                        </div>
                        <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: '0.7rem', fontWeight: 700, background: ss.bg, color: ss.color }}>
                          {ss.label}
                        </span>
                      </div>

                      {/* Next billing */}
                      {s.next_billing_date && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 10px', background: 'var(--bg-elevated)', borderRadius: 8, border: '1px solid var(--border-subtle)', marginTop: 10 }}>
                          <Clock size={11} style={{ color: daysColor(s.next_billing_date), flexShrink: 0 }} />
                          <div style={{ flex: 1 }}>
                            <span style={{ fontSize: '0.71rem', color: 'var(--text-tertiary)' }}>Next: </span>
                            <span style={{ fontSize: '0.71rem', color: 'var(--text-secondary)' }}>
                              {format(parseISO(s.next_billing_date), 'dd MMM yyyy')}
                            </span>
                          </div>
                          <span style={{ fontSize: '0.69rem', fontWeight: 700, color: daysColor(s.next_billing_date), flexShrink: 0 }}>
                            {daysUntilLabel(s.next_billing_date)}
                          </span>
                        </div>
                      )}

                      {s.note && (
                        <div style={{ marginTop: 8, fontSize: '0.71rem', color: 'var(--text-tertiary)', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {s.note}
                        </div>
                      )}
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Due This Week */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }} className="card" style={{ padding: '1.25rem' }}>
            <div style={{ fontFamily: 'Clash Display, sans-serif', fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text-primary)', marginBottom: '1rem' }}>
              Due This Week
            </div>
            {upcoming.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1.5rem 0', color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>
                <CheckCircle size={24} style={{ margin: '0 auto 8px', display: 'block', color: 'var(--color-brand)', opacity: 0.7 }} />
                No renewals this week
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {upcoming.map(s => {
                  const d = differenceInDays(parseISO(s.next_billing_date), new Date())
                  return (
                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 11px', background: 'var(--bg-elevated)', borderRadius: 10, border: '1px solid var(--border-subtle)' }}>
                      <BrandLogo name={s.name} color={s.category?.color} size={34} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {s.name}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginTop: 1 }}>
                          {format(parseISO(s.next_billing_date), 'dd MMM')}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>{fmt(s.amount)}</div>
                        <div style={{ fontSize: '0.67rem', fontWeight: 600, color: d <= 1 ? 'var(--color-danger)' : d <= 3 ? 'var(--color-warning)' : 'var(--color-brand)' }}>
                          {daysUntilLabel(s.next_billing_date)}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </motion.div>

          {/* Monthly Breakdown */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 }} className="card" style={{ padding: '1.25rem' }}>
            <div style={{ fontFamily: 'Clash Display, sans-serif', fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text-primary)', marginBottom: '1rem' }}>
              Monthly Breakdown
            </div>
            {catBreakdown.length === 0 ? (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', textAlign: 'center', padding: '1rem 0' }}>No active subscriptions</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                {catBreakdown.map(([cat, amt]) => (
                  <div key={cat}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: '0.78rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{cat}</span>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{fmt(amt)}</span>
                    </div>
                    <div className="progress-track" style={{ height: 4 }}>
                      <motion.div
                        className="progress-fill" initial={{ width: 0 }}
                        animate={{ width: `${monthlyTotal > 0 ? Math.min(100, (amt / monthlyTotal) * 100) : 0}%` }}
                        transition={{ duration: 0.8 }}
                        style={{ background: 'var(--color-brand)' }}
                      />
                    </div>
                  </div>
                ))}
                <div style={{ marginTop: 6, paddingTop: 12, borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Total / month</span>
                  <span style={{ fontFamily: 'Clash Display, sans-serif', fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-brand)' }}>{fmt(monthlyTotal)}</span>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={addOpen || !!editItem}
        onClose={() => { setAddOpen(false); setEditItem(null); resetForm() }}
        title={editItem ? 'Edit Subscription' : 'Add Subscription'}
        footer={
          <>
            <button onClick={() => { setAddOpen(false); setEditItem(null); resetForm() }} className="btn-ghost" style={{ padding: '9px 18px', fontSize: '0.875rem' }}>
              Cancel
            </button>
            <button onClick={submitForm} disabled={createMut.isPending || updateMut.isPending} className="btn-primary" style={{ padding: '9px 22px', fontSize: '0.875rem' }}>
              {createMut.isPending || updateMut.isPending ? 'Saving…' : editItem ? 'Update' : 'Add'}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>Name *</label>
            <input
              className="input" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Netflix, Spotify, Zomato"
              style={{ padding: '10px 12px', fontSize: '0.875rem', borderColor: formErrors.name ? 'var(--color-danger)' : undefined }}
            />
            {formErrors.name && <div style={{ fontSize: '0.75rem', color: 'var(--color-danger)', marginTop: 3 }}>{formErrors.name}</div>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>Amount (₹) *</label>
              <input
                type="number" className="input" value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                placeholder="499" min="1"
                style={{ padding: '10px 12px', fontSize: '0.875rem', borderColor: formErrors.amount ? 'var(--color-danger)' : undefined }}
              />
              {formErrors.amount && <div style={{ fontSize: '0.75rem', color: 'var(--color-danger)', marginTop: 3 }}>{formErrors.amount}</div>}
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>Billing Cycle</label>
              <select
                className="input" value={form.billing_cycle}
                onChange={e => setForm(f => ({ ...f, billing_cycle: e.target.value }))}
                style={{ padding: '10px 12px', fontSize: '0.875rem', cursor: 'pointer' }}
              >
                {Object.entries(CYCLE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>Provider</label>
              <input
                className="input" value={form.provider}
                onChange={e => setForm(f => ({ ...f, provider: e.target.value }))}
                placeholder="e.g. Netflix Inc."
                style={{ padding: '10px 12px', fontSize: '0.875rem' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>Status</label>
              <select
                className="input" value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                style={{ padding: '10px 12px', fontSize: '0.875rem', cursor: 'pointer' }}
              >
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>Next Billing Date</label>
            <input
              type="date" className="input" value={form.next_billing_date}
              onChange={e => setForm(f => ({ ...f, next_billing_date: e.target.value }))}
              style={{ padding: '10px 12px', fontSize: '0.875rem' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>Note</label>
            <textarea
              className="input" value={form.note}
              onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
              placeholder="Optional notes…" rows={2}
              style={{ padding: '10px 12px', fontSize: '0.875rem', resize: 'none' }}
            />
          </div>
        </div>
      </Modal>

      <style>{`
        @media (max-width: 900px) {
          .subs-layout { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
