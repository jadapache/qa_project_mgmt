import { useOutletContext } from 'react-router-dom'
import { api } from '../../api/client'
import { FeatureWorkspace } from '../../components/FeatureWorkspace'
import { toolsGroupLabel } from '../../constants/app'

type OutletContext = {
  displayName: string
}

const SOURCE_OPTIONS = [
  { id: 'jira', label: 'Jira' },
  { id: 'github', label: 'GitHub' },
  { id: 'gitlab', label: 'GitLab' },
  { id: 'knowledge', label: 'Biblioteca de Conocimiento' },
]

export const ChangeImpactPage = () => {
  const { displayName } = useOutletContext<OutletContext>()

  return (
    <FeatureWorkspace
      eyebrow={toolsGroupLabel(displayName)}
      title="Impacto de Cambios"
      description="Describe un cambio propuesto, sube especificaciones o tickets relacionados y consolida datos en vivo de Jira, GitHub o GitLab para evaluar el impacto."
      uploadTags="change_impact,spec"
      placeholder="Vamos a eliminar el proceso de compra como invitado. ¿Qué tickets, PRs y documentos se ven afectados?"
      defaultQuery="Analizar el impacto de cambio basándose en los archivos cargados y fuentes conectadas."
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
