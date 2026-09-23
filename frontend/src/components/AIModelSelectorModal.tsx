import { useEffect, useState } from 'react'
import {
  AlertCircle,
  Bot,
  Check,
  Coins,
  Cpu,
  Download,
  FileText,
  Gauge,
  Lock,
  Mic,
  RefreshCw,
  Search,
  Server,
  Sparkles,
  X,
  Zap,
} from 'lucide-react'
import { api, type AISettings, type ModelCatalogItem } from '../api/client'

export type ModelOption = {
  id: string
  name: string
  provider: 'groq' | 'openai' | 'claude' | 'gemini' | 'ollama'
  providerName: string
  description: string
  contextWindow: string
  rateLimits?: string
  pricingLabel?: string
  isFree?: boolean
  badge?: string
  isLocal?: boolean
  isDownloaded?: boolean
}

const LOCAL_PRESET_MODELS: ModelOption[] = [
  {
    id: 'llama3.2',
    name: 'Llama 3.2 (3B)',
    provider: 'ollama',
    providerName: 'Ollama Local',
    description: 'Modelo ligero óptimo para laptops y GPUs integradas (2GB+ VRAM).',
    contextWindow: '128k tokens',
    rateLimits: 'Ilimitado (Hardware propio)',
    pricingLabel: '$0.00 (100% Gratuito y Privado)',
    isFree: true,
    badge: 'Liviano & Rápido',
    isLocal: true,
  },
  {
    id: 'qwen2.5',
    name: 'Qwen 2.5 (7B)',
    provider: 'ollama',
    providerName: 'Ollama Local',
    description: 'Excelente rendimiento en español, lógica estructurada y formato JSON.',
    contextWindow: '32k tokens',
    rateLimits: 'Ilimitado (Hardware propio)',
    pricingLabel: '$0.00 (100% Gratuito y Privado)',
    isFree: true,
    badge: 'Recomendado Local',
    isLocal: true,
  },
  {
    id: 'deepseek-r1:8b',
    name: 'DeepSeek R1 (8B)',
    provider: 'ollama',
    providerName: 'Ollama Local',
    description: 'Razonamiento lógico por pasos de libre acceso ejecutado 100% offline.',
    contextWindow: '64k tokens',
    rateLimits: 'Ilimitado (Hardware propio)',
    pricingLabel: '$0.00 (100% Gratuito y Privado)',
    isFree: true,
    badge: 'Razonamiento Offline',
    isLocal: true,
  },
  {
    id: 'mistral',
    name: 'Mistral (7B)',
    provider: 'ollama',
    providerName: 'Ollama Local',
    description: 'Modelo versátil de alto rendimiento en tareas generales de desarrollo.',
    contextWindow: '32k tokens',
    rateLimits: 'Ilimitado (Hardware propio)',
    pricingLabel: '$0.00 (100% Gratuito y Privado)',
    isFree: true,
    isLocal: true,
  },
]

type AIModelSelectorModalProps = {
  isOpen: boolean
  onClose: () => void
  currentProvider: string
  currentModel: string
  onSelectModel: (provider: string, model: string) => void
  aiSettings: AISettings | null
}

export const AIModelSelectorModal = ({
  isOpen,
  onClose,
  currentProvider,
  currentModel,
  onSelectModel,
  aiSettings,
}: AIModelSelectorModalProps) => {
  const [activeTab, setActiveTab] = useState<'frontier' | 'local'>('frontier')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProviderFilter, setSelectedProviderFilter] = useState<string>('all')
  const [priceTierFilter, setPriceTierFilter] = useState<'all' | 'free' | 'paid'>('all')
  const [taskTypeFilter, setTaskTypeFilter] = useState<'all' | 'chat_writing' | 'transcription'>('chat_writing')

  // Catalog state
  const [catalogModels, setCatalogModels] = useState<ModelCatalogItem[]>([])
  const [catalogSource, setCatalogSource] = useState<string>('')
  const [catalogUpdatedAt, setCatalogUpdatedAt] = useState<string>('')
  const [catalogError, setCatalogError] = useState<string | null>(null)
  const [isLoadingCatalog, setIsLoadingCatalog] = useState<boolean>(false)
  const [isRefreshingCatalog, setIsRefreshingCatalog] = useState<boolean>(false)

  // Ollama local state
  const [ollamaUrl, setOllamaUrl] = useState('http://127.0.0.1:11434')
  const [ollamaOnline, setOllamaOnline] = useState<boolean | null>(null)
  const [ollamaInstalledModels, setOllamaInstalledModels] = useState<string[]>([])
  const [isCheckingOllama, setIsCheckingOllama] = useState(false)
  const [customPullName, setCustomPullName] = useState('')
  const [isPulling, setIsPulling] = useState(false)
  const [pullStatusMsg, setPullStatusMsg] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      if (catalogModels.length === 0) {
        void fetchCatalog(false)
      }
      if (aiSettings?.ollama_base_url) {
        setOllamaUrl(aiSettings.ollama_base_url)
        void checkOllama()
      }
    }
  }, [isOpen, aiSettings])

  const fetchCatalog = async (forceRefresh: boolean = false) => {
    if (forceRefresh) {
      setIsRefreshingCatalog(true)
    } else {
      setIsLoadingCatalog(true)
    }
    setCatalogError(null)
    try {
      const res = await api.getModelCatalog(forceRefresh)
      if (res.error) {
        setCatalogError(res.error)
        setCatalogModels(res.models || [])
      } else {
        setCatalogModels(res.models || [])
        setCatalogSource(res.source || 'en vivo')
        setCatalogUpdatedAt(res.updated_at || '')
      }
    } catch (err) {
      console.error('Error al cargar catálogo de modelos:', err)
      setCatalogError('Error de conexión, no se pudo obtener los modelos')
    } finally {
      setIsLoadingCatalog(false)
      setIsRefreshingCatalog(false)
    }
  }

  const checkOllama = async () => {
    setIsCheckingOllama(true)
    try {
      const res = await api.listOllamaModels(ollamaUrl)
      setOllamaOnline(res.online)
      setOllamaInstalledModels(res.models || [])
    } catch {
      setOllamaOnline(false)
      setOllamaInstalledModels([])
    } finally {
      setIsCheckingOllama(false)
    }
  }

  const handlePullModel = async (targetModelName?: string) => {
    const modelToPull = (targetModelName || customPullName).trim()
    if (!modelToPull) return
    setIsPulling(true)
    setPullStatusMsg(`Descargando "${modelToPull}" desde Ollama Registry…`)

    try {
      await api.pullOllamaModel(modelToPull, ollamaUrl)
      setPullStatusMsg(`¡Modelo "${modelToPull}" listo e instalado localmente!`)
      onSelectModel('ollama', modelToPull)
      void checkOllama()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al descargar modelo'
      setPullStatusMsg(`Error: ${msg}`)
    } finally {
      setIsPulling(false)
    }
  }

  if (!isOpen) return null

  // Filter frontier models from dynamic catalog
  const filteredFrontier = catalogModels.filter((m) => {
    const matchSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.provider_name.toLowerCase().includes(searchQuery.toLowerCase())

    const matchProvider =
      selectedProviderFilter === 'all' || m.provider === selectedProviderFilter

    const matchPrice =
      priceTierFilter === 'all' ||
      (priceTierFilter === 'free' && m.is_free) ||
      (priceTierFilter === 'paid' && !m.is_free)

    const matchTask =
      taskTypeFilter === 'all' || m.task_type === taskTypeFilter

    return matchSearch && matchProvider && matchPrice && matchTask
  })

  // Local models list (presets + custom installed)
  const allLocalModels: ModelOption[] = [
    ...LOCAL_PRESET_MODELS.map((m) => ({
      ...m,
      isDownloaded: ollamaInstalledModels.includes(m.id),
    })),
    ...ollamaInstalledModels
      .filter((mName) => !LOCAL_PRESET_MODELS.some((p) => p.id === mName))
      .map((mName) => ({
        id: mName,
        name: mName,
        provider: 'ollama' as const,
        providerName: 'Ollama Local',
        description: 'Modelo descargado manualmente en tu servidor Ollama.',
        contextWindow: 'Variable',
        rateLimits: 'Ilimitado (Hardware local)',
        pricingLabel: '$0.00 (Local / Privado)',
        isFree: true,
        isLocal: true,
        isDownloaded: true,
      })),
  ]

  const filteredLocal = allLocalModels.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.description.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const isKeyConfigured = (prov: string) => {
    if (prov === 'groq') return aiSettings?.groq_api_key_set
    if (prov === 'gemini') return aiSettings?.gemini_api_key_set
    if (prov === 'openai') return aiSettings?.openai_api_key_set
    if (prov === 'claude') return aiSettings?.claude_api_key_set
    return true
  }

  const getProviderColor = (prov: string) => {
    switch (prov) {
      case 'groq':
        return 'bg-amber-100 text-amber-900 border-amber-200'
      case 'gemini':
        return 'bg-sky-100 text-sky-900 border-sky-200'
      case 'openai':
        return 'bg-emerald-100 text-emerald-900 border-emerald-200'
      case 'claude':
        return 'bg-purple-100 text-purple-900 border-purple-200'
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200'
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/90 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#002777] text-white shadow-md">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">
                  Catálogo Dinámico de Modelos de IA
                </h2>
                {catalogSource && (
                  <span className="rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-bold text-[#002777]">
                    Fuente: {catalogSource}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Consulta en vivo con límites de uso por modelo y costos de consumo de tokens actualizados.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void fetchCatalog(true)}
              disabled={isRefreshingCatalog}
              title="Actualizar catálogo desde medio externo en vivo"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-100 hover:text-slate-900 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 text-[#002777] ${
                  isRefreshingCatalog ? 'animate-spin' : ''
                }`}
              />
              <span className="hidden sm:inline">
                {isRefreshingCatalog ? 'Actualizando…' : 'Actualizar Catálogo'}
              </span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Tab Switcher & Search Bar */}
        <div className="flex flex-col gap-3 border-b border-slate-100 px-6 py-3 bg-white sm:flex-row sm:items-center sm:justify-between">
          <div className="flex rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setActiveTab('frontier')}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'frontier'
                  ? 'bg-[#002777] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Zap className="h-3.5 w-3.5" />
              Modelos en la Nube ({catalogModels.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('local')}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'local'
                  ? 'bg-[#002777] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Cpu className="h-3.5 w-3.5" />
              Modelos Locales (Ollama Offline)
            </button>
          </div>

          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre, ID o descripción…"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:border-[#002777] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#002777]/20"
            />
          </div>
        </div>

        {/* Modal Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* FRONTIER / CLOUD MODELS TAB */}
          {activeTab === 'frontier' && (
            <div className="space-y-4">
              {/* Function / Task Filter Row */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <span>Función de IA:</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setTaskTypeFilter('chat_writing')}
                    className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                      taskTypeFilter === 'chat_writing'
                        ? 'bg-[#002777] text-white shadow-sm ring-2 ring-[#002777]/20'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <FileText className="h-3.5 w-3.5" />
                    <span>📝 Redacción y Chat (Actual)</span>
                    <span
                      className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                        taskTypeFilter === 'chat_writing'
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {
                        catalogModels.filter((m) => m.task_type === 'chat_writing')
                          .length
                      }
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTaskTypeFilter('transcription')}
                    className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                      taskTypeFilter === 'transcription'
                        ? 'bg-purple-700 text-white shadow-sm ring-2 ring-purple-600/20'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Mic className="h-3.5 w-3.5" />
                    <span>🎙️ Transcripción y Voz (Próximamente)</span>
                    <span
                      className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                        taskTypeFilter === 'transcription'
                          ? 'bg-white/20 text-white'
                          : 'bg-purple-100 text-purple-800'
                      }`}
                    >
                      {
                        catalogModels.filter((m) => m.task_type === 'transcription')
                          .length
                      }
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTaskTypeFilter('all')}
                    className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
                      taskTypeFilter === 'all'
                        ? 'bg-slate-800 text-white shadow-sm'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>Todas las funciones ({catalogModels.length})</span>
                  </button>
                </div>
              </div>

              {/* Explanatory Banner for Active Function */}
              {taskTypeFilter === 'chat_writing' && (
                <div className="flex items-center gap-2 rounded-xl bg-blue-50/80 border border-blue-200 px-3.5 py-2 text-xs text-blue-900">
                  <FileText className="h-4 w-4 shrink-0 text-[#002777]" />
                  <span>
                    <strong>Función del Panel Actual:</strong> Redacción de casos de prueba, PRDs, reportes de Daily Standup y chat de instrucciones. Se muestran los modelos LLM optimizados para texto y razonamiento.
                  </span>
                </div>
              )}

              {taskTypeFilter === 'transcription' && (
                <div className="flex items-center gap-2 rounded-xl bg-purple-50/90 border border-purple-200 px-3.5 py-2 text-xs text-purple-900">
                  <Mic className="h-4 w-4 shrink-0 text-purple-700" />
                  <span>
                    <strong>Modelos de Audio y Voz (Próximamente):</strong> Modelos Whisper para transcripción de reuniones y comandos de voz. Reservados para la próxima integración de voz (no aplicables para redactar texto en este panel).
                  </span>
                </div>
              )}

              {/* Dual Filter Row: Provider & Cost */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-100">
                {/* Provider Quick Filters */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-500 mr-1">
                    Proveedor:
                  </span>
                  {[
                    { id: 'all', label: 'Todos' },
                    { id: 'groq', label: 'Groq Cloud' },
                    { id: 'gemini', label: 'Google Gemini' },
                    { id: 'openai', label: 'OpenAI' },
                    { id: 'claude', label: 'Anthropic Claude' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setSelectedProviderFilter(f.id)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-medium transition cursor-pointer ${
                        selectedProviderFilter === f.id
                          ? 'bg-blue-100 text-[#002777] font-bold border border-blue-300'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {/* Price Tier Filters */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-500 mr-1">
                    Tarifa:
                  </span>
                  {[
                    { id: 'all' as const, label: 'Todos' },
                    { id: 'free' as const, label: '✨ Gratuitos / Free' },
                    { id: 'paid' as const, label: '🪙 De Pago' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPriceTierFilter(p.id)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-medium transition cursor-pointer ${
                        priceTierFilter === p.id
                          ? 'bg-emerald-100 text-emerald-900 font-bold border border-emerald-300'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Error indicator */}
              {catalogError && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-800 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                    <span>{catalogError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => void fetchCatalog(true)}
                    className="px-3 py-1 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 transition cursor-pointer"
                  >
                    Reintentar
                  </button>
                </div>
              )}

              {/* Loading indicator */}
              {isLoadingCatalog && (
                <div className="flex items-center justify-center py-12 gap-3 text-slate-500">
                  <RefreshCw className="h-5 w-5 animate-spin text-[#002777]" />
                  <span className="text-sm font-medium">
                    Consultando modelos y tarifas externas en vivo…
                  </span>
                </div>
              )}

              {/* Models Grid */}
              {!isLoadingCatalog && (
                <div className="grid gap-4 sm:grid-cols-2">
                  {filteredFrontier.map((m) => {
                    const isSelected =
                      currentProvider === m.provider && currentModel === m.id
                    const keyOk = isKeyConfigured(m.provider)

                    return (
                      <div
                        key={`${m.provider}-${m.id}`}
                        className={`flex flex-col justify-between rounded-2xl border p-4 transition-all ${
                          isSelected
                            ? 'border-[#002777] bg-blue-50/40 ring-2 ring-[#002777]/20 shadow-md'
                            : 'border-slate-200 bg-white hover:border-blue-200 hover:shadow-sm'
                        }`}
                      >
                        <div>
                          {/* Badges bar */}
                          <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span
                                className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase border ${getProviderColor(
                                  m.provider,
                                )}`}
                              >
                                {m.provider_name}
                              </span>
                              {m.task_type === 'transcription' ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-800 border border-purple-300">
                                  <Mic className="h-2.5 w-2.5 text-purple-700" /> Transcripción y Voz
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200">
                                  <FileText className="h-2.5 w-2.5 text-blue-600" /> Redacción y Chat
                                </span>
                              )}
                              {m.is_free ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                                  <Sparkles className="h-2.5 w-2.5" /> Gratuito (Free Tier)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 border border-indigo-200">
                                  De Pago
                                </span>
                              )}
                            </div>
                            {m.badge && (
                              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-[#002777]">
                                {m.badge}
                              </span>
                            )}
                          </div>

                          {/* Model Title & ID */}
                          <h3 className="text-sm font-bold text-slate-900 flex items-center justify-between gap-2">
                            <span>{m.name}</span>
                            <code className="text-[11px] font-mono font-normal text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                              {m.id}
                            </code>
                          </h3>

                          <p className="mt-1 text-xs text-slate-600 leading-relaxed line-clamp-2">
                            {m.description}
                          </p>

                          {/* Limits & Pricing specifications card */}
                          <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50/80 p-2.5 space-y-1.5 text-[11px]">
                            <div className="flex items-center justify-between text-slate-600">
                              <span className="flex items-center gap-1 font-medium text-slate-500">
                                <Gauge className="h-3 w-3 text-amber-600" /> Límites de uso:
                              </span>
                              <span className="font-semibold text-slate-800 text-right">
                                {m.rate_limits}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-slate-600">
                              <span className="flex items-center gap-1 font-medium text-slate-500">
                                <Coins className="h-3 w-3 text-emerald-600" /> Costo tokens:
                              </span>
                              <span className="font-semibold text-slate-800 text-right">
                                {m.pricing_label}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Footer card action */}
                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                          <div className="flex items-center gap-2 text-[11px] text-slate-500">
                            <span>
                              Contexto: <strong className="text-slate-700">{m.context_window}</strong>
                            </span>
                            {!keyOk && (
                              <span className="inline-flex items-center gap-1 text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                <Lock className="h-3 w-3" /> Requiere Key
                              </span>
                            )}
                          </div>

                          {m.task_type === 'transcription' ? (
                            <button
                              type="button"
                              disabled
                              title="Modelo de audio/voz reservado para el futuro módulo de comandos de voz. No genera texto en el panel actual."
                              className="rounded-xl px-3 py-1.5 text-xs font-semibold bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed flex items-center gap-1.5"
                            >
                              <Mic className="h-3.5 w-3.5 text-purple-600" /> Próximamente (Voz)
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                onSelectModel(m.provider, m.id)
                                onClose()
                              }}
                              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                                isSelected
                                  ? 'bg-emerald-600 text-white shadow-sm'
                                  : 'bg-[#002777] hover:bg-[#00369d] text-white'
                              }`}
                            >
                              {isSelected ? (
                                <>
                                  <Check className="h-3.5 w-3.5" /> Seleccionado
                                </>
                              ) : (
                                'Usar Modelo'
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {!isLoadingCatalog && filteredFrontier.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-slate-500">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                  <p className="text-sm font-semibold text-slate-700">
                    No se encontraron modelos con los filtros seleccionados.
                  </p>
                  <p className="text-xs mt-1">
                    Prueba cambiando el proveedor o limpiando el campo de búsqueda.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* LOCAL OLLAMA MODELS TAB */}
          {activeTab === 'local' && (
            <div className="space-y-6">
              {/* Ollama Server Connection Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-blue-100 bg-slate-50 p-4">
                <div className="flex items-center gap-3">
                  <Server className="h-5 w-5 text-[#002777] shrink-0" />
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      Estado del Servidor Ollama
                    </h4>
                    <p className="text-xs text-slate-500">
                      Ejecución 100% privada local. Los modelos descargados se empaquetan en tu equipo.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {ollamaOnline === true ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse-soft" />
                      Servidor En Línea ({ollamaInstalledModels.length} instalados)
                    </span>
                  ) : ollamaOnline === false ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-800">
                      <span className="h-2 w-2 rounded-full bg-red-500" />
                      Ollama Desconectado
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400 italic">Verificando…</span>
                  )}

                  <button
                    type="button"
                    onClick={() => void checkOllama()}
                    disabled={isCheckingOllama}
                    className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-100 cursor-pointer"
                    title="Probar conexión"
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${isCheckingOllama ? 'animate-spin' : ''}`}
                    />
                  </button>
                </div>
              </div>

              {/* Download Bar */}
              <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#002777] flex items-center gap-1.5">
                    <Download className="h-4 w-4" /> Descargar Modelo desde Ollama Registry
                  </h4>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={customPullName}
                    onChange={(e) => setCustomPullName(e.target.value)}
                    placeholder="Ej. llama3.2:1b, codellama, phi4, deepseek-r1:8b"
                    className="flex-1 rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs font-mono text-slate-800 placeholder-slate-400 focus:border-[#002777] focus:outline-none"
                    disabled={isPulling}
                  />
                  <button
                    type="button"
                    onClick={() => void handlePullModel()}
                    disabled={isPulling || !customPullName.trim()}
                    className="rounded-xl bg-[#002777] hover:bg-[#00369d] text-white py-2 px-4 text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    {isPulling ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Download className="h-3.5 w-3.5" />
                    )}
                    <span>{isPulling ? 'Descargando…' : 'Descargar'}</span>
                  </button>
                </div>

                {pullStatusMsg && (
                  <div className="rounded-xl bg-blue-100/80 p-2.5 text-xs font-medium text-[#002777] flex items-center gap-2">
                    <RefreshCw
                      className={`h-3.5 w-3.5 shrink-0 ${
                        isPulling ? 'animate-spin' : 'text-emerald-600'
                      }`}
                    />
                    <span>{pullStatusMsg}</span>
                  </div>
                )}
              </div>

              {/* Local Models Grid */}
              <div className="grid gap-4 sm:grid-cols-2">
                {filteredLocal.map((m) => {
                  const isSelected =
                    currentProvider === 'ollama' && currentModel === m.id

                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col justify-between rounded-2xl border p-4 transition-all ${
                        isSelected
                          ? 'border-[#002777] bg-blue-50/50 ring-2 ring-[#002777]/20 shadow-md'
                          : 'border-slate-200 bg-white hover:border-blue-200 hover:shadow-sm'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-700">
                            {m.providerName}
                          </span>
                          {m.isDownloaded ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                              <Check className="h-3 w-3" /> Instalado
                            </span>
                          ) : (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                              Disponible para descargar
                            </span>
                          )}
                        </div>

                        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                          {m.name}
                        </h3>
                        <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                          {m.description}
                        </p>

                        <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50/80 p-2.5 space-y-1.5 text-[11px]">
                          <div className="flex items-center justify-between text-slate-600">
                            <span className="flex items-center gap-1 font-medium text-slate-500">
                              <Gauge className="h-3 w-3 text-amber-600" /> Límites:
                            </span>
                            <span className="font-semibold text-slate-800">
                              {m.rateLimits}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-slate-600">
                            <span className="flex items-center gap-1 font-medium text-slate-500">
                              <Coins className="h-3 w-3 text-emerald-600" /> Costo:
                            </span>
                            <span className="font-semibold text-slate-800">
                              {m.pricingLabel}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[11px] text-slate-500">
                          Contexto: <strong className="text-slate-700">{m.contextWindow}</strong>
                        </span>

                        {m.isDownloaded ? (
                          <button
                            type="button"
                            onClick={() => {
                              onSelectModel('ollama', m.id)
                              onClose()
                            }}
                            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                              isSelected
                                ? 'bg-emerald-600 text-white shadow-sm'
                                : 'bg-[#002777] hover:bg-[#00369d] text-white'
                            }`}
                          >
                            {isSelected ? (
                              <>
                                <Check className="h-3.5 w-3.5" /> Seleccionado
                              </>
                            ) : (
                              'Usar Modelo'
                            )}
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={isPulling}
                            onClick={() => void handlePullModel(m.id)}
                            className="rounded-xl border border-blue-200 bg-white hover:bg-blue-50 text-[#002777] py-1.5 px-3 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Download className="h-3.5 w-3.5" />
                            <span>Descargar</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-slate-100 bg-slate-50 px-6 py-3">
          <div className="text-xs text-slate-500">
            Modelo seleccionado:{' '}
            <strong className="text-slate-800">
              {currentProvider} / {currentModel || 'Por defecto'}
            </strong>
            {catalogUpdatedAt && (
              <span className="ml-2 text-slate-400">
                (Última sincronización: {catalogUpdatedAt})
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
