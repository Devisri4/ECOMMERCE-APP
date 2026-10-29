import React, { useEffect, useMemo, useRef, useState } from 'react'
import { formatPrice } from '../utils/currency'

// Chart colors, validated for the admin's dark card surface (#202024) with the dataviz palette checker:
// #8b5cf6 passes lightness, chroma and 3:1 contrast. The lighter step only marks the hovered column.
const BAR = '#8b5cf6'
const BAR_ACTIVE = '#a78bfa'
const GRID = '#2e2e33'
const RANGES = [7, 30, 90]

// Short rupee amounts in Indian units: ₹950, ₹12.5K, ₹3.2L (lakh), ₹1.1Cr (crore).
// (Intl's en-IN compact notation writes thousands as "T", which reads like trillions.)
const tickLabel = (v) => {
  const short = (n, unit) => `₹${Number(n.toFixed(1))}${unit}`
  if (v >= 1e7) return short(v / 1e7, 'Cr')
  if (v >= 1e5) return short(v / 1e5, 'L')
  if (v >= 1e3) return short(v / 1e3, 'K')
  return `₹${Math.round(v)}`
}
const dayLabel = (ms) => new Date(ms).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })

// Clean axis steps (1, 2, 2.5, 5 × 10^k) with about three intervals
const niceTicks = (max) => {
  if (max <= 0) return [0, 1000]
  const raw = max / 3
  const mag = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw)
  const ticks = []
  for (let v = 0; v < max + step; v += step) ticks.push(v)
  return ticks
}

// Column with a 4px rounded top and a square base
const columnPath = (x, y, w, h) => {
  const r = Math.min(4, w / 2, h)
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`
}

const useElementWidth = () => {
  const ref = useRef(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    if (!ref.current) return
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])
  return [ref, width]
}

// Calendar days in local time. Built from year/month/day (not by adding 24 hours), so days stay
// correct across daylight-saving changes, when a day can be 23 or 25 hours long.
const dayKey = (ms) => {
  const d = new Date(ms)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

// Midnight (local time) at the start of the range: today plus the previous days - 1 days
const rangeStart = (days) => {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1)).getTime()
}

// Daily buckets for the last `days` days (local time), from non-cancelled INR orders
const dailyTotals = (orders, days) => {
  const now = new Date()
  const buckets = Array.from({ length: days }, (_, i) => {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1 - i)).getTime()
    return { date, value: 0, orders: 0 }
  })
  const byKey = new Map(buckets.map((b) => [dayKey(b.date), b]))
  for (const o of orders) {
    const bucket = byKey.get(dayKey(o.date))
    if (bucket) {
      bucket.value += o.amount
      bucket.orders += 1
    }
  }
  return buckets
}

const DailyChart = ({ data }) => {
  const [wrapRef, width] = useElementWidth()
  const [active, setActive] = useState(null)
  const height = 220
  const pad = { top: 22, right: 8, bottom: 26, left: 52 }
  const plotW = Math.max(0, width - pad.left - pad.right)
  const plotH = height - pad.top - pad.bottom

  const max = Math.max(...data.map((d) => d.value))
  const ticks = niceTicks(max)
  const top = ticks[ticks.length - 1]
  const slot = data.length ? plotW / data.length : 0
  const barW = Math.min(24, Math.max(2, slot - 2)) // 2px surface gap between neighbours
  const y = (v) => pad.top + plotH - (v / top) * plotH
  const xCenter = (i) => pad.left + i * slot + slot / 2
  const peak = max > 0 ? data.findIndex((d) => d.value === max) : -1
  const labelIdx = [...new Set([0, Math.floor((data.length - 1) / 2), data.length - 1])]

  const onKeyDown = (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    e.preventDefault()
    setActive((i) => {
      const cur = i ?? data.length - 1
      return Math.min(data.length - 1, Math.max(0, cur + (e.key === 'ArrowRight' ? 1 : -1)))
    })
  }

  const tip = active !== null ? data[active] : null
  const tipLeft = tip ? Math.min(Math.max(xCenter(active), 70), Math.max(70, width - 70)) : 0

  return (
    <div
      ref={wrapRef}
      className='relative outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60 rounded-md'
      tabIndex={0}
      role='group'
      aria-label='Order value per day. Use the left and right arrow keys to read each day.'
      onKeyDown={onKeyDown}
      onFocus={() => setActive((i) => i ?? data.length - 1)}
      onBlur={() => setActive(null)}
      onPointerLeave={() => setActive(null)}
    >
      {width > 0 && (
        <svg width={width} height={height} aria-hidden='true' className='block'>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth='1' />
              <text x={pad.left - 8} y={y(t)} dy='0.32em' textAnchor='end' className='fill-zinc-400 text-[11px] tabular-nums'>
                {tickLabel(t)}
              </text>
            </g>
          ))}
          {data.map((d, i) => {
            const h = (d.value / top) * plotH
            const x = pad.left + i * slot + (slot - barW) / 2
            return (
              <g key={d.date}>
                {h > 0 && <path d={columnPath(x, y(d.value), barW, h)} fill={i === active ? BAR_ACTIVE : BAR} />}
                {/* Hit target: the whole slot, full height, so short columns are easy to hover */}
                <rect x={pad.left + i * slot} y={pad.top} width={slot} height={plotH} fill='transparent' onPointerMove={() => setActive(i)} onPointerDown={() => setActive(i)} />
              </g>
            )
          })}
          {peak >= 0 && (
            <text x={xCenter(peak)} y={y(max) - 7} textAnchor='middle' className='fill-zinc-300 text-[11px] font-medium'>
              {tickLabel(max)}
            </text>
          )}
          {labelIdx.map((i) => (
            <text
              key={i}
              x={xCenter(i)}
              y={height - 6}
              textAnchor={i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle'}
              dx={i === 0 ? -slot / 2 + (slot - barW) / 2 : i === data.length - 1 ? slot / 2 - (slot - barW) / 2 : 0}
              className='fill-zinc-400 text-[11px]'
            >
              {dayLabel(data[i].date)}
            </text>
          ))}
        </svg>
      )}

      {/* Always present, so screen readers announce each day as the arrow keys move (the visual box below is decoration) */}
      <p role='status' className='sr-only'>
        {tip ? `${dayLabel(tip.date)}: ${formatPrice(tip.value, 'INR')}, ${tip.orders} ${tip.orders === 1 ? 'order' : 'orders'}` : ''}
      </p>

      {tip && (
        <div
          aria-hidden='true'
          className='pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs shadow-lg'
          style={{ left: tipLeft }}
        >
          <p className='text-sm font-semibold text-white'>{formatPrice(tip.value, 'INR')}</p>
          <p className='mt-0.5 whitespace-nowrap text-zinc-400'>
            {dayLabel(tip.date)} · {tip.orders} {tip.orders === 1 ? 'order' : 'orders'}
          </p>
        </div>
      )}
    </div>
  )
}

const TopProducts = ({ rows }) => {
  const max = Math.max(1, ...rows.map((r) => r.units))
  return (
    <ol className='flex flex-col gap-4'>
      {rows.map((r) => (
        <li key={r.id}>
          <div className='flex items-baseline justify-between gap-3 text-sm'>
            <span className='truncate text-zinc-200'>{r.name}</span>
            <span className='shrink-0 text-xs text-zinc-400'>
              <span className='font-medium text-zinc-200'>{r.units} sold</span> · {formatPrice(r.revenue, 'INR')}
            </span>
          </div>
          {/* Bar grows from a square base on the left to a 4px rounded end */}
          <div className='mt-2 h-2.5 w-full'>
            <div className='h-full rounded-r' style={{ width: `${(r.units / max) * 100}%`, background: BAR }} />
          </div>
        </li>
      ))}
    </ol>
  )
}

// Charts for the dashboard, computed from the admin order list. Only INR orders are counted (earlier
// USD orders aren't mixed in), and cancelled orders are left out.
const SalesCharts = ({ orders, products = [] }) => {
  const [days, setDays] = useState(30)

  const { daily, top, total, count } = useMemo(() => {
    // Orders keep the name at the time of purchase; show the product's current name when it still exists
    const currentName = new Map(products.map((p) => [String(p._id), p.name]))
    const since = rangeStart(days)
    // Card orders still waiting for payment may never be paid, so they are not counted as sales yet
    const inRange = orders.filter((o) => o.status !== 'Cancelled' && !(o.paymentMethod === 'Stripe' && !o.payment) && (o.currency || 'USD') === 'INR' && o.date >= since)
    const byProduct = new Map()
    for (const o of inRange) {
      for (const item of o.items) {
        const id = String(item._id)
        const row = byProduct.get(id) || { id, name: currentName.get(id) || item.name, units: 0, revenue: 0 }
        row.units += item.quantity
        row.revenue += item.price * item.quantity
        byProduct.set(id, row)
      }
    }
    return {
      daily: dailyTotals(inRange, days),
      top: [...byProduct.values()].sort((a, b) => b.units - a.units || b.revenue - a.revenue).slice(0, 5),
      total: inRange.reduce((sum, o) => sum + o.amount, 0),
      count: inRange.length,
    }
  }, [orders, products, days])

  return (
    <section className='mt-10' aria-labelledby='sales-heading'>
      {/* One date-range control above both charts; it scopes everything below it */}
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <h2 id='sales-heading' className='text-sm font-semibold text-white'>Sales</h2>
        <div role='group' aria-label='Date range' className='inline-flex rounded-md border border-zinc-800 bg-[#202024] p-0.5'>
          {RANGES.map((r) => (
            <button
              key={r}
              type='button'
              aria-pressed={days === r}
              onClick={() => setDays(r)}
              className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${days === r ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'}`}
            >
              Last {r} days
            </button>
          ))}
        </div>
      </div>

      <div className='mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]'>
        <div className='rounded-xl border border-zinc-800 bg-[#202024] p-5'>
          <h3 className='text-sm font-medium text-white'>Order value per day</h3>
          <p className='mt-1 text-xs text-zinc-400'>
            {formatPrice(total, 'INR')} from {count} {count === 1 ? 'order' : 'orders'} · excludes cancelled and unpaid card orders
          </p>
          <div className='mt-5'>
            {count === 0 ? (
              <p className='py-16 text-center text-sm text-zinc-400'>No orders in the last {days} days.</p>
            ) : (
              <DailyChart data={daily} />
            )}
          </div>
          {count > 0 && (
            <details className='mt-4 text-xs text-zinc-400'>
              <summary className='cursor-pointer select-none hover:text-white'>View as table</summary>
              <div className='mt-3 max-h-60 overflow-y-auto'>
                <table className='w-full text-left'>
                  <thead className='text-zinc-400'>
                    <tr><th className='py-1 font-medium'>Day</th><th className='py-1 text-right font-medium'>Orders</th><th className='py-1 text-right font-medium'>Order value</th></tr>
                  </thead>
                  <tbody className='tabular-nums'>
                    {[...daily].reverse().map((d) => (
                      <tr key={d.date} className='border-t border-zinc-800'>
                        <td className='py-1.5'>{dayLabel(d.date)}</td>
                        <td className='py-1.5 text-right'>{d.orders}</td>
                        <td className='py-1.5 text-right text-zinc-200'>{formatPrice(d.value, 'INR')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}
        </div>

        <div className='rounded-xl border border-zinc-800 bg-[#202024] p-5'>
          <h3 className='text-sm font-medium text-white'>Top products</h3>
          <p className='mt-1 text-xs text-zinc-400'>By units sold, last {days} days</p>
          <div className='mt-5'>
            {top.length === 0 ? <p className='py-16 text-center text-sm text-zinc-400'>No sales yet.</p> : <TopProducts rows={top} />}
          </div>
        </div>
      </div>
    </section>
  )
}

export default SalesCharts
