const AGENTS = [
  {
    name: 'Counterpart',
    color: 'border-counterpart text-counterpart',
    text: 'Plays the opposing party (HR manager, claims adjuster or landlord). Uses real tactics such as anchoring, deadlines and "the budget is fixed", retrieved from a tactics knowledge base for the scenario. Concedes only when you earn it.',
  },
  {
    name: 'Coach',
    color: 'border-coach text-coach',
    text: 'Reviews every message you send, in parallel with the counterpart. Rates the move, flags weak concessions, suggests stronger wording and points out leverage you have not used yet.',
  },
  {
    name: 'Debrief',
    color: 'border-debrief text-debrief',
    text: 'Reads the whole finished transcript and produces a scorecard: an overall score, five skill dimensions, leverage used and missed, stronger rewrites and next steps.',
  },
]

const FLOW = ['Your goal and scenario', 'Counterpart agent', 'Coach agent (parallel)', 'Negotiation loop', 'Debrief agent', 'Scorecard']

const OBJECTIVES = [
  ['A realistic, interactive practice environment', 'Streaming chat with three scenarios and three difficulty levels'],
  ['An adversarial counterpart with domain tactics', 'Tactics knowledge base per scenario, retrieved each turn'],
  ['Real-time coaching on weak concessions', 'Coach panel with ratings, better phrasing and unused leverage'],
  ['A performance evaluation after every session', 'Debrief scorecard with five skill dimensions'],
  ['Confidence through repeated, low-risk practice', 'Session history, progress charts and adaptive difficulty'],
]

const FUTURE = [
  ['More domains', 'Add a JSON config and a tactics file. No code changes.'],
  ['Performance tracking', 'Per-user history, averages, trend and skill breakdown.'],
  ['Adaptive difficulty', 'Suggested from your last three scores.'],
  ['Voice negotiation', 'Speak your moves and hear replies, using the browser speech APIs.'],
]

const STACK = [
  ['Backend', 'Python, FastAPI, Pydantic, SQLAlchemy, SQLite, Server-Sent Events'],
  ['Agents', 'Custom async orchestrator, JSON validation with automatic repair, prompt-injection guard'],
  ['LLM', 'Provider-agnostic client (Anthropic or OpenAI-compatible) plus an offline mock'],
  ['Frontend', 'React 18, TypeScript, Vite, Tailwind CSS, Zustand, React Router'],
]

export default function AboutPage() {
  return (
    <div className="space-y-4">
      <section className="card">
        <h1 className="text-xl font-bold">About Negotiation Dojo</h1>
        <p className="mt-2 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
          Ordinary chatbots give advice, but advice does not prepare you for a stubborn counterpart across the table.
          Negotiation Dojo is a sparring environment: three cooperating AI agents let you rehearse salary, insurance-claim and rent
          negotiations against a realistic opponent, with live coaching and a scored debrief, before the real conversation.
        </p>
      </section>

      <section className="card">
        <h2 className="mb-3 text-lg font-bold">How it flows</h2>
        <ol className="flex flex-wrap items-center gap-2 text-sm">
          {FLOW.map((step, i) => (
            <li key={step} className="flex items-center gap-2">
              <span className="rounded-full border border-stone-300 px-3 py-1 dark:border-stone-700">{step}</span>
              {i < FLOW.length - 1 && <span aria-hidden>→</span>}
            </li>
          ))}
        </ol>
        <p className="mt-3 text-xs text-stone-500">
          For every message you send, the Counterpart reply and the Coach analysis run at the same time, so feedback never slows the conversation.
        </p>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        {AGENTS.map((a) => (
          <section key={a.name} className={`card border-t-4 ${a.color.split(' ')[0]}`}>
            <h2 className={`text-lg font-bold ${a.color.split(' ')[1]}`}>{a.name} agent</h2>
            <p className="mt-2 text-sm leading-relaxed text-stone-600 dark:text-stone-400">{a.text}</p>
          </section>
        ))}
      </div>

      <section className="card">
        <h2 className="mb-3 text-lg font-bold">Project objectives</h2>
        <ul className="space-y-2 text-sm">
          {OBJECTIVES.map(([goal, how]) => (
            <li key={goal} className="flex gap-2">
              <span aria-hidden>✅</span>
              <span>
                <b>{goal}.</b> <span className="text-stone-600 dark:text-stone-400">{how}.</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h2 className="mb-3 text-lg font-bold">Future scope, built in</h2>
        <ul className="grid gap-2 text-sm sm:grid-cols-2">
          {FUTURE.map(([t, d]) => (
            <li key={t} className="rounded-xl border border-stone-200 p-3 dark:border-stone-800">
              <div className="font-semibold">{t}</div>
              <div className="text-stone-600 dark:text-stone-400">{d}</div>
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h2 className="mb-3 text-lg font-bold">Tech stack</h2>
        <dl className="space-y-1.5 text-sm">
          {STACK.map(([k, v]) => (
            <div key={k} className="grid gap-1 sm:grid-cols-[100px_1fr]">
              <dt className="font-semibold">{k}</dt>
              <dd className="text-stone-600 dark:text-stone-400">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="card">
        <h2 className="mb-2 text-lg font-bold">Known limitations</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-stone-600 dark:text-stone-400">
          <li>The AI opponent is a simulation. Real negotiators may behave differently, so treat scores as practice feedback.</li>
          <li>Your history is tied to an anonymous id stored in this browser, not to an account.</li>
          <li>Voice features depend on your browser (Chrome and Edge work best).</li>
        </ul>
      </section>
    </div>
  )
}