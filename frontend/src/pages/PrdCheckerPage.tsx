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
      title="Revisor de PRD"
      description="Sube uno o más documentos de requerimientos (PRD) o especificaciones para evaluarlos. Analiza claridad, vacíos y riesgos basándose estrictamente en el contenido."
      uploadTags="prd,prd_checker"
      placeholder="Evalúa este PRD según la rúbrica de criterios de aceptación. Enfócate en casos límite."
      defaultQuery="Revisar los documentos de PRD cargados con respecto a la rúbrica de evaluación."
      onRun={({ query, documentIds, chatContext }) =>
        api.runPrdChecker({ query, document_ids: documentIds, chat_context: chatContext })
      }
    />
  )
}
