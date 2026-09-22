export type ConnectionStatus = 'connected' | 'not_connected' | 'error'
export type AuthMethod = 'oauth' | 'pat'

export type Capability =
  | 'get_issues'
  | 'get_projects'
  | 'get_sprints'
  | 'get_pull_requests'
  | 'get_commits'
  | 'get_files_changed'
  | 'get_repositories'

export type IntegrationInfo = {
  id: string
  name: string
  description: string
  status: ConnectionStatus
  auth_methods: AuthMethod[]
  capabilities: Capability[]
  account_label?: string | null
  workspace_label?: string | null
  details?: Record<string, unknown>
  error?: string | null
  oauth_configured: boolean
}

export type TestConnectionResult = {
  ok: boolean
  message: string
  details?: Record<string, unknown>
}

export type AppSettings = {
  display_name?: string
  theme?: string
  selected_repos?: string[]
  preferences?: Record<string, unknown>
}
