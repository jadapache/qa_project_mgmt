import { useState, useEffect, useRef, useCallback } from 'react'
import {
  transcriptionApi,
  type AvailableModelsInfo,
  type TranscriptionProgress,
  type TranscriptionResult,
} from '../api/modules/transcription'
import { useToast } from '../context/ToastContext'

const LOCAL_STORAGE_ACTIVE_JOBS = 'qa_active_transcription_jobs'

export function useTranscription() {
  const { toast } = useToast()

  // View mode
  const [viewMode, setViewMode] = useState<'dashboard' | 'studio'>('dashboard')

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

  // Synchronize active jobs with localStorage
  const saveActiveJobsToStorage = useCallback((jobs: Record<string, TranscriptionProgress>) => {
    try {
      const activeOnly: Record<string, TranscriptionProgress> = {}
      for (const [id, job] of Object.entries(jobs)) {
        if (job.status !== 'complete' && job.status !== 'failed' && job.status !== 'cancelled') {
          activeOnly[id] = job
        }
      }
      localStorage.setItem(LOCAL_STORAGE_ACTIVE_JOBS, JSON.stringify(activeOnly))
    } catch (e) {
      console.warn('Could not persist active jobs to localStorage:', e)
    }
  }, [])

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

  // Fetch available models and restore persisted jobs on mount
  useEffect(() => {
    transcriptionApi
      .getAvailableModels()
      .then(setAvailableModels)
      .catch((e) => console.warn('Could not load models info:', e))

    refreshTranscriptions()

    // Restore jobs from localStorage
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_ACTIVE_JOBS)
      if (stored) {
        const parsed: Record<string, TranscriptionProgress> = JSON.parse(stored)
        if (Object.keys(parsed).length > 0) {
          setActiveJobs(parsed)
        }
      }
    } catch (e) {
      console.warn('Error reading active jobs from storage:', e)
    }
  }, [refreshTranscriptions])

  // Save active jobs changes to localStorage
  useEffect(() => {
    saveActiveJobsToStorage(activeJobs)
  }, [activeJobs, saveActiveJobsToStorage])

  // Polling loop for active jobs (every 1.5 seconds)
  useEffect(() => {
    const activeIds = Object.keys(activeJobs).filter(
      (id) =>
        activeJobs[id].status !== 'complete' &&
        activeJobs[id].status !== 'failed' &&
        activeJobs[id].status !== 'cancelled'
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
            } else if (status.status === 'failed') {
              toast.error(status.error || 'Error en el proceso de transcripción.')
            }
          } catch (e) {
            // Check if job completed in background
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
      }, 1500)
    }

    return () => {
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current)
        pollingTimerRef.current = null
      }
    }
  }, [activeJobs, refreshTranscriptions, toast])

  // Start upload and transcription pipeline -> auto-transition to Studio
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
        progress: 15,
        message: 'Importando y extrayendo audio...',
        eta: '~45 s',
        model_info: availableModels?.active_model_label || 'Whisper Auto',
      }

      setActiveJobs((prev) => ({
        ...prev,
        [transcriptionId]: initialProgress,
      }))

      // Transition immediately to the Live Transcription Studio
      setViewMode('studio')
      toast.success('Grabación cargada. Transcribiendo en tiempo real...')
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
      if (selectedTranscriptionId === transcriptionId && viewMode === 'studio') {
        setViewMode('dashboard')
      }
      setShowProgressModal(false)
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
      if (selectedTranscriptionId === transcriptionId) {
        setViewMode('dashboard')
        setSelectedTranscriptionId(null)
      }
      toast.success('Transcripción eliminada con éxito.')
    } catch (err: any) {
      toast.error(`Error al eliminar: ${err.message}`)
    }
  }

  // Navigation helpers
  const openStudio = (transcriptionId: string) => {
    setSelectedTranscriptionId(transcriptionId)
    const recent = recentTranscriptions.find((t) => t.id === transcriptionId)
    if (recent) {
      setActiveMeetingTitle(recent.metadata.title)
    }
    setViewMode('studio')
  }

  const closeStudio = () => {
    setViewMode('dashboard')
  }

  const openProgressModal = (transcriptionId: string) => {
    openStudio(transcriptionId)
  }

  const openSummaryModal = (transcriptionId: string) => {
    openStudio(transcriptionId)
  }

  const openGenerateModal = (transcriptionId: string) => {
    setSelectedTranscriptionId(transcriptionId)
    const recent = recentTranscriptions.find((t) => t.id === transcriptionId)
    if (recent) {
      setActiveMeetingTitle(recent.metadata.title)
    }
    setShowGenerateModal(true)
  }

  const closeAllModals = () => {
    setShowProgressModal(false)
    setShowSummaryModal(false)
    setShowGenerateModal(false)
  }

  const handleDismissJob = (id: string) => {
    setActiveJobs((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  // Active progress for selected transcription
  const currentProgress = selectedTranscriptionId ? activeJobs[selectedTranscriptionId] || null : null

  return {
    viewMode,
    setViewMode,
    openStudio,
    closeStudio,
    activeJobs: Object.values(activeJobs),
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
    handleDismissJob,
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
