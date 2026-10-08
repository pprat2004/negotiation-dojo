import { NavLink, Outlet } from 'react-router-dom'
import ConnectionBadge from './ConnectionBadge'
import ThemeToggle from './ThemeToggle'

const links = [
  { to: '/', label: 'Setup', end: true },
  { to: '/dojo', label: 'Dojo', end: false },
  { to: '/progress', label: 'Progress', end: false },
  { to: '/about', label: 'About', end: false },
]

export default function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:text-stone-900"
      >
        Skip to content
      </a>

      <header className="border-b border-stone-200 bg-white/80 backdrop-blur dark:border-stone-800 dark:bg-stone-950/80">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
          <span className="text-lg font-extrabold tracking-tight">🥋 Negotiation Dojo</span>
          <nav aria-label="Main" className="flex gap-1">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    isActive
                      ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
                      : 'text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800'
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <ConnectionBadge />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <Outlet />
      </main>

      <footer className="border-t border-stone-200 py-3 text-center text-xs text-stone-500 dark:border-stone-800">
        Dayananda Sagar University · CSE (AI &amp; ML) · Agentic AI and LLM project
      </footer>
    </div>
  )
}