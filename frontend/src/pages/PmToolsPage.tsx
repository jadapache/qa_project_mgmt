import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api, type GroundedResult } from '../api/client'
import { GroundedResultView } from './StandupPage'

export const PmToolsPage = () => {
  const [result, setResult] = useState<GroundedResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const handleStandup = async () => {
    setBusy(true)
    setError(null)
    setResult(null)
    try {
      const response = await api.generateStandup()
      setResult(response)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Standup failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-ink-muted)]">PM Tools</p>
        <h1 className="font-[family-name:var(--font-display)] text-5xl">Product workflows</h1>
        <p className="max-w-2xl text-[var(--color-ink-muted)]">
          Standup uses Jira + GitHub only. If those sources are missing, it refuses instead of guessing.
        </p>
      </header>

      <section className="rounded-xl border border-[var(--color-line)] bg-white/60 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold">Standup</h2>
            <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
              Allowed sources: Jira, GitHub. Prompt + rubric are editable in Settings.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void handleStandup()}
            disabled={busy}
            className="rounded-md bg-[var(--color-sea)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {busy ? 'Generating…' : 'Generate Standup'}
          </button>
        </div>

        {error ? (
          <p className="mt-4 text-sm text-[var(--color-bad)]" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-6">
          {result ? <GroundedResultView result={result} /> : null}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {[
          {
            title: 'PRD Checker',
            body: 'Next: upload/paste a PRD and score it against your rubric with Knowledge retrieval.',
          },
          {
            title: 'Change Impact',
            body: 'Next: plain-language change → affected tickets, files, docs, and stakeholders.',
          },
        ].map((item) => (
          <article key={item.title} className="border-l-2 border-[var(--color-line)] pl-4">
            <h3 className="font-semibold">{item.title}</h3>
            <p className="mt-1 text-sm text-[var(--color-ink-muted)]">{item.body}</p>
          </article>
        ))}
      </section>

      <p className="text-sm text-[var(--color-ink-muted)]">
        Need docs for later PM tools? Upload them in <Link className="underline" to="/knowledge">Knowledge</Link>.
      </p>
    </div>
  )
}
