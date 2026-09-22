import { useOutletContext } from 'react-router-dom'
import { api } from '../api/client'
import { FeatureWorkspace } from '../components/FeatureWorkspace'
import { toolsGroupLabel } from '../constants/app'

type OutletContext = {
  displayName: string
}

export const PrdCheckerPage = () => {
  const { displayName } = useOutletContext<OutletContext>()

  return (
    <FeatureWorkspace
      eyebrow={toolsGroupLabel(displayName)}
      title="PRD Checker"
      description="Upload one or more PRDs or specs, then chat to steer the review. Scores clarity, gaps, and risks using your rubric — grounded in file content only."
      uploadTags="prd,prd_checker"
      placeholder="Score this PRD against our acceptance-criteria rubric. Focus on edge cases."
      defaultQuery="Review the uploaded PRD documents against the rubric."
      onRun={({ query, documentIds, chatContext }) =>
        api.runPrdChecker({ query, document_ids: documentIds, chat_context: chatContext })
      }
    />
  )
}
