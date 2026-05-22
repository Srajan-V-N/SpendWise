export function Skeleton({ width, height, borderRadius = 'var(--radius-sm)', style = {} }) {
  return (
    <div
      className="skeleton"
      style={{ width: width || '100%', height: height || 16, borderRadius, ...style }}
    />
  )
}

export function KPICardSkeleton() {
  return (
    <div className="kpi-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Skeleton width={80} height={13} />
        <Skeleton width={36} height={36} borderRadius="50%" />
      </div>
      <Skeleton width={120} height={28} borderRadius={6} />
      <Skeleton width={80} height={12} />
    </div>
  )
}

export function TableRowSkeleton({ cols = 5 }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} style={{ padding: '14px 16px' }}>
          <Skeleton width={i === 0 ? 140 : i === cols - 1 ? 60 : 80} height={13} />
        </td>
      ))}
    </tr>
  )
}

export function CardSkeleton({ lines = 3 }) {
  return (
    <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <Skeleton width="60%" height={16} borderRadius={6} />
      {Array.from({ length: lines - 1 }).map((_, i) => (
        <Skeleton key={i} width={`${85 - i * 15}%`} height={12} />
      ))}
    </div>
  )
}
