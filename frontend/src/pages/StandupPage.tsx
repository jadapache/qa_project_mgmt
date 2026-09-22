import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api, type GroundedResult } from '../api/client'

export const StandupPage = () => {
  const [result, setResult] = useState<GroundedResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const handleGenerate = async () => {
    setBusy(true)
    setError(null)
    try {
      const data = await api.generateStandup()
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Standup failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="page-title">Standup</h1>
        <p className="page-subtitle">
          Allowed sources: <strong>Jira + GitHub only</strong>. Refuses instead of guessing when data is missing.
        </p>
        <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
          Need connections? <Link className="text-[var(--color-primary)] underline" to="/integrations">Open Integrations</Link>
        </p>
      </header>

      <button
        type="button"
        onClick={() => void handleGenerate()}
        disabled={busy}
        className="btn-primary px-5 py-3 font-semibold disabled:opacity-50"
        aria-label="Generate standup"
      >
        {busy ? 'Gathering context…' : 'Generate Standup'}
      </button>

      {error ? (
        <p className="text-sm text-[var(--color-bad)]" role="alert">{error}</p>
      ) : null}

      {result ? <GroundedResultView result={result} /> : null}
    </div>
  )
}

export const GroundedResultView = ({ result }: { result: GroundedResult }) => {
  if (result.refused || !result.ok) {
    return (
      <section className="rounded-xl border border-[rgba(161,92,18,0.3)] bg-[rgba(161,92,18,0.08)] p-5">
        <h2 className="text-lg font-semibold text-[var(--color-warn)]">No answer — sources incomplete</h2>
        <p className="mt-2 text-sm">{result.reason}</p>
        {result.context?.missing_sources?.length ? (
          <p className="mt-2 text-xs text-[var(--color-ink-muted)]">
            Missing: {result.context.missing_sources.join(', ')}
          </p>
        ) : null}
      </section>
    )
  }

  return (
    <div className="space-y-6">
      <section className="card">
        <h2 className="text-lg font-semibold">Answer</h2>
        <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{result.answer}</div>
        {result.meta ? (
          <p className="mt-4 text-xs text-[var(--color-ink-muted)]">
            prompt v{String(result.meta.prompt_version)} · rubric v{String(result.meta.rubric_version)} ·{' '}
            {String(result.meta.provider)}/{String(result.meta.model)}
          </p>
        ) : null}
      </section>

      <section>
        <h2 className="text-lg font-semibold">Citations</h2>
        <ul className="mt-3 space-y-2">
          {result.citations.map((cite) => (
            <li key={cite.id} className="border-l-2 border-[var(--color-primary)] pl-3 text-sm">
              [{cite.index}] {cite.title}
              <span className="ml-2 text-xs text-[var(--color-ink-muted)]">
                {cite.source_type} · {cite.source_label}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
