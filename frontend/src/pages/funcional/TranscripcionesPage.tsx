import { useState } from 'react'
import {
  Upload,
  Mic,
  FileText,
  Sparkles,
  History,
  CheckCircle2,
  PlusCircle,
} from 'lucide-react'
import { useTranscription } from '../../hooks/useTranscription'
import {
  UploadStep,
  TranscribeStep,
  SummaryStep,
  GenerateStep,
  TranscriptionHistoryModal,
} from '../../components/transcription'
import type { TranscriptionResult } from '../../api/client'

const STEP_ITEMS = [
  { id: 'upload', label: '1. Cargar Audio', icon: Upload },
  { id: 'transcribe', label: '2. Transcripción', icon: Mic },
  { id: 'summary', label: '3. Resumen Ejecutivo', icon: FileText },
  { id: 'generate', label: '4. Generar Documentos', icon: Sparkles },
]

export const TranscripcionesPage = () => {
  const {
    step,
    setStep,
    isUploading,
    isTranscribing,
    progress,
    status,
    statusMessage,
    errorMessage,
    result,
    summary,
    handleUpload,
    startTranscription,
    handleUpdateSummary,
    handleRenameSpeakers,
    handleSaveToKB,
    loadExistingTranscription,
    reset,
  } = useTranscription()

  const [historyOpen, setHistoryOpen] = useState(false)

  const handleUploadAndStart = async (
    file: File,
    meta: { title: string; description?: string },
    options: any
  ) => {
    const uploadedMediaId = await handleUpload(file, meta)
    await startTranscription(uploadedMediaId, options)
  }

  const handleSelectFromHistory = (record: TranscriptionResult) => {
    loadExistingTranscription(record)
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Page Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-xs font-bold uppercase tracking-widest text-[#002777]">
              Módulo Funcional
            </p>
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-[#002777]">
              <Sparkles className="h-3 w-3" />
              IA + Whisper
            </span>
          </div>
          <h1 className="page-title mt-1">Transcripción de Reuniones y Minutas</h1>
          <p className="page-subtitle">
            Convierte grabaciones de reuniones en minutas estructuradas y genera automáticamente documentos de Inventario y Levantamiento.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setHistoryOpen(true)}
            className="px-4 py-2 bg-white hover:bg-slate-50 text-[#002777] border border-blue-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
          >
            <History className="h-4 w-4" />
            <span>Historial de Sesiones</span>
          </button>

          {step !== 'upload' && (
            <button
              type="button"
              onClick={reset}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Nueva Transcripción</span>
            </button>
          )}
        </div>
      </header>

      {/* Wizard Stepper Navigation */}
      <nav aria-label="Progreso del asistente" className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm">
        <ol className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {STEP_ITEMS.map((item, idx) => {
            const Icon = item.icon
            const isCurrent = step === item.id
            const stepOrder = ['upload', 'transcribe', 'summary', 'generate']
            const isCompleted = stepOrder.indexOf(step) > idx
            const isClickable = isCompleted || (isCurrent && idx > 0)

            return (
              <li key={item.id}>
                <button
                  type="button"
                  disabled={!isClickable}
                  onClick={() => setStep(item.id as any)}
                  className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl text-xs font-bold transition text-left ${
                    isCurrent
                      ? 'bg-blue-50 text-[#002777] ring-1 ring-blue-200 shadow-sm'
                      : isCompleted
                        ? 'text-emerald-700 hover:bg-emerald-50'
                        : 'text-slate-400 cursor-not-allowed opacity-60'
                  }`}
                >
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                      isCurrent
                        ? 'bg-[#002777] text-white'
                        : isCompleted
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-3.5 w-3.5" />}
                  </div>
                  <span className="truncate">{item.label}</span>
                </button>
              </li>
            )
          })}
        </ol>
      </nav>

      {/* Step Content */}
      <main className="transition-all duration-300">
        {step === 'upload' && (
          <UploadStep
            onUploadAndStart={handleUploadAndStart}
            isUploading={isUploading}
            isTranscribing={isTranscribing}
            errorMessage={errorMessage}
          />
        )}

        {step === 'transcribe' && (
          <TranscribeStep
            progress={progress}
            status={status}
            statusMessage={statusMessage}
            errorMessage={errorMessage}
            result={result}
            onRenameSpeakers={handleRenameSpeakers}
            onNext={() => setStep('summary')}
            onRetry={reset}
          />
        )}

        {step === 'summary' && (
          <SummaryStep
            summary={summary}
            savedToKnowledge={result?.saved_to_knowledge}
            onUpdateSummary={handleUpdateSummary}
            onSaveToKnowledge={handleSaveToKB}
            onBack={() => setStep('transcribe')}
            onNext={() => setStep('generate')}
          />
        )}

        {step === 'generate' && (
          <GenerateStep result={result} onBack={() => setStep('summary')} />
        )}
      </main>

      {/* History Modal */}
      <TranscriptionHistoryModal
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onSelect={handleSelectFromHistory}
      />
    </div>
  )
}

export default TranscripcionesPage
