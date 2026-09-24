import { FUNCIONAL_FEATURE_BY_SLUG } from '../../constants/funcionalFeatures'
import { GroundedChatWorkspace } from '../../components/workspace/GroundedChatWorkspace'

export const MejorasPage = () => {
  const config = FUNCIONAL_FEATURE_BY_SLUG['mejoras']
  if (!config) {
    return (
      <div className="p-6 text-center text-red-600">
        Configuración no encontrada para el módulo de Mejoras.
      </div>
    )
  }
  return <GroundedChatWorkspace config={config} />
}

export default MejorasPage
