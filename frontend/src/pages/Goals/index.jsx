import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit2, Trash2, Target, TrendingUp, Calendar, Sparkles, Star } from 'lucide-react'
import api from '../../api/axios'
import toast from 'react-hot-toast'
import Modal from '../../components/ui/Modal'
import { format } from 'date-fns'

function fmt(n) { return `₹${Number(n || 0).toLocaleString('en-IN')}` }

const GOAL_ICONS = ['target', 'plane', 'home', 'car', 'book-open', 'heart', 'gift', 'star', 'shield', 'laptop', 'briefcase', 'camera']
const GOAL_COLORS = ['#00FFDD', '#4DA3FF', '#A78BFA', '#FF6B6B', '#FFC247', '#34D399', '#F472B6', '#60A5FA']

function ProgressRing({ pct, size = 90, stroke = 7, color = '#00FFDD' }) {
  const radius = (size - stroke) / 2
  const circ = 2 * Math.PI * radius
  const offset = circ - (Math.min(100, pct) / 100) * circ
  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--border-subtle)" strokeWidth={stroke} />
      <motion.circle
        cx={size / 2} cy={size / 2} r={radius} fill="none"
        stroke={color} strokeWidth={stroke}
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.4, ease: [0.4, 0, 0.2, 1] }}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central"
        style={{ fontFamily: 'Clash Display, sans-serif', fontWeight: 700, fontSize: size * 0.18, fill: color }}>
        {Math.round(pct)}%
      </text>
    </svg>
  )
}

function MilestoneCelebration({ message, onClose }) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.7)',
        }}
        onClick={onClose}
      >
        <motion.div
          animate={{ rotate: [0, -3, 3, -2, 2, 0] }}
          transition={{ duration: 0.5, delay: 0.2 }}
          style={{ textAlign: 'center', padding: '2.5rem', background: 'var(--bg-surface)', borderRadius: 24, border: '2px solid var(--color-brand)', boxShadow: 'var(--shadow-brand-lg)', maxWidth: 380 }}
        >
          <Sparkles size={48} style={{ color: 'var(--color-brand)', margin: '0 auto 16px', display: 'block' }} />
          <h3 style={{ fontFamily: 'Clash Display, sans-serif', fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-brand)', marginBottom: 8 }}>Milestone Reached!</h3>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>{message}</p>
          <button onClick={onClose} className="btn-primary" style={{ marginTop: 20, padding: '10px 28px' }}>Awesome!</button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default function Goals() {
  const qc = useQueryClient()
  const [addOpen, setAddOpen] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [contributeGoal, setContributeGoal] = useState(null)
  const [celebration, setCelebration] = useState(null)
  const [form, setForm] = useState({ title: '', description: '', target_amount: '', current_amount: '0', deadline: '', icon: 'target', color: '#00FFDD', priority: 'medium' })
  const [contribForm, setContribForm] = useState({ amount: '', note: '' })
  const [formErrors, setFormErrors] = useState({})

  const { data, isLoading } = useQuery({
    queryKey: ['goals'],
    queryFn: () => api.get('/goals').then(r => r.data.data),
  })

  const goals = data?.goals || []
  const summary = data?.summary || {}

  const createMut = useMutation({
    mutationFn: (d) => api.post('/goals', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['goals'] }); setAddOpen(false); resetForm(); toast.success('Goal created!') },
    onError: (e) => toast.error(e?.response?.data?.error || 'Failed'),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, ...d }) => api.patch(`/goals/${id}`, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['goals'] }); setEditItem(null); toast.success('Updated!') },
  })

  const deleteMut = useMutation({
    mutationFn: (id) => api.delete(`/goals/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['goals'] }); toast.success('Goal deleted') },
  })

  const contributeMut = useMutation({
    mutationFn: ({ id, ...d }) => api.post(`/goals/${id}/contribute`, d),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['goals'] })
      setContributeGoal(null)
      setContribForm({ amount: '', note: '' })
      toast.success(`+${fmt(res.data.data.contribution.amount)} added!`)
      if (res.data.data.milestone_hit) {
        setTimeout(() => setCelebration(res.data.data.milestone_message), 200)
      }
    },
    onError: (e) => toast.error(e?.response?.data?.error || 'Failed'),
  })

  const resetForm = () => setForm({ title: '', description: '', target_amount: '', current_amount: '0', deadline: '', icon: 'target', color: '#00FFDD', priority: 'medium' })

  const openEdit = (g) => {
    setForm({ title: g.title, description: g.description || '', target_amount: g.target_amount, current_amount: g.current_amount, deadline: g.deadline || '', icon: g.icon || 'target', color: g.color || '#00FFDD', priority: g.priority || 'medium' })
    setEditItem(g)
  }

  const submitGoal = () => {
    const errs = {}
    if (!form.title.trim()) errs.title = 'Title required'
    if (!form.target_amount || parseFloat(form.target_amount) <= 0) errs.target_amount = 'Valid amount required'
    if (Object.keys(errs).length) { setFormErrors(errs); return }
    setFormErrors({})
    const payload = { ...form, target_amount: parseFloat(form.target_amount), current_amount: parseFloat(form.current_amount || 0) }
    if (editItem) updateMut.mutate({ id: editItem.id, ...payload })
    else createMut.mutate(payload)
  }

  const submitContrib = () => {
    if (!contribForm.amount || parseFloat(contribForm.amount) <= 0) { toast.error('Enter a valid amount'); return }
    contributeMut.mutate({ id: contributeGoal.id, amount: parseFloat(contribForm.amount), note: contribForm.note })
  }

  const priorityColors = { low: 'var(--color-info)', medium: 'var(--color-warning)', high: 'var(--color-danger)' }

  return (
    <div style={{ padding: '1.5rem 2rem', minHeight: 'calc(100vh - var(--topbar-height))' }}>
      {celebration && <MilestoneCelebration message={celebration} onClose={() => setCelebration(null)} />}

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Active Goals', value: summary.active || 0, color: 'var(--color-brand)', icon: Target, isNum: true },
          { label: 'Total Saved', value: fmt(summary.total_saved), color: 'var(--color-brand)', icon: TrendingUp },
          { label: 'Completed', value: summary.completed || 0, color: '#34D399', icon: Star, isNum: true },
          { label: 'Overall Progress', value: `${summary.overall_percentage || 0}%`, color: 'var(--color-info)', icon: Calendar },
        ].map(k => (
          <motion.div key={k.label} whileHover={{ y: -3 }} className="kpi-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k.label}</span>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: `${k.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <k.icon size={16} style={{ color: k.color }} />
              </div>
            </div>
            <div style={{ fontFamily: 'Clash Display, sans-serif', fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {k.isNum ? k.value : k.value}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Header actions */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.25rem' }}>
        <button onClick={() => { resetForm(); setAddOpen(true) }} className="btn-primary" style={{ padding: '9px 16px', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={15} /> New Goal
        </button>
      </div>

      {/* Goals Grid */}
      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card" style={{ padding: '1.75rem' }}>
              <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                <div className="skeleton" style={{ width: 90, height: 90, borderRadius: '50%' }} />
                <div style={{ flex: 1 }}>
                  <div className="skeleton" style={{ height: 16, width: '70%', marginBottom: 8 }} />
                  <div className="skeleton" style={{ height: 12, width: '50%', marginBottom: 8 }} />
                  <div className="skeleton" style={{ height: 10, width: '40%' }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : goals.length === 0 ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          style={{ textAlign: 'center', padding: '5rem 2rem', background: 'var(--bg-surface)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-default)' }}>
          <Target size={48} style={{ color: 'var(--text-tertiary)', margin: '0 auto 16px', display: 'block' }} />
          <h3 style={{ fontFamily: 'Clash Display, sans-serif', fontSize: '1.25rem', marginBottom: 8 }}>No goals yet</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: 20 }}>Set savings goals and track your progress with animated rings</p>
          <button onClick={() => setAddOpen(true)} className="btn-primary" style={{ padding: '10px 24px' }}>Create First Goal</button>
        </motion.div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {goals.map((g, idx) => (
            <motion.div
              key={g.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08 }}
              whileHover={{ y: -4 }}
              className="card"
              style={{ padding: '1.75rem', cursor: 'default', borderColor: g.status === 'completed' ? 'var(--color-brand)' : undefined }}
            >
              {g.status === 'completed' && (
                <div style={{ background: 'var(--color-brand-subtle)', borderRadius: 6, padding: '4px 10px', fontSize: '0.73rem', fontWeight: 700, color: 'var(--color-brand)', marginBottom: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Star size={11} /> Completed!
                </div>
              )}

              <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                <ProgressRing pct={g.percentage} size={90} stroke={7} color={g.color || '#00FFDD'} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'Clash Display, sans-serif', fontWeight: 600, fontSize: '1.0625rem', color: 'var(--text-primary)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {g.title}
                  </div>
                  {g.description && <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: 6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{g.description}</div>}
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{fmt(g.current_amount)}</span>
                    {' '}of{' '}
                    <span style={{ fontWeight: 600 }}>{fmt(g.target_amount)}</span>
                  </div>
                  {g.deadline && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: g.days_left < 30 ? 'var(--color-warning)' : 'var(--text-tertiary)' }}>
                      <Calendar size={11} />
                      {g.days_left != null ? `${g.days_left} days left` : format(new Date(g.deadline), 'dd MMM yyyy')}
                    </div>
                  )}
                  {g.monthly_needed && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: 3 }}>
                      {fmt(g.monthly_needed)}/month needed
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 6, borderTop: '1px solid var(--border-subtle)', paddingTop: 12 }}>
                <button onClick={() => setContributeGoal(g)} className="btn-primary" style={{ flex: 1, padding: '8px', fontSize: '0.8rem' }}>
                  Add Funds
                </button>
                <button onClick={() => openEdit(g)} style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid var(--border-default)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                  <Edit2 size={14} />
                </button>
                <button onClick={() => { if (window.confirm('Delete this goal?')) deleteMut.mutate(g.id) }}
                  style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid var(--border-default)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                  <Trash2 size={14} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create/Edit Goal Modal */}
      <Modal
        isOpen={addOpen || !!editItem}
        onClose={() => { setAddOpen(false); setEditItem(null); resetForm(); setFormErrors({}) }}
        title={editItem ? 'Edit Goal' : 'Create New Goal'}
        footer={
          <>
            <button onClick={() => { setAddOpen(false); setEditItem(null); resetForm() }} className="btn-ghost" style={{ padding: '9px 18px', fontSize: '0.875rem' }}>Cancel</button>
            <button onClick={submitGoal} disabled={createMut.isPending || updateMut.isPending} className="btn-primary" style={{ padding: '9px 22px', fontSize: '0.875rem' }}>
              {(createMut.isPending || updateMut.isPending) ? 'Saving...' : editItem ? 'Update' : 'Create Goal'}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>Goal Name *</label>
            <input className="input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Emergency Fund" style={{ padding: '10px 12px', fontSize: '0.875rem', borderColor: formErrors.title ? 'var(--color-danger)' : undefined }} />
            {formErrors.title && <div style={{ fontSize: '0.75rem', color: 'var(--color-danger)', marginTop: 3 }}>{formErrors.title}</div>}
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>Description</label>
            <textarea className="input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="What's this goal for?" rows={2} style={{ padding: '10px 12px', fontSize: '0.875rem', resize: 'vertical' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>Target Amount (₹) *</label>
              <input type="number" className="input" value={form.target_amount} onChange={e => setForm(f => ({ ...f, target_amount: e.target.value }))}
                placeholder="100000" min="1" style={{ padding: '10px 12px', fontSize: '0.875rem' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>Already Saved (₹)</label>
              <input type="number" className="input" value={form.current_amount} onChange={e => setForm(f => ({ ...f, current_amount: e.target.value }))}
                placeholder="0" min="0" style={{ padding: '10px 12px', fontSize: '0.875rem' }} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>Target Date</label>
              <input type="date" className="input" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
                style={{ padding: '10px 12px', fontSize: '0.875rem' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>Priority</label>
              <select className="input" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                style={{ padding: '10px 12px', fontSize: '0.875rem', cursor: 'pointer' }}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>Color</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {GOAL_COLORS.map(c => (
                <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                  style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: form.color === c ? '3px solid var(--text-primary)' : '2px solid transparent', cursor: 'pointer', transition: 'all 0.15s' }} />
              ))}
            </div>
          </div>
        </div>
      </Modal>

      {/* Contribute Modal */}
      <Modal
        isOpen={!!contributeGoal}
        onClose={() => { setContributeGoal(null); setContribForm({ amount: '', note: '' }) }}
        title={`Add to "${contributeGoal?.title || ''}"`}
        footer={
          <>
            <button onClick={() => setContributeGoal(null)} className="btn-ghost" style={{ padding: '9px 18px', fontSize: '0.875rem' }}>Cancel</button>
            <button onClick={submitContrib} disabled={contributeMut.isPending} className="btn-primary" style={{ padding: '9px 22px', fontSize: '0.875rem' }}>
              {contributeMut.isPending ? 'Adding...' : 'Add Funds'}
            </button>
          </>
        }
      >
        {contributeGoal && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ padding: '12px 16px', background: 'var(--color-brand-subtle)', borderRadius: 10, border: '1px solid var(--border-medium)', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Progress</span>
              <span style={{ fontWeight: 700, color: 'var(--color-brand)' }}>{contributeGoal.percentage}% · {fmt(contributeGoal.current_amount)} / {fmt(contributeGoal.target_amount)}</span>
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>Amount (₹) *</label>
              <input type="number" className="input" value={contribForm.amount} onChange={e => setContribForm(f => ({ ...f, amount: e.target.value }))}
                placeholder="5000" min="1" style={{ padding: '10px 12px', fontSize: '0.875rem' }} autoFocus />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>Note (optional)</label>
              <input className="input" value={contribForm.note} onChange={e => setContribForm(f => ({ ...f, note: e.target.value }))}
                placeholder="e.g. Monthly savings" style={{ padding: '10px 12px', fontSize: '0.875rem' }} />
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
