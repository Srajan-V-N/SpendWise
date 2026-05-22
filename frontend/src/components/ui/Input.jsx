export function Input({ label, error, hint, icon: Icon, className = '', ...props }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && (
        <label style={{
          fontSize: '0.8125rem', fontWeight: 600,
          color: 'var(--text-secondary)',
          fontFamily: 'General Sans, sans-serif',
        }}>
          {label}
        </label>
      )}
      <div style={{ position: 'relative' }}>
        {Icon && (
          <div style={{
            position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
            color: 'var(--text-tertiary)', pointerEvents: 'none',
          }}>
            <Icon size={16} />
          </div>
        )}
        <input
          className={`input ${className}`}
          style={{
            paddingLeft: Icon ? 38 : 12,
            paddingRight: 12,
            paddingTop: 10,
            paddingBottom: 10,
            fontSize: '0.875rem',
            borderColor: error ? 'var(--color-danger)' : undefined,
          }}
          {...props}
        />
      </div>
      {error && (
        <span style={{ fontSize: '0.75rem', color: 'var(--color-danger)', fontFamily: 'General Sans, sans-serif' }}>
          {error}
        </span>
      )}
      {hint && !error && (
        <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontFamily: 'General Sans, sans-serif' }}>
          {hint}
        </span>
      )}
    </div>
  )
}

export function Select({ label, error, children, className = '', ...props }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && (
        <label style={{
          fontSize: '0.8125rem', fontWeight: 600,
          color: 'var(--text-secondary)',
          fontFamily: 'General Sans, sans-serif',
        }}>
          {label}
        </label>
      )}
      <select
        className={`input ${className}`}
        style={{
          padding: '10px 12px',
          fontSize: '0.875rem',
          cursor: 'pointer',
          appearance: 'none',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%237BB5A8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 12px center',
          paddingRight: 36,
          borderColor: error ? 'var(--color-danger)' : undefined,
        }}
        {...props}
      >
        {children}
      </select>
      {error && (
        <span style={{ fontSize: '0.75rem', color: 'var(--color-danger)' }}>{error}</span>
      )}
    </div>
  )
}

export function Textarea({ label, error, ...props }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && (
        <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', fontFamily: 'General Sans, sans-serif' }}>
          {label}
        </label>
      )}
      <textarea
        className="input"
        style={{ padding: '10px 12px', fontSize: '0.875rem', resize: 'vertical', minHeight: 80 }}
        {...props}
      />
      {error && <span style={{ fontSize: '0.75rem', color: 'var(--color-danger)' }}>{error}</span>}
    </div>
  )
}
