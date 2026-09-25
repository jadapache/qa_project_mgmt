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
  { id: 'knowledge', label: 'Biblioteca' },
  { id: 'jira', label: 'Jira' },
]

export const FUNCIONAL_FEATURES: FuncionalFeatureConfig[] = [
  {
    slug: 'mejoras',
    title: 'Generador de Documento de Mejoras',
    subtitle: 'Sube especificaciones o minutas y genera/mantiene el documento funcional corporativo en tiempo real.',
    uploadTags: 'mejoras_doc',
    placeholder: 'Escribe tu indicación o consulta...',
    defaultQuery: 'Genera el Documento de Mejora detallado basado en la información recopilada.',
    defaultTemplate: `# Documento de Mejora y Requerimientos Funcionales

## 1. Información General del Proyecto
- **Proyecto / Módulo:** Sistema de Gestión QA / Módulo Funcional
- **Fecha:** {{FECHA}}
- **Responsables:** {{RESPONSABLES}}

## 2. Diagnóstico y Situación Actual
{{SITUACIÓN_ACTUAL}}

## 3. Propuesta de Solución y Mejoras Requeridas
{{SOLUCIÓN}}

## 4. Matriz de Requerimientos Funcionales
| ID | Requerimiento | Prioridad | Impacto en Negocio |
|---|---|---|---|
| RF-01 | Automatización de flujo funcional | Alta | Reducción de tiempos manuales |

## 5. Recomendaciones de Pruebas y Criterios de Aceptación
- Cobertura de pruebas unitarias e integración.
- Validación de rendimiento e impacto en la arquitectura.`,
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
