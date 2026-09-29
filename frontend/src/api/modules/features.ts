import {
  API_BASE,
  handleResponse,
  type FeaturePayload,
  type GroundedResult,
} from '../client'

export const featuresApi = {
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
}
