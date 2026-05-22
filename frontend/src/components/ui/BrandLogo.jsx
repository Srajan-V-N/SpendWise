import { useState, useEffect } from 'react'
import { getDomain } from '../../utils/brandLogos'

export default function BrandLogo({ name, size = 32, color, style = {}, className = '' }) {
  const domain = getDomain(name)
  const isDirectUrl = domain?.startsWith('https://')
  const [phase, setPhase] = useState('loading')

  useEffect(() => { setPhase('loading') }, [name])

  const radius = Math.round(size * 0.28)
  const imgSize = Math.round(size * 0.82)

  if (!domain || phase === 'fallback') {
    const letter = name?.charAt(0)?.toUpperCase() || '?'
    return (
      <div style={{
        width: size, height: size, borderRadius: radius, flexShrink: 0,
        background: color ? `${color}22` : 'var(--bg-elevated)',
        border: `1px solid ${color ? `${color}38` : 'var(--border-default)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: Math.round(size * 0.42), fontWeight: 700,
        color: color || 'var(--text-secondary)',
        fontFamily: 'Clash Display, sans-serif',
        ...style,
      }} className={className}>
        {letter}
      </div>
    )
  }

  return (
    <div style={{
      width: size, height: size, borderRadius: radius, flexShrink: 0,
      background: '#ffffff', border: '1px solid rgba(0,0,0,0.08)',
      boxShadow: '0 1px 4px rgba(0,0,0,0.10)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', position: 'relative',
      ...style,
    }} className={className}>
      {phase === 'loading' && (
        <div className="skeleton" style={{ width: imgSize, height: imgSize, borderRadius: 4 }} />
      )}
      {isDirectUrl ? (
        <img
          key={`direct-${domain}`}
          src={domain}
          alt={name}
          style={{
            width: imgSize, height: imgSize, objectFit: 'contain',
            display: phase === 'done' ? 'block' : 'none',
            position: 'absolute',
          }}
          onLoad={() => setPhase('done')}
          onError={() => setPhase('fallback')}
        />
      ) : (
        <>
          {phase !== 'favicon' && (
            <img
              key={`cb-${domain}`}
              src={`https://www.google.com/s2/favicons?domain=https://${domain}&sz=128`}
              alt={name}
              style={{
                width: imgSize, height: imgSize, objectFit: 'contain',
                display: phase === 'done' ? 'block' : 'none',
                position: 'absolute',
              }}
              onLoad={() => setPhase('done')}
              onError={() => setPhase('favicon')}
            />
          )}
          {phase === 'favicon' && (
            <img
              key={`fv-${domain}`}
              src={`https://icons.duckduckgo.com/ip3/${domain}.ico`}
              alt={name}
              style={{
                width: Math.round(size * 0.60), height: Math.round(size * 0.60),
                objectFit: 'contain', imageRendering: 'crisp-edges',
              }}
              onError={() => setPhase('fallback')}
            />
          )}
        </>
      )}
    </div>
  )
}
