import { httpClient } from './httpClient';

export const api = {
  httpClient,

  // Auth
  login: async (username: string, password: string) => {
    const res = await httpClient.post('/auth/login', { username, password });
    return res.data;
  },
  logout: async () => {
    try {
      await httpClient.post('/auth/logout');
    } catch (_) {}
  },
  registerUser: async (data: { username: string; password: string; role: string }) => {
    const res = await httpClient.post('/auth/register', data);
    return res.data;
  },

  // Users
  getUsers: async () => {
    const res = await httpClient.get('/users');
    return res.data;
  },
  updateRole: async (userId: string, role: string) => {
    const res = await httpClient.put(`/users/${userId}/role`, { role });
    return res.data;
  },

  // Projects
  getProjects: async () => {
    const res = await httpClient.get('/projects');
    return res.data;
  },
  createProject: async (data: { name: string; description?: string; start_date: string; end_date_estimated: string }) => {
    const res = await httpClient.post('/projects', data);
    return res.data;
  },
  updateProjectStatus: async (projectId: string, new_status: string) => {
    const res = await httpClient.patch(`/projects/${projectId}/status?new_status=${new_status}`);
    return res.data;
  },

  // Iterations & Stories
  getIterations: async (projectId: string) => {
    const res = await httpClient.get(`/projects/${projectId}/iterations`);
    return res.data;
  },
  createIteration: async (projectId: string, data: { name: string; start_date: string; end_date: string }) => {
    const res = await httpClient.post(`/projects/${projectId}/iterations`, data);
    return res.data;
  },
  getStories: async (iterationId: string) => {
    const res = await httpClient.get(`/iterations/${iterationId}/stories`);
    return res.data;
  },
  createStory: async (iterationId: string, data: { description: string; acceptance_criteria?: string; priority: string }) => {
    const res = await httpClient.post(`/iterations/${iterationId}/stories`, data);
    return res.data;
  },

  // RAG Chat
  createChatSession: async (projectId: string) => {
    const res = await httpClient.post(`/projects/${projectId}/chat-sessions`);
    return res.data;
  },
  getChatMessages: async (sessionId: string) => {
    const res = await httpClient.get(`/chat-sessions/${sessionId}/messages`);
    return res.data;
  },
  sendChatMessage: async (sessionId: string, content: string) => {
    const res = await httpClient.post(`/chat-sessions/${sessionId}/messages?content=${encodeURIComponent(content)}`);
    return res.data;
  },

  // RAG Ingest
  getRagDocuments: async (projectId: string) => {
    const res = await httpClient.get(`/projects/${projectId}/rag-documents`);
    return res.data;
  },
  uploadRagDocument: async (projectId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await httpClient.post(`/projects/${projectId}/ingest`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  // AI Drafts
  getAiDrafts: async (projectId: string) => {
    const res = await httpClient.get(`/projects/${projectId}/ai-drafts`);
    return res.data;
  },
  editAiDraft: async (draftId: string, edited_content: string) => {
    const res = await httpClient.patch(`/ai-drafts/${draftId}?edited_content=${encodeURIComponent(edited_content)}`);
    return res.data;
  },
  approveAiDraft: async (draftId: string) => {
    const res = await httpClient.patch(`/ai-drafts/${draftId}/approve`);
    return res.data;
  },

  // Versioned Documents
  getDocTemplates: async () => {
    const res = await httpClient.get('/doc-templates');
    return res.data;
  },
  generateDocument: async (projectId: string, templateId: string) => {
    const res = await httpClient.post(`/projects/${projectId}/documents?template_id=${templateId}`);
    return res.data;
  },
  getProjectDocuments: async (projectId: string) => {
    const res = await httpClient.get(`/projects/${projectId}/documents`);
    return res.data;
  },
  approveDocument: async (docId: string) => {
    const res = await httpClient.patch(`/documents/${docId}/approve`);
    return res.data;
  },

  // Import / Export
  exportDataUrl: (projectId: string, entity: string) => {
    return `${httpClient.defaults.baseURL}/projects/${projectId}/export?entity=${entity}`;
  },
  importData: async (projectId: string, entity: string, targetId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await httpClient.post(`/projects/${projectId}/import?entity=${entity}&target_id=${targetId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
};
