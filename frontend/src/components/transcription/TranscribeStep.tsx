import { useState } from 'react'
import {
  Mic,
  CheckCircle2,
  AlertCircle,
  Clock,
  Users,
  Search,
  UserCheck,
  Edit3,
  ArrowRight,
  RefreshCw,
} from 'lucide-react'
import type { TranscriptionResult } from '../../api/client'

export interface TranscribeStepProps {
  progress: number
  status: string
  statusMessage: string
  errorMessage?: string | null
  result: TranscriptionResult | null
  onRenameSpeakers?: (speakerMap: Record<string, string>) => Promise<any>
  onNext: () => void
  onRetry: () => void
}

function formatSeconds(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

const SPEAKER_COLORS: Record<number, string> = {
  0: 'bg-blue-100 text-[#002777] border-blue-200',
  1: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  2: 'bg-purple-100 text-purple-800 border-purple-200',
  3: 'bg-amber-100 text-amber-800 border-amber-200',
}

export const TranscribeStep = ({
  progress,
  status,
  statusMessage,
  errorMessage,
  result,
  onRenameSpeakers,
  onNext,
  onRetry,
}: TranscribeStepProps) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [isRenaming, setIsRenaming] = useState(false)
  const [speakerNames, setSpeakerNames] = useState<Record<string, string>>({})

  const isComplete = status === 'complete' || (result && result.segments && result.segments.length > 0)
  const isFailed = status === 'failed'

  // Extract unique speakers
  const uniqueSpeakers = Array.from(
    new Set(result?.segments?.map((s) => s.speaker) || [])
  )

  const handleOpenRenaming = () => {
    const initialMap: Record<string, string> = {}
    uniqueSpeakers.forEach((spk) => {
      initialMap[spk] = spk
    })
    setSpeakerNames(initialMap)
    setIsRenaming(true)
  }

  const handleSaveRenaming = async () => {
    if (onRenameSpeakers) {
      await onRenameSpeakers(speakerNames)
    }
    setIsRenaming(false)
  }

  const filteredSegments = (result?.segments || []).filter((seg) => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    return seg.text.toLowerCase().includes(term) || seg.speaker.toLowerCase().includes(term)
  })

  return (
    <div className="space-y-6">
      <div className="text-center max-w-xl mx-auto">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
          {isComplete ? 'Transcripción Completada' : 'Transcribiendo Sesión de Audio'}
        </h2>
        <p className="text-sm text-slate-600 mt-1.5">
          {statusMessage || 'Procesando reconocimiento de voz y análisis de diálogo...'}
        </p>
      </div>

      {/* Progress Card */}
      <div className="card p-8 bg-white border border-slate-200 rounded-2xl shadow-sm text-center space-y-6">
        <div className="flex items-center justify-center">
          {isComplete ? (
            <div className="h-16 w-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center ring-8 ring-emerald-50/50">
              <CheckCircle2 className="h-10 w-10 animate-scale-in" />
            </div>
          ) : isFailed ? (
            <div className="h-16 w-16 rounded-full bg-red-50 text-red-600 flex items-center justify-center ring-8 ring-red-50/50">
              <AlertCircle className="h-10 w-10" />
            </div>
          ) : (
            <div className="relative">
              <div className="h-16 w-16 rounded-full bg-blue-50 text-[#002777] flex items-center justify-center ring-8 ring-blue-50/50">
                <Mic className="h-8 w-8 animate-pulse text-[#004497]" />
              </div>
              <div className="absolute -top-1 -right-1 h-4 w-4 bg-cyan-400 rounded-full animate-ping" />
            </div>
          )}
        </div>

        {/* Status text & progress bar */}
        {!isComplete && !isFailed && (
          <div className="max-w-md mx-auto space-y-2.5">
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden p-0.5 border border-slate-200">
              <div
                className="bg-gradient-to-r from-[#002777] to-cyan-500 h-full rounded-full transition-all duration-500 ease-out"
                style={{ width: `${Math.max(progress, 8)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs font-semibold text-slate-600">
              <span className="capitalize">{status}...</span>
              <span className="text-[#002777] font-bold">{progress}%</span>
            </div>
          </div>
        )}

        {isFailed && (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-red-600">
              {errorMessage || 'Ocurrió un error al procesar el archivo multimedia.'}
            </p>
            <button
              type="button"
              onClick={onRetry}
              className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-900 inline-flex items-center gap-2"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Reintentar
            </button>
          </div>
        )}

        {isComplete && result && (
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 font-semibold text-slate-700">
              <Clock className="h-3.5 w-3.5 text-slate-500" />
              {formatSeconds(result.duration_seconds || 0)} min de audio
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 font-semibold text-[#002777] border border-blue-100">
              <Users className="h-3.5 w-3.5 text-[#004497]" />
              {uniqueSpeakers.length} interlocutores detectados
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 font-semibold text-emerald-800 border border-emerald-100">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              {result.segments.length} turnos de diálogo
            </span>
          </div>
        )}
      </div>

      {/* Transcript Preview & Speaker Renaming */}
      {result && result.segments && result.segments.length > 0 && (
        <div className="card p-6 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Línea de Diálogo Transcrita
              </h3>
              <p className="text-xs text-slate-500">
                Revisa las intervenciones y asigna nombres reales a los participantes
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar en la transcripción..."
                  className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs w-44 md:w-56 focus:bg-white focus:ring-1 focus:ring-[#002777]"
                />
              </div>

              {uniqueSpeakers.length > 0 && (
                <button
                  type="button"
                  onClick={handleOpenRenaming}
                  className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#002777] text-xs font-bold transition flex items-center gap-1.5 border border-blue-200/60"
                >
                  <Edit3 className="h-3.5 w-3.5" /> Renombrar participantes
                </button>
              )}
            </div>
          </div>

          {/* Speaker Renaming Modal/Card */}
          {isRenaming && (
            <div className="p-4 bg-gradient-to-r from-blue-50/70 via-slate-50 to-blue-50/70 border border-blue-200 rounded-xl space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#002777] flex items-center gap-1.5">
                  <UserCheck className="h-4 w-4" /> Asignar Nombres a Interlocutores
                </span>
                <button
                  type="button"
                  onClick={() => setIsRenaming(false)}
                  className="text-xs text-slate-500 hover:text-slate-700"
                >
                  Cancelar
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {uniqueSpeakers.map((spk) => (
                  <div key={spk} className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600 block">{spk}</label>
                    <input
                      type="text"
                      value={speakerNames[spk] || ''}
                      onChange={(e) =>
                        setSpeakerNames({ ...speakerNames, [spk]: e.target.value })
                      }
                      placeholder="Nombre real del participante"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium"
                    />
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleSaveRenaming}
                  className="px-4 py-1.5 bg-[#002777] text-white rounded-lg text-xs font-bold hover:bg-[#004497] transition"
                >
                  Guardar Nombres
                </button>
              </div>
            </div>
          )}

          {/* Segments Scroll Area */}
          <div className="max-h-80 overflow-y-auto space-y-2.5 pr-2 custom-scrollbar">
            {filteredSegments.length > 0 ? (
              filteredSegments.map((seg, idx) => {
                const spkIndex = Math.abs(seg.speaker.charCodeAt(0) + (seg.speaker.charCodeAt(seg.speaker.length - 1) || 0)) % 4
                const colorClass = SPEAKER_COLORS[spkIndex] || SPEAKER_COLORS[0]

                return (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-50/60 border border-slate-100 hover:bg-white hover:border-blue-100 transition flex items-start gap-3 text-xs"
                  >
                    <span className="font-mono text-slate-400 shrink-0 mt-0.5 font-medium">
                      [{formatSeconds(seg.start)}]
                    </span>
                    <span
                      className={`font-semibold shrink-0 px-2 py-0.5 rounded-md border text-[11px] ${colorClass}`}
                    >
                      {seg.speaker}
                    </span>
                    <p className="text-slate-700 leading-relaxed flex-1">{seg.text}</p>
                  </div>
                )
              })
            ) : (
              <p className="text-center text-xs text-slate-500 py-6">
                No se encontraron segmentos con el término buscado.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between items-center pt-2">
        <button
          type="button"
          onClick={onRetry}
          className="text-xs font-semibold text-slate-500 hover:text-slate-800"
        >
          ← Subir otro archivo
        </button>

        <button
          type="button"
          onClick={onNext}
          disabled={!isComplete}
          className="btn-primary px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-900/20 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span>Revisar Resumen Ejecutivo</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
