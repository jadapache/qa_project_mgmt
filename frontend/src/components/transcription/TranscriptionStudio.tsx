import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  ArrowLeft,
  Sparkles,
  Clock,
  Users,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Copy,
  Check,
  BookOpen,
  Wand2,
  Volume2,
  Edit3,
} from 'lucide-react'
import { UniverContainer } from '../document_workspace/UniverContainer'
import { UniverAdapter } from '../../document_agent/adapters/UniverAdapter'
import {
  transcriptionApi,
  type TranscriptionResult,
  type TranscriptionProgress,
  type TranscriptionSummary,
} from '../../api/modules/transcription'
import { useToast } from '../../context/ToastContext'
import { GenerateModal } from './GenerateModal'

interface TranscriptionStudioProps {
  transcriptionId: string
  activeProgress?: TranscriptionProgress | null
  onBackToDashboard: () => void
  onRefreshData?: () => void
}

function formatDuration(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`
}

function buildTranscriptMarkdown(result: TranscriptionResult | null): string {
  if (!result) return '# Transcripción de la Reunión\n\n_Cargando transcripción..._'
  const title = result.metadata?.title || 'Reunión'
  const header = `# Transcripción: ${title}\n\n`

  if (!result.segments || result.segments.length === 0) {
    if (result.text) {
      return `${header}${result.text}`
    }
    return `${header}_No se detectaron segmentos de audio._`
  }

  const lines = result.segments.map((seg) => {
    const mins = Math.floor(seg.start / 60)
    const secs = Math.floor(seg.start % 60)
    const timeStr = `${mins}:${secs < 10 ? '0' : ''}${secs}`
    const speaker = seg.speaker || 'Participante'
    return `**[${timeStr}] ${speaker}:** ${seg.text}`
  })

  return `${header}${lines.join('\n\n')}`
}

function buildSummaryMarkdown(summary: TranscriptionSummary | null | undefined, title: string = 'Reunión'): string {
  if (!summary) return ''

  const sections: string[] = []
  sections.push(`# Resumen Ejecutivo: ${title}\n`)

  if (summary.participants && summary.participants.length > 0) {
    sections.push(`## 👥 Participantes e Interlocutores\n${summary.participants.map((p) => `- ${p}`).join('\n')}\n`)
  }

  if (summary.topics && summary.topics.length > 0) {
    sections.push(`## 📌 Temas Tratados\n${summary.topics.map((t) => `- ${t}`).join('\n')}\n`)
  }

  if (summary.decisions && summary.decisions.length > 0) {
    sections.push(`## ✅ Decisiones Clave y Acuerdos\n${summary.decisions.map((d) => `- ${d}`).join('\n')}\n`)
  }

  if (summary.requirements && summary.requirements.length > 0) {
    sections.push(`## 📋 Requerimientos Funcionales y Técnicos\n${summary.requirements.map((r) => `- ${r}`).join('\n')}\n`)
  }

  if (summary.action_items && summary.action_items.length > 0) {
    sections.push(`## 🚀 Compromisos y Próximos Pasos\n${summary.action_items.map((a) => `- ${a}`).join('\n')}\n`)
  }

  return sections.join('\n')
}

export const TranscriptionStudio: React.FC<TranscriptionStudioProps> = ({
  transcriptionId,
  activeProgress,
  onBackToDashboard,
  onRefreshData,
}) => {
  const { toast } = useToast()

  // State
  const [transcriptionResult, setTranscriptionResult] = useState<TranscriptionResult | null>(null)
  const [transcriptContent, setTranscriptContent] = useState<string>('')
  const [summaryContent, setSummaryContent] = useState<string>('')
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false)
  const [isSavingKB, setIsSavingKB] = useState(false)
  const [hasCopiedTranscript, setHasCopiedTranscript] = useState(false)
  const [generateModalOpen, setGenerateModalOpen] = useState(false)

  // Speaker rename state
  const [showRenameModal, setShowRenameModal] = useState(false)
  const [speakerMap, setSpeakerMap] = useState<Record<string, string>>({})

  // Univer Adapters (one for transcript canvas, one for summary canvas)
  const transcriptAdapter = useMemo(() => new UniverAdapter('document'), [])
  const summaryAdapter = useMemo(() => new UniverAdapter('document'), [])

  // Is job still in progress
  const isJobActive = Boolean(activeProgress && activeProgress.status !== 'complete' && activeProgress.status !== 'failed')

  // Fetch initial data
  const loadTranscription = useCallback(async () => {
    try {
      const res = await transcriptionApi.getTranscriptionResult(transcriptionId)
      setTranscriptionResult(res)

      const tMd = buildTranscriptMarkdown(res)
      setTranscriptContent(tMd)

      if (res.summary) {
        const sMd = buildSummaryMarkdown(res.summary, res.metadata?.title)
        setSummaryContent(sMd)
      } else {
        setSummaryContent('')
      }

      // Initialize unique speakers map
      const speakers = Array.from(new Set(res.segments?.map((s) => s.speaker) || []))
      const initMap: Record<string, string> = {}
      speakers.forEach((spk) => {
        initMap[spk] = spk
      })
      setSpeakerMap(initMap)
    } catch (err: any) {
      console.warn('Could not load transcription result (might still be in progress):', err)
    }
  }, [transcriptionId])

  useEffect(() => {
    loadTranscription()
  }, [loadTranscription])

  // When active progress finishes, reload result
  useEffect(() => {
    if (activeProgress && activeProgress.status === 'complete') {
      loadTranscription()
      onRefreshData?.()
    }
  }, [activeProgress?.status, loadTranscription, onRefreshData])

  // Handle AI summary generation
  const handleGenerateSummary = async () => {
    try {
      setIsGeneratingSummary(true)
      toast.info('Generando resumen ejecutivo con IA...')
      const res = await transcriptionApi.generateSummary(transcriptionId)
      if (res.transcription) {
        setTranscriptionResult(res.transcription)
        const sMd = buildSummaryMarkdown(res.transcription.summary, res.transcription.metadata?.title)
        setSummaryContent(sMd)
        toast.success('¡Resumen ejecutivo generado con éxito!')
        onRefreshData?.()
      }
    } catch (err: any) {
      toast.error(`Error al generar resumen: ${err.message}`)
    } finally {
      setIsGeneratingSummary(false)
    }
  }

  // Save to Knowledge Base
  const handleSaveToKB = async () => {
    try {
      setIsSavingKB(true)
      await transcriptionApi.saveToKnowledgeBase(transcriptionId, ['reunion', 'transcripcion'])
      toast.success('Transcripción y resumen indexados en la Base de Conocimiento.')
      if (transcriptionResult) {
        setTranscriptionResult({ ...transcriptionResult, saved_to_knowledge: true })
      }
    } catch (err: any) {
      toast.error(`Error al guardar en Base de Conocimiento: ${err.message}`)
    } finally {
      setIsSavingKB(false)
    }
  }

  // Rename speakers
  const handleSaveSpeakerNames = async () => {
    try {
      const res = await transcriptionApi.renameSpeakers(transcriptionId, speakerMap)
      setTranscriptionResult(res.transcription)
      const tMd = buildTranscriptMarkdown(res.transcription)
      setTranscriptContent(tMd)
      if (res.transcription.summary) {
        const sMd = buildSummaryMarkdown(res.transcription.summary, res.transcription.metadata?.title)
        setSummaryContent(sMd)
      }
      setShowRenameModal(false)
      toast.success('Interlocutores actualizados.')
    } catch (err: any) {
      toast.error(`Error al renombrar: ${err.message}`)
    }
  }

  // Copy transcript text
  const handleCopyTranscript = () => {
    if (!transcriptContent) return
    navigator.clipboard.writeText(transcriptContent)
    setHasCopiedTranscript(true)
    setTimeout(() => setHasCopiedTranscript(false), 2000)
    toast.success('Transcripción copiada al portapapeles.')
  }

  const meetingTitle = transcriptionResult?.metadata?.title || activeProgress?.message || 'Transcripción de Reunión'
  const isSummaryReady = Boolean(summaryContent && summaryContent.trim().length > 0)

  return (
    <div className="flex flex-col h-[calc(100vh-5.5rem)] max-w-[1700px] mx-auto bg-slate-100 font-sans rounded-2xl border border-slate-300/80 shadow-md overflow-hidden">
      {/* Top Workspace Header */}
      <header className="px-5 py-3 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-2xs">
        <div className="flex items-center gap-3.5 min-w-0">
          <button
            type="button"
            onClick={onBackToDashboard}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition flex items-center gap-1.5 text-xs font-bold"
            title="Volver al panel de transcripciones"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Panel</span>
          </button>

          <div className="h-5 w-px bg-slate-200" />

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                {meetingTitle}
              </h1>
              {activeProgress && isJobActive ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 animate-pulse">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>En vivo ({activeProgress.progress}%)</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>Completado</span>
                </span>
              )}
            </div>

            {transcriptionResult && (
              <div className="flex items-center gap-2.5 text-[11px] text-slate-500 mt-0.5">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-slate-400" />
                  <span>{formatDuration(transcriptionResult.duration_seconds)} min</span>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3 text-slate-400" />
                  <span>{transcriptionResult.segments?.length || 0} turnos de voz</span>
                </span>
                <span>•</span>
                <span className="uppercase font-semibold text-slate-600">
                  Idioma: {transcriptionResult.language || 'ES'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-2">
          {transcriptionResult && (
            <>
              <button
                type="button"
                onClick={() => setShowRenameModal(true)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition flex items-center gap-1.5 shadow-2xs"
                title="Identificar nombres reales de los participantes"
              >
                <Edit3 className="h-3.5 w-3.5 text-blue-700" />
                <span className="hidden md:inline">Renombrar Hablantes</span>
              </button>

              <button
                type="button"
                onClick={handleSaveToKB}
                disabled={isSavingKB || transcriptionResult.saved_to_knowledge}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition flex items-center gap-1.5 shadow-2xs ${
                  transcriptionResult.saved_to_knowledge
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                }`}
                title="Guardar en biblioteca de conocimiento para consultas del agente"
              >
                <BookOpen className="h-3.5 w-3.5 text-blue-700" />
                <span className="hidden md:inline">
                  {transcriptionResult.saved_to_knowledge ? 'En Base de Conocimiento' : 'Guardar en BC'}
                </span>
              </button>
            </>
          )}

          {/* Primary Action Button: Generar Entregables (.xlsx / .docx) */}
          <button
            type="button"
            onClick={() => setGenerateModalOpen(true)}
            disabled={!isSummaryReady || isJobActive}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-2 shadow-xs ${
              isSummaryReady && !isJobActive
                ? 'bg-[#002777] hover:bg-[#001e5c] text-white cursor-pointer'
                : 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed'
            }`}
            title={
              !isSummaryReady
                ? 'Genera o visualiza el resumen ejecutivo para habilitar la generación de entregables funcionales'
                : 'Generar Inventario de Requerimientos (.xlsx) y Levantamiento Detallado (.docx)'
            }
          >
            <Sparkles className="h-4 w-4 text-amber-300" />
            <span>Generar Entregables (.xlsx / .docx)</span>
          </button>
        </div>
      </header>

      {/* Main Dual-Panel Workspace */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 bg-slate-100 overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-slate-300">
        {/* Left Panel: Transcripción (Univer Editor) */}
        <section className="flex-1 flex flex-col min-h-0 bg-white overflow-hidden">
          {/* Panel Sub-header */}
          <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-100 text-[#002777]">
                <Volume2 className="h-3.5 w-3.5" />
              </div>
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Transcripción Completa (Editor Univer)
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyTranscript}
                className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition shadow-2xs"
                title="Copiar texto de la transcripción"
              >
                {hasCopiedTranscript ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                <span className="text-[11px]">{hasCopiedTranscript ? 'Copiado' : 'Copiar'}</span>
              </button>
            </div>
          </div>

          {/* Univer Container for Transcription with Floating Progress Pill */}
          <div className="relative flex-1 min-h-0 bg-white overflow-hidden flex flex-col">
            {/* Complementary Pipeline Floating Pill (Separación de audio, diarización, etc.) */}
            {activeProgress && isJobActive && (
              <div className="absolute top-3 right-4 z-20 flex items-center gap-2 px-3.5 py-1.5 bg-slate-900/90 backdrop-blur-md text-white rounded-full shadow-lg border border-slate-700/60 text-xs animate-fade-in pointer-events-none">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
                <span className="font-semibold text-slate-200">
                  {activeProgress.stage === 'preprocessing'
                    ? 'Extracción & separación de audio'
                    : activeProgress.stage === 'diarizing'
                    ? 'Diarización & separación de interlocutores'
                    : activeProgress.stage === 'summarizing'
                    ? 'Extracción de acuerdos & minutas'
                    : 'Inferencia acústica Whisper'}
                </span>
                <span className="text-slate-500">•</span>
                <span className="font-mono font-bold text-blue-400">
                  {activeProgress.progress}%
                </span>
              </div>
            )}

            <UniverContainer
              adapter={transcriptAdapter}
              kind="document"
              title={meetingTitle}
              content={transcriptContent || `# Transcripción: ${meetingTitle}\n\n_Procesando audio..._`}
              images={[]}
              onInspect={() => {}}
              onExport={(fmt) => {
                if (fmt === 'docx') {
                  transcriptionApi.exportLevantamientoDocx(transcriptContent, meetingTitle)
                }
              }}
              onReloadFixture={() => {}}
              onContentChange={(newText) => setTranscriptContent(newText)}
              hideHeader={true}
              mode="artifact"
            />
          </div>
        </section>

        {/* Right Panel: Resumen Ejecutivo & Requerimientos (Univer Editor) */}
        <aside className="w-full lg:w-[480px] xl:w-[540px] flex flex-col min-h-0 bg-slate-50/80 shrink-0">
          {/* Panel Header */}
          <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
                <Sparkles className="h-3.5 w-3.5" />
              </div>
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Resumen & Requerimientos
              </h2>
            </div>

            <div className="flex items-center gap-2">
              {isSummaryReady && (
                <>
                  <button
                    type="button"
                    onClick={handleGenerateSummary}
                    disabled={isGeneratingSummary}
                    className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition shadow-2xs cursor-pointer"
                    title="Regenerar resumen con IA"
                  >
                    <RefreshCw className={`h-3 w-3 ${isGeneratingSummary ? 'animate-spin' : ''}`} />
                    <span>Regenerar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setGenerateModalOpen(true)}
                    disabled={!isSummaryReady || isJobActive}
                    className="px-3 py-1 bg-[#002777] hover:bg-[#001e5c] text-white rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                    title="Generar Inventario (.xlsx) y Levantamiento (.docx)"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                    <span>Generar Documento</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Panel Body: Empty / In-Progress / Ready with Univer */}
          <div className="flex-1 min-h-0 flex flex-col bg-white overflow-hidden">
            {isJobActive ? (
              <div className="p-6 text-center space-y-4 my-auto">
                <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-2xl bg-blue-50 text-[#002777]">
                  <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-800">
                    Transcripción en curso
                  </h3>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    Al finalizar la transcripción y diarización, se habilitará la generación y edición del resumen ejecutivo.
                  </p>
                </div>
              </div>
            ) : !isSummaryReady ? (
              <div className="p-8 text-center space-y-5 my-auto">
                <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-2xl bg-amber-50 text-amber-700 shadow-inner">
                  <Wand2 className="h-7 w-7" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-sm font-bold text-slate-900">
                    Generar Resumen de la Reunión
                  </h3>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    Extrae automáticamente participantes, temas clave, decisiones y requerimientos funcionales listos para entregables.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleGenerateSummary}
                  disabled={isGeneratingSummary}
                  className="btn-primary px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 mx-auto shadow-md shadow-blue-900/10"
                >
                  {isGeneratingSummary ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Analizando Transcripción con IA...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      <span>Generar Resumen con IA</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="flex-1 min-h-0 flex flex-col bg-white overflow-hidden">
                <UniverContainer
                  adapter={summaryAdapter}
                  kind="document"
                  title={`Resumen - ${meetingTitle}`}
                  content={summaryContent}
                  images={[]}
                  onInspect={() => {}}
                  onExport={() => {}}
                  onReloadFixture={() => {}}
                  onContentChange={(newText) => setSummaryContent(newText)}
                  hideHeader={true}
                  mode="artifact"
                />
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Speaker Rename Modal */}
      {showRenameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Edit3 className="h-4 w-4 text-[#002777]" />
                <span>Identificar y Renombrar Participantes</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowRenameModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Asigna nombres reales a los identificadores detectados por el motor de diarización:
            </p>

            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {Object.keys(speakerMap).map((spk) => (
                <div key={spk} className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-600 w-32 shrink-0 truncate">
                    {spk}:
                  </span>
                  <input
                    type="text"
                    value={speakerMap[spk]}
                    onChange={(e) =>
                      setSpeakerMap({
                        ...speakerMap,
                        [spk]: e.target.value,
                      })
                    }
                    className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#002777]/20 focus:border-[#002777]"
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowRenameModal(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveSpeakerNames}
                className="btn-primary px-4 py-1.5 text-xs rounded-xl font-bold"
              >
                Guardar Nombres
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generate Deliverables Modal */}
      <GenerateModal
        isOpen={generateModalOpen}
        transcriptionId={transcriptionId}
        meetingTitle={meetingTitle}
        onClose={() => setGenerateModalOpen(false)}
      />
    </div>
  )
}
