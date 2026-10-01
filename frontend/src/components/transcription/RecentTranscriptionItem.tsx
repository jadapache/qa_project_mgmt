import type React from 'react'
import {
  FileText,
  Calendar,
  Clock,
  Users,
  CheckSquare,
  Sparkles,
  Trash2,
  BookOpen,
  ArrowRight,
} from 'lucide-react'
import type { TranscriptionResult } from '../../api/modules/transcription'

interface RecentTranscriptionItemProps {
  transcription: TranscriptionResult
  onOpenSummary: (transcriptionId: string) => void
  onOpenGenerate: (transcriptionId: string) => void
  onDelete: (transcriptionId: string) => Promise<void>
}

export const RecentTranscriptionItem: React.FC<RecentTranscriptionItemProps> = ({
  transcription,
  onOpenSummary,
  onOpenGenerate,
  onDelete,
}) => {
  const formatDuration = (seconds: number): string => {
    if (!seconds || seconds <= 0) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatDate = (isoString: string): string => {
    try {
      const d = new Date(isoString)
      return d.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return isoString || 'Reciente'
    }
  }

  const summary = transcription.summary
  const participants = summary?.participants || []
  const requirementsCount = summary?.requirements?.length || 0
  const decisionsCount = summary?.decisions?.length || 0

  return (
    <div className="card p-5 bg-white border border-slate-200 hover:border-slate-300 rounded-2xl shadow-xs transition hover:shadow-md flex flex-col justify-between space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3.5 min-w-0">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#002777] ring-1 ring-blue-100 shadow-xs">
            <FileText className="h-5 w-5" />
          </div>
          <div className="min-w-0 space-y-1">
            <h4 className="text-sm font-bold text-slate-900 truncate">
              {transcription.metadata.title}
            </h4>
            <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {formatDate(transcription.created_at)}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 font-mono">
                <Clock className="h-3.5 w-3.5" />
                {formatDuration(transcription.duration_seconds)}
              </span>
              {transcription.saved_to_knowledge && (
                <>
                  <span>•</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-semibold border border-emerald-100 flex items-center gap-1">
                    <BookOpen className="h-3 w-3" /> Biblioteca
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onDelete(transcription.id)}
          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition"
          title="Eliminar transcripción"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Summary Chips */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {participants.length > 0 && (
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700">
            <Users className="h-3.5 w-3.5 text-blue-600" />
            <span>{participants.length} {participants.length === 1 ? 'participante' : 'participantes'}</span>
          </div>
        )}

        {requirementsCount > 0 && (
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-100">
            <Sparkles className="h-3.5 w-3.5" />
            <span>{requirementsCount} reqs</span>
          </div>
        )}

        {decisionsCount > 0 && (
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100">
            <CheckSquare className="h-3.5 w-3.5" />
            <span>{decisionsCount} decisiones</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
        <button
          type="button"
          onClick={() => onOpenSummary(transcription.id)}
          className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
        >
          Ver Resumen
        </button>

        <button
          type="button"
          onClick={() => onOpenGenerate(transcription.id)}
          className="btn-primary px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>Generar Documentos</span>
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  )
}
