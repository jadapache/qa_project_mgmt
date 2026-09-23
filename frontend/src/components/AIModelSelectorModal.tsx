import { useEffect, useState } from 'react'
import {
  Bot,
  Check,
  Cpu,
  Download,
  Lock,
  RefreshCw,
  Search,
  Server,
  X,
  Zap,
} from 'lucide-react'
import { api, type AISettings } from '../api/client'

export type ModelOption = {
  id: string
  name: string
  provider: 'groq' | 'openai' | 'claude' | 'ollama'
  providerName: string
  description: string
  contextWindow: string
  badge?: string
  isLocal?: boolean
  isDownloaded?: boolean
}

const FRONTIER_MODELS: ModelOption[] = [
  // Groq
  {
    id: 'llama-3.3-70b-versatile',
    name: 'Llama 3.3 70B Versatile',
    provider: 'groq',
    providerName: 'Groq Cloud',
    description: 'Inferencia ultra veloz en la nube con razonamiento de clase mundial.',
    contextWindow: '128k tokens',
    badge: 'Recomendado / Ultra Veloz',
  },
  {
    id: 'llama-3.1-8b-instant',
    name: 'Llama 3.1 8B Instant',
    provider: 'groq',
    providerName: 'Groq Cloud',
    description: 'Respuestas en milisegundos ideal para análisis rápidos y resúmenes.',
    contextWindow: '128k tokens',
    badge: 'Máxima Velocidad',
  },
  {
    id: 'mixtral-8x7b-32768',
    name: 'Mixtral 8x7B MoE',
    provider: 'groq',
    providerName: 'Groq Cloud',
    description: 'Arquitectura de mezcla de expertos eficiente y precisa.',
    contextWindow: '32k tokens',
  },
  // OpenAI
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    providerName: 'OpenAI API',
    description: 'Modelo ligero, económico y altamente inteligente para QA y análisis.',
    contextWindow: '128k tokens',
    badge: 'Recomendado OpenAI',
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    providerName: 'OpenAI API',
    description: 'Modelo omni insignia de alto rendimiento multimodal y razonamiento complejo.',
    contextWindow: '128k tokens',
    badge: 'Frontera Completa',
  },
  // Claude
  {
    id: 'claude-3-5-haiku-latest',
    name: 'Claude 3.5 Haiku',
    provider: 'claude',
    providerName: 'Anthropic Claude',
    description: 'Modelo de respuesta rápida con comprensión profunda de código y lenguaje.',
    contextWindow: '200k tokens',
    badge: 'Recomendado Anthropic',
  },
  {
    id: 'claude-3-5-sonnet-latest',
    name: 'Claude 3.5 Sonnet',
    provider: 'claude',
    providerName: 'Anthropic Claude',
    description: 'Líder de la industria en generación de código, PRDs y análisis de arquitectura.',
    contextWindow: '200k tokens',
    badge: 'Razonamiento Avanzado',
  },
]

const LOCAL_PRESET_MODELS: ModelOption[] = [
  {
    id: 'llama3.2',
    name: 'Llama 3.2 (3B)',
    provider: 'ollama',
    providerName: 'Ollama Local',
    description: 'Modelo ligero óptimo para laptops y GPUs integradas (2GB+ VRAM).',
    contextWindow: '128k tokens',
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

  // Ollama local state
  const [ollamaUrl, setOllamaUrl] = useState('http://127.0.0.1:11434')
  const [ollamaOnline, setOllamaOnline] = useState<boolean | null>(null)
  const [ollamaInstalledModels, setOllamaInstalledModels] = useState<string[]>([])
  const [isCheckingOllama, setIsCheckingOllama] = useState(false)
  const [customPullName, setCustomPullName] = useState('')
  const [isPulling, setIsPulling] = useState(false)
  const [pullStatusMsg, setPullStatusMsg] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && aiSettings?.ollama_base_url) {
      setOllamaUrl(aiSettings.ollama_base_url)
      void checkOllama()
    }
  }, [isOpen, aiSettings])

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

  // Filter frontier models
  const filteredFrontier = FRONTIER_MODELS.filter((m) => {
    const matchSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.providerName.toLowerCase().includes(searchQuery.toLowerCase())
    const matchProvider = selectedProviderFilter === 'all' || m.provider === selectedProviderFilter
    return matchSearch && matchProvider
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
        isLocal: true,
        isDownloaded: true,
      })),
  ]

  const filteredLocal = allLocalModels.filter((m) =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.description.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const isKeyConfigured = (prov: string) => {
    if (prov === 'groq') return aiSettings?.groq_api_key_set
    if (prov === 'openai') return aiSettings?.openai_api_key_set
    if (prov === 'claude') return aiSettings?.claude_api_key_set
    return true
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#002777] text-white shadow-md">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Catálogo de Modelos de Inteligencia Artificial</h2>
              <p className="text-xs text-slate-500">
                Selecciona modelos de frontera en la nube (API REST) o ejecuta modelos 100% locales con Ollama.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
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
              Modelos de Frontera (API REST)
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

          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar modelo o proveedor…"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:border-[#002777] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#002777]/20"
            />
          </div>
        </div>

        {/* Modal Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* FRONTIER MODELS TAB */}
          {activeTab === 'frontier' && (
            <div className="space-y-4">
              {/* Provider Quick Filters */}
              <div className="flex items-center gap-2 pb-1">
                <span className="text-xs font-semibold text-slate-500">Filtrar por proveedor:</span>
                {[
                  { id: 'all', label: 'Todos' },
                  { id: 'groq', label: 'Groq Cloud' },
                  { id: 'openai', label: 'OpenAI' },
                  { id: 'claude', label: 'Anthropic Claude' },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setSelectedProviderFilter(f.id)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                      selectedProviderFilter === f.id
                        ? 'bg-blue-100 text-[#002777] font-semibold border border-blue-200'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Models Grid */}
              <div className="grid gap-4 sm:grid-cols-2">
                {filteredFrontier.map((m) => {
                  const isSelected = currentProvider === m.provider && currentModel === m.id
                  const keyOk = isKeyConfigured(m.provider)

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
                          {m.badge && (
                            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-[#002777]">
                              {m.badge}
                            </span>
                          )}
                        </div>

                        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                          {m.name}
                        </h3>
                        <p className="mt-1 text-xs text-slate-600 leading-relaxed">{m.description}</p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-[11px] text-slate-500">
                          <span>Contexto: <strong className="text-slate-700">{m.contextWindow}</strong></span>
                          {!keyOk && (
                            <span className="inline-flex items-center gap-1 text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.5 rounded">
                              <Lock className="h-3 w-3" /> Requiere Key
                            </span>
                          )}
                        </div>

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
                      </div>
                    </div>
                  )
                })}
              </div>
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
                    <h4 className="text-sm font-bold text-slate-900">Estado del Servidor Ollama</h4>
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
                    className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-100"
                    title="Probar conexión"
                  >
                    <RefreshCw className={`h-4 w-4 ${isCheckingOllama ? 'animate-spin' : ''}`} />
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
                    className="rounded-xl bg-[#002777] hover:bg-[#00369d] text-white py-2 px-4 text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isPulling ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                    <span>{isPulling ? 'Descargando…' : 'Descargar'}</span>
                  </button>
                </div>

                {pullStatusMsg && (
                  <div className="rounded-xl bg-blue-100/80 p-2.5 text-xs font-medium text-[#002777] flex items-center gap-2">
                    <RefreshCw className={`h-3.5 w-3.5 shrink-0 ${isPulling ? 'animate-spin' : 'text-emerald-600'}`} />
                    <span>{pullStatusMsg}</span>
                  </div>
                )}
              </div>

              {/* Local Models Grid */}
              <div className="grid gap-4 sm:grid-cols-2">
                {filteredLocal.map((m) => {
                  const isSelected = currentProvider === 'ollama' && currentModel === m.id

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
                        <p className="mt-1 text-xs text-slate-600 leading-relaxed">{m.description}</p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[11px] text-slate-500">Contexto: <strong className="text-slate-700">{m.contextWindow}</strong></span>

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
                            className="rounded-xl border border-blue-200 bg-white hover:bg-blue-50 text-[#002777] py-1.5 px-3 text-xs font-bold flex items-center gap-1.5 transition-colors"
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
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-3">
          <div className="text-xs text-slate-500">
            Modelo seleccionado: <strong className="text-slate-800">{currentProvider} / {currentModel || 'Por defecto'}</strong>
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
