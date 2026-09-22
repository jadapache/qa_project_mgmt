import { useOutletContext } from 'react-router-dom'
import { api } from '../api/client'
import { FeatureWorkspace } from '../components/FeatureWorkspace'
import { toolsGroupLabel } from '../constants/app'

type OutletContext = {
  displayName: string
}

const SOURCE_OPTIONS = [
  { id: 'jira', label: 'Jira' },
  { id: 'github', label: 'GitHub' },
  { id: 'gitlab', label: 'GitLab' },
  { id: 'knowledge', label: 'Knowledge library' },
]

export const ChangeImpactPage = () => {
  const { displayName } = useOutletContext<OutletContext>()

  return (
    <FeatureWorkspace
      eyebrow={toolsGroupLabel(displayName)}
      title="Change Impact"
      description="Describe a change in chat, upload related specs or tickets, and pull live context from Jira, GitHub, or GitLab to map impact."
      uploadTags="change_impact,spec"
      placeholder="We're removing guest checkout. Which tickets, PRs, and docs are affected?"
      defaultQuery="Analyze change impact from uploaded files and connected sources."
      showSourceToggles
      sourceOptions={SOURCE_OPTIONS}
      defaultSources={['jira', 'github', 'knowledge']}
      onRun={({ query, documentIds, chatContext, sources }) =>
        api.runChangeImpact({
          query,
          document_ids: documentIds,
          chat_context: chatContext,
          sources,
        })
      }
    />
  )
}
