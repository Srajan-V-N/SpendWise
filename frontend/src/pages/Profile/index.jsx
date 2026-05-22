import { useState } from 'react'
import { motion } from 'framer-motion'
import { useMutation } from '@tanstack/react-query'
import { User, Mail, DollarSign, Calendar, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { Input } from '../../components/ui/Input'
import { format } from 'date-fns'

export default function Profile() {
  const { user, updateProfile } = useAuth()
  const [name, setName] = useState(user?.name || '')
  const [income, setIncome] = useState(user?.monthly_income?.toString() || '')
  const [errors, setErrors] = useState({})

  const saveMut = useMutation({
    mutationFn: (data) => updateProfile(data),
    onSuccess: () => toast.success('Profile updated!'),
    onError: (e) => toast.error(e?.response?.data?.error || 'Failed to save'),
  })

  function handleSave() {
    const errs = {}
    if (!name.trim() || name.trim().length < 2) errs.name = 'Name must be at least 2 characters'
    if (income && (isNaN(Number(income)) || Number(income) < 0)) errs.income = 'Enter a valid amount'
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    saveMut.mutate({
      name: name.trim(),
      monthly_income: income ? parseFloat(income) : 0,
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      style={{ padding: '2rem', maxWidth: 680, margin: '0 auto' }}
    >
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{
          fontFamily: 'Clash Display, sans-serif', fontWeight: 700,
          fontSize: '1.625rem', color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0,
        }}>
          Profile
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', marginTop: 4 }}>
          Manage your personal information
        </p>
      </div>

      {/* Identity card */}
      <div className="card" style={{ padding: '1.75rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%', flexShrink: 0,
            background: 'rgba(0, 255, 221, 0.1)',
            border: '2px solid rgba(0, 255, 221, 0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Clash Display, sans-serif', fontWeight: 700,
            fontSize: '1.75rem', color: 'var(--color-brand)',
          }}>
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div>
            <div style={{ fontFamily: 'Clash Display, sans-serif', fontWeight: 700, fontSize: '1.125rem', color: 'var(--text-primary)' }}>
              {user?.name}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5, color: 'var(--text-tertiary)', fontSize: '0.8125rem' }}>
              <Mail size={13} />
              {user?.email}
            </div>
            {user?.created_at && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, color: 'var(--text-tertiary)', fontSize: '0.8125rem' }}>
                <Calendar size={13} />
                Member since {format(new Date(user.created_at), 'MMMM yyyy')}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit form */}
      <div className="card" style={{ padding: '1.75rem' }}>
        <h2 style={{
          fontFamily: 'Clash Display, sans-serif', fontWeight: 600,
          fontSize: '0.9375rem', color: 'var(--text-primary)', margin: '0 0 1.25rem',
        }}>
          Edit Information
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Input
            label="Full Name"
            icon={User}
            value={name}
            onChange={e => setName(e.target.value)}
            error={errors.name}
            placeholder="Your name"
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{
              fontSize: '0.8125rem', fontWeight: 600,
              color: 'var(--text-secondary)', fontFamily: 'General Sans, sans-serif',
            }}>
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <div style={{
                position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                color: 'var(--text-tertiary)', pointerEvents: 'none',
              }}>
                <Mail size={16} />
              </div>
              <input
                className="input"
                value={user?.email || ''}
                readOnly
                style={{
                  paddingLeft: 38, paddingRight: 12, paddingTop: 10, paddingBottom: 10,
                  fontSize: '0.875rem', opacity: 0.6, cursor: 'not-allowed',
                }}
              />
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontFamily: 'General Sans, sans-serif' }}>
              Email cannot be changed
            </span>
          </div>

          <Input
            label="Monthly Income"
            icon={DollarSign}
            type="number"
            min="0"
            value={income}
            onChange={e => setIncome(e.target.value)}
            error={errors.income}
            placeholder="0"
            hint="Used to calculate your financial health score"
          />
        </div>

        <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            className="btn-primary"
            onClick={handleSave}
            disabled={saveMut.isPending}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 22px', fontSize: '0.875rem', borderRadius: 10,
              opacity: saveMut.isPending ? 0.7 : 1, cursor: saveMut.isPending ? 'not-allowed' : 'pointer',
            }}
          >
            <Save size={15} />
            {saveMut.isPending ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </motion.div>
  )
}
