import { buildPoints, linePath, yFor } from '../lib/chart'

export interface ChartPoint {
  score: number
  label: string
}

const W = 600
const H = 220

/** Line chart of scores over time. The dashed lines mark the adaptive-difficulty thresholds (45 and 75). */
export default function ProgressChart({ data }: { data: ChartPoint[] }) {
  const pts = buildPoints(data.map((d) => d.score), W, H)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Scores over your recent sessions">
      {[0, 25, 50, 75, 100].map((g) => (
        <g key={g}>
          <line x1="24" x2={W - 24} y1={yFor(g, H)} y2={yFor(g, H)} className="stroke-stone-200 dark:stroke-stone-800" />
          <text x="2" y={yFor(g, H) + 4} className="fill-stone-400 text-[10px]">{g}</text>
        </g>
      ))}
      {[45, 75].map((g) => (
        <line
          key={g} x1="24" x2={W - 24} y1={yFor(g, H)} y2={yFor(g, H)}
          strokeDasharray="4 4" className="stroke-amber-400/70"
        />
      ))}
      <text x={W - 26} y={yFor(75, H) - 4} textAnchor="end" className="fill-amber-600 text-[10px]">Hard zone 75+</text>
      <text x={W - 26} y={yFor(45, H) - 4} textAnchor="end" className="fill-amber-600 text-[10px]">Easy zone below 45</text>

      <path d={linePath(pts)} fill="none" strokeWidth="2.5" strokeLinejoin="round" className="stroke-counterpart" />
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="4.5" className="fill-counterpart stroke-white dark:stroke-stone-900" strokeWidth="2">
          <title>{`${data[i].label}: ${data[i].score}`}</title>
        </circle>
      ))}
    </svg>
  )
}