import { useState } from 'react'
import {
  Sparkles,
  History,
  FileAudio,
  FileText,
  Search,
  Settings,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTranscription } from '../../hooks/useTranscription'
import {
  UploadArea,
  ActiveTranscriptionItem,
  RecentTranscriptionItem,
  TranscriptionProgressModal,
  SummaryModal,
  GenerateModal,
  TranscriptionHistoryModal,
} from '../../components/transcription'

export const TranscripcionesPage = () => {
  const {
    activeJobs,
    recentTranscriptions,
    availableModels,
    isLoadingList,
    isUploading,
    showProgressModal,
    showSummaryModal,
    showGenerateModal,
    selectedTranscriptionId,
    activeMeetingTitle,
    currentProgress,
    handleUploadAndStart,
    handleCancelTranscription,
    handleDeleteTranscription,
    openProgressModal,
    openSummaryModal,
    openGenerateModal,
    setShowProgressModal,
    setShowSummaryModal,
    setShowGenerateModal,
    refreshTranscriptions,
  } = useTranscription()

  const [searchQuery, setSearchQuery] = useState('')
  const [historyModalOpen, setHistoryModalOpen] = useState(false)

  const filteredRecents = recentTranscriptions.filter((t) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    const titleMatch = t.metadata.title.toLowerCase().includes(q)
    const descMatch = t.metadata.description?.toLowerCase().includes(q)
    const participantsMatch = t.summary?.participants?.some((p) => p.toLowerCase().includes(q))
    return titleMatch || descMatch || participantsMatch
  })

  return (
    <div className="space-y-8 max-w-6xl mx-auto font-sans pb-12">
      {/* Page Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-xs font-bold uppercase tracking-widest text-[#002777]">
              MÓDULO FUNCIONAL
            </p>
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-[#002777]">
              <Sparkles className="h-3 w-3" />
              IA + Whisper
            </span>
          </div>
          <h1 className="page-title mt-1">Transcripción y Análisis de Reuniones</h1>
          <p className="page-subtitle">
            Carga grabaciones de reuniones para transcribir con Whisper, identificar interlocutores, extraer minutas y generar entregables funcionales.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setHistoryModalOpen(true)}
            className="px-4 py-2 bg-white hover:bg-slate-50 text-[#002777] border border-blue-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
          >
            <History className="h-4 w-4" />
            <span>Ver Historial Completo</span>
          </button>

          <button
            type="button"
            onClick={refreshTranscriptions}
            disabled={isLoadingList}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
            title="Actualizar lista"
          >
            <RefreshCw className={`h-4 w-4 ${isLoadingList ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      {/* Main Top Grid: Upload Area + System Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left 2 Cols: Upload Area */}
        <div className="lg:col-span-2">
          <UploadArea
            onUpload={async (file, title, desc) => {
              await handleUploadAndStart(file, title, desc)
            }}
            isUploading={isUploading}
            configuredModelLabel={availableModels?.active_model_label}
          />
        </div>

        {/* Right 1 Col: Info Panels */}
        <div className="space-y-4">
          {/* Configured AI Model Card */}
          <div className="card p-5 bg-gradient-to-br from-blue-50/80 to-white border border-blue-200/80 rounded-2xl space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100 text-[#002777]">
                  <Sparkles className="h-4 w-4" />
                </div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                  Motor de Transcripción
                </h3>
              </div>
              <Link
                to="/configuracion"
                className="text-slate-400 hover:text-blue-700 p-1 rounded-lg transition"
                title="Configurar en Ajustes"
              >
                <Settings className="h-4 w-4" />
              </Link>
            </div>

            <div className="space-y-1.5 pt-1">
              <p className="text-sm font-bold text-[#002777]">
                {availableModels?.active_model_label || 'Whisper Auto'}
              </p>
              <p className="text-xs text-slate-500 leading-relaxed">
                Reconocimiento de voz de alta precisión con diarización y segmentación de hablantes integrada.
              </p>
            </div>

            <div className="pt-2 border-t border-blue-100/60 flex items-center justify-between text-[11px] text-slate-600">
              <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                <CheckCircle2 className="h-3.5 w-3.5" /> Motor activo y validado
              </span>
              <Link to="/configuracion" className="font-bold text-[#002777] hover:underline">
                Cambiar en Ajustes
              </Link>
            </div>
          </div>

          {/* Formatos y Especificaciones */}
          <div className="card p-5 bg-white border border-slate-200 rounded-2xl space-y-3 shadow-xs">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                <FileAudio className="h-4 w-4" />
              </div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                Formatos y Límites
              </h3>
            </div>

            <ul className="text-xs text-slate-600 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <span><strong>Audio:</strong> MP3, WAV, M4A, OGG, FLAC, AAC, OPUS</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <span><strong>Video:</strong> MP4, WebM, MKV, MOV (audio extraído auto)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <span><strong>Capacidad:</strong> Hasta 2 GB por grabación</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Active In-Progress Transcriptions (If any) */}
      {activeJobs.length > 0 && (
        <section className="space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-blue-600 animate-ping" />
              <span>Transcripciones en Proceso ({activeJobs.length})</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeJobs.map((job) => (
              <ActiveTranscriptionItem
                key={job.id}
                progress={job}
                title={job.id === selectedTranscriptionId && activeMeetingTitle ? activeMeetingTitle : undefined}
                onOpenModal={(id) => openProgressModal(id)}
                onCancel={(id) => handleCancelTranscription(id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Recent Transcriptions Section */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Transcripciones y Minutas Recientes
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Consulta resúmenes, minutas y genera entregables de requerimientos en cualquier momento.
            </p>
          </div>

          {recentTranscriptions.length > 0 && (
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por título o participante..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#002777]/20 focus:border-[#002777] shadow-2xs"
              />
            </div>
          )}
        </div>

        {recentTranscriptions.length === 0 && activeJobs.length === 0 ? (
          <div className="card p-12 bg-white border border-slate-200 rounded-2xl text-center space-y-3">
            <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-2xl bg-blue-50 text-[#002777]">
              <FileText className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              Aún no tienes transcripciones registradas
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Sube una grabación de audio o video en el área superior para comenzar a generar minutas y documentación funcional.
            </p>
          </div>
        ) : filteredRecents.length === 0 ? (
          <div className="card p-8 bg-white border border-slate-200 rounded-2xl text-center text-xs text-slate-500">
            No se encontraron transcripciones que coincidan con "{searchQuery}".
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredRecents.map((item) => (
              <RecentTranscriptionItem
                key={item.id}
                transcription={item}
                onOpenSummary={(id) => openSummaryModal(id)}
                onOpenGenerate={(id) => openGenerateModal(id)}
                onDelete={(id) => handleDeleteTranscription(id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Modal 1: Progress Modal */}
      <TranscriptionProgressModal
        isOpen={showProgressModal}
        progress={currentProgress}
        title={activeMeetingTitle}
        onClose={() => setShowProgressModal(false)}
        onCancel={(id) => handleCancelTranscription(id)}
      />

      {/* Modal 2: Summary Modal */}
      <SummaryModal
        isOpen={showSummaryModal}
        transcriptionId={selectedTranscriptionId}
        onClose={() => setShowSummaryModal(false)}
        onNextGenerate={(id) => openGenerateModal(id)}
      />

      {/* Modal 3: Generate Modal */}
      <GenerateModal
        isOpen={showGenerateModal}
        transcriptionId={selectedTranscriptionId}
        meetingTitle={activeMeetingTitle}
        onClose={() => setShowGenerateModal(false)}
      />

      {/* Full History Modal */}
      <TranscriptionHistoryModal
        isOpen={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        onSelect={(record) => {
          setHistoryModalOpen(false)
          openSummaryModal(record.id)
        }}
      />
    </div>
  )
}

export default TranscripcionesPage
