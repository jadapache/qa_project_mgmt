import {
  API_BASE,
  handleResponse,
  type AISettings,
  type ModelCatalogResponse,
} from '../client'

export const aiSettingsApi = {
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
    }).then((r) => handleResponse<{ ok: boolean; status?: string; message: string; response?: string }>(r)),

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
}
