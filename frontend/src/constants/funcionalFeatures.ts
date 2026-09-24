import type { LucideIcon } from 'lucide-react'
import { FileEdit } from 'lucide-react'
import { api, type FeaturePayload } from '../api/client'

export type FuncionalFeatureConfig = {
  slug: string
  title: string
  subtitle: string
  uploadTags: string
  placeholder: string
  defaultQuery: string
  defaultTemplate: string
  defaultSources?: string[]
  icon: LucideIcon
  runApi: (payload: FeaturePayload) => Promise<any>
  exportFilenamePrefix?: string
  docxTitle?: string
}

export const FUNCIONAL_SOURCE_OPTIONS = [
  { id: 'knowledge', label: 'Biblioteca de Conocimiento' },
  { id: 'jira', label: 'Jira' },
  { id: 'github', label: 'GitHub' },
  { id: 'gitlab', label: 'GitLab' },
]

export const DEFAULT_MEJORAS_TEMPLATE = `## **FORMATO DOCUMENTACIÓN DE MEJORAS**

**_Objetivo del Formato:_** _Registrar de manera estructurada las necesidades funcionales, oportunidades de mejora y nuevos requerimientos identificados por los usuarios funcionales del proyecto, con el fin de facilitar su análisis, evaluación, priorización y definición por parte del equipo del proyecto para su posible incorporación en el nuevo Sistema de Información_ 

**_Código Requerimiento:_** M-01

| Fecha: ${new Date().toLocaleDateString('es-ES')} | Módulo/Funcionalidad: |
| -------------------------------------- | ------------------------ |
| Sede(s): HIC / ICV / IMAP              | Área(s):                 |

# Necesidad identificada

**Describe ¿Cómo funciona actualmente?** (incluye pantallas) 
*Describe detalladamente el funcionamiento actual, las pantallas involucradas y las limitaciones identificadas.*

**Impacto para el negocio (en tiempo, costos, reprocesos, etc)** 
*Detalla el impacto operacional, cuantitativo o cualitativo para la organización.*

**¿Cómo le gustaría que funcionara en el nuevo sistema?** 
*Describe el requerimiento funcional deseado, flujo esperado y comportamiento esperado.*

**Prioridad**
[Alta / Media / Baja]

**Observaciones complementarias o recomendaciones a tener en cuenta**
*Casos de borde, restricciones o consideraciones especiales.*

**Observaciones del Equipo del Proyecto**
*Evaluación técnica y observaciones por parte del equipo de desarrollo y QA.*

# Firma Participantes o Aprobadores

| **Nombre** | **Cargo** | **Sede** | **Rol** | **Aprobación** |
| ---------- | --------- | -------- | ------- | -------------- |
|            |           |          |         |                |

_Formato Elaborado por: Ing María Eugenia Gutiérrez - Jefe Corporativo de Proyectos de Software_
`

export const FUNCIONAL_FEATURES: FuncionalFeatureConfig[] = [
  {
    slug: 'mejoras',
    title: 'Generador de Documento de Mejoras',
    subtitle: 'Sube especificaciones o minutas y genera/mantiene el documento funcional corporativo en tiempo real.',
    uploadTags: 'mejoras_doc',
    placeholder: 'Escribe tu indicación o consulta...',
    defaultQuery: 'Genera el Documento de Mejora detallado basado en la información recopilada.',
    defaultTemplate: DEFAULT_MEJORAS_TEMPLATE,
    defaultSources: ['knowledge'],
    icon: FileEdit,
    runApi: (payload) => api.runMejoras(payload),
    exportFilenamePrefix: 'Documento_de_Mejora',
    docxTitle: 'Documento de Mejora y Requerimientos Funcionales',
  },
]

export const FUNCIONAL_FEATURE_BY_SLUG = Object.fromEntries(
  FUNCIONAL_FEATURES.map((item) => [item.slug, item])
) as Record<string, FuncionalFeatureConfig>
