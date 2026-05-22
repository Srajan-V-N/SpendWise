import { useState } from 'react'
import { motion } from 'framer-motion'
import { useMutation } from '@tanstack/react-query'
import { Sun, Moon, Globe, Lock, Eye, EyeOff, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../api/axios'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { Select } from '../../components/ui/Input'

const CURRENCIES = [
  { value: 'INR', label: 'INR — Indian Rupee' },
  { value: 'USD', label: 'USD — US Dollar' },
  { value: 'EUR', label: 'EUR — Euro' },
  { value: 'GBP', label: 'GBP — British Pound' },
  { value: 'JPY', label: 'JPY — Japanese Yen' },
  { value: 'CAD', label: 'CAD — Canadian Dollar' },
  { value: 'AUD', label: 'AUD — Australian Dollar' },
  { value: 'SGD', label: 'SGD — Singapore Dollar' },
]

function SectionHeader({ title, description }) {
  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <h2 style={{
        fontFamily: 'Clash Display, sans-serif', fontWeight: 600,
        fontSize: '0.9375rem', color: 'var(--text-primary)', margin: 0,
      }}>
        {title}
      </h2>
      {description && (
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', marginTop: 3 }}>
          {description}
        </p>
      )}
    </div>
  )
}

export default function Preferences() {
  const { user, updateProfile } = useAuth()
  const { theme, toggle: toggleTheme } = useTheme()

  const [currency, setCurrency] = useState(user?.currency || 'INR')
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [pwErrors, setPwErrors] = useState({})
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false })

  const currencyMut = useMutation({
    mutationFn: () => updateProfile({ currency }),
    onSuccess: () => toast.success('Currency updated!'),
    onError: (e) => toast.error(e?.response?.data?.error || 'Failed to save'),
  })

  function handleThemeToggle() {
    const newTheme = theme === 'dark' ? 'light' : 'dark'
    toggleTheme()
    updateProfile({ theme: newTheme }).catch(() => {})
  }

  const pwMut = useMutation({
    mutationFn: (data) => api.patch('/auth/password', data),
    onSuccess: () => {
      toast.success('Password changed!')
      setPwForm({ current: '', next: '', confirm: '' })
      setPwErrors({})
    },
    onError: (e) => {
      const msg = e?.response?.data?.error || 'Failed to change password'
      setPwErrors({ current: msg })
    },
  })

  function handlePwSave() {
    const errs = {}
    if (!pwForm.current) errs.current = 'Enter your current password'
    if (pwForm.next.length < 8) errs.next = 'At least 8 characters required'
    if (pwForm.next !== pwForm.confirm) errs.confirm = 'Passwords do not match'
    if (Object.keys(errs).length) { setPwErrors(errs); return }
    setPwErrors({})
    pwMut.mutate({ current_password: pwForm.current, new_password: pwForm.next })
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
          Preferences
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', marginTop: 4 }}>
          Customize your SpendWise experience
        </p>
      </div>

      {/* Appearance */}
      <div className="card" style={{ padding: '1.75rem', marginBottom: '1.25rem' }}>
        <SectionHeader title="Appearance" description="Choose how SpendWise looks" />
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 16px', borderRadius: 10,
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-subtle)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {theme === 'dark' ? <Moon size={16} color="var(--color-brand)" /> : <Sun size={16} color="var(--color-brand)" />}
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 1 }}>
                {theme === 'dark' ? 'Easy on the eyes' : 'Bright and clear'}
              </div>
            </div>
          </div>
          <button
            onClick={handleThemeToggle}
            style={{
              width: 48, height: 26, borderRadius: 999, border: 'none', cursor: 'pointer',
              background: theme === 'dark' ? 'var(--color-brand)' : 'var(--border-medium)',
              position: 'relative', transition: 'background 0.2s ease', flexShrink: 0,
            }}
            aria-label="Toggle theme"
          >
            <span style={{
              position: 'absolute', top: 3,
              left: theme === 'dark' ? 26 : 4,
              width: 20, height: 20, borderRadius: '50%',
              background: theme === 'dark' ? '#001A14' : '#fff',
              transition: 'left 0.18s ease',
              boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
            }} />
          </button>
        </div>
      </div>

      {/* Regional */}
      <div className="card" style={{ padding: '1.75rem', marginBottom: '1.25rem' }}>
        <SectionHeader title="Regional" description="Set your preferred currency for displaying amounts" />
        <Select
          label="Currency"
          value={currency}
          onChange={e => setCurrency(e.target.value)}
        >
          {CURRENCIES.map(c => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </Select>
        <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            className="btn-primary"
            onClick={() => currencyMut.mutate()}
            disabled={currencyMut.isPending || currency === user?.currency}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 22px', fontSize: '0.875rem', borderRadius: 10,
              opacity: (currencyMut.isPending || currency === user?.currency) ? 0.6 : 1,
              cursor: (currencyMut.isPending || currency === user?.currency) ? 'not-allowed' : 'pointer',
            }}
          >
            <Globe size={15} />
            {currencyMut.isPending ? 'Saving…' : 'Save Currency'}
          </button>
        </div>
      </div>

      {/* Security */}
      <div className="card" style={{ padding: '1.75rem' }}>
        <SectionHeader title="Security" description="Change your account password" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[
            { key: 'current', label: 'Current Password', placeholder: 'Enter current password' },
            { key: 'next', label: 'New Password', placeholder: 'At least 8 characters' },
            { key: 'confirm', label: 'Confirm New Password', placeholder: 'Repeat new password' },
          ].map(({ key, label, placeholder }) => (
            <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{
                fontSize: '0.8125rem', fontWeight: 600,
                color: 'var(--text-secondary)', fontFamily: 'General Sans, sans-serif',
              }}>
                {label}
              </label>
              <div style={{ position: 'relative' }}>
                <div style={{
                  position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                  color: 'var(--text-tertiary)', pointerEvents: 'none',
                }}>
                  <Lock size={16} />
                </div>
                <input
                  className="input"
                  type={showPw[key] ? 'text' : 'password'}
                  value={pwForm[key]}
                  onChange={e => setPwForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  style={{
                    paddingLeft: 38, paddingRight: 44, paddingTop: 10, paddingBottom: 10,
                    fontSize: '0.875rem',
                    borderColor: pwErrors[key] ? 'var(--color-danger)' : undefined,
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(s => ({ ...s, [key]: !s[key] }))}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center',
                    padding: 2,
                  }}
                >
                  {showPw[key] ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {pwErrors[key] && (
                <span style={{ fontSize: '0.75rem', color: 'var(--color-danger)', fontFamily: 'General Sans, sans-serif' }}>
                  {pwErrors[key]}
                </span>
              )}
            </div>
          ))}
        </div>
        <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            className="btn-primary"
            onClick={handlePwSave}
            disabled={pwMut.isPending}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 22px', fontSize: '0.875rem', borderRadius: 10,
              opacity: pwMut.isPending ? 0.7 : 1, cursor: pwMut.isPending ? 'not-allowed' : 'pointer',
            }}
          >
            <Check size={15} />
            {pwMut.isPending ? 'Changing…' : 'Change Password'}
          </button>
        </div>
      </div>
    </motion.div>
  )
}
