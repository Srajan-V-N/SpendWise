import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import {
  TrendingUp, Shield, Target, BarChart3, Sparkles, RefreshCw,
  CheckCircle, ArrowRight, Star, ChevronDown, ChevronUp,
  Zap, Award, Users, DollarSign,
} from 'lucide-react'

const FEATURES = [
  { icon: TrendingUp, title: 'Expense Tracking', desc: 'Log every transaction instantly. Import from bank statements, UPI apps, and CSV files with intelligent parsing.' },
  { icon: Target, title: 'Smart Budgets', desc: 'Set category budgets and get alerts before you overspend. Our AI forecasts your month-end spending.' },
  { icon: Award, title: 'Savings Goals', desc: 'Define financial goals with deadlines. Track progress with animated rings and celebrate milestones.' },
  { icon: BarChart3, title: 'Rich Reports', desc: 'Investor-grade analytics: trend charts, category breakdowns, financial score, and habit insights.' },
  { icon: RefreshCw, title: 'Subscription Detection', desc: 'Automatically discover recurring charges hidden in your statements. Find and cut wasteful subscriptions.' },
  { icon: Sparkles, title: 'WiseBot AI', desc: 'Your personal AI finance advisor powered by Gemini. Get contextual insights, plans, and coaching.' },
]

const TESTIMONIALS = [
  { name: 'Priya Sharma', role: 'Product Designer, Bangalore', text: "SpendWise gave me complete clarity over my finances. WiseBot caught that I was spending ₹4,200/month on subscriptions I forgot about.", rating: 5 },
  { name: 'Arjun Mehta', role: 'Software Engineer, Hyderabad', text: "The budget alerts are a game-changer. I actually stay within my limits now. The interface is incredibly polished.", rating: 5 },
  { name: 'Kavya Nair', role: 'Freelance Consultant, Mumbai', text: "Finally, a finance app that feels premium. The reports page alone is worth it — I use it for every client proposal.", rating: 5 },
]

const PRICING = [
  {
    tier: 'Free', price: '₹0', period: '/month',
    features: ['Up to 200 transactions/month', '3 Budget categories', '2 Savings goals', 'Basic reports', 'WiseBot (5 queries/day)'],
    cta: 'Get Started Free', highlight: false,
  },
  {
    tier: 'Plus', price: '₹199', period: '/month',
    features: ['Unlimited transactions', 'Unlimited budgets & goals', 'Import from files', 'Full reports & analytics', 'WiseBot (unlimited)', 'Priority support'],
    cta: 'Start Free Trial', highlight: true,
  },
  {
    tier: 'Pro', price: '₹499', period: '/month',
    features: ['Everything in Plus', 'Multi-account support', 'Custom categories', 'API access', 'Advanced AI insights', 'Dedicated advisor'],
    cta: 'Contact Sales', highlight: false,
  },
]

const FAQS = [
  { q: 'Is my financial data secure?', a: 'Absolutely. We use bank-grade encryption, never store passwords in plain text, and our servers are SOC2 compliant. Your data is only visible to you.' },
  { q: 'Can I import from Paytm, GPay, or PhonePe?', a: 'Yes! You can download your transaction history as CSV from these apps and upload directly. SpendWise intelligently parses and categorizes them.' },
  { q: 'How does WiseBot work?', a: 'WiseBot is powered by Google Gemini AI and has full context of your spending data. It gives personalized, data-driven advice — not generic tips.' },
  { q: 'Is there a free plan?', a: 'Yes, SpendWise has a generous free tier with 200 transactions/month, basic budgets, and goals. Upgrade anytime for unlimited access.' },
  { q: 'Can I export my data?', a: 'Yes, you can export your transactions, reports, and analytics as CSV or PDF at any time. Your data is always yours.' },
]

function FadeInSection({ children, delay = 0 }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1], delay }}
    >
      {children}
    </motion.div>
  )
}

function SpendWiseLogo({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40">
      <rect x="4" y="14" width="32" height="18" rx="4" fill="rgba(0,255,221,0.25)" />
      <rect x="4" y="9" width="32" height="18" rx="4" fill="rgba(0,255,221,0.55)" />
      <rect x="4" y="4" width="32" height="18" rx="4" fill="#00FFDD" />
      <rect x="4" y="14" width="32" height="4" fill="rgba(0,17,15,0.25)" />
      <circle cx="31" cy="15.5" r="2" fill="rgba(0,17,15,0.35)" />
    </svg>
  )
}

export default function Landing() {
  const navigate = useNavigate()
  const [openFaq, setOpenFaq] = useState(null)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <div style={{ background: 'var(--bg-base)', color: 'var(--text-primary)', overflowX: 'hidden' }}>
      {/* NAVBAR */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        padding: '0 2rem', height: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        transition: 'all 0.3s ease',
        background: scrolled ? 'rgba(5,25,23,0.9)' : 'transparent',
        backdropFilter: scrolled ? 'blur(16px)' : 'none',
        borderBottom: scrolled ? '1px solid var(--border-subtle)' : 'none',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <SpendWiseLogo size={36} />
          <span style={{ fontFamily: 'Clash Display, sans-serif', fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
            SpendWise
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => navigate('/login')} className="btn-ghost" style={{ padding: '8px 16px', fontSize: '0.875rem' }}>
            Sign In
          </button>
          <button onClick={() => navigate('/signup')} className="btn-primary" style={{ padding: '8px 18px', fontSize: '0.875rem' }}>
            Get Started
          </button>
        </div>
      </nav>

      {/* HERO */}
      <section style={{
        minHeight: '100vh',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '100px 2rem 4rem',
        background: `radial-gradient(ellipse 80% 60% at 50% -10%, rgba(0,255,221,0.10) 0%, transparent 70%), var(--gradient-hero)`,
        textAlign: 'center',
        position: 'relative',
      }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <div className="badge badge-brand" style={{ marginBottom: 20, padding: '6px 16px' }}>
            <Sparkles size={12} />
            <span>AI-Powered Personal Finance</span>
          </div>

          <h1 style={{
            fontFamily: 'Clash Display, sans-serif',
            fontSize: 'clamp(2.5rem, 7vw, 5rem)',
            fontWeight: 700,
            lineHeight: 1.08,
            letterSpacing: '-0.03em',
            marginBottom: '1.5rem',
            maxWidth: 800,
            margin: '0 auto 1.5rem',
          }}>
            Take Control of{' '}
            <span className="text-gradient">Your Money</span>
            {' '}with Intelligence
          </h1>

          <p style={{
            fontSize: 'clamp(1rem, 2vw, 1.25rem)',
            color: 'var(--text-secondary)',
            maxWidth: 580,
            margin: '0 auto 2.5rem',
            lineHeight: 1.65,
          }}>
            SpendWise helps you track expenses, crush budgets, achieve goals, and grow your wealth — guided by your personal AI financial advisor.
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <motion.button
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/signup')}
              className="btn-primary"
              style={{ padding: '14px 28px', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}
            >
              Start for Free
              <ArrowRight size={18} />
            </motion.button>
            <button
              onClick={() => navigate('/login')}
              className="btn-ghost"
              style={{ padding: '14px 24px', fontSize: '1rem' }}
            >
              Sign In
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 24 }}>
            {[...Array(5)].map((_, i) => <Star key={i} size={14} fill="#FFC247" color="#FFC247" />)}
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginLeft: 4 }}>
              4.9/5 · 10,000+ active users
            </span>
          </div>
        </motion.div>

        {/* Floating app cards preview */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          style={{ marginTop: 64, width: '100%', maxWidth: 900, position: 'relative' }}
        >
          <AppPreview />
        </motion.div>
      </section>

      {/* TRUST STRIP */}
      <FadeInSection>
        <section style={{
          padding: '3rem 2rem',
          borderTop: '1px solid var(--border-subtle)',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--bg-surface)',
        }}>
          <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '2rem', textAlign: 'center' }} className="trust-grid">
            {[
              { icon: Users, num: '10K+', label: 'Active Users' },
              { icon: DollarSign, num: '₹500M+', label: 'Money Tracked' },
              { icon: TrendingUp, num: '98%', label: 'Satisfaction Rate' },
              { icon: Shield, num: '256-bit', label: 'Bank-Grade Encryption' },
            ].map(({ icon: Icon, num, label }) => (
              <div key={label}>
                <Icon size={24} style={{ color: 'var(--color-brand)', marginBottom: 8 }} />
                <div style={{ fontFamily: 'Clash Display, sans-serif', fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>{num}</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: 4 }}>{label}</div>
              </div>
            ))}
          </div>
        </section>
      </FadeInSection>

      {/* FEATURES */}
      <section style={{ padding: '6rem 2rem', maxWidth: 1100, margin: '0 auto' }}>
        <FadeInSection>
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <div className="badge badge-brand" style={{ marginBottom: 16 }}>Everything You Need</div>
            <h2 style={{ fontFamily: 'Clash Display, sans-serif', fontSize: 'clamp(1.75rem, 4vw, 2.75rem)', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 12 }}>
              Finance tools that actually work
            </h2>
            <p style={{ color: 'var(--text-secondary)', maxWidth: 500, margin: '0 auto' }}>
              From daily expense logging to long-term wealth planning — SpendWise has every tool you need.
            </p>
          </div>
        </FadeInSection>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {FEATURES.map((f, i) => (
            <FadeInSection key={f.title} delay={i * 0.08}>
              <motion.div
                whileHover={{ y: -4 }}
                className="card"
                style={{ padding: '1.75rem', cursor: 'default' }}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: 'var(--color-brand-subtle)', border: '1px solid var(--border-medium)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 16,
                }}>
                  <f.icon size={20} style={{ color: 'var(--color-brand)' }} />
                </div>
                <h3 style={{ fontFamily: 'Clash Display, sans-serif', fontSize: '1.0625rem', fontWeight: 600, marginBottom: 8 }}>{f.title}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6 }}>{f.desc}</p>
              </motion.div>
            </FadeInSection>
          ))}
        </div>
      </section>

      {/* WISEBOT SECTION */}
      <FadeInSection>
        <section style={{
          padding: '5rem 2rem',
          background: 'var(--bg-surface)',
          borderTop: '1px solid var(--border-subtle)',
          borderBottom: '1px solid var(--border-subtle)',
        }}>
          <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'center' }} className="feature-grid">
            <div>
              <div className="badge badge-brand" style={{ marginBottom: 16 }}>
                <Sparkles size={12} /> AI-Powered
              </div>
              <h2 style={{ fontFamily: 'Clash Display, sans-serif', fontSize: 'clamp(1.5rem, 3.5vw, 2.25rem)', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 16, lineHeight: 1.2 }}>
                Meet WiseBot, your personal finance AI
              </h2>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 24 }}>
                WiseBot knows your spending habits, goals, and budgets. Ask anything — from "why did I overspend this month?" to "build me a savings plan for a trip to Europe."
              </p>
              {['Contextual spending analysis', 'Personalized savings strategies', 'Budget recommendations', 'Goal planning & tracking'].map(p => (
                <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <CheckCircle size={16} style={{ color: 'var(--color-brand)', flexShrink: 0 }} />
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>{p}</span>
                </div>
              ))}
            </div>
            <WiseBotPreview />
          </div>
        </section>
      </FadeInSection>

      {/* TESTIMONIALS */}
      <section style={{ padding: '6rem 2rem', maxWidth: 1000, margin: '0 auto' }}>
        <FadeInSection>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{ fontFamily: 'Clash Display, sans-serif', fontSize: 'clamp(1.5rem, 3.5vw, 2.25rem)', fontWeight: 700, letterSpacing: '-0.02em' }}>
              Loved by thousands of users
            </h2>
          </div>
        </FadeInSection>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {TESTIMONIALS.map((t, i) => (
            <FadeInSection key={t.name} delay={i * 0.1}>
              <div className="card" style={{ padding: '1.75rem' }}>
                <div style={{ display: 'flex', gap: 3, marginBottom: 12 }}>
                  {[...Array(t.rating)].map((_, j) => <Star key={j} size={14} fill="#FFC247" color="#FFC247" />)}
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.65, marginBottom: 16, fontFamily: 'DM Serif Display, serif', fontStyle: 'italic' }}>
                  "{t.text}"
                </p>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{t.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{t.role}</div>
                </div>
              </div>
            </FadeInSection>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <FadeInSection>
        <section style={{ padding: '5rem 2rem', background: 'var(--bg-surface)', borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ maxWidth: 900, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
              <div className="badge badge-brand" style={{ marginBottom: 16 }}>Simple Pricing</div>
              <h2 style={{ fontFamily: 'Clash Display, sans-serif', fontSize: 'clamp(1.5rem, 3.5vw, 2.25rem)', fontWeight: 700, letterSpacing: '-0.02em' }}>
                Start free, upgrade when ready
              </h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }} className="pricing-grid">
              {PRICING.map((p) => (
                <motion.div
                  key={p.tier}
                  whileHover={{ y: -4 }}
                  style={{
                    padding: '2rem',
                    borderRadius: 'var(--radius-xl)',
                    border: p.highlight ? '2px solid var(--color-brand)' : '1px solid var(--border-default)',
                    background: p.highlight ? 'var(--color-brand-subtle)' : 'var(--bg-elevated)',
                    position: 'relative',
                  }}
                >
                  {p.highlight && (
                    <div style={{
                      position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)',
                      background: 'var(--gradient-brand)', color: '#001A14', fontSize: '0.7rem',
                      fontWeight: 700, padding: '4px 14px', borderRadius: 999,
                      fontFamily: 'General Sans, sans-serif',
                    }}>
                      MOST POPULAR
                    </div>
                  )}
                  <div style={{ fontFamily: 'Clash Display, sans-serif', fontSize: '1.1rem', fontWeight: 700, marginBottom: 4 }}>{p.tier}</div>
                  <div style={{ marginBottom: 20 }}>
                    <span style={{ fontFamily: 'Clash Display, sans-serif', fontSize: '2rem', fontWeight: 700, color: p.highlight ? 'var(--color-brand)' : 'var(--text-primary)' }}>{p.price}</span>
                    <span style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>{p.period}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                    {p.features.map(f => (
                      <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                        <CheckCircle size={14} style={{ color: 'var(--color-brand)', marginTop: 2, flexShrink: 0 }} />
                        <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{f}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => navigate('/signup')}
                    className={p.highlight ? 'btn-primary' : 'btn-secondary'}
                    style={{ width: '100%', padding: '10px 16px', fontSize: '0.875rem' }}
                  >
                    {p.cta}
                  </button>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </FadeInSection>

      {/* FAQ */}
      <section style={{ padding: '5rem 2rem', maxWidth: 700, margin: '0 auto' }}>
        <FadeInSection>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{ fontFamily: 'Clash Display, sans-serif', fontSize: 'clamp(1.5rem, 3.5vw, 2.25rem)', fontWeight: 700, letterSpacing: '-0.02em' }}>
              Frequently asked questions
            </h2>
          </div>
        </FadeInSection>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {FAQS.map((faq, i) => (
            <FadeInSection key={i} delay={i * 0.05}>
              <div
                className="card"
                style={{ overflow: 'hidden', cursor: 'pointer' }}
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>{faq.q}</span>
                  {openFaq === i ? <ChevronUp size={18} style={{ color: 'var(--color-brand)', flexShrink: 0 }} /> : <ChevronDown size={18} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />}
                </div>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div style={{ padding: '0 20px 16px', color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.65, borderTop: '1px solid var(--border-subtle)', paddingTop: 12 }}>
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </FadeInSection>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <FadeInSection>
        <section style={{
          padding: '6rem 2rem',
          background: `radial-gradient(ellipse 80% 80% at 50% 50%, rgba(0,255,221,0.10) 0%, transparent 70%), var(--bg-surface)`,
          borderTop: '1px solid var(--border-subtle)',
          textAlign: 'center',
        }}>
          <div style={{ maxWidth: 580, margin: '0 auto' }}>
            <SpendWiseLogo size={56} />
            <h2 style={{ fontFamily: 'Clash Display, sans-serif', fontSize: 'clamp(1.75rem, 4vw, 3rem)', fontWeight: 700, letterSpacing: '-0.02em', margin: '1.25rem 0 1rem', lineHeight: 1.1 }}>
              Your financial transformation starts today
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 28, fontSize: '1rem', lineHeight: 1.6 }}>
              Join thousands of people who finally have clarity, control, and confidence over their money.
            </p>
            <motion.button
              whileHover={{ y: -2, boxShadow: 'var(--shadow-brand-lg)' }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/signup')}
              className="btn-primary"
              style={{ padding: '14px 32px', fontSize: '1rem', display: 'inline-flex', alignItems: 'center', gap: 8 }}
            >
              Get Started Free
              <ArrowRight size={18} />
            </motion.button>
            <div style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem', marginTop: 12 }}>
              No credit card required · Free forever plan available
            </div>
          </div>
        </section>
      </FadeInSection>

      {/* FOOTER */}
      <footer style={{
        borderTop: '1px solid var(--border-subtle)',
        padding: '2.5rem 2rem',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: '1rem',
        background: 'var(--bg-base)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <SpendWiseLogo size={28} />
          <span style={{ fontFamily: 'Clash Display, sans-serif', fontWeight: 700, fontSize: '1rem' }}>SpendWise</span>
        </div>
        <div style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>
          © 2026 SpendWise. All rights reserved.
        </div>
        <div style={{ display: 'flex', gap: '1.5rem' }}>
          {['Privacy', 'Terms', 'Security', 'Help'].map(l => (
            <a key={l} href="#" style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', textDecoration: 'none' }}>{l}</a>
          ))}
        </div>
      </footer>

      <style>{`
        @media (max-width: 768px) {
          .trust-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .feature-grid { grid-template-columns: 1fr !important; gap: 2rem !important; }
          .pricing-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 480px) {
          .trust-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
    </div>
  )
}

function AppPreview() {
  return (
    <div style={{ position: 'relative', padding: '1px' }}>
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-medium)',
        borderRadius: 20,
        overflow: 'hidden',
        boxShadow: 'var(--shadow-brand), 0 20px 60px rgba(0,0,0,0.5)',
        padding: '1.5rem',
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'Balance', value: '₹42,700', change: '+5.2%', positive: true },
            { label: 'Spent', value: '₹42,300', change: '-2.1%', positive: true },
            { label: 'Saved', value: '₹8,500', change: '+12%', positive: true },
            { label: 'Score', value: '74/100', change: '+3', positive: true },
          ].map(k => (
            <div key={k.label} className="card-elevated" style={{ padding: '1rem' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginBottom: 4 }}>{k.label}</div>
              <div style={{ fontFamily: 'Clash Display, sans-serif', fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{k.value}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--color-brand)' }}>↑ {k.change}</div>
            </div>
          ))}
        </div>
        <div style={{ background: 'var(--bg-elevated)', borderRadius: 12, padding: '1rem', height: 100, display: 'flex', alignItems: 'center', gap: 4 }}>
          {[40, 65, 45, 80, 55, 90, 72, 85, 60, 95, 70, 88].map((h, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%' }}>
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${h}%` }}
                transition={{ delay: i * 0.05, duration: 0.6, ease: 'easeOut' }}
                style={{ background: i === 11 ? 'var(--color-brand)' : 'var(--border-default)', borderRadius: 4, minHeight: 4 }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function WiseBotPreview() {
  const messages = [
    { role: 'user', text: "Why am I overspending on food?" },
    { role: 'bot', text: "Your food spending is **₹8,400** this month — 18% higher than last month (₹7,100). I noticed 12 Zomato orders totaling ₹3,200. **Tip:** Cooking at home just 3 extra days/week could save you ₹1,500 monthly." },
    { role: 'user', text: "Create a savings plan for my vacation goal" },
    { role: 'bot', text: "To reach ₹50,000 by January 2027, you need to save **₹4,167/month**. Based on your current ₹8,500 monthly savings, you're on track! I'll set up a dedicated goal — done!" },
  ]
  return (
    <div style={{
      background: 'var(--bg-surface)', border: '1px solid var(--border-medium)',
      borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--shadow-md)',
    }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--gradient-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Sparkles size={14} color="#001A14" />
        </div>
        <div>
          <div style={{ fontFamily: 'Clash Display, sans-serif', fontSize: '0.875rem', fontWeight: 700 }}>WiseBot</div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)' }}>AI Finance Advisor</div>
        </div>
      </div>
      <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 260, overflowY: 'auto' }}>
        {messages.map((m, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.15 }}
            style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '85%', padding: '9px 12px', borderRadius: m.role === 'user' ? '12px 12px 3px 12px' : '12px 12px 12px 3px',
              background: m.role === 'user' ? 'var(--gradient-brand)' : 'var(--bg-elevated)',
              color: m.role === 'user' ? '#001A14' : 'var(--text-primary)',
              border: m.role === 'bot' ? '1px solid var(--border-subtle)' : 'none',
              fontSize: '0.775rem', lineHeight: 1.5,
            }}>
              {m.text.replace(/\*\*(.*?)\*\*/g, '$1')}
            </div>
          </motion.div>
        ))}
      </div>
      <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>
        <div style={{ background: 'var(--bg-surface)', borderRadius: 10, padding: '8px 12px', border: '1px solid var(--border-default)', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
          Ask WiseBot anything...
        </div>
      </div>
    </div>
  )
}
