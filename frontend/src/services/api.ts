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

  // QA & Test Cases
  createTestCase: async (storyId: string, data: { title: string; preconditions?: string; input_data?: string; expected_result?: string }) => {
    const res = await httpClient.post(`/stories/${storyId}/test-cases?title=${encodeURIComponent(data.title)}${data.preconditions ? `&preconditions=${encodeURIComponent(data.preconditions)}` : ''}${data.input_data ? `&input_data=${encodeURIComponent(data.input_data)}` : ''}${data.expected_result ? `&expected_result=${encodeURIComponent(data.expected_result)}` : ''}`);
    return res.data;
  },
  getStoryTestCases: async (storyId: string) => {
    const res = await httpClient.get(`/stories/${storyId}/test-cases`);
    return res.data;
  },
  executeTestCase: async (testCaseId: string, result_status: string, comments?: string) => {
    const res = await httpClient.post(`/test-cases/${testCaseId}/executions?result_status=${result_status}${comments ? `&comments=${encodeURIComponent(comments)}` : ''}`);
    return res.data;
  },
  uploadEvidence: async (executionId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await httpClient.post(`/executions/${executionId}/evidences`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  // Defects
  createDefect: async (executionId: string, data: { title: string; description?: string; steps_to_reproduce?: string; severity: string }) => {
    const res = await httpClient.post(`/executions/${executionId}/defects?title=${encodeURIComponent(data.title)}&severity=${data.severity}${data.description ? `&description=${encodeURIComponent(data.description)}` : ''}${data.steps_to_reproduce ? `&steps_to_reproduce=${encodeURIComponent(data.steps_to_reproduce)}` : ''}`);
    return res.data;
  },
  getProjectDefects: async (projectId: string) => {
    const res = await httpClient.get(`/projects/${projectId}/defects`);
    return res.data;
  },

  // QaS Certifications
  createQasCycle: async (projectId: string, data: { name: string; start_date: string; end_date: string }) => {
    const res = await httpClient.post(`/projects/${projectId}/qas-cycles?name=${encodeURIComponent(data.name)}&start_date=${data.start_date}&end_date=${data.end_date}`);
    return res.data;
  },
  getQasCycles: async (projectId: string) => {
    const res = await httpClient.get(`/projects/${projectId}/qas-cycles`);
    return res.data;
  },
  createCertification: async (cycleId: string) => {
    const res = await httpClient.post(`/qas-cycles/${cycleId}/certifications`);
    return res.data;
  },
  getCertifications: async (cycleId: string) => {
    const res = await httpClient.get(`/qas-cycles/${cycleId}/certifications`);
    return res.data;
  },

  // Jira Integration
  saveJiraConfig: async (projectId: string, data: { jira_url: string; user_email: string; api_token: string }) => {
    const res = await httpClient.post(`/projects/${projectId}/jira-config?jira_url=${encodeURIComponent(data.jira_url)}&user_email=${encodeURIComponent(data.user_email)}&api_token=${encodeURIComponent(data.api_token)}`);
    return res.data;
  },
  syncDefectJira: async (defectId: string) => {
    const res = await httpClient.post(`/defects/${defectId}/sync-jira`);
    return res.data;
  },

  // UAT Sessions
  createUatSession: async (projectId: string, data: { name: string; start_date: string; end_date: string; description?: string }) => {
    const res = await httpClient.post(`/projects/${projectId}/uat-sessions?name=${encodeURIComponent(data.name)}&start_date=${data.start_date}&end_date=${data.end_date}${data.description ? `&description=${encodeURIComponent(data.description)}` : ''}`);
    return res.data;
  },
  getUatSessions: async (projectId: string) => {
    const res = await httpClient.get(`/projects/${projectId}/uat-sessions`);
    return res.data;
  },
  inviteUatTester: async (sessionId: string, userId: string) => {
    const res = await httpClient.post(`/uat-sessions/${sessionId}/testers?user_id=${userId}`);
    return res.data;
  },
  submitUatResult: async (sessionId: string, result_status: string, comments?: string) => {
    const res = await httpClient.post(`/uat-sessions/${sessionId}/results?result_status=${result_status}${comments ? `&comments=${encodeURIComponent(comments)}` : ''}`);
    return res.data;
  },
  getUatSummary: async (sessionId: string) => {
    const res = await httpClient.get(`/uat-sessions/${sessionId}/summary`);
    return res.data;
  },

  // Audit Log
  getAuditLog: async (page = 1, page_size = 50, operation_type?: string, user_id?: string) => {
    let url = `/audit-log?page=${page}&page_size=${page_size}`;
    if (operation_type) url += `&operation_type=${encodeURIComponent(operation_type)}`;
    if (user_id) url += `&user_id=${user_id}`;
    const res = await httpClient.get(url);
    return res.data;
  },

  // RAG Chat & Ingest
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

  // AI Drafts & Documents
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
