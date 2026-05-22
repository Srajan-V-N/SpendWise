import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import {
  TrendingUp, TrendingDown, DollarSign, PiggyBank, Download,
  Calendar, ArrowUpRight, ArrowDownRight, Award, Target, Shield, Zap,
} from 'lucide-react'
import api from '../../api/axios'
import { format, subMonths, endOfMonth } from 'date-fns'

function fmt(n) { return `₹${Number(n || 0).toLocaleString('en-IN')}` }
function pct(n) { return `${Number(n || 0).toFixed(1)}%` }

const CHART_COLORS = ['#00FFDD', '#4DA3FF', '#FFC247', '#FF5A6B', '#A78BFA', '#34D399', '#FB923C', '#F472B6']

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 10, padding: '10px 14px', boxShadow: 'var(--shadow-lg)' }}>
      <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', marginBottom: 6 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color }} />
          <span style={{ color: 'var(--text-secondary)' }}>{p.name}:</span>
          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>₹{Number(p.value || 0).toLocaleString('en-IN')}</span>
        </div>
      ))}
    </div>
  )
}

const ScoreGauge = ({ score }) => {
  const radius = 70
  const stroke = 10
  const nr = radius - stroke / 2
  const half = nr * Math.PI
  const offset = half - (score / 100) * half
  const color = score >= 80 ? '#00FFDD' : score >= 60 ? '#4DA3FF' : score >= 40 ? '#FFC247' : '#FF5A6B'
  const label = score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Needs Work'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width={radius * 2} height={radius + stroke + 4} style={{ overflow: 'visible' }}>
        <path d={`M ${stroke/2} ${radius} A ${nr} ${nr} 0 0 1 ${radius*2-stroke/2} ${radius}`}
          fill="none" stroke="var(--border-strong)" strokeWidth={stroke} strokeLinecap="round" />
        <motion.path d={`M ${stroke/2} ${radius} A ${nr} ${nr} 0 0 1 ${radius*2-stroke/2} ${radius}`}
          fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={`${half} ${half}`}
          initial={{ strokeDashoffset: half }} animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.4, ease: [0.4, 0, 0.2, 1] }}
          />
        <text x={radius} y={radius - 4} textAnchor="middle" fill="var(--text-primary)"
          style={{ fontFamily: 'Clash Display, sans-serif', fontSize: '2rem', fontWeight: 700 }}>{score}</text>
        <text x={radius} y={radius + 16} textAnchor="middle" fill={color}
          style={{ fontSize: '0.7rem', fontWeight: 600 }}>{label}</text>
      </svg>
    </div>
  )
}

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function periodLabel(str, groupBy) {
  if (!str) return String(str)
  const s = String(str)
  if (groupBy === 'month' && /^\d{4}-\d{2}$/.test(s)) {
    const [y, m] = s.split('-')
    return `${MONTH_NAMES[Number(m) - 1]} '${y.slice(2)}`
  }
  if (groupBy === 'week' && /^\d{5,6}$/.test(s)) {
    const week = parseInt(s.slice(-2), 10)
    const yr   = s.slice(2, 4)
    return `W${week} '${yr}`
  }
  if (groupBy === 'day' && /^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [, m, d] = s.split('-')
    return `${Number(d)} ${MONTH_NAMES[Number(m) - 1]}`
  }
  return s
}

export default function Reports() {
  const [groupBy, setGroupBy] = useState('month')
  const [startDate, setStartDate] = useState(format(subMonths(new Date(), 5), 'yyyy-MM-01'))
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'))

  const summaryParams = { start_date: startDate, end_date: endDate, group_by: groupBy }
  const catParams     = { start_date: startDate, end_date: endDate }

  const { data: summaryData, isLoading: loadingSummary } = useQuery({
    queryKey: ['reports-summary', startDate, endDate, groupBy],
    queryFn: () => api.get('/reports/summary', { params: summaryParams }).then(r => r.data.data),
  })

  const { data: trendsData, isLoading: loadingTrends } = useQuery({
    queryKey: ['reports-trends'],
    queryFn: () => api.get('/reports/trends', { params: { months: 6 } }).then(r => r.data.data),
    staleTime: 60_000,
  })

  const { data: catData, isLoading: loadingCat } = useQuery({
    queryKey: ['reports-categories', startDate, endDate],
    queryFn: () => api.get('/reports/categories', { params: catParams }).then(r => r.data.data),
  })

  const { data: scoreData, isLoading: loadingScore } = useQuery({
    queryKey: ['reports-score'],
    queryFn: () => api.get('/reports/financial-score').then(r => r.data.data),
    staleTime: 5 * 60_000,
  })

  const totals     = summaryData?.totals    || {}
  const byPeriod   = summaryData?.by_period || []
  const categories = catData?.categories    || []
  const trends6m   = trendsData?.trends     || []
  const score      = scoreData || {}

  const trendChartData = useMemo(() =>
    byPeriod.map(row => ({
      label: periodLabel(row.period, groupBy),
      Income:   row.income   || 0,
      Expenses: row.expenses || 0,
    })),
  [byPeriod, groupBy])

  const hasChartData = trendChartData.length > 0

  const kpis = [
    { label: 'Total Income',   value: fmt(totals.income),   color: 'var(--color-brand)',  icon: TrendingUp },
    { label: 'Total Expenses', value: fmt(totals.expenses), color: 'var(--color-danger)', icon: TrendingDown },
    { label: 'Net Savings',    value: fmt(totals.net),      color: (totals.net ?? 0) >= 0 ? 'var(--color-info)' : 'var(--color-danger)', icon: PiggyBank },
    { label: 'Savings Rate',   value: pct(totals.savings_rate), color: (totals.savings_rate ?? 0) >= 20 ? 'var(--color-brand)' : (totals.savings_rate ?? 0) >= 10 ? '#FFC247' : 'var(--color-danger)', icon: DollarSign },
  ]

  const handleExport = () => {
    const rows = [
      ['Period', 'Income', 'Expenses', 'Net'],
      ...byPeriod.map(r => [
        periodLabel(r.period, groupBy),
        r.income || 0,
        r.expenses || 0,
        (r.income || 0) - (r.expenses || 0),
      ]),
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `spendwise-report-${startDate}-${endDate}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const scoreComponents = [
    { key: 'savings_rate',     label: 'Savings Rate',     icon: PiggyBank, value: score.components?.savings_rate?.score     || 0 },
    { key: 'budget_adherence', label: 'Budget Adherence', icon: Target,    value: score.components?.budget_adherence?.score || 0 },
    { key: 'goal_progress',    label: 'Goal Progress',    icon: Award,     value: score.components?.goal_progress?.score    || 0 },
    { key: 'consistency',      label: 'Consistency',      icon: Shield,    value: score.components?.consistency?.score      || 0 },
  ]

  const trendDirection = trendsData?.trend_direction || 'stable'

  return (
    <div style={{ padding: '1.5rem 2rem', minHeight: 'calc(100vh - var(--topbar-height))' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: 'Clash Display, sans-serif', fontSize: '1.375rem', fontWeight: 700, marginBottom: 2 }}>Financial Reports</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>Detailed analysis of your financial health</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 10, padding: '7px 12px' }}>
            <Calendar size={14} style={{ color: 'var(--text-tertiary)' }} />
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              style={{ background: 'none', border: 'none', fontSize: '0.8rem', color: 'var(--text-primary)', outline: 'none', cursor: 'pointer' }} />
            <span style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>→</span>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              style={{ background: 'none', border: 'none', fontSize: '0.8rem', color: 'var(--text-primary)', outline: 'none', cursor: 'pointer' }} />
          </div>
          <select value={groupBy} onChange={e => setGroupBy(e.target.value)}
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 10, padding: '8px 12px', fontSize: '0.8rem', color: 'var(--text-primary)', cursor: 'pointer', outline: 'none' }}>
            <option value="day">Daily</option>
            <option value="week">Weekly</option>
            <option value="month">Monthly</option>
          </select>
          <button onClick={handleExport}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', fontSize: '0.8rem', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 10, color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600 }}>
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {kpis.map((k, i) => (
          <motion.div key={k.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }} whileHover={{ y: -3 }} className="kpi-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <span style={{ fontSize: '0.73rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k.label}</span>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: `${k.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <k.icon size={16} style={{ color: k.color }} />
              </div>
            </div>
            <div style={{ fontFamily: 'Clash Display, sans-serif', fontSize: '1.4rem', fontWeight: 700, color: k.color }}>
              {loadingSummary ? <div className="skeleton" style={{ height: 28, width: '70%' }} /> : k.value}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.25rem', marginBottom: '1.25rem' }}>

        {/* Income vs Expenses Chart */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <div style={{ fontFamily: 'Clash Display, sans-serif', fontWeight: 600, fontSize: '1rem' }}>Income vs Expenses</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 2 }}>By {groupBy}</div>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              {[{ color: '#00FFDD', label: 'Income' }, { color: '#FF5A6B', label: 'Expenses' }].map(l => (
                <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: l.color }} />{l.label}
                </div>
              ))}
            </div>
          </div>
          {loadingSummary ? (
            <div className="skeleton" style={{ height: 260 }} />
          ) : !hasChartData ? (
            <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>No transactions recorded in this period</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={trendChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00FFDD" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#00FFDD" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF5A6B" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#FF5A6B" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} interval={Math.max(0, Math.floor(trendChartData.length / 8) - 1)} />
                <YAxis tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false}
                  width={60}
                  domain={[0, dataMax => Math.ceil(dataMax * 1.15) || 100]}
                  tickFormatter={v => {
                    if (v === 0) return '₹0'
                    if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`
                    if (v >= 1000) return `₹${(v / 1000).toFixed(0)}k`
                    return `₹${Math.round(v)}`
                  }} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="Income" stroke="#00FFDD" strokeWidth={2.5} fill="url(#incomeGrad)" dot={false} activeDot={{ r: 5, fill: '#00FFDD' }} />
                <Area type="monotone" dataKey="Expenses" stroke="#FF5A6B" strokeWidth={2.5} fill="url(#expGrad)" dot={false} activeDot={{ r: 5, fill: '#FF5A6B' }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        {/* Financial Score */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="card" style={{ padding: '1.5rem' }}>
          <div style={{ fontFamily: 'Clash Display, sans-serif', fontWeight: 600, fontSize: '1rem', marginBottom: '1.25rem' }}>Financial Score</div>
          {loadingScore ? (
            <div className="skeleton" style={{ height: 220 }} />
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                <ScoreGauge score={score.score || 0} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {scoreComponents.map(c => (
                  <div key={c.key}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <c.icon size={13} style={{ color: 'var(--text-tertiary)' }} />
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{c.label}</span>
                      </div>
                      <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)' }}>{c.value}/25</span>
                    </div>
                    <div className="progress-track" style={{ height: 5 }}>
                      <motion.div className="progress-fill"
                        initial={{ width: 0 }} animate={{ width: `${(c.value / 25) * 100}%` }}
                        transition={{ duration: 1, ease: [0.4, 0, 0.2, 1] }}
                        style={{ background: c.value >= 20 ? '#00FFDD' : c.value >= 12 ? '#4DA3FF' : '#FFC247' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </motion.div>
      </div>

      {/* Categories + 6-Month Trends */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>

        {/* Category Breakdown */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="card" style={{ padding: '1.5rem' }}>
          <div style={{ fontFamily: 'Clash Display, sans-serif', fontWeight: 600, fontSize: '1rem', marginBottom: '1.25rem' }}>Spending by Category</div>
          {loadingCat ? (
            <div className="skeleton" style={{ height: 240 }} />
          ) : categories.length === 0 ? (
            <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>No data</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={categories.slice(0, 8)} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                  <XAxis type="number" tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }} axisLine={false} tickLine={false}
                    tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} width={90} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                  <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                    {categories.slice(0, 8).map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
                {categories.slice(0, 8).map((c, i) => (
                  <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: CHART_COLORS[i % CHART_COLORS.length] }} />
                    {c.name} ({pct(c.percentage)})
                  </div>
                ))}
              </div>
            </>
          )}
        </motion.div>

        {/* 6-Month Trends */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="card" style={{ padding: '1.5rem' }}>
          <div style={{ fontFamily: 'Clash Display, sans-serif', fontWeight: 600, fontSize: '1rem', marginBottom: '1.25rem' }}>6-Month Trend</div>
          {loadingTrends ? (
            <div className="skeleton" style={{ height: 240 }} />
          ) : trends6m.length === 0 ? (
            <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>No trend data</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={trends6m.map(r => ({
                    label: periodLabel(r.month, 'month'),
                    Income: r.income,
                    Expenses: r.expenses,
                  }))}
                  margin={{ top: 5, right: 5, left: -10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }} axisLine={false} tickLine={false}
                    tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                  <Bar dataKey="Income" fill="#00FFDD" radius={[3, 3, 0, 0]} fillOpacity={0.85} />
                  <Bar dataKey="Expenses" fill="#FF5A6B" radius={[3, 3, 0, 0]} fillOpacity={0.85} />
                </BarChart>
              </ResponsiveContainer>
              <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Zap size={13} style={{ color: trendDirection === 'improving' ? 'var(--color-brand)' : trendDirection === 'worsening' ? 'var(--color-danger)' : '#FFC247' }} />
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  Spending trend is{' '}
                  <strong style={{ color: trendDirection === 'improving' ? 'var(--color-brand)' : trendDirection === 'worsening' ? 'var(--color-danger)' : '#FFC247' }}>
                    {trendDirection}
                  </strong>
                </span>
              </div>
            </>
          )}
        </motion.div>
      </div>

      {/* AI Insights */}
      {(scoreData?.insights?.length > 0) && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="card" style={{ padding: '1.5rem' }}>
          <div style={{ fontFamily: 'Clash Display, sans-serif', fontWeight: 600, fontSize: '1rem', marginBottom: '1rem' }}>Key Insights</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
            {scoreData.insights.map((insight, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.05 }}
                style={{ display: 'flex', gap: 10, padding: '12px 14px', background: 'var(--bg-elevated)', borderRadius: 10, border: '1px solid var(--border-subtle)' }}>
                <Zap size={15} style={{ color: 'var(--color-brand)', flexShrink: 0, marginTop: 1 }} />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{insight}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  )
}
