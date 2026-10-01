import { useState, useEffect, useRef, useCallback } from 'react'
import {
  transcriptionApi,
  type AvailableModelsInfo,
  type TranscriptionProgress,
  type TranscriptionResult,
} from '../api/modules/transcription'
import { useToast } from '../context/ToastContext'

export function useTranscription() {
  const { toast } = useToast()

  // Data lists
  const [activeJobs, setActiveJobs] = useState<Record<string, TranscriptionProgress>>({})
  const [recentTranscriptions, setRecentTranscriptions] = useState<TranscriptionResult[]>([])
  const [availableModels, setAvailableModels] = useState<AvailableModelsInfo | null>(null)
  const [isLoadingList, setIsLoadingList] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  // Modals state
  const [showProgressModal, setShowProgressModal] = useState(false)
  const [showSummaryModal, setShowSummaryModal] = useState(false)
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [selectedTranscriptionId, setSelectedTranscriptionId] = useState<string | null>(null)
  const [activeMeetingTitle, setActiveMeetingTitle] = useState<string>('')

  // Toast milestone milestones already notified per job
  const notifiedMilestones = useRef<Record<string, Set<number>>>({})
  const pollingTimerRef = useRef<number | null>(null)

  // Fetch recent saved transcriptions
  const refreshTranscriptions = useCallback(async () => {
    try {
      setIsLoadingList(true)
      const res = await transcriptionApi.listTranscriptions()
      setRecentTranscriptions(res.transcriptions || [])
    } catch (err: any) {
      console.warn('Error fetching transcriptions list:', err)
    } finally {
      setIsLoadingList(false)
    }
  }, [])

  // Fetch available models configuration on mount
  useEffect(() => {
    transcriptionApi
      .getAvailableModels()
      .then(setAvailableModels)
      .catch((e) => console.warn('Could not load models info:', e))

    refreshTranscriptions()
  }, [refreshTranscriptions])

  // Polling loop for active jobs (every 1 second)
  useEffect(() => {
    const activeIds = Object.keys(activeJobs).filter(
      (id) => activeJobs[id].status !== 'complete' && activeJobs[id].status !== 'failed' && activeJobs[id].status !== 'cancelled'
    )

    if (activeIds.length === 0) {
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current)
        pollingTimerRef.current = null
      }
      return
    }

    if (!pollingTimerRef.current) {
      pollingTimerRef.current = window.setInterval(async () => {
        for (const id of activeIds) {
          try {
            const status = await transcriptionApi.getTranscriptionStatus(id)

            setActiveJobs((prev) => ({
              ...prev,
              [id]: status,
            }))

            // Track milestone toasts
            if (!notifiedMilestones.current[id]) {
              notifiedMilestones.current[id] = new Set()
            }

            const sent = notifiedMilestones.current[id]
            if (status.progress >= 25 && !sent.has(25)) {
              sent.add(25)
              toast.info(`Transcripción: 25% completado (${status.message || 'Procesando'})`)
            }
            if (status.progress >= 50 && !sent.has(50)) {
              sent.add(50)
              toast.info(`Transcripción: 50% completado`)
            }
            if (status.progress >= 75 && !sent.has(75)) {
              sent.add(75)
              toast.info(`Transcripción: 75% completado - Diarización de interlocutores`)
            }

            // On Completion
            if (status.status === 'complete' || status.progress === 100) {
              toast.success('¡Transcripción completada con éxito!')
              await refreshTranscriptions()

              // Auto-open summary modal if this was the focused transcription
              setSelectedTranscriptionId(id)
              setShowProgressModal(false)
              setShowSummaryModal(true)
            } else if (status.status === 'failed') {
              toast.error(status.error || 'Error en el proceso de transcripción.')
            }
          } catch (e) {
            // If job not found or failed, check result
            try {
              const res = await transcriptionApi.getTranscriptionResult(id)
              if (res) {
                setActiveJobs((prev) => ({
                  ...prev,
                  [id]: {
                    id,
                    media_id: res.media_id,
                    status: 'complete',
                    stage: 'complete',
                    progress: 100,
                    message: 'Transcripción finalizada.',
                  },
                }))
                await refreshTranscriptions()
              }
            } catch {
              // Ignore temporary poll failure
            }
          }
        }
      }, 1000)
    }

    return () => {
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current)
        pollingTimerRef.current = null
      }
    }
  }, [activeJobs, refreshTranscriptions, toast])

  // Start upload and transcription pipeline
  const handleUploadAndStart = async (file: File, title: string, description: string = '') => {
    try {
      setIsUploading(true)
      setActiveMeetingTitle(title)

      // 1. Upload media
      const uploadRes = await transcriptionApi.uploadMedia(file, title, description)
      const mediaId = uploadRes.media_id

      // 2. Start transcription
      const transRes = await transcriptionApi.startTranscription(mediaId, {
        mode: 'auto',
        enable_diarization: true,
      })

      const transcriptionId = transRes.transcription_id
      setSelectedTranscriptionId(transcriptionId)

      // Initialize active job
      const initialProgress: TranscriptionProgress = {
        id: transcriptionId,
        media_id: mediaId,
        status: 'preprocessing',
        stage: 'preprocessing',
        progress: 10,
        message: 'Importando y preparando archivo de audio...',
        eta: '~45 s',
        model_info: availableModels?.active_model_label || 'Whisper Auto',
      }

      setActiveJobs((prev) => ({
        ...prev,
        [transcriptionId]: initialProgress,
      }))

      setShowProgressModal(true)
      toast.success('Grabación subida. Transcripción iniciada en segundo plano.')
    } catch (err: any) {
      toast.error(`Error al iniciar transcripción: ${err.message}`)
      throw err
    } finally {
      setIsUploading(false)
    }
  }

  // Cancel transcription
  const handleCancelTranscription = async (transcriptionId: string) => {
    try {
      await transcriptionApi.cancelTranscription(transcriptionId)
      setActiveJobs((prev) => {
        const next = { ...prev }
        delete next[transcriptionId]
        return next
      })
      if (selectedTranscriptionId === transcriptionId) {
        setShowProgressModal(false)
      }
      toast.info('Transcripción cancelada y archivos limpiados.')
      await refreshTranscriptions()
    } catch (err: any) {
      toast.error(`Error al cancelar: ${err.message}`)
    }
  }

  // Delete saved transcription
  const handleDeleteTranscription = async (transcriptionId: string) => {
    if (!window.confirm('¿Seguro que deseas eliminar esta transcripción y sus archivos asociados?')) {
      return
    }

    try {
      await transcriptionApi.deleteTranscription(transcriptionId)
      setRecentTranscriptions((prev) => prev.filter((t) => t.id !== transcriptionId))
      setActiveJobs((prev) => {
        const next = { ...prev }
        delete next[transcriptionId]
        return next
      })
      toast.success('Transcripción eliminada con éxito.')
    } catch (err: any) {
      toast.error(`Error al eliminar: ${err.message}`)
    }
  }

  // Modal open helpers
  const openProgressModal = (transcriptionId: string) => {
    setSelectedTranscriptionId(transcriptionId)
    const job = activeJobs[transcriptionId]
    if (job) {
      setShowProgressModal(true)
    }
  }

  const openSummaryModal = (transcriptionId: string) => {
    setSelectedTranscriptionId(transcriptionId)
    const recent = recentTranscriptions.find((t) => t.id === transcriptionId)
    if (recent) {
      setActiveMeetingTitle(recent.metadata.title)
    }
    setShowSummaryModal(true)
  }

  const openGenerateModal = (transcriptionId: string) => {
    setSelectedTranscriptionId(transcriptionId)
    const recent = recentTranscriptions.find((t) => t.id === transcriptionId)
    if (recent) {
      setActiveMeetingTitle(recent.metadata.title)
    }
    setShowSummaryModal(false)
    setShowGenerateModal(true)
  }

  const closeAllModals = () => {
    setShowProgressModal(false)
    setShowSummaryModal(false)
    setShowGenerateModal(false)
  }

  // Get active progress item currently selected
  const currentProgress = selectedTranscriptionId ? activeJobs[selectedTranscriptionId] || null : null

  return {
    activeJobs: Object.values(activeJobs).filter((j) => j.status !== 'complete'),
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
    closeAllModals,
    setShowProgressModal,
    setShowSummaryModal,
    setShowGenerateModal,
    refreshTranscriptions,
  }
}
