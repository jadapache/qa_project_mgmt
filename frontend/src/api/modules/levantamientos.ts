import { client } from '../client'

export interface StoryProposal {
  id: string
  session_id: string
  title: string
  description: string
  acceptance_criteria?: string
  priority: string
  status: 'Propuesta' | 'Importada' | 'Descartada'
  imported_story_id?: string
  created_at: string
}

export interface LevantamientoSession {
  id: string
  project_id: string
  created_by?: string
  status: 'Borrador_Local' | 'Transcrito' | 'Generando' | 'Listo' | 'Error'
  source_label?: string
  transcript: string
  summary_optional?: string
  llm_model?: string
  error_message?: string
  created_at: string
  updated_at: string
  proposals: StoryProposal[]
}

export interface CreateLevantamientoPayload {
  project_id: string
  source_label?: string
  transcript: string
  llm_model?: string
}

export interface ImportProposalsPayload {
  iteration_id: string
  proposal_ids: string[]
}

export const levantamientosApi = {
  createSession: async (payload: CreateLevantamientoPayload): Promise<LevantamientoSession> => {
    const res = await client.post('/api/levantamientos', payload)
    return res.data
  },

  getSession: async (sessionId: string): Promise<LevantamientoSession> => {
    const res = await client.get(`/api/levantamientos/${sessionId}`)
    return res.data
  },

  listProjectSessions: async (projectId: string = 'default'): Promise<LevantamientoSession[]> => {
    const res = await client.get(`/api/levantamientos/projects/${projectId}`)
    return res.data
  },

  updateProposal: async (
    sessionId: string,
    proposalId: string,
    payload: Partial<Pick<StoryProposal, 'title' | 'description' | 'acceptance_criteria' | 'priority' | 'status'>>
  ): Promise<StoryProposal> => {
    const res = await client.patch(`/api/levantamientos/${sessionId}/proposals/${proposalId}`, payload)
    return res.data
  },

  importProposals: async (
    sessionId: string,
    payload: ImportProposalsPayload
  ): Promise<{ ok: boolean; message: string; imported_count: number }> => {
    const res = await client.post(`/api/levantamientos/${sessionId}/import`, payload)
    return res.data
  },
}
