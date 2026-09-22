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
      setError(err instanceof Error ? err.message : 'Falló la generación de Standup')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="page-title">Standup Diario</h1>
        <p className="page-subtitle">
          Fuentes permitidas: <strong>Únicamente Jira + GitHub</strong>. Rechaza responder si faltan datos en lugar de adivinar.
        </p>
        <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
          ¿Necesitas configurar conexiones? <Link className="text-[var(--color-primary)] underline" to="/integrations">Abrir Integraciones</Link>
        </p>
      </header>

      <button
        type="button"
        onClick={() => void handleGenerate()}
        disabled={busy}
        className="btn-primary px-5 py-3 font-semibold disabled:opacity-50"
        aria-label="Generar Standup"
      >
        {busy ? 'Recopilando contexto…' : 'Generar Standup'}
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
        <h2 className="text-lg font-semibold text-[var(--color-warn)]">Sin respuesta — fuentes incompletas</h2>
        <p className="mt-2 text-sm">{result.reason}</p>
        {result.context?.missing_sources?.length ? (
          <p className="mt-2 text-xs text-[var(--color-ink-muted)]">
            Faltantes: {result.context.missing_sources.join(', ')}
          </p>
        ) : null}
      </section>
    )
  }

  return (
    <div className="space-y-6">
      <section className="card">
        <h2 className="text-lg font-semibold">Respuesta</h2>
        <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{result.answer}</div>
        {result.meta ? (
          <p className="mt-4 text-xs text-[var(--color-ink-muted)]">
            prompt v{String(result.meta.prompt_version)} · rúbrica v{String(result.meta.rubric_version)} ·{' '}
            {String(result.meta.provider)}/{String(result.meta.model)}
          </p>
        ) : null}
      </section>

      <section>
        <h2 className="text-lg font-semibold">Citas y Referencias</h2>
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
