import { useParams } from 'react-router-dom'
import { FUNCIONAL_FEATURE_BY_SLUG } from '../../constants/funcionalFeatures'
import { GroundedChatWorkspace } from '../../components/workspace/GroundedChatWorkspace'

export const FuncionalFeaturePage = () => {
  const { slug } = useParams<{ slug: string }>()
  const config = slug ? FUNCIONAL_FEATURE_BY_SLUG[slug] : undefined

  if (!config) {
    return (
      <div className="p-8 text-center space-y-2">
        <h2 className="text-lg font-bold text-slate-800">Módulo no encontrado</h2>
        <p className="text-xs text-slate-500">No se encontró una configuración válida para el slug: {slug}</p>
      </div>
    )
  }

  return <GroundedChatWorkspace config={config} />
}

export default FuncionalFeaturePage
