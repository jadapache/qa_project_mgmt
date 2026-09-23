import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Cpu,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  Layers,
  Lock,
  RefreshCw,
  RotateCw,
  ShieldCheck,
  Sparkles,
  User,
  UserCheck,
  UserX,
} from 'lucide-react'
import { api, type AISettings, type AuthUser } from '../api/client'
import { AIModelSelectorModal } from '../components/AIModelSelectorModal'
import { DEFAULT_DISPLAY_NAME } from '../constants/app'

type OutletContext = {
  displayName: string
  setDisplayName: (name: string) => void
}

type TabType = 'ai_models' | 'integrations' | 'user_approvals' | 'profile_rubrics'

type BuiltInModel = {
  id: string
  name: string
  tag: string
  description: string
  size: string
  tokens: string
}

const BUILT_IN_MODELS: BuiltInModel[] = [
  {
    id: 'gemma3:1b',
    name: 'Gemma 3 1B (Rápido)',
    tag: 'gemma:2b',
    description: 'Modelo ultra rápido. Funciona en cualquier equipo con ~1GB de RAM. Ideal para resúmenes ágiles.',
    size: '~1019 MiB',
    tokens: '32.768 tokens',
  },
  {
    id: 'qwen3.5:4b',
    name: 'Qwen 3.5 4B (Alta Calidad)',
    tag: 'qwen2.5:7b',
    description: 'Modelo Qwen de alta calidad para resúmenes y análisis complejos. Mejor opción Qwen local.',
    size: '~2.6 GiB',
    tokens: '32.768 tokens',
  },
  {
    id: 'qwen3.5:2b',
    name: 'Qwen 3.5 2B (Equilibrado)',
    tag: 'qwen2.5:3b',
    description: 'Modelo Qwen equilibrado para análisis y resúmenes. Alta precisión con requerimientos moderados.',
    size: '~1.2 GiB',
    tokens: '32.768 tokens',
  },
  {
    id: 'deepseek-r1:8b',
    name: 'DeepSeek R1 8B (Razonamiento)',
    tag: 'deepseek-r1:8b',
    description: 'Modelo de razonamiento estructurado (Chain of Thought) para análisis profundo de QA y arquitectura.',
    size: '~4.9 GiB',
    tokens: '65.536 tokens',
  },
  {
    id: 'llama3.2:3b',
    name: 'Llama 3.2 3B (Rápido & Equilibrado)',
    tag: 'llama3.2:3b',
    description: 'Modelo ligero de Meta optimizado para baja latencia y alta precisión en equipos locales.',
    size: '~2.0 GiB',
    tokens: '131.072 tokens',
  },
]

const OLLAMA_RECOMMENDED = [
  { id: 'gemma3:1b', name: 'Gemma 3 1B (Recomendado, ~800MB)' },
  { id: 'llama3.2', name: 'Llama 3.2 3B (Ultra Rápido)' },
  { id: 'qwen2.5:3b', name: 'Qwen 2.5 3B (Equilibrado)' },
  { id: 'qwen2.5:7b', name: 'Qwen 2.5 7B (Alta Calidad)' },
  { id: 'deepseek-r1:8b', name: 'DeepSeek R1 8B (Razonamiento)' },
  { id: 'mistral', name: 'Mistral 7B (Propósito General)' },
  { id: 'phi4', name: 'Phi-4 14B (Lógica y Código)' },
]

const CLOUD_PROVIDERS = [
  {
    id: 'groq',
    name: 'Groq (API en la Nube)',
    recommendedModels: [
      { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile (Recomendado)' },
      { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant (Ultra Rápido)' },
      { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B (Contexto 32k)' },
    ],
  },
  {
    id: 'openai',
    name: 'OpenAI (API en la Nube)',
    recommendedModels: [
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini (Recomendado)' },
      { id: 'gpt-4o', name: 'GPT-4o (Completo)' },
    ],
  },
  {
    id: 'claude',
    name: 'Claude (Anthropic API en la Nube)',
    recommendedModels: [
      { id: 'claude-3-5-haiku-latest', name: 'Claude 3.5 Haiku (Recomendado)' },
      { id: 'claude-3-5-sonnet-latest', name: 'Claude 3.5 Sonnet (Razonamiento Avanzado)' },
    ],
  },
]

export const SettingsPage = () => {
  const { displayName, setDisplayName } = useOutletContext<OutletContext>()
  const [activeTab, setActiveTab] = useState<TabType>('ai_models')

  const [name, setName] = useState(displayName)
  const [ai, setAi] = useState<AISettings | null>(null)

  // Provider state: 'builtin' | 'ollama' | 'groq' | 'openai' | 'claude'
  const [provider, setProvider] = useState<string>('builtin')
  const [model, setModel] = useState<string>('qwen3.5:2b')
  const [isModelModalOpen, setIsModelModalOpen] = useState(false)

  // Custom Endpoint section toggle
  const [showEndpointSection, setShowEndpointSection] = useState(true)

  // API Keys & credentials
  const [groqKey, setGroqKey] = useState('')
  const [openaiKey, setOpenaiKey] = useState('')
  const [claudeKey, setClaudeKey] = useState('')
  const [ollamaUrl, setOllamaUrl] = useState('') // Empty by default so placeholder "http://localhost:11434" shows
  const [showKey, setShowKey] = useState(false)

  // Local Ollama models & pull state
  const [ollamaOnline, setOllamaOnline] = useState<boolean | null>(null)
  const [ollamaModels, setOllamaModels] = useState<string[]>([])
  const [isPulling, setIsPulling] = useState(false)
  const [pullingModelTag, setPullingModelTag] = useState<string | null>(null)
  const [pullStatusMsg, setPullStatusMsg] = useState<string | null>(null)
  const [fetchingModels, setFetchingModels] = useState(false)

  // Access Requests (Admin)
  const [pendingRequests, setPendingRequests] = useState<AuthUser[]>([])
  const [loadingRequests, setLoadingRequests] = useState(false)

  // Feedback messages
  const [standupRubric, setStandupRubric] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [savingAi, setSavingAi] = useState(false)

  useEffect(() => {
    setName(displayName)
  }, [displayName])

  const loadAccessRequests = async () => {
    setLoadingRequests(true)
    try {
      const res = await api.getAccessRequests()
      setPendingRequests(res.requests || [])
    } catch {
      // ignore
    } finally {
      setLoadingRequests(false)
    }
  }

  useEffect(() => {
    const load = async () => {
      try {
        const settings = await api.getAiSettings()
        setAi(settings)
        if (settings.provider) {
          setProvider(settings.provider)
        }
        if (settings.model) setModel(settings.model)
        if (settings.ollama_base_url && settings.ollama_base_url !== 'http://localhost:11434' && settings.ollama_base_url !== 'http://127.0.0.1:11434') {
          setOllamaUrl(settings.ollama_base_url)
        } else {
          setOllamaUrl('')
        }

        const rubric = await api.getRubric('standup')
        setStandupRubric(((rubric.criteria as string[]) || []).join('\n'))

        void loadAccessRequests()

        // Fetch local Ollama models silently in background
        void fetchOllamaModels(settings.ollama_base_url || 'http://localhost:11434', false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar la configuración del sistema')
      }
    }
    void load()
  }, [])

  const handleApproveRequest = async (userId: string, uname: string) => {
    try {
      await api.approveAccessRequest(userId)
      setMessage(`Acceso aprobado con éxito para el usuario '${uname}'.`)
      void loadAccessRequests()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al aprobar la solicitud de acceso')
    }
  }

  const handleRejectRequest = async (userId: string, uname: string) => {
    try {
      await api.rejectAccessRequest(userId)
      setMessage(`Solicitud rechazada para el usuario '${uname}'.`)
      void loadAccessRequests()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al rechazar la solicitud de acceso')
    }
  }

  const fetchOllamaModels = async (url?: string, isUserAction = false) => {
    setFetchingModels(true)
    if (isUserAction) {
      setError(null)
      setMessage(null)
    }
    const target = (url !== undefined ? url : ollamaUrl).trim() || 'http://localhost:11434'
    try {
      const res = await api.listOllamaModels(target)
      setOllamaOnline(res.online)
      setOllamaModels(res.models || [])
      if (!res.online) {
        if (isUserAction) {
          setError(`No se pudo conectar con el servidor Ollama en "${target}". Asegúrate de que Ollama esté ejecutándose en tu equipo o verifica la dirección del endpoint.`)
        }
      } else {
        if (isUserAction) {
          setMessage(`Conexión exitosa: Se encontraron ${res.models?.length || 0} modelo(s) en tu servidor Ollama.`)
        }
      }
    } catch (err) {
      setOllamaOnline(false)
      setOllamaModels([])
      if (isUserAction) {
        setError(`Error al consultar modelos en Ollama (${target}): ${err instanceof Error ? err.message : 'No se pudo conectar con el servidor'}`)
      }
    } finally {
      setFetchingModels(false)
    }
  }

  const handlePullModel = async (targetModelTag: string) => {
    setIsPulling(true)
    setPullingModelTag(targetModelTag)
    setPullStatusMsg(`Descargando "${targetModelTag}" desde el registro de Ollama…`)
    setError(null)

    const effectiveTargetUrl = ollamaUrl.trim() || 'http://localhost:11434'

    try {
      await api.pullOllamaModel(targetModelTag, effectiveTargetUrl)
      setPullStatusMsg(`¡Modelo "${targetModelTag}" descargado con éxito!`)
      setModel(targetModelTag)
      void fetchOllamaModels(effectiveTargetUrl, false)
    } catch (err) {
      setError(err instanceof Error ? err.message : `Error al descargar el modelo ${targetModelTag}`)
      setPullStatusMsg(null)
    } finally {
      setIsPulling(false)
      setPullingModelTag(null)
    }
  }

  const handleProfile = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setMessage(null)
    try {
      const updated = await api.updateSettings({ display_name: name.trim() || DEFAULT_DISPLAY_NAME })
      setDisplayName(updated.display_name ?? name)
      setMessage('Perfil guardado exitosamente.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar el perfil')
    }
  }

  const handleAiSave = async (event?: FormEvent) => {
    if (event) event.preventDefault()
    setError(null)
    setMessage(null)
    setSavingAi(true)

    const payload: Record<string, string> = {
      provider,
      model: model.trim(),
      ollama_base_url: ollamaUrl.trim() || 'http://localhost:11434',
    }

    if (groqKey.trim()) payload.groq_api_key = groqKey.trim()
    if (openaiKey.trim()) payload.openai_api_key = openaiKey.trim()
    if (claudeKey.trim()) payload.claude_api_key = claudeKey.trim()

    try {
      const updated = await api.updateAiSettings(payload)
      setAi(updated)
      setGroqKey('')
      setOpenaiKey('')
      setClaudeKey('')
      setMessage('Configuración de modelo de IA guardada exitosamente.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar la configuración de IA')
    } finally {
      setSavingAi(false)
    }
  }

  const handleRubric = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setMessage(null)
    try {
      const criteria = standupRubric
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
      await api.updateRubric('standup', criteria)
      setMessage('Rúbrica de evaluación Standup actualizada.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar la rúbrica')
    }
  }

  const isModelDownloaded = (modelTag: string) => {
    return ollamaModels.some((m) => m === modelTag || m.startsWith(`${modelTag}:`))
  }

  const TABS: Array<{
    id: TabType
    label: string
    subtitle: string
    icon: typeof Cpu
    badgeCount?: number
  }> = [
    {
      id: 'ai_models',
      label: 'Modelos de IA',
      subtitle: 'Configuración de modelos locales y APIs',
      icon: Cpu,
    },
    {
      id: 'integrations',
      label: 'Integraciones',
      subtitle: 'Jira Software, GitHub, GitLab',
      icon: Layers,
    },
    {
      id: 'user_approvals',
      label: 'Aprobación de Usuarios',
      subtitle: 'Solicitudes de acceso pendientes',
      icon: ShieldCheck,
      badgeCount: pendingRequests.length,
    },
    {
      id: 'profile_rubrics',
      label: 'Perfil & Preferencias',
      subtitle: 'Usuario y rúbricas de evaluación',
      icon: User,
    },
  ]

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#002777]">Sistema & Preferencias</p>
        </div>
        <h1 className="page-title">Configuración del Sistema</h1>
        <p className="page-subtitle">
          Administra los modelos de IA, integraciones con repositorios, aprobación de accesos y preferencias.
        </p>
      </header>

      {/* Global Alerts */}
      {message ? (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          <span>{message}</span>
        </div>
      ) : null}

      {error ? (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      ) : null}

      {/* Meetily-Style Nav Tabs Bar */}
      <nav className="flex flex-wrap gap-2 rounded-2xl border border-[var(--color-border)] bg-slate-100/70 p-1.5 shadow-sm">
        {TABS.map((t) => {
          const Icon = t.icon
          const isActive = activeTab === t.id
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={[
                'flex flex-1 min-w-[200px] items-center gap-3 rounded-xl px-4 py-3 text-left transition-all duration-200 cursor-pointer',
                isActive
                  ? 'bg-white text-[#002777] shadow-md ring-1 ring-black/5 font-bold'
                  : 'text-slate-600 hover:bg-white/60 hover:text-slate-900 font-medium',
              ].join(' ')}
            >
              <div
                className={[
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors',
                  isActive ? 'bg-[#002777] text-white' : 'bg-slate-200/80 text-slate-600',
                ].join(' ')}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold truncate">{t.label}</span>
                  {t.badgeCount && t.badgeCount > 0 ? (
                    <span className="inline-flex items-center justify-center rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-extrabold text-white animate-pulse">
                      {t.badgeCount}
                    </span>
                  ) : null}
                </div>
                <p className="text-[11px] text-slate-500 truncate font-normal">{t.subtitle}</p>
              </div>
            </button>
          )
        })}
      </nav>

      {/* TAB 1: MODELOS DE IA (MEETILY DESIGN EN ESPAÑOL) */}
      {activeTab === 'ai_models' && (
        <div className="space-y-6">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-slate-900">Configuración del Modelo de IA</h2>
            <p className="text-sm text-slate-500">
              Configura el modelo de IA utilizado para la generación de resúmenes, análisis de QA e ingeniería de requerimientos.
            </p>
          </div>

          <form onSubmit={(e) => void handleAiSave(e)} className="card space-y-6 border border-slate-200 bg-white p-6 md:p-8 shadow-sm rounded-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-900">Parámetros del Modelo</h3>
              <button
                type="button"
                onClick={() => setIsModelModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-[#002777] shadow-sm hover:bg-blue-100 hover:border-[#004497] transition-all cursor-pointer"
              >
                <Sparkles className="h-4 w-4 text-[#002777]" />
                <span>Explorar Catálogo Extendido</span>
              </button>
            </div>

            {/* Selector de Proveedor / Tipo de Modelo */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-800 block">
                Modelo de Inferencia / Resumen
              </label>

              <select
                value={provider}
                onChange={(e) => {
                  const newProv = e.target.value
                  setProvider(newProv)
                  if (newProv === 'builtin') {
                    setModel('qwen3.5:2b')
                  } else if (newProv === 'ollama') {
                    if (ollamaModels.length > 0) {
                      setModel(ollamaModels[0])
                    } else {
                      setModel('gemma3:1b')
                    }
                    void fetchOllamaModels(undefined, false)
                  } else if (newProv === 'groq') {
                    setModel('llama-3.3-70b-versatile')
                  } else if (newProv === 'openai') {
                    setModel('gpt-4o-mini')
                  } else if (newProv === 'claude') {
                    setModel('claude-3-5-haiku-latest')
                  }
                }}
                className="input-field text-sm font-medium text-slate-900 w-full bg-white border border-slate-300 rounded-xl py-2.5 px-3"
              >
                <option value="builtin">IA Integrada (Local, Sin API externa)</option>
                <option value="ollama">Ollama (Servidor Local / Remoto)</option>
                <option value="groq">Groq (API en la Nube)</option>
                <option value="openai">OpenAI (API en la Nube)</option>
                <option value="claude">Claude (Anthropic API en la Nube)</option>
              </select>
            </div>

            {/* CASO 1: IA INTEGRADA LOCAL (DISEÑO IMAGEN 2 EN ESPAÑOL) */}
            {provider === 'builtin' && (
              <div className="space-y-4 pt-2">
                <h4 className="text-sm font-bold text-slate-900">Modelos de IA Integrados (Locales)</h4>

                {pullStatusMsg ? (
                  <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 text-xs font-medium text-[#002777] flex items-center gap-2">
                    <RefreshCw className={`h-4 w-4 shrink-0 ${isPulling ? 'animate-spin text-[#004497]' : 'text-emerald-600'}`} />
                    <span>{pullStatusMsg}</span>
                  </div>
                ) : null}

                <div className="space-y-3">
                  {BUILT_IN_MODELS.map((m) => {
                    const downloaded = isModelDownloaded(m.tag)
                    const isSelected = model === m.id || model === m.tag
                    const isCurrentlyPulling = isPulling && pullingModelTag === m.tag

                    return (
                      <div
                        key={m.id}
                        onClick={() => {
                          setModel(m.id)
                        }}
                        className={[
                          'flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl transition-all cursor-pointer',
                          isSelected
                            ? 'border-2 border-slate-900 bg-white shadow-sm'
                            : 'border border-slate-200 bg-white hover:border-slate-300',
                        ].join(' ')}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h5 className="font-bold text-slate-900 text-base">{m.name}</h5>
                            {downloaded ? (
                              <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700">
                                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                Listo
                              </span>
                            ) : null}
                            {isSelected ? (
                              <span className="rounded-md bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                                Seleccionado
                              </span>
                            ) : null}
                          </div>

                          <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
                            {m.description}
                          </p>

                          <p className="text-xs text-slate-400 font-medium pt-0.5">
                            {m.size} • {m.tokens}
                          </p>
                        </div>

                        <div className="shrink-0 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          {downloaded ? (
                            <button
                              type="button"
                              onClick={() => setModel(m.id)}
                              className={[
                                'px-4 py-2 rounded-lg text-xs font-semibold transition',
                                isSelected
                                  ? 'bg-slate-900 text-white'
                                  : 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-700',
                              ].join(' ')}
                            >
                              {isSelected ? 'Activo' : 'Seleccionar'}
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={isPulling}
                              onClick={() => void handlePullModel(m.tag)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold px-4 py-2 shadow-sm transition disabled:opacity-60 cursor-pointer"
                            >
                              {isCurrentlyPulling ? (
                                <>
                                  <RotateCw className="h-3.5 w-3.5 animate-spin text-blue-600" />
                                  <span>Descargando…</span>
                                </>
                              ) : (
                                <>
                                  <Download className="h-3.5 w-3.5 text-slate-700" />
                                  <span>Descargar</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* CASO 2: PROVEEDOR OLLAMA (CON 2 COLUMNAS COMO EN LA CAPTURA) */}
            {provider === 'ollama' && (
              <div className="space-y-5 pt-2">
                {/* 2 Columnas de selección de modelo idéntico a la captura */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-800 block">
                      Modelo Recomendado
                    </label>
                    <select
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      className="input-field text-sm font-medium text-slate-900 border border-slate-300 rounded-xl"
                    >
                      {ollamaModels.length > 0 && (
                        <optgroup label="Modelos Instalados en Ollama">
                          {ollamaModels.map((m) => (
                            <option key={m} value={m}>
                              {m} (Instalado)
                            </option>
                          ))}
                        </optgroup>
                      )}
                      <optgroup label="Modelos Recomendados">
                        {OLLAMA_RECOMMENDED.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-800 block">
                      Identificador de Modelo Personalizado
                    </label>
                    <input
                      type="text"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      placeholder="Ej. gemma3:1b, llama3.2, deepseek-r1:8b"
                      className="input-field font-mono text-xs border border-slate-300 rounded-xl"
                    />
                  </div>
                </div>

                {/* Endpoint Personalizado (Opcional) colapsable con placeholder limpio */}
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setShowEndpointSection(!showEndpointSection)}
                    className="flex items-center justify-between w-full text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-800">
                        Endpoint Personalizado (Opcional)
                      </span>
                      {ollamaOnline === true && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          En línea
                        </span>
                      )}
                      {ollamaOnline === false && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                          Desconectado
                        </span>
                      )}
                    </div>
                    {showEndpointSection ? (
                      <ChevronUp className="h-4 w-4 text-slate-500" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-slate-500" />
                    )}
                  </button>

                  {showEndpointSection && (
                    <div className="space-y-2">
                      <p className="text-xs text-slate-500">
                        Deja vacío para usar el valor por defecto o ingresa un endpoint personalizado (ej. http://localhost:11434)
                      </p>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={ollamaUrl}
                          onChange={(e) => setOllamaUrl(e.target.value)}
                          placeholder="http://localhost:11434"
                          className="input-field font-mono text-xs flex-1 border border-slate-300 rounded-xl py-2.5 px-3"
                        />
                        <button
                          type="button"
                          onClick={() => void fetchOllamaModels(undefined, true)}
                          disabled={fetchingModels}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition shrink-0 cursor-pointer"
                        >
                          <RotateCw className={`h-3.5 w-3.5 ${fetchingModels ? 'animate-spin' : ''}`} />
                          <span>Consultar Modelos</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Modelos de Ollama Disponibles */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-800 block">
                    Modelos de Ollama Disponibles
                  </label>

                  {ollamaModels.length === 0 ? (
                    <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-xs text-slate-600">
                      No se encontraron modelos. Descarga un modelo recomendado o haz clic en "Consultar Modelos" para cargar los modelos disponibles en tu servidor Ollama.
                    </div>
                  ) : (
                    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
                      <p className="text-xs text-slate-500 mb-2">Modelos detectados en tu servidor Ollama:</p>
                      <div className="flex flex-wrap gap-2">
                        {ollamaModels.map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setModel(m)}
                            className={[
                              'rounded-lg px-3 py-1.5 text-xs font-mono transition cursor-pointer',
                              model === m
                                ? 'bg-slate-900 text-white font-bold shadow-sm'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
                            ].join(' ')}
                          >
                            {m} {model === m ? '✓' : ''}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Botón de descarga rápida recomendada */}
                  <div className="pt-2">
                    <button
                      type="button"
                      disabled={isPulling}
                      onClick={() => void handlePullModel('gemma3:1b')}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 py-2.5 px-4 text-xs font-semibold text-slate-800 shadow-sm transition cursor-pointer"
                    >
                      {isPulling && pullingModelTag === 'gemma3:1b' ? (
                        <RotateCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Download className="h-3.5 w-3.5" />
                      )}
                      <span>Descargar gemma3:1b (Recomendado, ~800MB)</span>
                    </button>
                  </div>

                  {pullStatusMsg ? (
                    <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 text-xs font-medium text-[#002777] flex items-center gap-2">
                      <RefreshCw className={`h-4 w-4 shrink-0 ${isPulling ? 'animate-spin text-[#004497]' : 'text-emerald-600'}`} />
                      <span>{pullStatusMsg}</span>
                    </div>
                  ) : null}
                </div>
              </div>
            )}

            {/* CASO 3: PROVEEDORES CLOUD (GROQ, OPENAI, CLAUDE) */}
            {['groq', 'openai', 'claude'].includes(provider) && (
              <div className="space-y-4 pt-2">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-800 block">
                      Modelo Recomendado
                    </label>
                    <select
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      className="input-field text-sm font-medium text-slate-900 border border-slate-300 rounded-xl"
                    >
                      {CLOUD_PROVIDERS.find((p) => p.id === provider)?.recommendedModels.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-800 block">
                      Identificador de Modelo Personalizado
                    </label>
                    <input
                      type="text"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      placeholder="Ej. gpt-4o, llama-3.3-70b-versatile"
                      className="input-field font-mono text-xs border border-slate-300 rounded-xl"
                    />
                  </div>
                </div>

                {/* Campo API Key según proveedor */}
                {provider === 'groq' && (
                  <div className="space-y-2 rounded-xl bg-slate-50 p-4 border border-slate-200">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Lock className="h-3.5 w-3.5" /> Clave de API de Groq
                      </label>
                      {ai?.groq_api_key_set ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                          <Check className="h-3 w-3" /> Clave guardada
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          Sin clave configurada
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type={showKey ? 'text' : 'password'}
                        value={groqKey}
                        onChange={(e) => setGroqKey(e.target.value)}
                        placeholder={ai?.groq_api_key_set ? '•••••••••••••••• (Guardada en el servidor)' : 'gsk_... (Ingresa tu clave de Groq)'}
                        className="input-field pr-10 font-mono text-xs border border-slate-300 rounded-xl"
                      />
                      <button
                        type="button"
                        onClick={() => setShowKey(!showKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {provider === 'openai' && (
                  <div className="space-y-2 rounded-xl bg-slate-50 p-4 border border-slate-200">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Lock className="h-3.5 w-3.5" /> Clave de API de OpenAI
                      </label>
                      {ai?.openai_api_key_set ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                          <Check className="h-3 w-3" /> Clave guardada
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          Sin clave configurada
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type={showKey ? 'text' : 'password'}
                        value={openaiKey}
                        onChange={(e) => setOpenaiKey(e.target.value)}
                        placeholder={ai?.openai_api_key_set ? '•••••••••••••••• (Guardada en el servidor)' : 'sk-proj-... (Ingresa tu clave de OpenAI)'}
                        className="input-field pr-10 font-mono text-xs border border-slate-300 rounded-xl"
                      />
                      <button
                        type="button"
                        onClick={() => setShowKey(!showKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {provider === 'claude' && (
                  <div className="space-y-2 rounded-xl bg-slate-50 p-4 border border-slate-200">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Lock className="h-3.5 w-3.5" /> Clave de API de Anthropic Claude
                      </label>
                      {ai?.claude_api_key_set ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                          <Check className="h-3 w-3" /> Clave guardada
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          Sin clave configurada
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type={showKey ? 'text' : 'password'}
                        value={claudeKey}
                        onChange={(e) => setClaudeKey(e.target.value)}
                        placeholder={ai?.claude_api_key_set ? '•••••••••••••••• (Guardada en el servidor)' : 'sk-ant-... (Ingresa tu clave de Claude)'}
                        className="input-field pr-10 font-mono text-xs border border-slate-300 rounded-xl"
                      />
                      <button
                        type="button"
                        onClick={() => setShowKey(!showKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Botón Guardar en Español */}
            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                type="submit"
                disabled={savingAi}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2.5 rounded-xl shadow-sm transition flex items-center gap-2 cursor-pointer text-sm"
              >
                {savingAi ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                <span>Guardar Configuración</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: INTEGRACIONES (JIRA, GITHUB, GITLAB) */}
      {activeTab === 'integrations' && (
        <div className="space-y-6">
          <div className="card space-y-6 border border-[var(--color-border)] p-6 md:p-8">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
              <div>
                <h2 className="text-xl font-bold text-[var(--color-ink)] flex items-center gap-2">
                  <Layers className="h-5 w-5 text-[#002777]" />
                  Integraciones de Desarrollo & QA
                </h2>
                <p className="text-xs text-[var(--color-ink-muted)] mt-1">
                  Conexión directa con Jira, GitHub y GitLab para sincronización de requerimientos y Pull Requests.
                </p>
              </div>
              <a
                href="/integrations"
                className="btn-secondary text-xs py-2 px-4 flex items-center gap-1.5"
              >
                <span>Administrar Integraciones</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 p-5 bg-white space-y-2 shadow-sm">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900">Jira Software</h4>
                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Sincronización de épicas, historias de usuario y tareas de testing con OAuth 2.0 y PAT.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-5 bg-white space-y-2 shadow-sm">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900">GitHub</h4>
                  <span className="h-2 w-2 rounded-full bg-slate-900" />
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Inspección de Pull Requests, commits y validación de cobertura de código.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-5 bg-white space-y-2 shadow-sm">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900">GitLab</h4>
                  <span className="h-2 w-2 rounded-full bg-orange-500" />
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Integración con repositorios GitLab y pipelines de integración continua.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: APROBACIÓN DE USUARIOS */}
      {activeTab === 'user_approvals' && (
        <div className="card space-y-6 border border-[var(--color-border)] p-6 md:p-8">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-[#002777]" />
              <div>
                <h2 className="text-xl font-bold text-[var(--color-ink)]">Solicitudes de Acceso Pendientes</h2>
                <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">
                  Gestión de aprobaciones para usuarios que han solicitado acceso a la plataforma.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void loadAccessRequests()}
              disabled={loadingRequests}
              className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loadingRequests ? 'animate-spin' : ''}`} />
              <span>Actualizar</span>
            </button>
          </div>

          {pendingRequests.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center text-xs text-slate-500 space-y-2">
              <UserCheck className="h-8 w-8 mx-auto text-slate-400" />
              <p className="font-semibold text-slate-700 text-sm">No hay solicitudes pendientes</p>
              <p className="text-slate-500">Todas las solicitudes de registro han sido procesadas.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingRequests.map((req) => (
                <div
                  key={req.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-[var(--color-border)] bg-white p-4 shadow-sm hover:border-blue-200 transition"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{req.username}</span>
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                        Pendiente de aprobación
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">
                      {req.full_name || 'Sin nombre'} • {req.email || 'Sin correo electrónico'}
                    </p>
                    {req.created_at ? (
                      <p className="text-[11px] text-slate-400">Solicitado: {req.created_at}</p>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => void handleApproveRequest(req.id, req.username)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 text-xs font-semibold shadow-sm transition-all cursor-pointer"
                    >
                      <UserCheck className="h-4 w-4" />
                      <span>Aprobar Acceso</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleRejectRequest(req.id, req.username)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white px-3.5 py-2 text-xs font-semibold shadow-sm transition-all cursor-pointer"
                    >
                      <UserX className="h-4 w-4" />
                      <span>Rechazar</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: PERFIL & RÚBRICAS */}
      {activeTab === 'profile_rubrics' && (
        <div className="space-y-6">
          <form onSubmit={(event) => void handleProfile(event)} className="card space-y-4 border border-[var(--color-border)] p-6">
            <div className="flex items-center gap-2 border-b border-[var(--color-border)] pb-3">
              <User className="h-5 w-5 text-[#002777]" />
              <h2 className="text-lg font-bold text-[var(--color-ink)]">Perfil de Usuario</h2>
            </div>
            <p className="text-xs text-[var(--color-ink-muted)]">
              Nombre visible en saludos y encabezados (ej. Herramientas de {displayName}). Almacenado localmente.
            </p>
            <div className="max-w-md space-y-1.5">
              <label className="text-xs font-semibold text-[var(--color-ink)] block">Nombre a mostrar</label>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="input-field"
              />
            </div>
            <button type="submit" className="btn-secondary text-xs py-2 px-4 cursor-pointer">
              Guardar Perfil
            </button>
          </form>

          <form onSubmit={(event) => void handleRubric(event)} className="card space-y-4 border border-[var(--color-border)] p-6">
            <div className="flex items-center gap-2 border-b border-[var(--color-border)] pb-3">
              <Sparkles className="h-5 w-5 text-[#002777]" />
              <h2 className="text-lg font-bold text-[var(--color-ink)]">Rúbrica de Evaluación Standup</h2>
            </div>
            <p className="text-xs text-[var(--color-ink-muted)]">
              Criterios utilizados para validar la completitud del resumen diario. Un criterio por línea.
            </p>
            <textarea
              value={standupRubric}
              onChange={(event) => setStandupRubric(event.target.value)}
              rows={6}
              className="input-field font-mono text-xs leading-relaxed"
            />
            <button type="submit" className="btn-secondary text-xs py-2 px-4 cursor-pointer">
              Guardar Rúbrica
            </button>
          </form>
        </div>
      )}

      {/* Modal Extendido Selector de Modelos de IA */}
      <AIModelSelectorModal
        isOpen={isModelModalOpen}
        onClose={() => setIsModelModalOpen(false)}
        currentProvider={provider}
        currentModel={model}
        onSelectModel={(newProv, newModel) => {
          setProvider(newProv)
          setModel(newModel)
          if (newProv === 'ollama') {
            void fetchOllamaModels(undefined, false)
          }
        }}
        aiSettings={ai}
      />
    </div>
  )
}
