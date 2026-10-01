import { useState } from 'react'
import {
  Sparkles,
  History,
  FileText,
  Search,
  RefreshCw,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTranscription } from '../../hooks/useTranscription'
import {
  UploadArea,
  RecentTranscriptionItem,
  GenerateModal,
  TranscriptionHistoryModal,
  FloatingTranscriptionToast,
  TranscriptionStudio,
} from '../../components/transcription'

export const TranscripcionesPage = () => {
  const {
    viewMode,
    openStudio,
    closeStudio,
    activeJobs,
    recentTranscriptions,
    availableModels,
    isLoadingList,
    isUploading,
    showGenerateModal,
    selectedTranscriptionId,
    activeMeetingTitle,
    currentProgress,
    handleUploadAndStart,
    handleCancelTranscription,
    handleDeleteTranscription,
    handleDismissJob,
    openGenerateModal,
    setShowGenerateModal,
    refreshTranscriptions,
  } = useTranscription()

  const [searchQuery, setSearchQuery] = useState('')
  const [historyModalOpen, setHistoryModalOpen] = useState(false)

  const isModelConfigured =
    !availableModels ||
    availableModels.local_available ||
    availableModels.groq_configured ||
    availableModels.openai_configured

  const filteredRecents = recentTranscriptions.filter((t) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    const titleMatch = t.metadata.title.toLowerCase().includes(q)
    const descMatch = t.metadata.description?.toLowerCase().includes(q)
    const participantsMatch = t.summary?.participants?.some((p) => p.toLowerCase().includes(q))
    return titleMatch || descMatch || participantsMatch
  })

  // If in Studio mode and a transcription is selected, render the TranscriptionStudio workspace
  if (viewMode === 'studio' && selectedTranscriptionId) {
    return (
      <div className="animate-fade-in font-sans">
        <TranscriptionStudio
          transcriptionId={selectedTranscriptionId}
          activeProgress={currentProgress}
          onBackToDashboard={closeStudio}
          onRefreshData={refreshTranscriptions}
        />
        {/* Floating toast widget also available */}
        <FloatingTranscriptionToast
          activeJobs={activeJobs}
          onOpenStudio={(id) => openStudio(id)}
          onCancelJob={(id) => handleCancelTranscription(id)}
          onDismissJob={(id) => handleDismissJob(id)}
        />
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto font-sans pb-12 animate-fade-in">
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

      {/* API Key Missing Warning Banner (If no model provider is configured) */}
      {!isModelConfigured && (
        <div className="card p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs animate-fade-in">
          <div className="flex items-start sm:items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-amber-950 uppercase tracking-wide">
                Configuración de Motor de Transcripción Requerida
              </h3>
              <p className="text-xs text-amber-900 mt-0.5">
                No se detectó API Key para Groq ni OpenAI Whisper. Configura tu clave en Ajustes para habilitar el procesamiento en la nube.
              </p>
            </div>
          </div>

          <Link
            to="/configuracion"
            className="px-3.5 py-1.5 bg-amber-800 hover:bg-amber-900 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 shadow-xs"
          >
            <span>Configurar Ajustes</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

      {/* Upload Area (Full width, right sidebar cards removed as requested) */}
      <div className="w-full">
        <UploadArea
          onUpload={async (file, title, desc) => {
            await handleUploadAndStart(file, title, desc)
          }}
          isUploading={isUploading}
          configuredModelLabel={availableModels?.active_model_label}
        />
      </div>

      {/* Recent Transcriptions Section */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Transcripciones y Minutas Recientes
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Consulta resúmenes, edita en el espacio Univer y genera entregables de requerimientos.
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
          <div className="card p-12 bg-white border border-slate-200 rounded-2xl text-center space-y-3 shadow-xs">
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
                onOpenSummary={(id) => openStudio(id)}
                onOpenGenerate={(id) => openGenerateModal(id)}
                onDelete={(id) => handleDeleteTranscription(id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Floating Transcription Toast (Bottom-Right Widget) */}
      <FloatingTranscriptionToast
        activeJobs={activeJobs}
        onOpenStudio={(id) => openStudio(id)}
        onCancelJob={(id) => handleCancelTranscription(id)}
        onDismissJob={(id) => handleDismissJob(id)}
      />

      {/* Generate Deliverables Modal */}
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
          openStudio(record.id)
        }}
      />
    </div>
  )
}

export default TranscripcionesPage
