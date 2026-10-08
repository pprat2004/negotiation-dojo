import type { Difficulty } from '../api/types'

const LEVELS: { id: Difficulty; blurb: string }[] = [
  { id: 'Easy', blurb: 'Cooperative. Concedes after any sensible reason.' },
  { id: 'Medium', blurb: 'Firm but fair. Trades concessions.' },
  { id: 'Hard', blurb: 'Tough. Pressure tactics, concedes only for strong leverage.' },
]

interface Props {
  value: Difficulty
  onChange: (d: Difficulty) => void
  suggested: Difficulty | null
  reason?: string
}

export default function DifficultyPicker({ value, onChange, suggested, reason }: Props) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold">Difficulty</legend>
      <div className="grid gap-3 sm:grid-cols-3">
        {LEVELS.map((l) => (
          <label key={l.id} className="cursor-pointer">
            <input
              type="radio"
              name="difficulty"
              value={l.id}
              checked={value === l.id}
              onChange={() => onChange(l.id)}
              className="peer sr-only"
            />
            <div className="h-full rounded-xl border-2 border-stone-200 p-3 transition peer-checked:border-counterpart peer-checked:bg-counterpart/5 peer-focus-visible:ring-2 peer-focus-visible:ring-counterpart dark:border-stone-800">
              <div className="flex items-center justify-between font-semibold">
                {l.id}
                {suggested === l.id && (
                  <span className="rounded-full bg-coach/10 px-2 py-0.5 text-[11px] font-bold text-coach">Suggested</span>
                )}
              </div>
              <div className="mt-1 text-xs text-stone-500 dark:text-stone-400">{l.blurb}</div>
            </div>
          </label>
        ))}
      </div>
      {suggested && reason && <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">💡 {reason}</p>}
    </fieldset>
  )
}