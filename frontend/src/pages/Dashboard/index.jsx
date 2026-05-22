import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'
import {
  TrendingUp, TrendingDown, Wallet, Target, Activity,
  ArrowRight, AlertTriangle,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import api from '../../api/axios'
import { useAuth } from '../../context/AuthContext'
import { KPICardSkeleton } from '../../components/ui/Skeleton'
import BrandLogo from '../../components/ui/BrandLogo'

function useCountUp(target, duration = 1200) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!target) return
    let start = 0
    const step = target / (duration / 16)
    const timer = setInterval(() => {
      start = Math.min(start + step, target)
      setVal(Math.floor(start))
      if (start >= target) clearInterval(timer)
    }, 16)
    return () => clearInterval(timer)
  }, [target, duration])
  return val
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)
}

function KPICard({ label, value, icon: Icon, trend, trendValue, color = 'var(--color-brand)', loading, isScore }) {
  const numericValue = typeof value === 'number' ? Math.abs(value) : 0
  const counted = useCountUp(loading ? 0 : numericValue)

  if (loading) return <KPICardSkeleton />

  return (
    <motion.div
      className="kpi-card"
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <span style={{
          fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)',
          textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'General Sans, sans-serif',
        }}>
          {label}
        </span>
        <div style={{
          width: 38, height: 38, borderRadius: 10,
          background: `${color}18`, border: `1px solid ${color}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={17} style={{ color }} />
        </div>
      </div>

      {isScore ? (
        <div style={{
          fontFamily: 'Clash Display, sans-serif', fontWeight: 700,
          letterSpacing: '-0.02em', marginBottom: 8,
          display: 'flex', alignItems: 'baseline', gap: 2,
        }}>
          <span style={{ fontSize: '1.75rem', color }}>{counted}</span>
          <span style={{ fontSize: '1rem', color: 'var(--text-tertiary)', fontWeight: 500 }}>/100</span>
        </div>
      ) : (
        <div style={{
          fontFamily: 'Clash Display, sans-serif', fontSize: '1.625rem', fontWeight: 700,
          color: 'var(--text-primary)', letterSpacing: '-0.025em', marginBottom: 8,
        }}>
          {typeof value === 'number'
            ? `${value < 0 ? '-' : ''}₹${counted.toLocaleString('en-IN')}`
            : (value ?? '--')}
        </div>
      )}

      {trendValue !== undefined && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.775rem' }}>
          {trend === 'up'
            ? <TrendingUp size={12} style={{ color: 'var(--color-brand)' }} />
            : <TrendingDown size={12} style={{ color: 'var(--color-danger)' }} />}
          <span style={{ color: trend === 'up' ? 'var(--color-brand)' : 'var(--color-danger)', fontWeight: 600 }}>
            {trendValue}
          </span>
          <span style={{ color: 'var(--text-tertiary)' }}>vs last month</span>
        </div>
      )}
    </motion.div>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip" style={{ padding: '10px 14px' }}>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: 6 }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: p.color }} />
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{p.name}:</span>
          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            ₹{Number(p.value).toLocaleString('en-IN')}
          </span>
        </div>
      ))}
    </div>
  )
}

const CATEGORY_COLORS = ['#00FFDD', '#4DA3FF', '#FF6B6B', '#FFC247', '#A78BFA', '#34D399', '#F472B6']

const stagger = {
  container: { hidden: {}, show: { transition: { staggerChildren: 0.07 } } },
  item: { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } },
}

function SectionCard({ children, style = {} }) {
  return (
    <motion.div
      variants={stagger.item}
      className="card"
      style={{ padding: '1.5rem', ...style }}
    >
      {children}
    </motion.div>
  )
}

function CardHeader({ title, subtitle, action }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
      <div>
        <h3 style={{
          fontFamily: 'Clash Display, sans-serif', fontWeight: 600,
          fontSize: '0.9375rem', color: 'var(--text-primary)', letterSpacing: '-0.01em',
        }}>
          {title}
        </h3>
        {subtitle && (
          <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 3 }}>
            {subtitle}
          </p>
        )}
      </div>
      {action}
    </div>
  )
}

function ViewAllLink({ href, label = 'View all' }) {
  return (
    <a href={href} style={{
      fontSize: '0.78rem', color: 'var(--color-brand)', textDecoration: 'none',
      display: 'flex', alignItems: 'center', gap: 3, fontWeight: 500,
      whiteSpace: 'nowrap',
    }}>
      {label} <ArrowRight size={12} />
    </a>
  )
}

function EmptyState({ icon: Icon, message }) {
  return (
    <div style={{
      textAlign: 'center', padding: '2.5rem 1rem',
      color: 'var(--text-tertiary)', fontSize: '0.875rem',
    }}>
      <Icon size={28} style={{ margin: '0 auto 10px', display: 'block', opacity: 0.3 }} />
      {message}
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: () => api.get('/dashboard/summary').then(r => r.data.data),
  })

  const kpis         = data?.kpis || {}
  const trend        = data?.spending_trend || []
  const topCats      = data?.top_categories || []
  const recent       = data?.recent_transactions || []
  const budgetHealth = data?.budget_health || []
  const goalsPreview = data?.goals_preview || []
  const subReminders = data?.subscription_reminders || []

  const trendFormatted = trend.map(t => ({
    ...t,
    label: t.date ? format(parseISO(t.date), 'dd MMM') : '',
  }))

  const scoreColor = (kpis.financial_score ?? 0) >= 70
    ? 'var(--color-brand)'
    : (kpis.financial_score ?? 0) >= 50
    ? 'var(--color-warning)'
    : 'var(--color-danger)'

  return (
    <div style={{ padding: '1.75rem 2rem 2.5rem', minHeight: 'calc(100vh - var(--topbar-height))' }}>

      {/* Welcome */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        style={{ marginBottom: '2rem' }}
      >
        <h2 style={{
          fontFamily: 'Clash Display, sans-serif', fontSize: '1.5rem',
          fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--text-primary)',
        }}>
          {greeting()}, {user?.name?.split(' ')[0] || 'there'}
        </h2>
        <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem', marginTop: 5 }}>
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </motion.div>

      {/* KPI Cards */}
      <motion.div
        variants={stagger.container}
        initial="hidden"
        animate="show"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          marginBottom: '1.75rem',
        }}
      >
        <motion.div variants={stagger.item}>
          <KPICard label="Net Balance" value={kpis.net_balance} icon={Wallet} trend={kpis.net_balance >= 0 ? 'up' : 'down'} loading={isLoading} />
        </motion.div>
        <motion.div variants={stagger.item}>
          <KPICard label="Spent This Month" value={kpis.total_expenses} icon={TrendingDown} color="var(--color-danger)" trend="down" loading={isLoading} />
        </motion.div>
        <motion.div variants={stagger.item}>
          <KPICard label="Income" value={kpis.total_income} icon={TrendingUp} color="var(--color-brand)" trend="up" loading={isLoading} />
        </motion.div>
        <motion.div variants={stagger.item}>
          <KPICard
            label="Financial Score"
            value={kpis.financial_score ?? 0}
            icon={Activity}
            color={scoreColor}
            loading={isLoading}
            isScore={true}
          />
        </motion.div>
      </motion.div>

      {/* Main Grid: Chart + Category */}
      <motion.div
        variants={stagger.container}
        initial="hidden"
        animate="show"
        style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.25rem', marginBottom: '1.25rem' }}
        className="dash-grid"
      >
        {/* Spending Trend */}
        <SectionCard>
          <CardHeader
            title="Spending Trend"
            subtitle="Daily income & expenses this month"
          />
          {isLoading ? (
            <div className="skeleton" style={{ height: 220, borderRadius: 12 }} />
          ) : trendFormatted.length === 0 ? (
            <EmptyState icon={TrendingUp} message="No activity recorded yet" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={trendFormatted} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00FFDD" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="#00FFDD" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="incGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4DA3FF" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="#4DA3FF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#00FFDD" strokeWidth={2} fill="url(#expGrad)" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                <Area type="monotone" dataKey="income" name="Income" stroke="#4DA3FF" strokeWidth={2} fill="url(#incGrad)" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </SectionCard>

        {/* Top Categories */}
        <SectionCard>
          <CardHeader title="Top Categories" subtitle="By spend this month" />
          {isLoading ? (
            <div className="skeleton" style={{ height: 200, borderRadius: 12 }} />
          ) : topCats.length === 0 ? (
            <EmptyState icon={Target} message="No expenses this month" />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={148}>
                <PieChart>
                  <Pie
                    data={topCats} dataKey="amount" nameKey="name"
                    cx="50%" cy="50%" innerRadius={42} outerRadius={68} strokeWidth={0}
                  >
                    {topCats.map((c, i) => (
                      <Cell key={i} fill={c.color || CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v) => `₹${Number(v).toLocaleString('en-IN')}`}
                    contentStyle={{
                      background: 'var(--bg-elevated)', border: '1px solid var(--border-medium)',
                      borderRadius: 10, fontFamily: 'General Sans', color: 'var(--text-primary)',
                    }}
                    labelStyle={{ color: 'var(--text-primary)' }}
                    itemStyle={{ color: 'var(--text-primary)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 6 }}>
                {topCats.slice(0, 4).map((c, i) => (
                  <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                      background: c.color || CATEGORY_COLORS[i % CATEGORY_COLORS.length],
                    }} />
                    <span style={{ flex: 1, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{c.name}</span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>{c.percentage}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </SectionCard>
      </motion.div>

      {/* Bottom Row */}
      <motion.div
        variants={stagger.container}
        initial="hidden"
        animate="show"
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.25rem' }}
        className="dash-bottom"
      >
        {/* Recent Transactions */}
        <SectionCard>
          <CardHeader
            title="Recent Transactions"
            action={<ViewAllLink href="/expenses" />}
          />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} style={{ padding: '9px 0', display: 'flex', gap: 10, borderBottom: '1px solid var(--border-subtle)' }}>
                  <div className="skeleton" style={{ width: 34, height: 34, borderRadius: 8, flexShrink: 0 }} />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7, justifyContent: 'center' }}>
                    <div className="skeleton" style={{ height: 11, width: '65%' }} />
                    <div className="skeleton" style={{ height: 9, width: '40%' }} />
                  </div>
                  <div className="skeleton" style={{ height: 13, width: 60, alignSelf: 'center' }} />
                </div>
              ))
            ) : recent.length === 0 ? (
              <EmptyState icon={Wallet} message="No transactions yet" />
            ) : (
              recent.map(t => (
                <div key={t.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 0', borderBottom: '1px solid var(--border-subtle)',
                }}>
                  <BrandLogo name={t.merchant || t.title} size={44} color={t.category?.color} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '0.8375rem', fontWeight: 600, color: 'var(--text-primary)',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {t.title}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: 1 }}>
                      {t.date ? format(parseISO(t.date), 'dd MMM') : ''} · {t.category?.name || 'Other'}
                    </div>
                  </div>
                  <span style={{
                    fontSize: '0.875rem', fontWeight: 700, flexShrink: 0,
                    color: t.type === 'income' ? 'var(--color-brand)' : 'var(--text-primary)',
                  }}>
                    {t.type === 'income' ? '+' : '−'}₹{Number(t.amount).toLocaleString('en-IN')}
                  </span>
                </div>
              ))
            )}
          </div>
        </SectionCard>

        {/* Budget Health */}
        <SectionCard>
          <CardHeader
            title="Budget Health"
            action={<ViewAllLink href="/budgets" label="Manage" />}
          />
          {budgetHealth.length === 0 && !isLoading ? (
            <EmptyState icon={Target} message="No budgets set up yet" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {(isLoading ? Array.from({ length: 3 }) : budgetHealth).map((b, i) =>
                isLoading ? (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div className="skeleton" style={{ height: 11, width: '70%' }} />
                    <div className="skeleton" style={{ height: 6, borderRadius: 3 }} />
                  </div>
                ) : (
                  <div key={b.budget_id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>{b.name}</span>
                      <span style={{
                        fontSize: '0.75rem', fontWeight: 700,
                        color: b.status === 'safe' ? 'var(--color-brand)' : b.status === 'warning' ? 'var(--color-warning)' : 'var(--color-danger)',
                      }}>
                        {b.percentage}%
                      </span>
                    </div>
                    <div className="progress-track" style={{ height: 5 }}>
                      <motion.div
                        className="progress-fill"
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, b.percentage)}%` }}
                        transition={{ duration: 1, ease: [0.4, 0, 0.2, 1], delay: i * 0.1 }}
                        style={{
                          background: b.status === 'safe'
                            ? 'var(--color-brand)'
                            : b.status === 'warning'
                            ? 'var(--color-warning)'
                            : 'var(--color-danger)',
                        }}
                      />
                    </div>
                    <div style={{ fontSize: '0.69rem', color: 'var(--text-tertiary)', marginTop: 4 }}>
                      ₹{b.spent?.toLocaleString('en-IN')} of ₹{b.limit?.toLocaleString('en-IN')}
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </SectionCard>

        {/* Goals + Subscriptions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Goals */}
          <SectionCard style={{ padding: '1.25rem' }}>
            <CardHeader
              title="Goals"
              action={<ViewAllLink href="/goals" />}
            />
            {goalsPreview.length === 0 && !isLoading ? (
              <div style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem', textAlign: 'center', padding: '1rem 0' }}>
                No active goals
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                {goalsPreview.slice(0, 3).map(g => (
                  <div key={g.goal_id} style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                    <ProgressRing pct={g.percentage} size={36} stroke={3} color={g.color || 'var(--color-brand)'} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {g.title}
                      </div>
                      <div style={{ fontSize: '0.69rem', color: 'var(--text-tertiary)', marginTop: 1 }}>
                        {g.days_left != null ? `${g.days_left}d left` : 'No deadline'}
                      </div>
                    </div>
                    <span style={{
                      fontSize: '0.78rem', fontWeight: 700, flexShrink: 0,
                      color: g.color || 'var(--color-brand)',
                    }}>
                      {g.percentage}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Subscription reminders */}
          {subReminders.length > 0 && (
            <motion.div
              variants={stagger.item}
              className="card"
              style={{
                padding: '1.25rem',
                background: 'var(--color-warning-bg)',
                borderColor: 'rgba(255, 194, 71, 0.28)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <AlertTriangle size={15} style={{ color: 'var(--color-warning)' }} />
                <span style={{ fontSize: '0.8375rem', fontWeight: 600, color: 'var(--color-warning)' }}>
                  Upcoming Payments
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {subReminders.slice(0, 3).map(s => (
                  <div key={s.subscription_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>{s.name}</span>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-warning)' }}>
                        ₹{s.amount?.toLocaleString('en-IN')}
                      </div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)' }}>
                        in {s.days_until} day{s.days_until !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>

      <style>{`
        @media (max-width: 1100px) {
          .dash-grid { grid-template-columns: 1fr !important; }
          .dash-bottom { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 768px) {
          .dash-bottom { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}

function ProgressRing({ pct, size = 48, stroke = 4, color = 'var(--color-brand)' }) {
  const radius = (size - stroke) / 2
  const circ = 2 * Math.PI * radius
  const offset = circ - (Math.min(100, pct) / 100) * circ

  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--border-subtle)" strokeWidth={stroke} />
      <motion.circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1] }}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  )
}
