import { useState } from 'react'
import {
  Upload,
  X,
  FileAudio,
  FileVideo,
  Settings2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import type { MediaMetadata, TranscribeOptions } from '../../api/client'

export interface UploadStepProps {
  onUploadAndStart: (file: File, metadata: MediaMetadata, options: TranscribeOptions) => Promise<void>
  isUploading: boolean
  isTranscribing: boolean
  errorMessage?: string | null
}

const SUPPORTED_EXTS = ['.mp3', '.wav', '.m4a', '.ogg', '.flac', '.wma', '.aac', '.mp4', '.webm', '.mkv', '.avi', '.mov']

export const UploadStep = ({
  onUploadAndStart,
  isUploading,
  isTranscribing,
  errorMessage,
}: UploadStepProps) => {
  const [file, setFile] = useState<File | null>(null)
  const [metadata, setMetadata] = useState<MediaMetadata>({ title: '', description: '' })
  const [dragActive, setDragActive] = useState(false)
  const [showOptions, setShowOptions] = useState(false)
  const [options, setOptions] = useState<TranscribeOptions>({
    mode: 'auto',
    language: 'es',
    enable_diarization: true,
  })
  const [validationError, setValidationError] = useState<string | null>(null)

  const validateAndSetFile = (selectedFile: File) => {
    setValidationError(null)
    const nameLower = selectedFile.name.toLowerCase()
    const hasValidExt = SUPPORTED_EXTS.some((ext) => nameLower.endsWith(ext))

    if (!hasValidExt) {
      setValidationError(`Formato no compatible. Por favor sube un archivo de audio o video (${SUPPORTED_EXTS.join(', ')}).`)
      return
    }

    if (selectedFile.size > 2 * 1024 * 1024 * 1024) {
      setValidationError('El archivo supera el límite máximo permitido de 2GB.')
      return
    }

    setFile(selectedFile)
    if (!metadata.title) {
      // Pre-fill title from filename without extension
      const baseName = selectedFile.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ')
      setMetadata((prev) => ({
        ...prev,
        title: baseName.charAt(0).toUpperCase() + baseName.slice(1),
      }))
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0])
    }
  }

  const handleSubmit = async () => {
    if (!file || !metadata.title.trim()) return
    await onUploadAndStart(file, metadata, options)
  }

  const isVideo = file?.type.startsWith('video/') || (file && /\.(mp4|webm|mkv|avi|mov)$/i.test(file.name))

  return (
    <div className="space-y-6">
      <div className="text-center max-w-xl mx-auto">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
          Cargar Grabación de Reunión
        </h2>
        <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
          Sube la grabación en video o audio de tu sesión de levantamiento o kickoff. La IA transcribirá, identificará interlocutores y estructurará el resumen ejecutivo automáticamente.
        </p>
      </div>

      {(errorMessage || validationError) && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-3 text-red-700 text-sm">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <span>{errorMessage || validationError}</span>
        </div>
      )}

      {/* Drag & Drop Zone */}
      <div
        className={`relative border-2 border-dashed rounded-2xl p-8 md:p-12 text-center transition-all duration-200 ${
          dragActive
            ? 'border-[#004497] bg-blue-50/70 shadow-inner'
            : file
              ? 'border-blue-200 bg-blue-50/20'
              : 'border-slate-300 hover:border-[#004497]/60 bg-white/70 shadow-sm'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {file ? (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-white border border-blue-100 shadow-md">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#002777] to-[#004497] text-white shadow-md">
                {isVideo ? <FileVideo className="h-6 w-6" /> : <FileAudio className="h-6 w-6" />}
              </div>
              <div className="text-left">
                <p className="font-semibold text-slate-900 truncate max-w-xs md:max-w-md" title={file.name}>
                  {file.name}
                </p>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                  <span className="font-medium text-[#002777]">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </span>
                  <span>•</span>
                  <span className="uppercase">{file.name.split('.').pop()}</span>
                  <span>•</span>
                  <span className="text-emerald-600 font-medium flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Listo para procesar
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setFile(null)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 transition border border-red-100 flex items-center gap-1.5"
            >
              <X className="h-4 w-4" /> Cambiar archivo
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-blue-50 text-[#002777] shadow-inner ring-1 ring-blue-100">
              <Upload className="h-8 w-8 animate-pulse-soft" />
            </div>
            <div>
              <p className="text-base font-semibold text-slate-800">
                Arrastra tu grabación aquí o{' '}
                <label className="text-[#004497] cursor-pointer hover:underline font-bold">
                  explora en tu equipo
                  <input
                    type="file"
                    className="hidden"
                    accept="audio/*,video/*,.mp3,.wav,.m4a,.ogg,.flac,.wma,.aac,.mp4,.webm,.mkv,.avi,.mov"
                    onChange={(e) => {
                      if (e.target.files?.[0]) validateAndSetFile(e.target.files[0])
                    }}
                  />
                </label>
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Formatos soportados: MP3, WAV, M4A, MP4, WebM, MKV, OGG, FLAC (Hasta 2GB)
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Metadata Form */}
      {file && (
        <div className="card p-6 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-[#002777]">
            Metadatos de la Sesión
          </h3>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Título de la Reunión <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={metadata.title}
              onChange={(e) => setMetadata({ ...metadata, title: e.target.value })}
              placeholder="ej. Kickoff - Módulo de Auditoría y Reportes QA"
              className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-[#002777] focus:border-[#002777] transition"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Descripción o Contexto Adicional (opcional)
            </label>
            <textarea
              value={metadata.description}
              onChange={(e) => setMetadata({ ...metadata, description: e.target.value })}
              placeholder="Objetivos de la sesión, facilitador, proyectos relacionados..."
              rows={2}
              className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-[#002777] focus:border-[#002777] transition resize-none"
            />
          </div>

          {/* Advanced Transcription Options */}
          <div className="pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowOptions(!showOptions)}
              className="flex items-center gap-1.5 text-xs font-semibold text-[#004497] hover:underline"
            >
              <Settings2 className="h-3.5 w-3.5" />
              {showOptions ? 'Ocultar opciones avanzadas' : 'Configurar motor y diarización'}
            </button>

            {showOptions && (
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Modo de Transcripción</label>
                  <select
                    value={options.mode || 'auto'}
                    onChange={(e) => setOptions({ ...options, mode: e.target.value as any })}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                  >
                    <option value="auto">Auto (Groq / Nube)</option>
                    <option value="local">Local (Whisper)</option>
                    <option value="groq">Groq Cloud (Rápido)</option>
                    <option value="openai">OpenAI Whisper</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Idioma de Audio</label>
                  <select
                    value={options.language || 'es'}
                    onChange={(e) => setOptions({ ...options, language: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                  >
                    <option value="es">Español</option>
                    <option value="en">Inglés</option>
                    <option value="">Auto-detectar</option>
                  </select>
                </div>

                <div className="flex items-center pt-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={options.enable_diarization !== false}
                      onChange={(e) => setOptions({ ...options, enable_diarization: e.target.checked })}
                      className="h-4 w-4 rounded text-[#002777] border-slate-300"
                    />
                    <span className="font-medium text-slate-700">Diarización de hablantes</span>
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Submit */}
      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!file || !metadata.title.trim() || isUploading || isTranscribing}
          className="btn-primary px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isUploading ? (
            <>
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Subiendo archivo...</span>
            </>
          ) : isTranscribing ? (
            <>
              <Sparkles className="h-4 w-4 animate-spin" />
              <span>Iniciando transcripción...</span>
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              <span>Subir y Transcribir →</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
