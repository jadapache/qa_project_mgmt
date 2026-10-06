import { open } from '@tauri-apps/plugin-dialog'
import { listen, UnlistenFn } from '@tauri-apps/api/event'
import { invoke } from '@tauri-apps/api/core'

export interface TranscriptionProgress {
  percentage: number
  status: string
  current_time_sec: number
}

export interface TranscriptionSegment {
  start: number
  end: number
  text: string
}

export interface TranscriptionResult {
  text: string
  duration_sec: number
  segments: TranscriptionSegment[]
  language: string
}

export const isTauriAvailable = (): boolean => {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

export const pickMediaFile = async (): Promise<string | null> => {
  if (!isTauriAvailable()) {
    throw new Error('La selección nativa de archivos solo está disponible en la app Desktop (Tauri).')
  }

  const selected = await open({
    multiple: false,
    filters: [
      {
        name: 'Audio / Video',
        extensions: ['mp3', 'wav', 'm4a', 'aac', 'ogg', 'mp4', 'mkv', 'avi', 'webm', 'mov'],
      },
    ],
  })

  return typeof selected === 'string' ? selected : null
}

export const transcribeMedia = async (
  filePath: string,
  onProgress?: (progress: TranscriptionProgress) => void,
  language?: string
): Promise<TranscriptionResult> => {
  if (!isTauriAvailable()) {
    // Fallback Mock para navegadores Web en desarrollo sin Tauri
    if (onProgress) {
      onProgress({ percentage: 20, status: 'Simulando extracción de audio...', current_time_sec: 10 })
      await new Promise((r) => setTimeout(r, 600))
      onProgress({ percentage: 60, status: 'Simulando STT Whisper local...', current_time_sec: 45 })
      await new Promise((r) => setTimeout(r, 800))
      onProgress({ percentage: 100, status: 'Transcripción finalizada', current_time_sec: 90 })
    }
    return {
      text: `[Transcripción Web Demo de ${filePath.split('\\').pop() || filePath}]\nDurante la sesión con el equipo de producto, se establecieron los siguientes puntos clave:\n1. El cliente Tauri realiza la transcripción de audio/video 100% en local sin subir archivos binarios al servidor.\n2. La transcripción se envía únicamente en formato de texto plano a la IA en la nube.\n3. La IA analiza el texto y genera propuestas de Historias de Usuario estructuradas en formato Gherkin.\n4. El usuario puede revisar, editar e importar las historias seleccionadas al backlog del proyecto.`,
      duration_sec: 90,
      language: language || 'es',
      segments: [
        { start: 0, end: 20, text: 'El cliente realiza la transcripción de audio/video 100% en local.' },
        { start: 20, end: 50, text: 'La transcripción se envía únicamente en formato de texto plano a la IA en la nube.' },
        { start: 50, end: 75, text: 'La IA analiza el texto y genera propuestas de Historias de Usuario estructuradas.' },
        { start: 75, end: 90, text: 'El usuario puede revisar, editar e importar las historias seleccionadas al backlog.' },
      ],
    }
  }

  let unlisten: UnlistenFn | null = null

  if (onProgress) {
    unlisten = await listen<TranscriptionProgress>('transcription-progress', (event) => {
      onProgress(event.payload)
    })
  }

  try {
    const result = await invoke<TranscriptionResult>('transcribe_media', {
      filePath,
      language: language || 'es',
    })
    return result
  } finally {
    if (unlisten) {
      unlisten()
    }
  }
}

export const cancelTranscription = async (): Promise<boolean> => {
  if (!isTauriAvailable()) return true
  return await invoke<boolean>('cancel_transcription')
}
