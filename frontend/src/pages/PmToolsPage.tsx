import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api, type GroundedResult } from '../api/client'
import { GroundedResultView } from './StandupPage'
import { useToast } from '../context/ToastContext'

export const PmToolsPage = () => {
  const { toast } = useToast()
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
      if (response.refused) {
        toast.warning(response.reason || 'Fuentes incompletas para generar el standup.')
      } else {
        toast.success('Standup generado exitosamente.')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falló la generación de Standup'
      setError(msg)
      toast.error(msg)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-ink-muted)]">Herramientas PM</p>
        <h1 className="font-[family-name:var(--font-display)] text-5xl">Flujos de trabajo de Producto</h1>
        <p className="max-w-2xl text-[var(--color-ink-muted)]">
          Standup utiliza únicamente Jira y GitHub. Rechaza responder si faltan datos en lugar de adivinar.
        </p>
      </header>

      <section className="rounded-xl border border-[var(--color-line)] bg-white/60 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold">Standup Diario</h2>
            <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
              Fuentes permitidas: Jira, GitHub. El prompt y la rúbrica son editables en Configuración.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void handleStandup()}
            disabled={busy}
            className="rounded-md bg-[var(--color-sea)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {busy ? 'Generando…' : 'Generar Standup'}
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
            title: 'Revisor de PRD',
            body: 'Sube o pega un PRD para evaluarlo con tu rúbrica y la biblioteca de conocimiento.',
            to: '/pm/prd-checker',
          },
          {
            title: 'Impacto de Cambios',
            body: 'Mapea cambios en lenguaje natural hacia tickets, archivos, docs y partes interesadas.',
            to: '/pm/change-impact',
          },
        ].map((item) => (
          <Link key={item.title} to={item.to} className="border-l-2 border-[var(--color-line)] pl-4 hover:border-[#002777] transition-colors">
            <h3 className="font-semibold text-[var(--color-ink)]">{item.title}</h3>
            <p className="mt-1 text-sm text-[var(--color-ink-muted)]">{item.body}</p>
          </Link>
        ))}
      </section>

      <p className="text-sm text-[var(--color-ink-muted)]">
        ¿Necesitas documentos para tus flujos de PM? Cárgalos en <Link className="underline" to="/knowledge">Conocimiento</Link>.
      </p>
    </div>
  )
}
