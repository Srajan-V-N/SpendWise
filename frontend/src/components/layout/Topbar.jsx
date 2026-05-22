import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, Plus, Bell, Sun, Moon, LogOut, User, Settings, ScanLine } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../api/axios'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { formatDistanceToNow } from 'date-fns'

const PAGE_TITLES = {
  '/dashboard':     'Dashboard',
  '/expenses':      'Expenses',
  '/budgets':       'Budgets',
  '/goals':         'Goals',
  '/reports':       'Reports',
  '/subscriptions': 'Subscriptions',
  '/import':        'Smart Scan',
  '/profile':       'Profile',
  '/preferences':   'Preferences',
}

export default function Topbar({ onToggleSidebar, onMobileMenuOpen, sidebarCollapsed }) {
  const { user, logout } = useAuth()
  const { isDark, toggle } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const [showNotifs, setShowNotifs] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [bellAnimating, setBellAnimating] = useState(false)
  const qc = useQueryClient()

  const { data: notifsData } = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: () => api.get('/notifications?limit=10&unread_only=false').then(r => r.data.data),
    refetchInterval: 60_000,
  })

  const markAllRead = useMutation({
    mutationFn: () => api.patch('/notifications/read-all'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const unreadCount = notifsData?.unread_count || 0
  const notifications = notifsData?.notifications || []

  useEffect(() => {
    if (unreadCount > 0) {
      setBellAnimating(true)
      setTimeout(() => setBellAnimating(false), 700)
    }
  }, [unreadCount])

  const title = PAGE_TITLES[location.pathname] || 'SpendWise'

  const iconBtnStyle = {
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    cursor: 'pointer',
    color: 'var(--text-secondary)',
    width: 36,
    height: 36,
    borderRadius: 9,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.14s ease',
    flexShrink: 0,
  }

  return (
    <header
      className="topbar-glass"
      style={{
        height: 'var(--topbar-height)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 1.5rem',
        gap: '0.875rem',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      {/* Mobile menu */}
      <button
        onClick={onMobileMenuOpen}
        className="mobile-menu-btn topbar-icon-btn"
        style={{ ...iconBtnStyle, display: 'none' }}
      >
        <Menu size={18} />
      </button>

      {/* Desktop sidebar toggle */}
      <button
        onClick={onToggleSidebar}
        className="desktop-toggle topbar-icon-btn"
        style={iconBtnStyle}
        title="Toggle sidebar"
      >
        <Menu size={17} />
      </button>

      <h1 style={{
        fontFamily: 'Clash Display, sans-serif',
        fontSize: '1rem',
        fontWeight: 600,
        color: 'var(--text-primary)',
        flex: 1,
        letterSpacing: '-0.03em',
        lineHeight: 1,
      }}>
        {title}
      </h1>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Add expense CTA — text on desktop, icon-only pill on mobile */}
        <button
          onClick={() => navigate('/expenses?add=true')}
          className="btn-primary add-expense-btn"
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '0 14px', height: 36, fontSize: '0.8rem',
            borderRadius: 9,
          }}
        >
          <Plus size={15} strokeWidth={2.5} />
          <span className="add-expense-label">Add Expense</span>
        </button>

        <button
          onClick={() => navigate('/import')}
          className="scan-import-btn"
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '0 14px', height: 36, fontSize: '0.8rem',
            borderRadius: 9,
            background: 'rgba(0, 255, 221, 0.06)',
            border: '1px solid rgba(0, 255, 221, 0.20)',
            color: 'var(--color-brand)',
            fontWeight: 500,
            cursor: 'pointer',
            fontFamily: 'General Sans, sans-serif',
            transition: 'all var(--transition-base)',
            flexShrink: 0,
            letterSpacing: '-0.01em',
          }}
        >
          <ScanLine size={15} strokeWidth={2} />
          <span className="scan-import-label">Scan &amp; Import</span>
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggle}
          style={iconBtnStyle}
          className="topbar-icon-btn"
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* Bell */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => { setShowNotifs(v => !v); setShowProfile(false) }}
            style={{ ...iconBtnStyle, position: 'relative' }}
            className={`topbar-icon-btn${bellAnimating ? ' animate-bell-dangle' : ''}`}
            title="Notifications"
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: 7, right: 7,
                width: 7, height: 7, borderRadius: '50%',
                background: 'var(--color-danger)',
                border: '1.5px solid var(--bg-surface)',
              }} />
            )}
          </button>

          <AnimatePresence>
            {showNotifs && (
              <NotifDropdown
                notifications={notifications}
                unreadCount={unreadCount}
                onClose={() => setShowNotifs(false)}
                onMarkAll={() => markAllRead.mutate()}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Avatar */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => { setShowProfile(v => !v); setShowNotifs(false) }}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1.5px solid rgba(0, 255, 221, 0.30)',
              cursor: 'pointer', width: 38, height: 38, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--color-brand)', fontWeight: 700, fontSize: '0.875rem',
              fontFamily: 'Clash Display, sans-serif',
              transition: 'all 0.15s ease',
              flexShrink: 0,
            }}
            title="Profile"
          >
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </button>

          <AnimatePresence>
            {showProfile && (
              <ProfileDropdown
                user={user}
                onClose={() => setShowProfile(false)}
                onLogout={() => { setShowProfile(false); logout(); navigate('/') }}
                onNavigate={(path) => { setShowProfile(false); navigate(path) }}
              />
            )}
          </AnimatePresence>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .mobile-menu-btn { display: flex !important; }
          .desktop-toggle { display: none !important; }
        }
        @media (max-width: 520px) {
          .add-expense-label { display: none; }
          .add-expense-btn { width: 36px; padding: 0 !important; justify-content: center; border-radius: 9px; }
          .scan-import-label { display: none; }
          .scan-import-btn { width: 36px; padding: 0 !important; justify-content: center; }
        }
        .scan-import-btn:hover {
          background: rgba(0, 255, 221, 0.11) !important;
          border-color: rgba(0, 255, 221, 0.38) !important;
          transform: translateY(-1px);
          box-shadow: 0 0 18px rgba(0, 255, 221, 0.10);
        }
        .scan-import-btn:active {
          transform: translateY(0);
          box-shadow: none;
        }
        .topbar-icon-btn:hover {
          background: rgba(255, 255, 255, 0.08) !important;
          border-color: rgba(255, 255, 255, 0.14) !important;
          color: var(--text-primary) !important;
        }
        .animate-bell-dangle { animation: bellDangle 0.6s cubic-bezier(0.34,1.56,0.64,1); }
        @keyframes bellDangle {
          0%,100% { transform: rotate(0deg); }
          20% { transform: rotate(15deg); }
          60% { transform: rotate(-10deg); }
          80% { transform: rotate(6deg); }
        }
      `}</style>
    </header>
  )
}

function NotifDropdown({ notifications, unreadCount, onClose, onMarkAll }) {
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (!ref.current?.contains(e.target)) onClose() }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const typeColors = {
    budget_warning:   'var(--color-warning)',
    budget_exceeded:  'var(--color-danger)',
    goal_milestone:   'var(--color-brand)',
    goal_completed:   'var(--color-brand)',
    subscription_due: 'var(--color-info)',
    wisebot_tip:      'var(--color-brand)',
    system:           'var(--text-tertiary)',
  }

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.97 }}
      transition={{ duration: 0.14 }}
      style={{
        position: 'absolute', top: 'calc(100% + 10px)', right: 0,
        width: 320, background: 'var(--bg-surface)',
        border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-lg)', zIndex: 500, overflow: 'hidden',
      }}
    >
      <div style={{
        padding: '13px 16px', borderBottom: '1px solid var(--border-subtle)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
          Notifications
          {unreadCount > 0 && (
            <span style={{
              background: 'var(--color-danger)', color: '#fff',
              borderRadius: 999, padding: '1px 7px', fontSize: '0.7rem', fontWeight: 700,
            }}>
              {unreadCount}
            </span>
          )}
        </span>
        {unreadCount > 0 && (
          <button
            onClick={onMarkAll}
            style={{
              background: 'none', border: 'none', color: 'var(--color-brand)',
              fontSize: '0.75rem', cursor: 'pointer', fontFamily: 'General Sans, sans-serif', fontWeight: 500,
            }}
          >
            Mark all read
          </button>
        )}
      </div>
      <div style={{ maxHeight: 360, overflowY: 'auto' }}>
        {notifications.length === 0 ? (
          <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>
            <Bell size={22} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.35 }} />
            No notifications
          </div>
        ) : (
          notifications.slice(0, 8).map(n => (
            <div key={n.id} style={{
              padding: '11px 16px',
              borderBottom: '1px solid var(--border-subtle)',
              background: n.is_read ? 'transparent' : 'var(--color-brand-subtle)',
              display: 'flex', gap: 10, transition: 'background 0.12s ease',
            }}>
              <div style={{
                width: 7, height: 7, borderRadius: '50%', marginTop: 6, flexShrink: 0,
                background: typeColors[n.type] || 'var(--text-tertiary)',
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
                  {n.title}
                </div>
                {n.body && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                    {n.body}
                  </div>
                )}
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', marginTop: 4 }}>
                  {n.created_at ? formatDistanceToNow(new Date(n.created_at), { addSuffix: true }) : ''}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </motion.div>
  )
}

function ProfileDropdown({ user, onClose, onLogout, onNavigate }) {
  const ref = useRef(null)
  useEffect(() => {
    const handler = (e) => { if (!ref.current?.contains(e.target)) onClose() }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.97 }}
      transition={{ duration: 0.14 }}
      style={{
        position: 'absolute', top: 'calc(100% + 10px)', right: 0,
        width: 224, background: 'var(--bg-surface)',
        border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-lg)', zIndex: 500, overflow: 'hidden',
        padding: '6px',
      }}
    >
      <div style={{
        padding: '10px 12px 12px',
        borderBottom: '1px solid var(--border-subtle)',
        marginBottom: 4,
      }}>
        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
          {user?.name}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 3 }}>
          {user?.email}
        </div>
      </div>
      {[
        { icon: User, label: 'Profile', path: '/profile' },
        { icon: Settings, label: 'Preferences', path: '/preferences' },
      ].map(({ icon: Icon, label, path }) => (
        <button
          key={label}
          onClick={() => onNavigate(path)}
          style={{
            display: 'flex', alignItems: 'center', gap: 10, width: '100%',
            padding: '9px 12px', background: 'transparent', border: 'none', borderRadius: 8,
            cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '0.8125rem',
            fontFamily: 'General Sans, sans-serif', transition: 'all 0.12s ease', textAlign: 'left',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-elevated)'; e.currentTarget.style.color = 'var(--text-primary)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' }}
        >
          <Icon size={15} /> {label}
        </button>
      ))}
      <div style={{ borderTop: '1px solid var(--border-subtle)', marginTop: 4, paddingTop: 4 }}>
        <button
          onClick={onLogout}
          style={{
            display: 'flex', alignItems: 'center', gap: 10, width: '100%',
            padding: '9px 12px', background: 'transparent', border: 'none', borderRadius: 8,
            cursor: 'pointer', color: 'var(--color-danger)', fontSize: '0.8125rem',
            fontFamily: 'General Sans, sans-serif', transition: 'all 0.12s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-danger-bg)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
        >
          <LogOut size={15} /> Sign Out
        </button>
      </div>
    </motion.div>
  )
}
