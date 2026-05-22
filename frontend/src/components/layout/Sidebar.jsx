import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  LayoutDashboard, CreditCard, Target, TrendingUp,
  BarChart3, RefreshCw, ScanLine, X,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'

const NAV_ITEMS = [
  { to: '/dashboard',     label: 'Dashboard',     icon: LayoutDashboard },
  { to: '/expenses',      label: 'Expenses',       icon: CreditCard },
  { to: '/budgets',       label: 'Budgets',        icon: Target },
  { to: '/goals',         label: 'Goals',          icon: TrendingUp },
  { to: '/reports',       label: 'Reports',        icon: BarChart3 },
  { to: '/subscriptions', label: 'Subscriptions',  icon: RefreshCw },
  { to: '/import',        label: 'Smart Scan',     icon: ScanLine },
]

function Logo({ collapsed, isDark }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '20px 16px 16px',
      minHeight: 68,
    }}>
      <img
        src={isDark ? '/dm-logo.png' : '/lm-logo.png'}
        alt="SpendWise"
        style={{ height: 32, width: 'auto', flexShrink: 0, objectFit: 'contain' }}
      />
      {!collapsed && (
        <motion.span
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
          style={{
            fontFamily: 'Clash Display, sans-serif',
            fontSize: '1.125rem',
            fontWeight: 700,
            color: 'var(--text-primary)',
            letterSpacing: '-0.03em',
            whiteSpace: 'nowrap',
          }}
        >
          SpendWise
        </motion.span>
      )}
    </div>
  )
}

export default function Sidebar({ collapsed, mobileOpen, onMobileClose }) {
  const { user } = useAuth()
  const { isDark } = useTheme()

  const sidebarBase = {
    width: collapsed ? 72 : 240,
    height: '100vh',
    position: 'fixed',
    left: 0,
    top: 0,
    background: 'var(--gradient-sidebar)',
    borderRight: '1px solid var(--border-subtle)',
    boxShadow: isDark ? '2px 0 24px rgba(0, 0, 0, 0.60)' : 'none',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 200,
    transition: 'width 0.25s cubic-bezier(0.4,0,0.2,1)',
    overflowX: 'hidden',
  }

  const mobileSidebarStyle = {
    ...sidebarBase,
    width: 240,
    transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
    transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
    zIndex: 300,
  }

  return (
    <>
      {/* Desktop sidebar */}
      <nav style={sidebarBase} className="desktop-sidebar">
        <Logo collapsed={collapsed} isDark={isDark} />
        <div style={{ width: collapsed ? 40 : 200, height: 1, background: 'var(--border-subtle)', margin: '0 auto 6px' }} />
        <NavItems collapsed={collapsed} user={user} />
      </nav>

      {/* Mobile sidebar */}
      <nav style={mobileSidebarStyle} className="mobile-sidebar">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: 14 }}>
          <Logo collapsed={false} isDark={isDark} />
          <button
            onClick={onMobileClose}
            style={{
              width: 30, height: 30, borderRadius: 8, border: '1px solid var(--border-default)',
              background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-tertiary)', flexShrink: 0,
            }}
          >
            <X size={15} />
          </button>
        </div>
        <div style={{ width: 200, height: 1, background: 'var(--border-subtle)', margin: '0 auto 6px' }} />
        <NavItems collapsed={false} user={user} />
      </nav>

      <style>{`
        @media (min-width: 769px) { .mobile-sidebar { display: none !important; } }
        @media (max-width: 768px) { .desktop-sidebar { display: none !important; } }
      `}</style>
    </>
  )
}

function NavItems({ collapsed, user }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '4px 0 12px' }}>
      <div style={{ flex: 1, padding: '0 8px' }}>
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: collapsed ? 0 : 11,
              padding: collapsed ? '11px 0' : '10px 13px',
              justifyContent: collapsed ? 'center' : 'flex-start',
              margin: '2px 0',
              borderRadius: 10,
              textDecoration: 'none',
              color: isActive ? 'var(--color-brand)' : 'var(--text-secondary)',
              background: isActive ? 'rgba(0, 255, 221, 0.08)' : 'transparent',
              border: isActive ? '1px solid rgba(0, 255, 221, 0.14)' : '1px solid transparent',
              boxShadow: isActive ? '0 0 16px rgba(0, 255, 221, 0.05)' : 'none',
              fontWeight: isActive ? 600 : 450,
              fontSize: '0.8375rem',
              fontFamily: 'General Sans, sans-serif',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              position: 'relative',
            })}
            onMouseEnter={e => {
              const link = e.currentTarget
              const isActive = link.getAttribute('aria-current') === 'page'
              if (!isActive) {
                link.style.background = 'rgba(255, 255, 255, 0.05)'
                link.style.color = 'var(--text-primary)'
                link.style.borderColor = 'rgba(255, 255, 255, 0.06)'
              }
            }}
            onMouseLeave={e => {
              const link = e.currentTarget
              const isActive = link.getAttribute('aria-current') === 'page'
              if (!isActive) {
                link.style.background = 'transparent'
                link.style.color = 'var(--text-secondary)'
                link.style.borderColor = 'transparent'
              }
            }}
          >
            {({ isActive }) => (
              <>
                <Icon
                  size={17}
                  strokeWidth={isActive ? 2.2 : 1.75}
                  style={{ flexShrink: 0, color: isActive ? 'var(--color-brand)' : 'inherit' }}
                />
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.15 }}
                    style={{ letterSpacing: '-0.01em' }}
                  >
                    {label}
                  </motion.span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>

      {/* User profile section */}
      <div style={{
        margin: '8px 8px 0',
        borderTop: '1px solid var(--border-subtle)',
        paddingTop: 12,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: collapsed ? '10px 0' : '10px 12px',
          justifyContent: collapsed ? 'center' : 'flex-start',
          borderRadius: 10,
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-subtle)',
        }}>
          <div style={{
            width: 32, height: 32,
            borderRadius: '50%',
            background: 'rgba(0, 255, 221, 0.10)',
            border: '1.5px solid rgba(0, 255, 221, 0.28)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--color-brand)',
            fontWeight: 700, fontSize: '0.8125rem',
            fontFamily: 'Clash Display, sans-serif',
            flexShrink: 0,
          }}>
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.15 }}
              style={{ minWidth: 0, flex: 1 }}
            >
              <div style={{
                fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)',
                lineHeight: 1.25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {user?.name || 'User'}
              </div>
              <div style={{
                fontSize: '0.6875rem', color: 'var(--text-tertiary)', marginTop: 2,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {user?.email || ''}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}
