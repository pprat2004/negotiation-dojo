import type { Dimensions } from '../api/types'
import { ratingTone, type Tone } from '../lib/coach'
import { DIMENSION_LABEL, DIMENSION_ORDER } from '../lib/dimensions'

const FILL: Record<Tone, string> = { good: 'bg-emerald-500', ok: 'bg-amber-500', low: 'bg-red-500' }

/** Bars for the five skill dimensions. Values are 0-10; missing dimensions are skipped. */
export default function DimensionBars({ values }: { values: Partial<Record<keyof Dimensions, number>> }) {
  return (
    <div className="space-y-2.5">
      {DIMENSION_ORDER.filter((k) => values[k] !== undefined).map((k) => {
        const v = values[k] as number
        return (
          <div key={k} className="grid grid-cols-[110px_1fr_36px] items-center gap-3 text-sm">
            <span>{DIMENSION_LABEL[k]}</span>
            <div
              role="meter"
              aria-label={DIMENSION_LABEL[k]}
              aria-valuemin={0}
              aria-valuemax={10}
              aria-valuenow={v}
              className="h-2.5 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-800"
            >
              <div className={`h-full rounded-full ${FILL[ratingTone(v)]}`} style={{ width: `${v * 10}%` }} />
            </div>
            <span className="text-right font-semibold">{v}</span>
          </div>
        )
      })}
    </div>
  )
}