import { API_BASE, getAuthHeaders, handleResponse } from '../client'

export type MediaMetadata = {
  title: string
  description?: string
}

export type TranscriptionSegment = {
  start: number
  end: number
  speaker: string
  text: string
}

export type TranscriptionSummary = {
  participants: string[]
  topics: string[]
  decisions: string[]
  requirements: string[]
  action_items: string[]
}

export type TranscriptionProgress = {
  id: string
  media_id: string
  status: 'pending' | 'preprocessing' | 'transcribing' | 'diarizing' | 'summarizing' | 'complete' | 'failed' | 'cancelled'
  stage?: string
  progress: number
  message: string
  eta?: string | null
  model_info?: string | null
  error?: string | null
}

export type TranscriptionResult = {
  id: string
  media_id: string
  metadata: MediaMetadata
  language: string
  duration_seconds: number
  created_at: string
  segments: TranscriptionSegment[]
  text: string
  summary?: TranscriptionSummary | null
  saved_to_knowledge?: boolean
  document_id?: string | null
}

export type TranscribeOptions = {
  mode?: 'auto' | 'local' | 'cloud' | 'groq' | 'openai'
  language?: string
  model_size?: string
  enable_diarization?: boolean
}

export type AvailableModelsInfo = {
  configured_provider: string
  configured_model: string
  local_available: boolean
  groq_configured: boolean
  openai_configured: boolean
  available_providers: string[]
  active_model_label: string
}

export const transcriptionApi = {
  async getAvailableModels(): Promise<AvailableModelsInfo> {
    const response = await fetch(`${API_BASE}/api/transcription/available-models`, {
      headers: getAuthHeaders(),
    })
    return handleResponse(response)
  },

  async uploadMedia(file: File, title: string, description: string = ''): Promise<{ ok: boolean; media_id: string; message: string }> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('title', title)
    formData.append('description', description)

    const response = await fetch(`${API_BASE}/api/transcription/upload`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: formData,
    })
    return handleResponse(response)
  },

  async startTranscription(mediaId: string, options?: TranscribeOptions): Promise<{ ok: boolean; status: string; transcription_id: string }> {
    const response = await fetch(`${API_BASE}/api/transcription/transcribe/${mediaId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify(options || {}),
    })
    return handleResponse(response)
  },

  async getTranscriptionStatus(transcriptionId: string): Promise<TranscriptionProgress> {
    const response = await fetch(`${API_BASE}/api/transcription/status/${transcriptionId}`, {
      headers: getAuthHeaders(),
    })
    return handleResponse(response)
  },

  async cancelTranscription(transcriptionId: string): Promise<{ ok: boolean; message: string }> {
    const response = await fetch(`${API_BASE}/api/transcription/cancel/${transcriptionId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    })
    return handleResponse(response)
  },

  async getTranscriptionResult(transcriptionId: string): Promise<TranscriptionResult> {
    const response = await fetch(`${API_BASE}/api/transcription/result/${transcriptionId}`, {
      headers: getAuthHeaders(),
    })
    return handleResponse(response)
  },

  async updateTranscriptionSummary(transcriptionId: string, summary: TranscriptionSummary): Promise<{ ok: boolean; transcription: TranscriptionResult }> {
    const response = await fetch(`${API_BASE}/api/transcription/summary/${transcriptionId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ summary }),
    })
    return handleResponse(response)
  },

  async renameSpeakers(transcriptionId: string, speakerMap: Record<string, string>): Promise<{ ok: boolean; transcription: TranscriptionResult }> {
    const response = await fetch(`${API_BASE}/api/transcription/speakers/${transcriptionId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ speaker_map: speakerMap }),
    })
    return handleResponse(response)
  },

  async saveToKnowledgeBase(transcriptionId: string, customTags: string[] = []): Promise<{ ok: boolean; document_id: string; message: string }> {
    const response = await fetch(`${API_BASE}/api/transcription/save-to-knowledge/${transcriptionId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ custom_tags: customTags }),
    })
    return handleResponse(response)
  },

  async listTranscriptions(): Promise<{ transcriptions: TranscriptionResult[] }> {
    const response = await fetch(`${API_BASE}/api/transcription/list`, {
      headers: getAuthHeaders(),
    })
    return handleResponse(response)
  },

  async deleteTranscription(transcriptionId: string): Promise<{ ok: boolean; message: string }> {
    const response = await fetch(`${API_BASE}/api/transcription/${transcriptionId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    })
    return handleResponse(response)
  },

  async exportInventarioXlsx(content: string, title: string = 'Inventario_de_Requerimientos'): Promise<Blob> {
    const response = await fetch(`${API_BASE}/api/transcription/export/inventario`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ content, title }),
    })
    if (!response.ok) {
      throw new Error(`Error al exportar Inventario XLSX (${response.status})`)
    }
    return response.blob()
  },

  async exportLevantamientoDocx(content: string, title: string = 'Levantamiento_Detallado'): Promise<Blob> {
    const response = await fetch(`${API_BASE}/api/transcription/export/levantamiento`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ content, title }),
    })
    if (!response.ok) {
      throw new Error(`Error al exportar Levantamiento DOCX (${response.status})`)
    }
    return response.blob()
  },
}
