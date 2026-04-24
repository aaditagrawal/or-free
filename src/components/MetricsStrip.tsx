import { useMemo } from 'react'
import type { DerivedModel } from '../types/explorer'

type MetricsStripProps = {
  derivedAll: DerivedModel[]
  visible: DerivedModel[]
}

const CONTEXT_BUCKETS: Array<{ label: string; max: number }> = [
  { label: '≤4K', max: 4_096 },
  { label: '8K', max: 8_192 },
  { label: '16K', max: 16_384 },
  { label: '32K', max: 32_768 },
  { label: '64K', max: 65_536 },
  { label: '128K', max: 131_072 },
  { label: '256K', max: 262_144 },
  { label: '>256K', max: Number.POSITIVE_INFINITY },
]

function bucketContextLengths(models: DerivedModel[]): number[] {
  const counts = new Array(CONTEXT_BUCKETS.length).fill(0) as number[]

  for (const model of models) {
    const ctx = model.contextLength
    if (ctx == null || ctx <= 0) continue
    const idx = CONTEXT_BUCKETS.findIndex((b) => ctx <= b.max)
    if (idx >= 0) counts[idx] += 1
  }

  return counts
}

function topProviders(models: DerivedModel[], limit = 5): Array<{ name: string; count: number }> {
  const tally = new Map<string, number>()

  for (const model of models) {
    const slug = model.id.split('/')[0] ?? 'unknown'
    tally.set(slug, (tally.get(slug) ?? 0) + 1)
  }

  return Array.from(tally.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}

function nearestExpiration(models: DerivedModel[]): { days: number; id: string } | null {
  const today = Date.now()
  let best: { days: number; id: string } | null = null

  for (const model of models) {
    if (!model.expirationDate) continue
    const end = new Date(`${model.expirationDate}T00:00:00.000Z`).getTime()
    if (!Number.isFinite(end)) continue
    const days = Math.max(0, Math.floor((end - today) / (24 * 60 * 60 * 1000)))
    if (best == null || days < best.days) {
      best = { days, id: model.id }
    }
  }

  return best
}

export function MetricsStrip({ derivedAll, visible }: MetricsStripProps) {
  const contextHistogram = useMemo(() => bucketContextLengths(visible), [visible])
  const histogramMax = useMemo(() => Math.max(1, ...contextHistogram), [contextHistogram])

  const providers = useMemo(() => topProviders(visible), [visible])
  const providersMax = useMemo(() => Math.max(1, ...providers.map((p) => p.count)), [providers])

  const pricing = useMemo(() => {
    let free = 0
    let paid = 0
    for (const model of derivedAll) {
      if (!model.isUnexpired) continue
      if (model.isFree) free += 1
      else paid += 1
    }
    const total = free + paid
    return {
      free,
      paid,
      total,
      freePct: total ? (free / total) * 100 : 0,
      paidPct: total ? (paid / total) * 100 : 0,
    }
  }, [derivedAll])

  const expiration = useMemo(() => {
    const active = derivedAll.filter((m) => m.isUnexpired && m.isFree)
    const withExpiry = active.filter((m) => m.expirationDate)
    return {
      nearest: nearestExpiration(active),
      withExpiryCount: withExpiry.length,
      totalFreeActive: active.length,
    }
  }, [derivedAll])

  const medianContext = useMemo(() => {
    const values = visible
      .map((m) => m.contextLength)
      .filter((v): v is number => typeof v === 'number' && v > 0)
      .sort((a, b) => a - b)
    if (values.length === 0) return null
    const mid = Math.floor(values.length / 2)
    return values.length % 2 ? values[mid] : Math.round((values[mid - 1] + values[mid]) / 2)
  }, [visible])

  return (
    <section className="metrics" aria-label="Overview metrics">
      {/* 1. Context histogram */}
      <div className="metric">
        <div className="metric-head">
          <span className="metric-label">Context length</span>
          <span className="metric-sub">{visible.length} shown</span>
        </div>
        <div
          className="sparkbars"
          style={{ ['--cols' as string]: CONTEXT_BUCKETS.length }}
          role="img"
          aria-label="Context length histogram"
        >
          {contextHistogram.map((count, idx) => {
            const isPeak = count > 0 && count === histogramMax
            return (
              <div
                key={CONTEXT_BUCKETS[idx].label}
                className={isPeak ? 'sparkbar is-peak' : 'sparkbar'}
                title={`${CONTEXT_BUCKETS[idx].label}: ${count} models`}
                style={{ height: `${Math.max(count ? 8 : 0, (count / histogramMax) * 100)}%` }}
              />
            )
          })}
        </div>
        <div className="sparkbars-axis">
          <span>≤4K</span>
          <span>{medianContext ? `median ${Intl.NumberFormat().format(medianContext)}` : '—'}</span>
        </div>
      </div>

      {/* 2. Top providers ranked bars */}
      <div className="metric">
        <div className="metric-head">
          <span className="metric-label">Top providers</span>
          <span className="metric-sub">top {providers.length}</span>
        </div>
        <div className="rankbars">
          {providers.length === 0 ? (
            <span className="metric-sub">no data</span>
          ) : (
            providers.map((p) => (
              <div className="rankbar" key={p.name}>
                <span className="rankbar-name">{p.name}</span>
                <span className="rankbar-track">
                  <span
                    className="rankbar-fill"
                    style={{ ['--w' as string]: `${(p.count / providersMax) * 100}%` }}
                  />
                </span>
                <span className="rankbar-count">{p.count}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 3. Pricing split */}
      <div className="metric">
        <div className="metric-head">
          <span className="metric-label">Pricing mix</span>
          <span className="metric-sub">{pricing.total} active</span>
        </div>
        <div className="splitbar" role="img" aria-label="Free vs paid">
          <div className="splitbar-seg free" style={{ width: `${pricing.freePct}%` }} />
          <div className="splitbar-seg paid" style={{ width: `${pricing.paidPct}%` }} />
        </div>
        <div className="splitbar-legend">
          <span>
            <span className="dot dot-accent" />free <strong>{pricing.free}</strong>
          </span>
          <span>
            <span className="dot dot-alt" />paid <strong>{pricing.paid}</strong>
          </span>
        </div>
      </div>

      {/* 4. Expiration gauge */}
      <div className="metric">
        <div className="metric-head">
          <span className="metric-label">Nearest free expiry</span>
          <span className="metric-sub">
            {expiration.withExpiryCount}/{expiration.totalFreeActive} dated
          </span>
        </div>
        <div className="metric-value">
          {expiration.nearest ? `${expiration.nearest.days}d` : '—'}
        </div>
        <div className="gauge">
          <div className="gauge-track">
            <div
              className="gauge-fill"
              style={{
                ['--w' as string]: expiration.nearest
                  ? `${Math.max(4, 100 - Math.min(100, (expiration.nearest.days / 90) * 100))}%`
                  : '0%',
              }}
            />
          </div>
          <div className="gauge-ticks">
            <span>now</span>
            <span>30d</span>
            <span>90d+</span>
          </div>
        </div>
      </div>
    </section>
  )
}
