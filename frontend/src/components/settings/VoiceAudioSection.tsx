import type { FormEvent } from 'react'
import { Check, ChevronDown, ChevronUp, Coins, Cpu, Gauge, Mic, RefreshCw, Sparkles } from 'lucide-react'
import type { ModelCatalogItem } from '../../api/client'

export type VoiceAudioSectionProps = {
  voiceAudioProvider: string
  setVoiceAudioProvider: (p: string) => void
  voiceAudioModel: string
  setVoiceAudioModel: (m: string) => void
  isVoiceAudioOpen: boolean
  setIsVoiceAudioOpen: (open: boolean) => void
  catalogModels: ModelCatalogItem[]
  savingAi: boolean
  handleVoiceAudioSave: (e?: FormEvent) => Promise<void>
}

export const VoiceAudioSection = ({
  voiceAudioProvider,
  setVoiceAudioProvider,
  voiceAudioModel,
  setVoiceAudioModel,
  isVoiceAudioOpen,
  setIsVoiceAudioOpen,
  catalogModels,
  savingAi,
  handleVoiceAudioSave,
}: VoiceAudioSectionProps) => {
  const selectedModelInfo = catalogModels.find(
    (m) => m.provider === voiceAudioProvider && m.id === voiceAudioModel,
  )
  const isGroq = voiceAudioProvider === 'groq'

  return (
    <div className="card space-y-6 border border-slate-200 bg-white p-6 md:p-8 shadow-sm rounded-2xl transition-all">
      <div
        onClick={() => setIsVoiceAudioOpen(!isVoiceAudioOpen)}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 cursor-pointer select-none"
      >
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
            <Mic className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Modelo de Transcripción y Comandos de Voz</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Configura el modelo de inteligencia artificial para la transcripción de notas de voz, audios y ejecución de comandos por voz.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
          {!isVoiceAudioOpen && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              Activo: <span className="font-mono text-[11px] text-blue-700 font-bold">{voiceAudioProvider} • {voiceAudioModel}</span>
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
          {/* Selectores de Proveedor y Modelo de Voz y Transcripción */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-800 block">
                Proveedor de Voz y Transcripción
              </label>
              <select
                value={voiceAudioProvider}
                onChange={(e) => {
                  const newP = e.target.value
                  setVoiceAudioProvider(newP)
                  if (newP === 'groq') {
                    setVoiceAudioModel('whisper-large-v3')
                  } else if (newP === 'openai') {
                    setVoiceAudioModel('whisper-1')
                  }
                }}
                className="input-field text-sm font-medium text-slate-900 border border-slate-300 rounded-xl"
              >
                <option value="groq">Groq Cloud (Whisper LPU Ultrarrápido - Free Tier)</option>
                <option value="openai">OpenAI API (Whisper Oficial - Alta Calidad)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-800 block">
                Modelo Activo
              </label>
              <select
                value={voiceAudioModel}
                onChange={(e) => setVoiceAudioModel(e.target.value)}
                className="input-field text-sm font-medium text-slate-900 border border-slate-300 rounded-xl"
              >
                {voiceAudioProvider === 'groq' ? (
                  <>
                    <option value="whisper-large-v3">Whisper Large v3 (Recomendado / Máxima Precisión)</option>
                    <option value="whisper-large-v3-turbo">Whisper Large v3 Turbo (Velocidad Extrema)</option>
                  </>
                ) : (
                  <option value="whisper-1">Whisper 1 (OpenAI Cloud Audio API)</option>
                )}
              </select>
            </div>
          </div>

          {/* Resumen del modelo de voz y transcripción seleccionado */}
          <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 space-y-2 text-xs">
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
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-bold text-blue-800">
                  <Coins className="h-3 w-3" /> De Pago ($0.006 / min)
                </span>
              )}
            </div>
            <div className="grid gap-2 sm:grid-cols-3 text-[11px] pt-1">
              <div>
                <span className="text-slate-500 block flex items-center gap-1">
                  <Gauge className="h-3 w-3 text-blue-600" /> Límites de uso:
                </span>
                <span className="font-medium text-slate-800">
                  {isGroq ? '30 RPM • 14,400 RPD' : 'Tier 1: 500 RPM • 50 RPD'}
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
                  <Cpu className="h-3 w-3 text-blue-600" /> Tarea asignada:
                </span>
                <span className="font-medium text-slate-800">Transcripción y Comandos de Voz</span>
              </div>
            </div>
          </div>

          {/* Botón Guardar Modelo de Transcripción y Comandos de Voz */}
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => void handleVoiceAudioSave()}
              disabled={savingAi}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2.5 rounded-xl shadow-sm transition flex items-center gap-2 cursor-pointer text-sm"
            >
              {savingAi ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              <span>Guardar Modelo de Voz y Transcripción</span>
            </button>
          </div>
        </>
      )}
    </div>
  )
}
