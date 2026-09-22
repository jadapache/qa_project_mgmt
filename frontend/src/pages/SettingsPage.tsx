import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  AlertCircle,
  Bot,
  Check,
  CheckCircle2,
  Cpu,
  Download,
  Eye,
  EyeOff,
  Globe,
  Key,
  Lock,
  RefreshCw,
  Server,
  Sparkles,
  User,
  Zap,
} from 'lucide-react'
import { api, type AISettings } from '../api/client'
import { DEFAULT_DISPLAY_NAME } from '../constants/app'

type OutletContext = {
  displayName: string
  setDisplayName: (name: string) => void
}

type ProviderInfo = {
  id: string
  name: string
  subtitle: string
  icon: typeof Zap
  badge?: string
  recommendedModels: Array<{ id: string; name: string }>
}

const PROVIDERS: ProviderInfo[] = [
  {
    id: 'groq',
    name: 'Groq',
    subtitle: 'Inferencia ultra veloz en la nube con Llama 3.3 & Mixtral',
    icon: Zap,
    badge: 'Velocidad Máxima',
    recommendedModels: [
      { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile (Recomendado)' },
      { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant (Ultra Rápido)' },
      { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B (Contexto 32k)' },
    ],
  },
  {
    id: 'openai',
    name: 'OpenAI',
    subtitle: 'Modelos GPT-4o y GPT-4o-mini de alto rendimiento',
    icon: Bot,
    recommendedModels: [
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini (Recomendado)' },
      { id: 'gpt-4o', name: 'GPT-4o (Completo)' },
    ],
  },
  {
    id: 'claude',
    name: 'Claude (Anthropic)',
    subtitle: 'Razonamiento estructurado con Claude 3.5 Haiku y Sonnet',
    icon: Sparkles,
    recommendedModels: [
      { id: 'claude-3-5-haiku-latest', name: 'Claude 3.5 Haiku (Recomendado)' },
      { id: 'claude-3-5-sonnet-latest', name: 'Claude 3.5 Sonnet (Razonamiento Avanzado)' },
    ],
  },
  {
    id: 'ollama',
    name: 'Ollama (Modo Local / Offline)',
    subtitle: 'Ejecución 100% privada sin salir de tu equipo',
    icon: Cpu,
    badge: 'Offline / Privado',
    recommendedModels: [
      { id: 'llama3.2', name: 'Llama 3.2' },
      { id: 'qwen2.5', name: 'Qwen 2.5' },
      { id: 'deepseek-r1:8b', name: 'DeepSeek R1 8B' },
      { id: 'mistral', name: 'Mistral 7B' },
    ],
  },
]

export const SettingsPage = () => {
  const { displayName, setDisplayName } = useOutletContext<OutletContext>()
  const [name, setName] = useState(displayName)
  const [ai, setAi] = useState<AISettings | null>(null)
  
  const [provider, setProvider] = useState<string>('groq')
  const [model, setModel] = useState<string>('')
  
  // API Keys & credentials
  const [groqKey, setGroqKey] = useState('')
  const [openaiKey, setOpenaiKey] = useState('')
  const [claudeKey, setClaudeKey] = useState('')
  const [ollamaUrl, setOllamaUrl] = useState('http://127.0.0.1:11434')
  const [showKey, setShowKey] = useState(false)

  // Local Ollama models & pull state
  const [ollamaOnline, setOllamaOnline] = useState<boolean | null>(null)
  const [ollamaModels, setOllamaModels] = useState<string[]>([])
  const [pullModelName, setPullModelName] = useState('')
  const [isPulling, setIsPulling] = useState(false)
  const [pullStatusMsg, setPullStatusMsg] = useState<string | null>(null)
  const [checkingOllama, setCheckingOllama] = useState(false)

  // Rubric & forms feedback
  const [standupRubric, setStandupRubric] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [savingAi, setSavingAi] = useState(false)

  useEffect(() => {
    setName(displayName)
  }, [displayName])

  useEffect(() => {
    const load = async () => {
      try {
        const settings = await api.getAiSettings()
        setAi(settings)
        if (settings.provider) setProvider(settings.provider)
        if (settings.model) setModel(settings.model)
        if (settings.ollama_base_url) setOllamaUrl(settings.ollama_base_url)

        const rubric = await api.getRubric('standup')
        setStandupRubric(((rubric.criteria as string[]) || []).join('\n'))

        if (settings.provider === 'ollama' || settings.ollama_base_url) {
          void checkOllamaStatus(settings.ollama_base_url || 'http://127.0.0.1:11434')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar la configuración')
      }
    }
    void load()
  }, [])

  const checkOllamaStatus = async (url?: string) => {
    setCheckingOllama(true)
    try {
      const res = await api.listOllamaModels(url || ollamaUrl)
      setOllamaOnline(res.online)
      setOllamaModels(res.models || [])
    } catch {
      setOllamaOnline(false)
      setOllamaModels([])
    } finally {
      setCheckingOllama(false)
    }
  }

  const handlePullOllamaModel = async (targetModelName?: string) => {
    const modelToPull = (targetModelName || pullModelName).trim()
    if (!modelToPull) return
    setIsPulling(true)
    setPullStatusMsg(`Descargando modelo "${modelToPull}" desde Ollama Registry…`)
    setError(null)

    try {
      await api.pullOllamaModel(modelToPull, ollamaUrl)
      setPullStatusMsg(`¡Modelo "${modelToPull}" descargado con éxito!`)
      setModel(modelToPull)
      void checkOllamaStatus(ollamaUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : `Error al descargar modelo ${modelToPull}`)
      setPullStatusMsg(null)
    } finally {
      setIsPulling(false)
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
      setError(err instanceof Error ? err.message : 'Error al guardar perfil')
    }
  }

  const handleAiSave = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setMessage(null)
    setSavingAi(true)

    const currentProviderObj = PROVIDERS.find((p) => p.id === provider)
    const effectiveModel = model.trim() || currentProviderObj?.recommendedModels[0]?.id || ''

    const payload: Record<string, string> = {
      provider,
      model: effectiveModel,
      ollama_base_url: ollamaUrl,
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
      setMessage(`Configuración de IA para ${currentProviderObj?.name || provider} guardada exitosamente.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar configuración de IA')
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
      setMessage('Rúbrica de Standup actualizada.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar rúbrica')
    }
  }

  const currentProviderObj = PROVIDERS.find((p) => p.id === provider) || PROVIDERS[0]

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#002777]">Sistema & Preferencias</p>
        </div>
        <h1 className="page-title">Configuración del Sistema</h1>
        <p className="page-subtitle">
          Administra el proveedor de IA, claves API de inferencia, modelos locales de Ollama y parámetros del sistema.
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

      {/* Main Form: AI Provider & Engine */}
      <form onSubmit={(e) => void handleAiSave(e)} className="card space-y-6 border border-[var(--color-border)] p-6 md:p-8">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-[var(--color-border)] pb-4">
          <div>
            <h2 className="text-xl font-bold text-[var(--color-ink)] flex items-center gap-2">
              <Bot className="h-5 w-5 text-[#002777]" />
              Proveedor y Motor de Inteligencia Artificial
            </h2>
            <p className="text-xs text-[var(--color-ink-muted)] mt-1">
              Selecciona el proveedor activo. La interfaz mostrará únicamente las claves y parámetros pertinentes.
            </p>
          </div>
          {ai?.provider ? (
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-[#002777]">
              <span className="h-2 w-2 rounded-full bg-[#004497] animate-pulse-soft" />
              Proveedor Activo: <span className="uppercase">{ai.provider}</span> ({ai.model || 'por defecto'})
            </div>
          ) : null}
        </div>

        {/* Provider Cards Selector */}
        <div className="space-y-3">
          <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-ink-muted)] block">
            1. Seleccionar Proveedor de IA
          </label>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {PROVIDERS.map((p) => {
              const Icon = p.icon
              const isSelected = provider === p.id
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setProvider(p.id)
                    const defaultModel = p.recommendedModels[0]?.id || ''
                    if (!model || !p.recommendedModels.some((m) => m.id === model)) {
                      setModel(defaultModel)
                    }
                    if (p.id === 'ollama') {
                      void checkOllamaStatus()
                    }
                  }}
                  className={[
                    'group relative flex flex-col justify-between rounded-2xl border p-4 text-left transition-all duration-200',
                    isSelected
                      ? 'border-[#004497] bg-blue-50/50 shadow-md ring-2 ring-[#002777]/20'
                      : 'border-[var(--color-border)] bg-white hover:border-blue-200 hover:bg-slate-50/50',
                  ].join(' ')}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${isSelected ? 'bg-[#002777] text-white' : 'bg-slate-100 text-slate-700 group-hover:bg-blue-100 group-hover:text-[#002777]'}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      {p.badge ? (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-[#002777]">
                          {p.badge}
                        </span>
                      ) : null}
                    </div>
                    <h3 className="font-bold text-[#002777] text-base">{p.name}</h3>
                    <p className="mt-1 text-xs text-[var(--color-ink-muted)] leading-relaxed">{p.subtitle}</p>
                  </div>
                  {isSelected ? (
                    <div className="mt-3 flex items-center gap-1 text-xs font-bold text-[#002777]">
                      <Check className="h-4 w-4" /> Seleccionado
                    </div>
                  ) : null}
                </button>
              )
            })}
          </div>
        </div>

        {/* Dynamic Provider Settings Card */}
        <div className="rounded-2xl border border-blue-100 bg-slate-50/60 p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-blue-100 pb-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#002777] flex items-center gap-2">
              <Key className="h-4 w-4" />
              2. Parámetros de {currentProviderObj.name}
            </h3>
          </div>

          {/* Model Selector / Custom Model */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--color-ink)] block">
                Modelo Recomendado
              </label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="input-field text-sm font-medium text-[var(--color-ink)]"
              >
                {currentProviderObj.recommendedModels.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
                {provider === 'ollama' && ollamaModels.length > 0
                  ? ollamaModels.map((m) => (
                      <option key={m} value={m}>
                        {m} (Instalado Localmente)
                      </option>
                    ))
                  : null}
                <option value="custom">-- Escribir otro modelo manualmente --</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--color-ink)] block">
                Identificador del Modelo
              </label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="Ej. llama-3.3-70b-versatile"
                className="input-field font-mono text-xs"
              />
            </div>
          </div>

          {/* Provider Specific Inputs */}

          {/* GROQ */}
          {provider === 'groq' && (
            <div className="space-y-2 rounded-xl bg-white p-4 border border-blue-100 shadow-sm">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#002777] flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5" /> Groq API Key
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
                  placeholder={ai?.groq_api_key_set ? '•••••••••••••••• (Guardada en backend)' : 'gsk_... (Pega tu API Key de Groq)'}
                  className="input-field pr-10 font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-[11px] text-[var(--color-ink-muted)]">
                Obtén tu clave gratuita en <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" className="text-[#004497] underline">console.groq.com</a>.
              </p>
            </div>
          )}

          {/* OPENAI */}
          {provider === 'openai' && (
            <div className="space-y-2 rounded-xl bg-white p-4 border border-blue-100 shadow-sm">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#002777] flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5" /> OpenAI API Key
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
                  placeholder={ai?.openai_api_key_set ? '•••••••••••••••• (Guardada en backend)' : 'sk-proj-... (Pega tu API Key de OpenAI)'}
                  className="input-field pr-10 font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}

          {/* CLAUDE */}
          {provider === 'claude' && (
            <div className="space-y-2 rounded-xl bg-white p-4 border border-blue-100 shadow-sm">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#002777] flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5" /> Anthropic Claude API Key
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
                  placeholder={ai?.claude_api_key_set ? '•••••••••••••••• (Guardada en backend)' : 'sk-ant-... (Pega tu API Key de Anthropic)'}
                  className="input-field pr-10 font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}

          {/* OLLAMA LOCAL ENGINE & MODEL PULL */}
          {provider === 'ollama' && (
            <div className="space-y-5 rounded-xl bg-white p-5 border border-blue-200 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h4 className="font-bold text-[#002777] text-sm flex items-center gap-2">
                    <Server className="h-4 w-4" /> Servidor Local Ollama
                  </h4>
                  <p className="text-xs text-[var(--color-ink-muted)]">
                    Inferencia 100% privada sin enviar datos fuera de tu red.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={ollamaUrl}
                    onChange={(e) => setOllamaUrl(e.target.value)}
                    className="input-field font-mono text-xs w-52"
                    placeholder="http://127.0.0.1:11434"
                  />
                  <button
                    type="button"
                    onClick={() => void checkOllamaStatus()}
                    disabled={checkingOllama}
                    className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1 shrink-0"
                  >
                    {checkingOllama ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Globe className="h-3.5 w-3.5" />}
                    <span>Probar</span>
                  </button>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[var(--color-ink-muted)]">Estado Ollama:</span>
                {ollamaOnline === true ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse-soft" />
                    En línea (Servidor respondiendo)
                  </span>
                ) : ollamaOnline === false ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800">
                    <span className="h-2 w-2 rounded-full bg-red-500" />
                    Desconectado (Inicia Ollama en tu equipo)
                  </span>
                ) : (
                  <span className="text-xs text-slate-400 italic">Verificando conexión…</span>
                )}
              </div>

              {/* Local Download & Pull Section */}
              <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-[#002777] flex items-center gap-1.5">
                    <Download className="h-4 w-4 text-[#004497]" /> Descargar / Pull de Modelo Local
                  </h5>
                  <span className="text-[11px] text-[var(--color-ink-muted)]">Ollama Registry</span>
                </div>

                <p className="text-xs text-[var(--color-ink-muted)] leading-relaxed">
                  Descarga y empaqueta modelos directamente desde el registro de Ollama a tu equipo:
                </p>

                {/* Quick Model Download Chips */}
                <div className="flex flex-wrap gap-2">
                  {[
                    { name: 'llama3.2', label: 'Llama 3.2 (3B)' },
                    { name: 'qwen2.5', label: 'Qwen 2.5 (7B)' },
                    { name: 'deepseek-r1:8b', label: 'DeepSeek R1 (8B)' },
                    { name: 'mistral', label: 'Mistral (7B)' },
                  ].map((m) => (
                    <button
                      key={m.name}
                      type="button"
                      disabled={isPulling}
                      onClick={() => void handlePullOllamaModel(m.name)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-2.5 py-1 text-xs font-medium text-[#002777] shadow-sm transition hover:bg-blue-100 hover:border-[#004497]"
                    >
                      <Download className="h-3 w-3 text-[#004497]" />
                      <span>{m.label}</span>
                    </button>
                  ))}
                </div>

                {/* Custom Model Pull Input */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={pullModelName}
                    onChange={(e) => setPullModelName(e.target.value)}
                    placeholder="Escribe nombre de modelo (ej. llama3.2:1b, codellama, phi4)"
                    className="input-field font-mono text-xs flex-1"
                    disabled={isPulling}
                  />
                  <button
                    type="button"
                    onClick={() => void handlePullOllamaModel()}
                    disabled={isPulling || !pullModelName.trim()}
                    className="btn-primary text-xs py-2 px-4 shrink-0 flex items-center gap-1.5"
                  >
                    {isPulling ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                    <span>{isPulling ? 'Descargando…' : 'Descargar Modelo'}</span>
                  </button>
                </div>

                {pullStatusMsg ? (
                  <div className="rounded-lg bg-blue-100/70 p-2.5 text-xs font-medium text-[#002777] flex items-center gap-2">
                    <RefreshCw className={`h-3.5 w-3.5 shrink-0 ${isPulling ? 'animate-spin text-[#004497]' : 'text-emerald-600'}`} />
                    <span>{pullStatusMsg}</span>
                  </div>
                ) : null}
              </div>

              {/* Models Installed List */}
              {ollamaModels.length > 0 ? (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <p className="text-xs font-bold text-[#002777]">
                    Modelos Locales Instalados ({ollamaModels.length}):
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {ollamaModels.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setModel(m)}
                        className={`rounded-lg px-2.5 py-1 text-xs font-mono transition ${
                          model === m
                            ? 'bg-[#002777] text-white font-bold shadow-sm'
                            : 'bg-slate-100 text-slate-700 hover:bg-blue-100 hover:text-[#002777]'
                        }`}
                      >
                        {m} {model === m ? '✓' : ''}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="flex justify-end pt-2 border-t border-[var(--color-border)]">
          <button
            type="submit"
            disabled={savingAi}
            className="btn-primary py-2.5 px-6 font-semibold flex items-center gap-2"
          >
            {savingAi ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            <span>Guardar Configuración de IA</span>
          </button>
        </div>
      </form>

      {/* User Profile Form */}
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
        <button type="submit" className="btn-secondary text-xs py-2 px-4">
          Guardar Perfil
        </button>
      </form>

      {/* Rubric Form */}
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
        <button type="submit" className="btn-secondary text-xs py-2 px-4">
          Guardar Rúbrica
        </button>
      </form>
    </div>
  )
}
