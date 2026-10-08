import { orderTips, ratingTone, stripQuotes, type Tone } from '../lib/coach'
import type { CoachTip } from '../store/sessionStore'

const TONE: Record<Tone, string> = {
  good: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  ok: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  low: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
}
const BAR: Record<Tone, string> = { good: 'bg-emerald-500', ok: 'bg-amber-500', low: 'bg-red-500' }

interface Props {
  tips: CoachTip[]
  pending: boolean
  canUse: boolean
  onUseLine: (text: string) => void
}

function TipBody({ tip, canUse, onUseLine }: { tip: CoachTip; canUse: boolean; onUseLine: (t: string) => void }) {
  const fb = tip.feedback
  if (!fb) return <p className="text-sm text-stone-500">Coach was unavailable for this move.</p>
  const noIssue = fb.issue.trim().toLowerCase() === 'none'
  return (
    <div className="space-y-2 text-sm">
      {fb.tactic_detected && (
        <span className="inline-block rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium dark:bg-stone-800">
          Their tactic: {fb.tactic_detected}
        </span>
      )}
      <p>{noIssue ? '✅ No mistake spotted.' : `⚠️ ${fb.issue}`}</p>
      <div className="rounded-lg border-l-4 border-coach bg-coach/5 p-2">
        <div className="text-xs font-bold uppercase tracking-wide text-coach">Try saying</div>
        <p className="mt-0.5">{stripQuotes(fb.better_phrasing)}</p>
        <button
          type="button"
          className="mt-1.5 text-xs font-semibold text-coach underline disabled:opacity-40"
          disabled={!canUse}
          onClick={() => onUseLine(stripQuotes(fb.better_phrasing))}
        >
          Use this line
        </button>
      </div>
      <p className="text-stone-600 dark:text-stone-400">🎯 Unused leverage: {fb.unused_leverage}</p>
    </div>
  )
}

export default function CoachPanel({ tips, pending, canUse, onUseLine }: Props) {
  const ordered = orderTips(tips)
  const [latest, ...older] = ordered
  const rated = [...tips].filter((t) => t.feedback).sort((a, b) => a.round - b.round)

  return (
    <aside className="card" aria-label="Live coach">
      <h2 className="text-lg font-bold text-coach">Coach (live)</h2>

      {rated.length > 1 && (
        <div className="mt-2" aria-label="Move ratings">
          <div className="flex h-8 items-end gap-1">
            {rated.map((t) => (
              <div
                key={t.id}
                title={`Move ${t.round}: ${t.feedback!.rating}/10`}
                className={`w-4 rounded-t ${BAR[ratingTone(t.feedback!.rating)]}`}
                style={{ height: `${t.feedback!.rating * 10}%` }}
              />
            ))}
          </div>
          <div className="mt-0.5 text-[11px] text-stone-500">Rating per move</div>
        </div>
      )}

      {pending && (
        <div className="mt-3 animate-pulse rounded-xl bg-stone-100 p-3 text-sm text-stone-500 dark:bg-stone-800">
          Coach is analysing your move…
        </div>
      )}

      {!latest && !pending && (
        <p className="mt-3 text-sm text-stone-500">
          Make your first move. The coach reviews every message you send and suggests stronger wording.
        </p>
      )}

      {latest && (
        <div className="mt-3 rounded-xl border border-coach/30 p-3">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-sm font-semibold">Move {latest.round}</span>
            {latest.feedback && (
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${TONE[ratingTone(latest.feedback.rating)]}`}>
                {latest.feedback.rating}/10
              </span>
            )}
          </div>
          <TipBody tip={latest} canUse={canUse} onUseLine={onUseLine} />
        </div>
      )}

      {older.length > 0 && (
        <div className="mt-3 space-y-2">
          {older.map((t) => (
            <details key={t.id} className="rounded-xl border border-stone-200 p-2 dark:border-stone-800">
              <summary className="cursor-pointer text-sm font-medium">
                Move {t.round}
                {t.feedback && (
                  <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-bold ${TONE[ratingTone(t.feedback.rating)]}`}>
                    {t.feedback.rating}/10
                  </span>
                )}
              </summary>
              <div className="mt-2">
                <TipBody tip={t} canUse={canUse} onUseLine={onUseLine} />
              </div>
            </details>
          ))}
        </div>
      )}
    </aside>
  )
}