export default function TopicAccuracyBars({ rows }) {
  if (!rows.length) return <p style={{ color: 'var(--muted)' }}>No data yet — complete a session to see stats.</p>

  return (
    <div>
      {rows.map((r) => (
        <div key={r.key} style={{ marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
            <span>{r.key}</span>
            <span style={{ color: 'var(--muted)' }}>
              {r.correct}/{r.seen} ({Math.round(r.accuracy * 100)}%)
            </span>
          </div>
          <div style={{ background: '#0f172a', borderRadius: '999px', height: '8px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${Math.round(r.accuracy * 100)}%`,
                height: '100%',
                background: r.accuracy >= 0.7 ? 'var(--good)' : r.accuracy >= 0.4 ? '#facc15' : 'var(--bad)',
              }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
