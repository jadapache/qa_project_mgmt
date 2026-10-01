import { useState, useEffect, useRef } from 'react'
import {
  api,
  type MediaMetadata,
  type TranscriptionResult,
  type TranscriptionSummary,
  type TranscribeOptions,
} from '../api/client'

export type WizardStep = 'upload' | 'transcribe' | 'summary' | 'generate'

export function useTranscription() {
  const [step, setStep] = useState<WizardStep>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [metadata, setMetadata] = useState<MediaMetadata>({ title: '', description: '' })
  const [mediaId, setMediaId] = useState<string | null>(null)
  const [transcriptionId, setTranscriptionId] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<
    'idle' | 'uploading' | 'pending' | 'preprocessing' | 'transcribing' | 'diarizing' | 'summarizing' | 'complete' | 'failed'
  >('idle')
  const [statusMessage, setStatusMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [result, setResult] = useState<TranscriptionResult | null>(null)
  const [summary, setSummary] = useState<TranscriptionSummary | null>(null)
  const [options, setOptions] = useState<TranscribeOptions>({
    mode: 'auto',
    language: 'es',
    enable_diarization: true,
  })

  const pollingRef = useRef<number | null>(null)

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }

  useEffect(() => {
    return () => {
      stopPolling()
    }
  }, [])

  const handleUpload = async (uploadedFile: File, meta: MediaMetadata): Promise<string> => {
    try {
      setIsUploading(true)
      setStatus('uploading')
      setStatusMessage('Subiendo archivo multimedia...')
      setErrorMessage(null)
      setFile(uploadedFile)
      setMetadata(meta)

      const res = await api.uploadMedia(uploadedFile, meta.title, meta.description || '')
      setMediaId(res.media_id)
      setIsUploading(false)
      setStatus('idle')
      return res.media_id
    } catch (err: any) {
      setIsUploading(false)
      setStatus('failed')
      setErrorMessage(err.message || 'Error al subir el archivo.')
      throw err
    }
  }

  const startTranscription = async (
    targetMediaId?: string,
    customOptions?: TranscribeOptions,
  ) => {
    const idToUse = targetMediaId || mediaId
    if (!idToUse) {
      throw new Error('No hay un archivo multimedia seleccionado para transcribir.')
    }

    try {
      setIsTranscribing(true)
      setStatus('pending')
      setProgress(5)
      setStatusMessage('Iniciando pipeline de transcripción...')
      setErrorMessage(null)

      const opts = customOptions || options
      setOptions(opts)

      const res = await api.startTranscription(idToUse, opts)
      const transId = res.transcription_id
      setTranscriptionId(transId)
      setStep('transcribe')

      stopPolling()

      // Start polling
      pollingRef.current = window.setInterval(async () => {
        try {
          const prog = await api.getTranscriptionStatus(transId)
          setProgress(prog.progress)
          setStatus(prog.status)
          setStatusMessage(prog.message || 'Procesando transcripción...')

          if (prog.status === 'complete') {
            stopPolling()
            setIsTranscribing(false)
            const finalResult = await api.getTranscriptionResult(transId)
            setResult(finalResult)
            if (finalResult.summary) {
              setSummary(finalResult.summary)
            }
          } else if (prog.status === 'failed') {
            stopPolling()
            setIsTranscribing(false)
            setErrorMessage(prog.error || prog.message || 'Error en el proceso de transcripción.')
          }
        } catch (pollErr: any) {
          // If polling fails temporarily, check result
          try {
            const fallbackResult = await api.getTranscriptionResult(transId)
            if (fallbackResult && fallbackResult.segments?.length > 0) {
              stopPolling()
              setIsTranscribing(false)
              setStatus('complete')
              setProgress(100)
              setResult(fallbackResult)
              if (fallbackResult.summary) {
                setSummary(fallbackResult.summary)
              }
            }
          } catch {
            // Keep waiting or log
          }
        }
      }, 1500)
    } catch (err: any) {
      setIsTranscribing(false)
      setStatus('failed')
      setErrorMessage(err.message || 'Error al iniciar la transcripción.')
      throw err
    }
  }

  const handleUpdateSummary = async (newSummary: TranscriptionSummary) => {
    if (!transcriptionId) return
    try {
      const res = await api.updateTranscriptionSummary(transcriptionId, newSummary)
      setSummary(newSummary)
      if (result) {
        setResult({ ...result, summary: newSummary })
      }
      return res
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al actualizar el resumen.')
      throw err
    }
  }

  const handleRenameSpeakers = async (speakerMap: Record<string, string>) => {
    if (!transcriptionId) return
    try {
      const res = await api.renameSpeakers(transcriptionId, speakerMap)
      if (res.transcription) {
        setResult(res.transcription)
        if (res.transcription.summary) {
          setSummary(res.transcription.summary)
        }
      }
      return res
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al renombrar interlocutores.')
      throw err
    }
  }

  const handleSaveToKB = async (customTags: string[] = []) => {
    if (!transcriptionId) return
    try {
      const res = await api.saveToKnowledgeBase(transcriptionId, customTags)
      if (result) {
        setResult({ ...result, saved_to_knowledge: true, document_id: res.document_id })
      }
      return res
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al guardar en la biblioteca.')
      throw err
    }
  }

  const loadExistingTranscription = (record: TranscriptionResult) => {
    setTranscriptionId(record.id)
    setMediaId(record.media_id)
    setMetadata(record.metadata)
    setResult(record)
    setSummary(record.summary || null)
    setProgress(100)
    setStatus('complete')
    setStep('summary')
  }

  const reset = () => {
    stopPolling()
    setStep('upload')
    setFile(null)
    setMetadata({ title: '', description: '' })
    setMediaId(null)
    setTranscriptionId(null)
    setIsUploading(false)
    setIsTranscribing(false)
    setProgress(0)
    setStatus('idle')
    setStatusMessage('')
    setErrorMessage(null)
    setResult(null)
    setSummary(null)
  }

  return {
    step,
    setStep,
    file,
    setFile,
    metadata,
    setMetadata,
    mediaId,
    transcriptionId,
    isUploading,
    isTranscribing,
    progress,
    status,
    statusMessage,
    errorMessage,
    result,
    summary,
    options,
    setOptions,
    handleUpload,
    startTranscription,
    handleUpdateSummary,
    handleRenameSpeakers,
    handleSaveToKB,
    loadExistingTranscription,
    reset,
  }
}
