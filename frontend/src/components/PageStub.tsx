import type { ReactNode } from 'react'

export default function PageStub({ title, step, children }: { title: string; step: number; children?: ReactNode }) {
  return (
    <section className="card">
      <h1 className="text-xl font-bold">{title}</h1>
      <p className="mt-1 text-sm text-stone-500">Built in step {step}.</p>
      {children}
    </section>
  )
}