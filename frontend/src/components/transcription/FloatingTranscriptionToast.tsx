import React, { useState } from 'react'
import {
  Sparkles,
  Loader2,
  ChevronDown,
  ChevronUp,
  Maximize2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Mic,
  X,
} from 'lucide-react'
import type { TranscriptionProgress } from '../../api/modules/transcription'

interface FloatingTranscriptionToastProps {
  activeJobs: TranscriptionProgress[]
  onOpenStudio: (id: string) => void
  onCancelJob: (id: string) => void
  onDismissJob?: (id: string) => void
}

export const FloatingTranscriptionToast: React.FC<FloatingTranscriptionToastProps> = ({
  activeJobs,
  onOpenStudio,
  onCancelJob,
  onDismissJob,
}) => {
  const [isMinimized, setIsMinimized] = useState(false)

  if (!activeJobs || activeJobs.length === 0) {
    return null
  }

  const primaryJob = activeJobs[0]
  const otherJobsCount = activeJobs.length - 1

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-md w-full sm:w-96 animate-fade-in font-sans shadow-xl">
      <div className="bg-white text-slate-900 rounded-2xl border border-slate-300/90 shadow-2xl overflow-hidden">
        {/* Toast Header: Corporate Solid Dark Blue */}
        <div className="px-4 py-3 bg-[#002777] text-white flex items-center justify-between border-b border-blue-900">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/15 text-white">
              {primaryJob.status === 'complete' ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              ) : primaryJob.status === 'failed' ? (
                <AlertTriangle className="h-4 w-4 text-amber-300" />
              ) : (
                <Sparkles className="h-4 w-4 animate-pulse text-blue-200" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-blue-100 truncate">
                Transcripción {otherJobsCount > 0 && `(+${otherJobsCount})`}
              </p>
              <p className="text-[11px] text-blue-200 font-medium truncate">
                {primaryJob.status === 'complete'
                  ? 'Completado con éxito'
                  : primaryJob.status === 'failed'
                  ? 'Fallo en proceso'
                  : `${primaryJob.progress}% • ${primaryJob.stage || 'Procesando'}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => onOpenStudio(primaryJob.id)}
              className="px-2.5 py-1 bg-white text-[#002777] hover:bg-blue-50 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-2xs"
              title="Abrir espacio de transcripción"
            >
              <Maximize2 className="h-3 w-3" />
              <span className="hidden sm:inline">Abrir</span>
            </button>

            <button
              type="button"
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1 hover:bg-white/10 rounded-lg text-blue-200 hover:text-white transition"
              title={isMinimized ? 'Expandir' : 'Minimizar'}
            >
              {isMinimized ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Expandable Body */}
        {!isMinimized && (
          <div className="p-4 space-y-3.5 bg-white divide-y divide-slate-100">
            {activeJobs.map((job) => {
              const isComplete = job.status === 'complete'
              const isFailed = job.status === 'failed'

              return (
                <div key={job.id} className="space-y-2 pt-3 first:pt-0">
                  <div className="flex items-center justify-between text-xs gap-2">
                    <span className="font-semibold text-slate-800 flex items-center gap-1.5 min-w-0">
                      {isComplete ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      ) : isFailed ? (
                        <AlertTriangle className="h-3.5 w-3.5 text-red-600 shrink-0" />
                      ) : (
                        <Loader2 className="h-3.5 w-3.5 text-[#002777] animate-spin shrink-0" />
                      )}
                      <span className="truncate">{job.message || 'Procesando audio...'}</span>
                    </span>

                    <span className="font-mono text-[11px] font-bold text-[#002777] shrink-0">
                      {job.progress}%
                    </span>
                  </div>

                  {/* Progress Bar (Solid Colors) */}
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                    <div
                      className={`h-full transition-all duration-300 ${
                        isComplete
                          ? 'bg-emerald-600'
                          : isFailed
                          ? 'bg-red-600'
                          : 'bg-[#002777]'
                      }`}
                      style={{ width: `${Math.max(5, job.progress)}%` }}
                    />
                  </div>

                  {/* Footer Meta & Actions */}
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                    <div className="flex items-center gap-2 min-w-0">
                      {job.eta && !isComplete && !isFailed && (
                        <span className="flex items-center gap-1 text-slate-500">
                          <Clock className="h-3 w-3 text-slate-400" />
                          <span>{job.eta}</span>
                        </span>
                      )}
                      {job.model_info && (
                        <span className="flex items-center gap-1 text-slate-600 font-medium truncate">
                          <Mic className="h-3 w-3 text-[#002777]" />
                          <span className="truncate max-w-[130px]">{job.model_info}</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {!isComplete && !isFailed && (
                        <button
                          type="button"
                          onClick={() => onCancelJob(job.id)}
                          className="text-red-600 hover:text-red-700 hover:underline font-semibold text-xs transition"
                        >
                          Cancelar
                        </button>
                      )}
                      {(isComplete || isFailed) && onDismissJob && (
                        <button
                          type="button"
                          onClick={() => onDismissJob(job.id)}
                          className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition"
                          title="Cerrar notificación"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onOpenStudio(job.id)}
                        className="text-[#002777] hover:underline font-bold text-xs transition"
                      >
                        Ver Estudio
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
