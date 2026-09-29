import { API_BASE, handleResponse, type KnowledgeDocument } from '../client'

export const knowledgeApi = {
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
}
