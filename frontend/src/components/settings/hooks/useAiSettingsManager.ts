import type { FormEvent } from 'react'
import { useCallback, useEffect, useState } from 'react'
import { api, type AISettings, type ModelCatalogItem } from '../../../api/client'
import { useToast } from '../../../context/ToastContext'
import { normalizeOllamaUrl, validateAiSettingsPayload } from '../validators/settingsValidation'

export function useAiSettingsManager() {
  const { toast } = useToast()

  const [ai, setAi] = useState<AISettings | null>(null)
  const [loadingAi, setLoadingAi] = useState(true)

  // Provider state: 'builtin' | 'ollama' | 'groq' | 'gemini' | 'openai' | 'claude'
  const [provider, setProvider] = useState<string>('builtin')
  const [model, setModel] = useState<string>('qwen3.5:2b')

  // Collapsible panels
  const [isWritingOpen, setIsWritingOpen] = useState(true)
  const [isVoiceAudioOpen, setIsVoiceAudioOpen] = useState(true)
  const [showEndpointSection, setShowEndpointSection] = useState(true)

  // Dynamic models catalog
  const [catalogModels, setCatalogModels] = useState<ModelCatalogItem[]>([])
  const [catalogError, setCatalogError] = useState<string | null>(null)

  // Voice & Transcription unified state
  const [voiceAudioProvider, setVoiceAudioProvider] = useState<string>('groq')
  const [voiceAudioModel, setVoiceAudioModel] = useState<string>('whisper-large-v3')

  // API Keys & credentials
  const [groqKey, setGroqKey] = useState('')
  const [geminiKey, setGeminiKey] = useState('')
  const [openaiKey, setOpenaiKey] = useState('')
  const [claudeKey, setClaudeKey] = useState('')
  const [ollamaUrl, setOllamaUrl] = useState('')
  const [showKey, setShowKey] = useState(false)

  // Local Ollama models & pull state
  const [ollamaOnline, setOllamaOnline] = useState<boolean | null>(null)
  const [ollamaModels, setOllamaModels] = useState<string[]>([])
  const [isPulling, setIsPulling] = useState(false)
  const [pullingModelTag, setPullingModelTag] = useState<string | null>(null)
  const [pullStatusMsg, setPullStatusMsg] = useState<string | null>(null)
  const [fetchingModels, setFetchingModels] = useState(false)

  // Feedback states
  const [savingAi, setSavingAi] = useState(false)
  const [testingConnection, setTestingConnection] = useState(false)

  const loadDynamicCatalog = useCallback(async (forceRefresh = false) => {
    try {
      const res = await api.getModelCatalog(forceRefresh)
      if (res.error) {
        setCatalogError(res.error)
      } else {
        setCatalogError(null)
      }
      setCatalogModels(res.models || [])
    } catch (e) {
      console.error('Error al cargar catálogo de modelos:', e)
      setCatalogError('Error de conexión, no se pudo obtener los modelos')
      setCatalogModels([])
    }
  }, [])

  const fetchOllamaModels = useCallback(async (url?: string, isUserAction = false) => {
    setFetchingModels(true)
    const target = normalizeOllamaUrl(url !== undefined ? url : ollamaUrl)
    try {
      const res = await api.listOllamaModels(target)
      setOllamaOnline(res.online)
      setOllamaModels(res.models || [])
      if (!res.online) {
        if (isUserAction) {
          toast.error(`No se pudo conectar con el servidor Ollama en "${target}". Asegúrate de que Ollama esté ejecutándose en tu equipo o verifica la dirección del endpoint.`)
        }
      } else {
        if (isUserAction) {
          toast.success(`Conexión exitosa: Se encontraron ${res.models?.length || 0} modelo(s) en tu servidor Ollama.`)
        }
      }
    } catch (err) {
      setOllamaOnline(false)
      setOllamaModels([])
      if (isUserAction) {
        toast.error(`Error al consultar modelos en Ollama (${target}): ${err instanceof Error ? err.message : 'No se pudo conectar con el servidor'}`)
      }
    } finally {
      setFetchingModels(false)
    }
  }, [ollamaUrl, toast])

  useEffect(() => {
    let isMounted = true
    const load = async () => {
      setLoadingAi(true)
      try {
        await loadDynamicCatalog(false)
        const settings = await api.getAiSettings()
        if (!isMounted) return
        setAi(settings)
        if (settings.provider) {
          setProvider(settings.provider)
        }
        if (settings.model) {
          setModel(settings.model)
        }
        const unifiedProvider = settings.transcription_provider || settings.voice_command_provider || 'groq'
        const unifiedModel = settings.transcription_model || settings.voice_command_model || 'whisper-large-v3'
        setVoiceAudioProvider(unifiedProvider)
        setVoiceAudioModel(unifiedModel)
        if (
          settings.ollama_base_url &&
          settings.ollama_base_url !== 'http://localhost:11434' &&
          settings.ollama_base_url !== 'http://127.0.0.1:11434'
        ) {
          setOllamaUrl(settings.ollama_base_url)
        } else {
          setOllamaUrl('')
        }

        // Fetch local Ollama models silently in background
        void fetchOllamaModels(settings.ollama_base_url || 'http://localhost:11434', false)
      } catch (err) {
        if (isMounted) {
          toast.error(err instanceof Error ? err.message : 'Error al cargar la configuración del sistema')
        }
      } finally {
        if (isMounted) {
          setLoadingAi(false)
        }
      }
    }
    void load()

    return () => {
      isMounted = false
    }
  }, [fetchOllamaModels, loadDynamicCatalog, toast])

  const handlePullModel = async (targetModelTag: string) => {
    setIsPulling(true)
    setPullingModelTag(targetModelTag)
    setPullStatusMsg(`Descargando "${targetModelTag}" desde el registro de Ollama…`)

    const effectiveTargetUrl = normalizeOllamaUrl(ollamaUrl)

    try {
      await api.pullOllamaModel(targetModelTag, effectiveTargetUrl)
      const successMsg = `¡Modelo "${targetModelTag}" descargado con éxito!`
      setPullStatusMsg(successMsg)
      toast.success(successMsg)
      setModel(targetModelTag)
      void fetchOllamaModels(effectiveTargetUrl, false)
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : `Error al descargar el modelo ${targetModelTag}`
      toast.error(errMsg)
      setPullStatusMsg(null)
    } finally {
      setIsPulling(false)
      setPullingModelTag(null)
    }
  }

  const isModelDownloaded = (modelTag: string) => {
    return ollamaModels.some((m) => m === modelTag || m.startsWith(`${modelTag}:`))
  }

  const checkIsKeyConfigured = (p: string) => {
    if (p === 'groq') return Boolean(ai?.groq_api_key_set)
    if (p === 'gemini') return Boolean(ai?.gemini_api_key_set)
    if (p === 'openai') return Boolean(ai?.openai_api_key_set)
    if (p === 'claude') return Boolean(ai?.claude_api_key_set)
    return true
  }

  const handleAiSave = async (event?: FormEvent) => {
    if (event) event.preventDefault()

    const validation = validateAiSettingsPayload({
      provider,
      model,
      ollamaUrl,
      groqKey,
      geminiKey,
      openaiKey,
      claudeKey,
      isKeyConfigured: checkIsKeyConfigured(provider),
    })

    if (!validation.isValid) {
      toast.error(validation.error || 'Verifica los campos ingresados.')
      return
    }

    setSavingAi(true)

    const payload: Record<string, string> = {
      provider,
      model: model.trim(),
      ollama_base_url: normalizeOllamaUrl(ollamaUrl),
      transcription_provider: voiceAudioProvider,
      transcription_model: voiceAudioModel.trim(),
      voice_command_provider: voiceAudioProvider,
      voice_command_model: voiceAudioModel.trim(),
    }

    if (groqKey.trim()) payload.groq_api_key = groqKey.trim()
    if (geminiKey.trim()) payload.gemini_api_key = geminiKey.trim()
    if (openaiKey.trim()) payload.openai_api_key = openaiKey.trim()
    if (claudeKey.trim()) payload.claude_api_key = claudeKey.trim()

    try {
      const updated = await api.updateAiSettings(payload)
      setAi(updated)
      setGroqKey('')
      setGeminiKey('')
      setOpenaiKey('')
      setClaudeKey('')
      toast.success('Configuración del modelo de redacción y chat guardada exitosamente.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar la configuración de IA')
    } finally {
      setSavingAi(false)
    }
  }

  const handleTestConnection = async () => {
    const validation = validateAiSettingsPayload({
      provider,
      model,
      ollamaUrl,
      groqKey,
      geminiKey,
      openaiKey,
      claudeKey,
      isKeyConfigured: checkIsKeyConfigured(provider),
    })

    if (!validation.isValid) {
      toast.error(validation.error || 'Verifica los campos ingresados.')
      return
    }

    setTestingConnection(true)

    const payload: Record<string, string> = {
      provider,
      model: model.trim(),
      ollama_base_url: normalizeOllamaUrl(ollamaUrl),
    }

    if (groqKey.trim()) payload.groq_api_key = groqKey.trim()
    if (geminiKey.trim()) payload.gemini_api_key = geminiKey.trim()
    if (openaiKey.trim()) payload.openai_api_key = openaiKey.trim()
    if (claudeKey.trim()) payload.claude_api_key = claudeKey.trim()

    try {
      const res = await api.testAiConnection(payload)
      if (res.ok || res.status === 'ok') {
        toast.success(res.message || 'Prueba de conexión exitosa con el modelo de IA.')
      } else {
        toast.error(res.message || 'La prueba de conexión con el modelo ha fallado.')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al realizar la prueba de conexión con el modelo.')
    } finally {
      setTestingConnection(false)
    }
  }

  const handleVoiceAudioSave = async (event?: FormEvent) => {
    if (event) event.preventDefault()
    setSavingAi(true)
    try {
      const updated = await api.updateAiSettings({
        transcription_provider: voiceAudioProvider,
        transcription_model: voiceAudioModel.trim(),
        voice_command_provider: voiceAudioProvider,
        voice_command_model: voiceAudioModel.trim(),
      })
      setAi(updated)
      toast.success('Configuración del modelo de transcripción y comandos de voz guardada exitosamente.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar el modelo de voz y transcripción')
    } finally {
      setSavingAi(false)
    }
  }

  return {
    ai,
    loadingAi,
    provider,
    setProvider,
    model,
    setModel,
    isWritingOpen,
    setIsWritingOpen,
    isVoiceAudioOpen,
    setIsVoiceAudioOpen,
    showEndpointSection,
    setShowEndpointSection,
    catalogModels,
    catalogError,
    loadDynamicCatalog,
    voiceAudioProvider,
    setVoiceAudioProvider,
    voiceAudioModel,
    setVoiceAudioModel,
    groqKey,
    setGroqKey,
    geminiKey,
    setGeminiKey,
    openaiKey,
    setOpenaiKey,
    claudeKey,
    setClaudeKey,
    ollamaUrl,
    setOllamaUrl,
    showKey,
    setShowKey,
    ollamaOnline,
    ollamaModels,
    isPulling,
    pullingModelTag,
    pullStatusMsg,
    fetchingModels,
    fetchOllamaModels,
    handlePullModel,
    isModelDownloaded,
    savingAi,
    testingConnection,
    handleAiSave,
    handleTestConnection,
    handleVoiceAudioSave,
  }
}
