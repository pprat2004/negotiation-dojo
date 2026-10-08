import type { Scorecard, SessionStatus } from '../api/types'
import { STATUS_LABEL, scoreTone } from '../lib/format'
import DimensionBars from './DimensionBars'

const RING = { good: 'stroke-emerald-500', ok: 'stroke-amber-500', low: 'stroke-red-500' }
const R = 52
const C = 2 * Math.PI * R

function List({ title, items, tone }: { title: string; items: string[]; tone: 'ok' | 'bad' }) {
  return (
    <div>
      <h3 className="mb-1.5 text-sm font-bold">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-stone-500">Nothing to list.</p>
      ) : (
        <ul className="space-y-1.5 text-sm">
          {items.map((t, i) => (
            <li key={i} className="flex gap-2">
              <span aria-hidden>{tone === 'ok' ? '✅' : '❌'}</span>
              <span>{t}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function ScoreCard({ card, status }: { card: Scorecard; status: SessionStatus }) {
  const tone = scoreTone(card.score)
  return (
    <div className="space-y-4">
      <section className="card flex flex-wrap items-center gap-6">
        <div className="relative h-32 w-32 shrink-0">
          <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" role="img" aria-label={`Score ${card.score} out of 100`}>
            <circle cx="60" cy="60" r={R} fill="none" strokeWidth="10" className="stroke-stone-200 dark:stroke-stone-800" />
            <circle
              cx="60" cy="60" r={R} fill="none" strokeWidth="10" strokeLinecap="round"
              strokeDasharray={`${(C * card.score) / 100} ${C}`}
              className={RING[tone]}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-extrabold leading-none">{card.score}</span>
            <span className="text-xs text-stone-500">out of 100</span>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium dark:bg-stone-800">{STATUS_LABEL[status]}</span>
          <p className="mt-2 text-lg font-semibold leading-snug">{card.verdict}</p>
        </div>
      </section>

      <section className="card">
        <h2 className="mb-3 text-lg font-bold text-debrief">Skill breakdown</h2>
        <DimensionBars values={card.dimensions} />
      </section>

      <section className="card grid gap-6 sm:grid-cols-2">
        <List title="Leverage you used" items={card.leverage_used} tone="ok" />
        <List title="Opportunities missed" items={card.opportunities_missed} tone="bad" />
      </section>

      {card.rewrites.length > 0 && (
        <section className="card">
          <h2 className="mb-3 text-lg font-bold text-debrief">Stronger rewrites</h2>
          <div className="space-y-3">
            {card.rewrites.map((r, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-xl bg-red-50 p-3 text-sm dark:bg-red-950/50">
                  <div className="text-xs font-bold uppercase tracking-wide text-red-700 dark:text-red-300">You said</div>
                  <p className="mt-0.5">{r.said}</p>
                </div>
                <div className="rounded-xl bg-emerald-50 p-3 text-sm dark:bg-emerald-950/50">
                  <div className="text-xs font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Better</div>
                  <p className="mt-0.5">{r.better}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {card.next_steps.length > 0 && (
        <section className="card">
          <h2 className="mb-2 text-lg font-bold text-debrief">Practise next</h2>
          <ol className="list-decimal space-y-1.5 pl-5 text-sm">
            {card.next_steps.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ol>
        </section>
      )}
    </div>
  )
}