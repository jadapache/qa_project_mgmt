import type React from 'react'
import {
  FileText,
  Calendar,
  Clock,
  HardDrive,
  Trash2,
  Eye,
} from 'lucide-react'
import type { TranscriptionResult } from '../../api/modules/transcription'

interface RecentTranscriptionItemProps {
  transcription: TranscriptionResult
  viewMode?: 'grid' | 'list'
  onOpenSummary: (transcriptionId: string) => void
  onRequestDelete: (transcription: TranscriptionResult) => void
}

function formatSeconds(seconds: number): string {
  if (!seconds || isNaN(seconds) || seconds <= 0) return '0 s'
  return `${Math.round(seconds)} s`
}

function formatFileSize(transcription: TranscriptionResult): string {
  if (transcription.metadata?.file_size_formatted) {
    return transcription.metadata.file_size_formatted
  }
  const bytes = transcription.metadata?.size_bytes
  if (bytes && bytes > 0) {
    if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    return `${(bytes / 1024).toFixed(1)} KB`
  }
  return 'Audio'
}

function formatDateTime(isoString: string): string {
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

export const RecentTranscriptionItem: React.FC<RecentTranscriptionItemProps> = ({
  transcription,
  viewMode = 'grid',
  onOpenSummary,
  onRequestDelete,
}) => {
  const title = transcription.metadata?.title || 'Transcripción de Reunión'
  const description = transcription.metadata?.description || 'Sin descripción adicional.'
  const sizeStr = formatFileSize(transcription)
  const durationStr = formatSeconds(transcription.duration_seconds)
  const dateTimeStr = formatDateTime(transcription.created_at)

  if (viewMode === 'list') {
    return (
      <div className="card p-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl shadow-2xs transition hover:shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#002777] ring-1 ring-blue-100">
            <FileText className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1 space-y-0.5">
            <h4 className="text-sm font-bold text-slate-900 truncate" title={title}>
              {title}
            </h4>
            <p className="text-xs text-slate-500 line-clamp-1" title={description}>
              {description}
            </p>
            <div className="flex flex-wrap items-center gap-2.5 text-[11px] text-slate-400 pt-1">
              <span className="flex items-center gap-1 font-medium text-slate-600">
                <Calendar className="h-3 w-3 text-slate-400" />
                {dateTimeStr}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 font-medium text-slate-600">
                <Clock className="h-3 w-3 text-slate-400" />
                {durationStr}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 font-medium text-slate-600">
                <HardDrive className="h-3 w-3 text-slate-400" />
                {sizeStr}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          <button
            type="button"
            onClick={() => onOpenSummary(transcription.id)}
            className="p-2 text-slate-600 hover:text-[#002777] hover:bg-blue-50 rounded-xl border border-slate-200 transition cursor-pointer flex items-center gap-1 text-xs font-semibold"
            title="Ver transcripción y resumen"
          >
            <Eye className="h-4 w-4 text-[#002777]" />
            <span className="hidden md:inline">Ver</span>
          </button>

          <button
            type="button"
            onClick={() => onRequestDelete(transcription)}
            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl border border-transparent hover:border-red-200 transition cursor-pointer"
            title="Eliminar transcripción"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    )
  }

  // Grid Mode (Card)
  return (
    <div className="card p-5 bg-white border border-slate-200 hover:border-slate-300 rounded-2xl shadow-xs transition hover:shadow-md flex flex-col justify-between space-y-4">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3.5 min-w-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#002777] ring-1 ring-blue-100 shadow-xs">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0 space-y-0.5">
              <h4 className="text-sm font-bold text-slate-900 truncate" title={title}>
                {title}
              </h4>
              <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed" title={description}>
                {description}
              </p>
            </div>
          </div>
        </div>

        {/* Metadata Details: Peso, Duración en segundos, Fecha y Hora */}
        <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100">
          <div className="flex items-center gap-1.5 text-slate-600">
            <HardDrive className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span className="font-semibold text-slate-700 truncate">{sizeStr}</span>
          </div>

          <div className="flex items-center gap-1.5 text-slate-600 justify-end">
            <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span className="font-semibold text-slate-700">{durationStr}</span>
          </div>

          <div className="col-span-2 flex items-center gap-1.5 text-[11px] text-slate-500 pt-0.5">
            <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span>{dateTimeStr}</span>
          </div>
        </div>
      </div>

      {/* Actions: Eye button to view and Trash button to delete */}
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
        <button
          type="button"
          onClick={() => onRequestDelete(transcription)}
          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition cursor-pointer"
          title="Eliminar transcripción"
        >
          <Trash2 className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => onOpenSummary(transcription.id)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-[#002777] hover:bg-[#001f5f] rounded-xl transition cursor-pointer shadow-xs"
          title="Ver transcripción y resumen"
        >
          <Eye className="h-3.5 w-3.5" />
          <span>Ver Transcripción</span>
        </button>
      </div>
    </div>
  )
}
