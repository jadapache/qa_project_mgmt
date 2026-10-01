import type { FormEvent } from 'react'
import {
  Check,
  ChevronDown,
  ChevronUp,
  Coins,
  Cpu,
  Eye,
  EyeOff,
  Gauge,
  Lock,
  Mic,
  RefreshCw,
  Sparkles,
} from 'lucide-react'
import type { AISettings, ModelCatalogItem } from '../../api/client'
import { BUILT_IN_WHISPER_MODELS } from './constants'

export type VoiceAudioSectionProps = {
  ai: AISettings | null
  voiceAudioProvider: string
  setVoiceAudioProvider: (p: string) => void
  voiceAudioModel: string
  setVoiceAudioModel: (m: string) => void
  isVoiceAudioOpen: boolean
  setIsVoiceAudioOpen: (open: boolean) => void
  catalogModels: ModelCatalogItem[]
  transcriptionGroqKey: string
  setTranscriptionGroqKey: (k: string) => void
  transcriptionOpenaiKey: string
  setTranscriptionOpenaiKey: (k: string) => void
  showTranscriptionKey: boolean
  setShowTranscriptionKey: (show: boolean) => void
  savingAi: boolean
  handleVoiceAudioSave: (e?: FormEvent) => Promise<void>
}

export const VoiceAudioSection = ({
  ai,
  voiceAudioProvider,
  setVoiceAudioProvider,
  voiceAudioModel,
  setVoiceAudioModel,
  isVoiceAudioOpen,
  setIsVoiceAudioOpen,
  catalogModels,
  transcriptionGroqKey,
  setTranscriptionGroqKey,
  transcriptionOpenaiKey,
  setTranscriptionOpenaiKey,
  showTranscriptionKey,
  setShowTranscriptionKey,
  savingAi,
  handleVoiceAudioSave,
}: VoiceAudioSectionProps) => {
  const isGroq = voiceAudioProvider === 'groq'
  const isOpenAI = voiceAudioProvider === 'openai'
  const isBuiltIn = voiceAudioProvider === 'builtin' || voiceAudioProvider === 'local'

  const selectedModelInfo = catalogModels.find(
    (m) => m.provider === voiceAudioProvider && m.id === voiceAudioModel,
  )

  const isGroqKeyConfigured = Boolean(ai?.transcription_groq_api_key_set || ai?.groq_api_key_set)
  const isOpenaiKeyConfigured = Boolean(ai?.transcription_openai_api_key_set || ai?.openai_api_key_set)

  return (
    <div className="card space-y-6 border border-slate-200 bg-white p-6 md:p-8 shadow-xs rounded-2xl transition-all">
      <div
        onClick={() => setIsVoiceAudioOpen(!isVoiceAudioOpen)}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 cursor-pointer select-none"
      >
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-blue-100 text-[#002777]">
            <Mic className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Modelo de Transcripción y Comandos de Voz</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Configura el motor Whisper (Local o en la Nube) y sus credenciales de API para procesar grabaciones y audio.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
          {!isVoiceAudioOpen && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              Activo: <span className="font-mono text-[11px] text-[#002777] font-bold">{voiceAudioProvider} • {voiceAudioModel}</span>
            </span>
          )}
          <div
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
            title={isVoiceAudioOpen ? 'Plegar panel' : 'Desplegar panel'}
          >
            {isVoiceAudioOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </div>
        </div>
      </div>

      {isVoiceAudioOpen && (
        <>
          {/* Selectores de Proveedor y Tipo de Motor */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-800 block">
              Proveedor del Motor de Transcripción
            </label>
            <select
              value={voiceAudioProvider}
              onChange={(e) => {
                const newP = e.target.value
                setVoiceAudioProvider(newP)
                if (newP === 'builtin' || newP === 'local') {
                  setVoiceAudioModel('base')
                } else if (newP === 'groq') {
                  setVoiceAudioModel('whisper-large-v3')
                } else if (newP === 'openai') {
                  setVoiceAudioModel('whisper-1')
                }
              }}
              className="input-field text-sm font-medium text-slate-900 w-full bg-white border border-slate-300 rounded-xl py-2.5 px-3"
            >
              <option value="builtin">Whisper Integrado (Local / Sin costo por token)</option>
              <option value="groq">Groq Cloud (Whisper LPU Ultrarrápido - Free Tier)</option>
              <option value="openai">OpenAI API (Whisper Oficial Cloud)</option>
            </select>
          </div>

          {/* CASO 1: WHISPER LOCAL INTEGRADO */}
          {isBuiltIn && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-[#002777]">
                <Cpu className="h-4 w-4 shrink-0 text-[#002777]" />
                <span className="font-medium">
                  El procesamiento local ejecuta Whisper directamente en tu equipo sin enviar datos de audio a servidores externos.
                </span>
              </div>

              <div className="space-y-3">
                {BUILT_IN_WHISPER_MODELS.map((m) => {
                  const isSelected = voiceAudioModel === m.id || voiceAudioModel === `whisper-${m.id}`

                  return (
                    <div
                      key={m.id}
                      onClick={() => setVoiceAudioModel(m.id)}
                      className={[
                        'flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl transition-all cursor-pointer',
                        isSelected
                          ? 'border-2 border-[#002777] bg-blue-50/20 shadow-xs'
                          : 'border border-slate-200 bg-white hover:border-slate-300',
                      ].join(' ')}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h5 className="font-bold text-slate-900 text-base">{m.name}</h5>
                          {isSelected && (
                            <span className="rounded-md bg-blue-100 px-2 py-0.5 text-xs font-semibold text-[#002777]">
                              Seleccionado
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
                          {m.description}
                        </p>
                        <p className="text-xs text-slate-400 font-medium pt-0.5">
                          Tamaño: {m.size} • Precisión: {m.accuracy}
                        </p>
                      </div>

                      <div className="shrink-0 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setVoiceAudioModel(m.id)}
                          className={[
                            'px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer',
                            isSelected
                              ? 'bg-[#002777] text-white font-bold'
                              : 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-700',
                          ].join(' ')}
                        >
                          {isSelected ? 'Activo' : 'Seleccionar'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* CASO 2 & 3: PROVEEDORES CLOUD (GROQ / OPENAI) */}
          {(isGroq || isOpenAI) && (
            <div className="space-y-5 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-800 block">
                  Modelo en la Nube
                </label>
                <select
                  value={voiceAudioModel}
                  onChange={(e) => setVoiceAudioModel(e.target.value)}
                  className="input-field text-sm font-medium text-slate-900 border border-slate-300 rounded-xl"
                >
                  {isGroq ? (
                    <>
                      <option value="whisper-large-v3">Whisper Large v3 (Recomendado / Máxima Precisión)</option>
                      <option value="whisper-large-v3-turbo">Whisper Large v3 Turbo (Velocidad Extrema)</option>
                    </>
                  ) : (
                    <option value="whisper-1">Whisper 1 (OpenAI Cloud Audio API)</option>
                  )}
                </select>
              </div>

              {/* Resumen del modelo de voz seleccionado */}
              <div className="rounded-xl border border-blue-100 bg-slate-50/60 p-4 space-y-2 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-100 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">
                      {selectedModelInfo?.name || (isGroq ? 'Whisper Large v3 (Groq)' : 'Whisper 1 (OpenAI)')}
                    </span>
                    <code className="text-[11px] font-mono text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {voiceAudioModel}
                    </code>
                  </div>
                  {isGroq ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                      <Sparkles className="h-3 w-3" /> Gratuito (Free Tier)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-bold text-[#002777]">
                      <Coins className="h-3 w-3" /> De Pago ($0.006 / min)
                    </span>
                  )}
                </div>

                <div className="grid gap-2 sm:grid-cols-3 text-[11px] pt-1">
                  <div>
                    <span className="text-slate-500 block flex items-center gap-1">
                      <Gauge className="h-3 w-3 text-[#002777]" /> Límites de uso:
                    </span>
                    <span className="font-medium text-slate-800">
                      {isGroq ? '30 RPM • 14,400 RPD' : 'Tier 1: 500 RPM'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block flex items-center gap-1">
                      <Coins className="h-3 w-3 text-emerald-600" /> Costo estimado:
                    </span>
                    <span className="font-medium text-slate-800">
                      {isGroq ? '$0.00 (Incluido en Free Tier)' : '$0.006 por minuto de audio'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block flex items-center gap-1">
                      <Cpu className="h-3 w-3 text-[#002777]" /> Tarea asignada:
                    </span>
                    <span className="font-medium text-slate-800">Transcripción y Análisis de Reuniones</span>
                  </div>
                </div>
              </div>

              {/* API Key Específica para Transcripción */}
              {isGroq && (
                <div className="space-y-2 rounded-xl bg-slate-50 p-4 border border-slate-200">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Lock className="h-3.5 w-3.5" /> Clave de API de Groq para Transcripción
                    </label>
                    {isGroqKeyConfigured ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                        <Check className="h-3 w-3" /> Clave configurada
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        Sin clave configurada
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={showTranscriptionKey ? 'text' : 'password'}
                      value={transcriptionGroqKey}
                      onChange={(e) => setTranscriptionGroqKey(e.target.value)}
                      placeholder={
                        isGroqKeyConfigured
                          ? '••••••••••••••••'
                          : 'gsk_... (Ingresa tu clave de Groq para transcripción)'
                      }
                      className="input-field pr-10 font-mono text-xs border border-slate-300 rounded-xl"
                    />
                    <button
                      type="button"
                      onClick={() => setShowTranscriptionKey(!showTranscriptionKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showTranscriptionKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Opcional: Si lo dejas vacío, se usará automáticamente la clave de Groq configurada en el Modelo de Redacción.
                  </p>
                </div>
              )}

              {isOpenAI && (
                <div className="space-y-2 rounded-xl bg-slate-50 p-4 border border-slate-200">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Lock className="h-3.5 w-3.5" /> Clave de API de OpenAI para Transcripción
                    </label>
                    {isOpenaiKeyConfigured ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                        <Check className="h-3 w-3" /> Clave configurada
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        Sin clave configurada
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={showTranscriptionKey ? 'text' : 'password'}
                      value={transcriptionOpenaiKey}
                      onChange={(e) => setTranscriptionOpenaiKey(e.target.value)}
                      placeholder={
                        isOpenaiKeyConfigured
                          ? '••••••••••••••••'
                          : 'sk-proj-... (Ingresa tu clave de OpenAI para transcripción)'
                      }
                      className="input-field pr-10 font-mono text-xs border border-slate-300 rounded-xl"
                    />
                    <button
                      type="button"
                      onClick={() => setShowTranscriptionKey(!showTranscriptionKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showTranscriptionKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Opcional: Si lo dejas vacío, se usará automáticamente la clave de OpenAI configurada en el Modelo de Redacción.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Botón Guardar Modelo de Transcripción */}
          <div className="flex justify-end pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => void handleVoiceAudioSave()}
              disabled={savingAi}
              className="bg-[#002777] hover:bg-[#001e5c] text-white font-medium px-5 py-2.5 rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer text-xs"
            >
              {savingAi ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              <span>Guardar Configuración de Transcripción</span>
            </button>
          </div>
        </>
      )}
    </div>
  )
}
