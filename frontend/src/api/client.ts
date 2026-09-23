import { AUTH_TOKEN_KEY } from '../constants/app'
import type { AppSettings, IntegrationInfo, TestConnectionResult } from '../types'

const API_BASE = import.meta.env.VITE_API_BASE ?? ''

const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem(AUTH_TOKEN_KEY)
  return token ? { Authorization: `Bearer ${token}` } : {}
}

const handleResponse = async <T,>(response: Response): Promise<T> => {
  if (!response.ok) {
    let detail = `Request failed (${response.status})`
    try {
      const body = await response.json()
      detail = body.detail ?? detail
    } catch {
      // ignore
    }
    throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail))
  }
  if (response.status === 204) {
    return undefined as T
  }
  return response.json() as Promise<T>
}

export type AuthUser = {
  id: string
  username: string
  email?: string
  full_name?: string
  role?: string
  status?: string
  created_at?: string
}

export type AuthResponse = {
  token?: string
  status?: string
  message?: string
  user: AuthUser
}

export type KnowledgeDocument = {
  id: string
  filename: string
  tags: string[]
  chunk_count: number
  uploaded_at: string
  char_count: number
}

export type GroundedResult = {
  ok: boolean
  refused: boolean
  reason?: string | null
  answer?: string | null
  citations: Array<{
    index: number
    id: string
    source_type: string
    source_label: string
    title: string
  }>
  context?: {
    query: string
    chunks: Array<Record<string, unknown>>
    missing_sources: string[]
    used_sources: string[]
  }
  meta?: Record<string, unknown>
}

export type AISettings = {
  provider: string
  model: string
  transcription_provider?: string
  transcription_model?: string
  voice_command_provider?: string
  voice_command_model?: string
  openai_api_key_set: boolean
  claude_api_key_set: boolean
  groq_api_key_set: boolean
  gemini_api_key_set?: boolean
  ollama_base_url: string
}

export type ModelCatalogItem = {
  id: string
  raw_id: string
  name: string
  provider: 'groq' | 'openai' | 'claude' | 'gemini' | 'ollama'
  provider_name: string
  description: string
  context_window: string
  context_length: number
  task_type: 'chat_writing' | 'transcription'
  task_label: string
  tier_type: 'free' | 'paid' | 'freemium'
  pricing_prompt: number
  pricing_completion: number
  pricing_label: string
  rate_limits: string
  badge?: string
  is_free: boolean
}

export type ModelCatalogResponse = {
  updated_at: string
  source: string
  providers: string[]
  models: ModelCatalogItem[]
  error?: string
}

export type FeaturePayload = {
  query: string
  document_ids: string[]
  chat_context?: string
  sources?: string[]
}

export const api = {
  getIntegrations: () =>
    fetch(`${API_BASE}/api/integrations`).then((r) => handleResponse<IntegrationInfo[]>(r)),

  getIntegration: (id: string) =>
    fetch(`${API_BASE}/api/integrations/${id}`).then((r) => handleResponse<IntegrationInfo>(r)),

  startOAuth: (id: string) =>
    fetch(`${API_BASE}/api/integrations/${id}/oauth/start`, { method: 'POST' }).then((r) =>
      handleResponse<{ authorization_url: string; state: string; auth_method: string }>(r),
    ),

  connectWithPat: (
    id: string,
    payload: { token: string; email?: string; base_url?: string; selected_repos?: string[] },
  ) =>
    fetch(`${API_BASE}/api/integrations/${id}/pat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then((r) => handleResponse<IntegrationInfo>(r)),

  testIntegration: (id: string) =>
    fetch(`${API_BASE}/api/integrations/${id}/test`, { method: 'POST' }).then((r) =>
      handleResponse<TestConnectionResult>(r),
    ),

  disconnectIntegration: (id: string) =>
    fetch(`${API_BASE}/api/integrations/${id}/disconnect`, { method: 'POST' }).then((r) =>
      handleResponse<IntegrationInfo>(r),
    ),

  getIssues: () =>
    fetch(`${API_BASE}/api/integrations/jira/issues`).then((r) =>
      handleResponse<{ issues: Array<Record<string, unknown>> }>(r),
    ),

  getProjects: () =>
    fetch(`${API_BASE}/api/integrations/jira/projects`).then((r) =>
      handleResponse<{
        projects: Array<{ id: string; key: string; name: string; selected: boolean }>
      }>(r),
    ),

  updateProjects: (selected_projects: string[]) =>
    fetch(`${API_BASE}/api/integrations/jira/projects`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selected_projects }),
    }).then((r) => handleResponse<IntegrationInfo>(r)),

  autoSelectJiraProject: () =>
    fetch(`${API_BASE}/api/integrations/jira/auto-select-project`, { method: 'POST' }).then((r) =>
      handleResponse<IntegrationInfo>(r),
    ),

  getPullRequests: (id: string = 'github') =>
    fetch(`${API_BASE}/api/integrations/${id}/pull-requests`).then((r) =>
      handleResponse<{ pull_requests: Array<Record<string, unknown>> }>(r),
    ),

  getRepositories: (id: string = 'github') =>
    fetch(`${API_BASE}/api/integrations/${id}/repositories`).then((r) =>
      handleResponse<{
        repositories: Array<{
          full_name: string
          name: string
          private: boolean
          selected: boolean
          html_url: string
        }>
      }>(r),
    ),

  updateRepositories: (id: string, selected_repos: string[]) =>
    fetch(`${API_BASE}/api/integrations/${id}/repositories`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selected_repos }),
    }).then((r) => handleResponse<IntegrationInfo>(r)),

  getSettings: () =>
    fetch(`${API_BASE}/api/settings`).then((r) => handleResponse<AppSettings>(r)),

  getJiraOAuth: () =>
    fetch(`${API_BASE}/api/settings/jira-oauth`).then((r) =>
      handleResponse<{
        configured: boolean
        client_id_set: boolean
        client_secret_set: boolean
        redirect_uri: string
        scopes?: string[]
        scope_guide?: Array<{
          scope: string
          label: string
          where: string
          required: boolean
        }>
      }>(r),
    ),

  saveJiraOAuth: (payload: { client_id: string; client_secret?: string; redirect_uri?: string }) =>
    fetch(`${API_BASE}/api/settings/jira-oauth`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then((r) => handleResponse<Record<string, unknown>>(r)),

  getGitHubOAuth: () =>
    fetch(`${API_BASE}/api/settings/github-oauth`).then((r) =>
      handleResponse<{
        configured: boolean
        client_id_set: boolean
        client_secret_set: boolean
        redirect_uri: string
      }>(r),
    ),

  saveGitHubOAuth: (payload: { client_id: string; client_secret?: string; redirect_uri?: string }) =>
    fetch(`${API_BASE}/api/settings/github-oauth`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then((r) => handleResponse<Record<string, unknown>>(r)),

  getGitLabOAuth: () =>
    fetch(`${API_BASE}/api/settings/gitlab-oauth`).then((r) =>
      handleResponse<{
        configured: boolean
        client_id_set: boolean
        client_secret_set: boolean
        redirect_uri: string
        base_url?: string
      }>(r),
    ),

  saveGitLabOAuth: (payload: {
    client_id: string
    client_secret?: string
    redirect_uri?: string
    base_url?: string
  }) =>
    fetch(`${API_BASE}/api/settings/gitlab-oauth`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then((r) => handleResponse<Record<string, unknown>>(r)),

  syncIntegration: (id: string) =>
    fetch(`${API_BASE}/api/integrations/${id}/sync`, { method: 'POST' }).then((r) =>
      handleResponse<Record<string, unknown>>(r),
    ),

  getSyncCache: (id: string) =>
    fetch(`${API_BASE}/api/integrations/${id}/sync`).then((r) => handleResponse<Record<string, unknown>>(r)),

  updateSettings: (payload: AppSettings) =>
    fetch(`${API_BASE}/api/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then((r) => handleResponse<AppSettings>(r)),

  health: () =>
    fetch(`${API_BASE}/api/health`).then((r) => handleResponse<{ status: string; app: string }>(r)),

  listDocuments: () =>
    fetch(`${API_BASE}/api/knowledge/documents`).then((r) =>
      handleResponse<{ documents: KnowledgeDocument[] }>(r),
    ),

  uploadDocument: async (file: File, tags: string) => {
    const form = new FormData()
    form.append('file', file)
    form.append('tags', tags)
    return fetch(`${API_BASE}/api/knowledge/documents`, { method: 'POST', body: form }).then((r) =>
      handleResponse<{ document: KnowledgeDocument }>(r),
    )
  },

  uploadDocumentsBatch: async (files: File[], tags: string) => {
    const form = new FormData()
    for (const file of files) {
      form.append('files', file)
    }
    form.append('tags', tags)
    return fetch(`${API_BASE}/api/knowledge/documents/batch`, { method: 'POST', body: form }).then((r) =>
      handleResponse<{ documents: KnowledgeDocument[]; errors: string[] }>(r),
    )
  },

  deleteDocument: (id: string) =>
    fetch(`${API_BASE}/api/knowledge/documents/${id}`, { method: 'DELETE' }).then((r) =>
      handleResponse<{ ok: boolean }>(r),
    ),

  retrieve: (query: string, sources: string[]) =>
    fetch(`${API_BASE}/api/knowledge/retrieve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, sources }),
    }).then((r) => handleResponse<Record<string, unknown>>(r)),

  getModelCatalog: (refresh?: boolean, provider?: string, task_type?: string) => {
    const params = new URLSearchParams()
    if (refresh) params.set('refresh', 'true')
    if (provider && provider !== 'all') params.set('provider', provider)
    if (task_type && task_type !== 'all') params.set('task_type', task_type)
    const qs = params.toString() ? `?${params.toString()}` : ''
    return fetch(`${API_BASE}/api/ai/models/catalog${qs}`).then((r) =>
      handleResponse<ModelCatalogResponse>(r),
    )
  },

  getAiSettings: () =>
    fetch(`${API_BASE}/api/ai/settings`).then((r) => handleResponse<AISettings>(r)),

  updateAiSettings: (payload: Record<string, string>) =>
    fetch(`${API_BASE}/api/ai/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then((r) => handleResponse<AISettings>(r)),

  testAiConnection: (payload: Record<string, string>) =>
    fetch(`${API_BASE}/api/ai/test-connection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then((r) => handleResponse<{ status: string; message: string; response?: string }>(r)),

  listOllamaModels: (baseUrl?: string) =>
    fetch(`${API_BASE}/api/ai/ollama/models${baseUrl ? `?base_url=${encodeURIComponent(baseUrl)}` : ''}`).then(
      (r) => handleResponse<{ online: boolean; models: string[]; error?: string }>(r),
    ),

  pullOllamaModel: (name: string, baseUrl?: string) =>
    fetch(`${API_BASE}/api/ai/ollama/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, base_url: baseUrl }),
    }).then((r) => handleResponse<{ status: string; model: string }>(r)),

  getPrompt: (feature: string) =>
    fetch(`${API_BASE}/api/ai/prompts/${feature}`).then((r) => handleResponse<Record<string, unknown>>(r)),

  updatePrompt: (feature: string, payload: Record<string, unknown>) =>
    fetch(`${API_BASE}/api/ai/prompts/${feature}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then((r) => handleResponse<Record<string, unknown>>(r)),

  getRubric: (feature: string) =>
    fetch(`${API_BASE}/api/ai/rubrics/${feature}`).then((r) => handleResponse<Record<string, unknown>>(r)),

  updateRubric: (feature: string, criteria: string[]) =>
    fetch(`${API_BASE}/api/ai/rubrics/${feature}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ criteria }),
    }).then((r) => handleResponse<Record<string, unknown>>(r)),

  generateStandup: (query?: string) =>
    fetch(`${API_BASE}/api/features/standup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: query || 'Generate standup from recent work.' }),
    }).then((r) => handleResponse<GroundedResult>(r)),

  askProduct: (payload: {
    query: string
    sources: string[]
    document_ids?: string[]
    chat_context?: string
  }) =>
    fetch(`${API_BASE}/api/features/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then((r) => handleResponse<GroundedResult>(r)),

  runPrdChecker: (payload: FeaturePayload) =>
    fetch(`${API_BASE}/api/features/prd-checker`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then((r) => handleResponse<GroundedResult>(r)),

  runChangeImpact: (payload: FeaturePayload) =>
    fetch(`${API_BASE}/api/features/change-impact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then((r) => handleResponse<GroundedResult>(r)),

  runQaFeature: (featureKey: string, payload: FeaturePayload) =>
    fetch(`${API_BASE}/api/features/qa/${featureKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then((r) => handleResponse<GroundedResult>(r)),

  runMejoras: (payload: {
    query: string
    document_ids: string[]
    chat_context?: string
    sources?: string[]
  }) =>
    fetch(`${API_BASE}/api/features/mejoras`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then((r) => handleResponse<GroundedResult>(r)),

  exportMejorasDocx: async (markdown: string, title?: string): Promise<Blob> => {
    const res = await fetch(`${API_BASE}/api/features/export-docx`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markdown, title: title || 'Documento de Mejora y Requerimientos Funcionales' }),
    })
    if (!res.ok) {
      let detail = `Error al exportar (.docx)`
      try {
        const body = await res.json()
        detail = body.detail ?? detail
      } catch {}
      throw new Error(detail)
    }
    return res.blob()
  },

  register: (payload: { username: string; password: string; email?: string; full_name?: string }) =>
    fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(payload),
    }).then((r) => handleResponse<AuthResponse>(r)),

  login: (payload: { username: string; password: string }) =>
    fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(payload),
    }).then((r) => handleResponse<AuthResponse>(r)),

  getMe: () =>
    fetch(`${API_BASE}/api/auth/me`, {
      method: 'GET',
      headers: { ...getAuthHeaders() },
    }).then((r) => handleResponse<{ user: AuthUser }>(r)),

  updateProfile: (payload: { full_name?: string; email?: string; password?: string }) =>
    fetch(`${API_BASE}/api/auth/me`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(payload),
    }).then((r) => handleResponse<{ message: string; user: AuthUser }>(r)),

  getAccessRequests: () =>
    fetch(`${API_BASE}/api/auth/access-requests`, {
      method: 'GET',
      headers: { ...getAuthHeaders() },
    }).then((r) => handleResponse<{ requests: AuthUser[] }>(r)),

  approveAccessRequest: (userId: string) =>
    fetch(`${API_BASE}/api/auth/access-requests/${userId}/approve`, {
      method: 'POST',
      headers: { ...getAuthHeaders() },
    }).then((r) => handleResponse<{ status: string; user: AuthUser }>(r)),

  rejectAccessRequest: (userId: string) =>
    fetch(`${API_BASE}/api/auth/access-requests/${userId}/reject`, {
      method: 'POST',
      headers: { ...getAuthHeaders() },
    }).then((r) => handleResponse<{ status: string; user: AuthUser }>(r)),
}

export const apiClient = api



