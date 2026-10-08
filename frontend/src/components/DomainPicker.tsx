import type { Domain } from '../api/types'

interface Props {
  domains: Domain[]
  value: string
  onChange: (id: string) => void
}

export default function DomainPicker({ domains, value, onChange }: Props) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold">Scenario</legend>
      <div className="grid gap-3 sm:grid-cols-3">
        {domains.map((d) => (
          <label key={d.id} className="cursor-pointer">
            <input
              type="radio"
              name="domain"
              value={d.id}
              checked={value === d.id}
              onChange={() => onChange(d.id)}
              className="peer sr-only"
            />
            <div className="h-full rounded-xl border-2 border-stone-200 p-3 transition peer-checked:border-counterpart peer-checked:bg-counterpart/5 peer-focus-visible:ring-2 peer-focus-visible:ring-counterpart dark:border-stone-800">
              <div className="font-semibold">
                {d.emoji} {d.label}
              </div>
              <div className="mt-1 text-xs text-stone-500 dark:text-stone-400">Opponent: {d.counterpart_role}</div>
            </div>
          </label>
        ))}
      </div>
    </fieldset>
  )
}