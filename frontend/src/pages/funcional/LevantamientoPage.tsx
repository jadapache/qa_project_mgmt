import { Layers, Clock, Sparkles, CheckCircle2 } from 'lucide-react'

export const LevantamientoPage = () => {
  const plannedFeatures = [
    'Entrevistas guiadas a usuarios finales con captura estructurada de necesidades',
    'Transcripción y extracción automática de requerimientos desde minutas de reunión',
    'Generación automática de Diagramas de Procesos de Negocio (BPMN / Flujos de Trabajo)',
    'Matriz de trazabilidad interactiva entre objetivos del proyecto y HU/Requerimientos',
  ]

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#002777]">
              Módulo Funcional
            </p>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
              <Clock className="h-3 w-3" />
              Próximamente a implementar
            </span>
          </div>
          <h1 className="page-title mt-1">Levantamiento de Requerimientos</h1>
          <p className="page-subtitle">
            Herramienta inteligente para la toma de requerimientos, entrevistas a usuarios finales y estructuración de procesos de negocio.
          </p>
        </div>
      </header>

      <section className="card p-8 bg-gradient-to-br from-white via-blue-50/20 to-slate-50 border border-blue-100 shadow-lg shadow-blue-100/30">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#002777] text-white shadow-md shadow-blue-900/30">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[var(--color-ink)]">
              Capacidades en desarrollo para el Módulo de Levantamiento
            </h2>
            <p className="text-xs text-[var(--color-ink-muted)]">
              Este módulo permitirá a los analistas funcionales y Product Owners automatizar el levantamiento temprano.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {plannedFeatures.map((item, index) => (
            <div
              key={index}
              className="flex items-start gap-3 rounded-xl border border-[var(--color-border)] bg-white p-4 shadow-sm transition-all hover:border-[#004497]/40 hover:shadow-md"
            >
              <CheckCircle2 className="h-5 w-5 shrink-0 text-[#004497] mt-0.5" />
              <span className="text-sm font-medium text-[var(--color-ink)] leading-relaxed">{item}</span>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-xl bg-blue-50/60 p-4 border border-blue-200/60 flex items-center gap-3 text-xs text-[#002777]">
          <Sparkles className="h-4 w-4 shrink-0 text-[#004497] animate-pulse-soft" />
          <span>
            Mientras tanto, puedes utilizar la opción <strong>Documento de Mejoras</strong> en el menú <strong>Funcional</strong> para generar especificaciones completas en formato .docx.
          </span>
        </div>
      </section>
    </div>
  )
}
