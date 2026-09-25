import { useEffect, useRef, useState } from 'react'
import {
  FileText,
  FileSpreadsheet,
  Download,
  Eye,
  RefreshCw,
  Image as ImageIcon,
  Check,
} from 'lucide-react'
import type { UniverAdapter } from '../../document_agent/adapters/UniverAdapter'
import type { DocumentKind } from '../../document_agent/core/types'

interface UniverContainerProps {
  adapter: UniverAdapter
  kind: DocumentKind
  title: string
  content: string
  images: Array<{ id: string; sectionId: string; url: string; caption?: string }>
  onInspect: () => void
  onExport: (format: 'docx' | 'xlsx' | 'json') => void
  onReloadFixture: () => void
  onContentChange?: (newContent: string) => void
}

export const UniverContainer = ({
  adapter,
  kind,
  title,
  content,
  images,
  onInspect,
  onExport,
  onReloadFixture,
  onContentChange,
}: UniverContainerProps) => {
  const mountRef = useRef<HTMLDivElement>(null)
  const [activeSheetTab, setActiveSheetTab] = useState('Casos de Prueba')

  useEffect(() => {
    if (mountRef.current) {
      void adapter.attach(mountRef.current, { kind })
    }
    return () => {
      adapter.detach()
    }
  }, [adapter, kind])

  // Mock spreadsheet data for XLSX fixture
  const [spreadsheetRows, setSpreadsheetRows] = useState([
    { id: 'TC01', req: 'REQ-01', desc: 'Validar login con credenciales válidas', estado: 'Aprobado', severity: 'Alta' },
    { id: 'TC02', req: 'REQ-01', desc: 'Validar bloqueo tras 3 intentos fallidos', estado: 'Pendiente', severity: 'Crítica' },
    { id: 'TC03', req: 'REQ-02', desc: 'Validar carga de comprobante en PDF/PNG', estado: 'Aprobado', severity: 'Media' },
    { id: 'TC04', req: 'REQ-03', desc: 'Validar cálculo automático de retención', estado: 'En Ejecución', severity: 'Alta' },
    { id: 'TC05', req: 'REQ-04', desc: 'Verificar envío de notificación al usuario', estado: 'Pendiente', severity: 'Baja' },
  ])

  const handleCellEdit = (idx: number, field: string, value: string) => {
    setSpreadsheetRows((prev) =>
      prev.map((row, rIdx) => (rIdx === idx ? { ...row, [field]: value } : row))
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-100 overflow-hidden border border-slate-200 rounded-xl shadow-xs">
      {/* Top Workspace Toolbar */}
      <div className="bg-white px-5 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl text-white ${kind === 'spreadsheet' ? 'bg-emerald-600' : 'bg-blue-600'}`}>
            {kind === 'spreadsheet' ? <FileSpreadsheet className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-slate-900 text-sm">{title}</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-indigo-50 text-indigo-700 border border-indigo-200">
                Runtime: Univer v1.0.2
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                Edición Directa Habilitada
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Modo: <span className="font-semibold text-slate-700">{kind === 'spreadsheet' ? 'Hoja de Cálculo (XLSX)' : 'Documento Estructurado (DOCX)'}</span> • Haz clic en el documento para editar directamente
            </p>
          </div>
        </div>

        {/* Toolbar Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onInspect}
            className="px-3 py-1.5 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Inspecciona el modelo canónico del documento"
          >
            <Eye className="h-4 w-4 text-indigo-600" />
            <span>Inspeccionar (Canónico)</span>
          </button>

          <button
            type="button"
            onClick={onReloadFixture}
            className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Recargar fixture original"
          >
            <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
            <span>Recargar Fixture</span>
          </button>

          <div className="h-4 w-px bg-slate-200 mx-1" />

          <button
            type="button"
            onClick={() => onExport(kind === 'spreadsheet' ? 'xlsx' : 'docx')}
            className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Exportar {kind === 'spreadsheet' ? 'XLSX' : 'DOCX'}</span>
          </button>
        </div>
      </div>

      {/* Main Univer Document / Spreadsheet Canvas */}
      <div className="flex-1 overflow-y-auto p-6 flex justify-center">
        {kind === 'document' ? (
          /* DOCX Document Viewport with ContentEditable */
          <div
            ref={mountRef}
            contentEditable={true}
            suppressContentEditableWarning={true}
            onBlur={(e) => {
              if (onContentChange) {
                onContentChange(e.currentTarget.innerText)
              }
            }}
            className="bg-white w-full max-w-4xl shadow-md border border-slate-200 rounded-lg p-10 min-h-[750px] space-y-6 text-slate-800 font-sans focus:outline-hidden focus:ring-2 focus:ring-indigo-500/50 transition-all cursor-text"
          >
            {/* Document Corporate Header */}
            <div className="border-b-2 border-indigo-900 pb-4 mb-6" contentEditable={false}>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">
                    QA Project MGMT • Módulo de Gestión Documental
                  </span>
                  <h1 className="text-xl font-bold text-slate-900 uppercase tracking-tight">{title}</h1>
                </div>
                <div className="text-right text-[11px] text-slate-500">
                  <p>Versión: <span className="font-semibold text-slate-700">1.0-PoC</span></p>
                  <p>Estado: <span className="font-semibold text-emerald-600">Edición Directa Activa</span></p>
                </div>
              </div>
            </div>

            {/* Document Content (Tag Pills Hidden) */}
            <div className="space-y-4 text-sm leading-relaxed">
              {content.split(/\r?\n/).map((line, idx) => {
                const trimmed = line.trim()
                if (!trimmed) return <div key={idx} className="h-2" />

                // Hide tag lines completely from visual reader
                if (trimmed.startsWith('{{') && trimmed.endsWith('}}')) {
                  return null
                }

                // Headings
                if (trimmed.startsWith('# ')) {
                  return (
                    <h2 key={idx} className="text-lg font-bold text-slate-900 border-b border-slate-200 pb-1 mt-6">
                      {trimmed.replace('# ', '')}
                    </h2>
                  )
                }
                if (trimmed.startsWith('## ')) {
                  const headingTitle = trimmed.replace('## ', '')
                  return (
                    <div key={idx} className="mt-5">
                      <h3 className="text-base font-bold text-indigo-950">
                        {headingTitle}
                      </h3>
                    </div>
                  )
                }

                // Table Rows
                if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
                  const cells = trimmed.split('|').filter((_, cIdx, arr) => cIdx > 0 && cIdx < arr.length - 1)
                  const isHeader = idx > 0 && content.split(/\r?\n/)[idx - 1]?.includes('|Rol|')
                  return (
                    <div
                      key={idx}
                      className={`grid grid-cols-3 gap-2 p-2.5 rounded-lg border text-xs ${
                        isHeader
                          ? 'bg-indigo-900 text-white font-bold'
                          : 'bg-slate-50 border-slate-200 font-sans hover:bg-indigo-50/50'
                      }`}
                    >
                      {cells.map((cell, cIdx) => (
                        <div key={cIdx} className="truncate">{cell.trim()}</div>
                      ))}
                    </div>
                  )
                }

                return (
                  <p key={idx} className="text-slate-700 leading-normal">
                    {line}
                  </p>
                )
              })}
            </div>

            {/* Render Dynamically Inserted Images */}
            {images.length > 0 && (
              <div className="mt-6 pt-4 border-t border-slate-200" contentEditable={false}>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-emerald-600" />
                  Evidencias Insertadas por el Agente ({images.length})
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {images.map((img) => (
                    <div
                      key={img.id}
                      className="group relative bg-slate-50 border border-slate-200 rounded-xl p-3 shadow-xs hover:border-indigo-300 transition-all"
                    >
                      <div className="h-44 bg-slate-200/80 rounded-lg flex items-center justify-center overflow-hidden border border-slate-300/80">
                        {img.url ? (
                          <img
                            src={img.url}
                            alt={img.caption || 'Evidencia'}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none'
                            }}
                          />
                        ) : null}
                        <div className="flex flex-col items-center justify-center p-4 text-center">
                          <ImageIcon className="h-8 w-8 text-slate-400 mb-1" />
                          <span className="font-semibold text-xs text-slate-700">{img.id}</span>
                          <span className="text-[11px] text-slate-500 mt-0.5">{img.caption || 'Evidencia adjunta'}</span>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[11px]">
                        <span className="font-mono text-indigo-700 font-semibold">{img.caption || img.id}</span>
                        <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-sm font-semibold flex items-center gap-1">
                          <Check className="h-3 w-3" /> Insertada en Observaciones
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* XLSX Spreadsheet Viewport with Interactive Cell Editing */
          <div
            ref={mountRef}
            className="bg-white w-full max-w-5xl shadow-md border border-slate-200 rounded-lg flex flex-col min-h-[600px] overflow-hidden"
          >
            {/* Formula Bar */}
            <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex items-center gap-3 text-xs">
              <span className="font-mono font-bold text-slate-500 bg-white px-2 py-0.5 border border-slate-200 rounded-sm">
                C4
              </span>
              <span className="font-mono text-slate-400 font-bold">fx</span>
              <input
                type="text"
                readOnly
                value="=SUMA(D2:D10)"
                className="flex-1 bg-white border border-slate-200 px-3 py-1 rounded-sm font-mono text-slate-700 text-xs"
              />
            </div>

            {/* Spreadsheet Grid Table */}
            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 font-mono">
                    <th className="w-10 p-2 text-center border-r border-slate-200 bg-slate-200/60">#</th>
                    <th className="p-2 border-r border-slate-200">A (ID Caso)</th>
                    <th className="p-2 border-r border-slate-200">B (Requerimiento)</th>
                    <th className="p-2 border-r border-slate-200">C (Descripción de Prueba)</th>
                    <th className="p-2 border-r border-slate-200">D (Estado)</th>
                    <th className="p-2">E (Severidad)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-sans">
                  {spreadsheetRows.map((row, idx) => (
                    <tr key={row.id} className="hover:bg-blue-50/50">
                      <td className="p-2 text-center font-mono text-slate-400 bg-slate-50 border-r border-slate-200">
                        {idx + 1}
                      </td>
                      <td className="p-2 font-mono font-bold text-indigo-700 border-r border-slate-200">
                        <input
                          type="text"
                          value={row.id}
                          onChange={(e) => handleCellEdit(idx, 'id', e.target.value)}
                          className="w-full bg-transparent focus:outline-hidden focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded-xs px-1"
                        />
                      </td>
                      <td className="p-2 font-semibold text-slate-800 border-r border-slate-200">
                        <input
                          type="text"
                          value={row.req}
                          onChange={(e) => handleCellEdit(idx, 'req', e.target.value)}
                          className="w-full bg-transparent focus:outline-hidden focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded-xs px-1"
                        />
                      </td>
                      <td className="p-2 text-slate-700 border-r border-slate-200">
                        <input
                          type="text"
                          value={row.desc}
                          onChange={(e) => handleCellEdit(idx, 'desc', e.target.value)}
                          className="w-full bg-transparent focus:outline-hidden focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded-xs px-1"
                        />
                      </td>
                      <td className="p-2 border-r border-slate-200">
                        <select
                          value={row.estado}
                          onChange={(e) => handleCellEdit(idx, 'estado', e.target.value)}
                          className="bg-transparent text-xs font-semibold rounded-md px-1 py-0.5 border border-slate-200 focus:outline-hidden focus:bg-white"
                        >
                          <option value="Aprobado">Aprobado</option>
                          <option value="Pendiente">Pendiente</option>
                          <option value="En Ejecución">En Ejecución</option>
                        </select>
                      </td>
                      <td className="p-2 font-semibold text-slate-700">
                        <select
                          value={row.severity}
                          onChange={(e) => handleCellEdit(idx, 'severity', e.target.value)}
                          className="bg-transparent text-xs font-semibold rounded-md px-1 py-0.5 border border-slate-200 focus:outline-hidden focus:bg-white"
                        >
                          <option value="Alta">Alta</option>
                          <option value="Crítica">Crítica</option>
                          <option value="Media">Media</option>
                          <option value="Baja">Baja</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Sheets Tabs Bottom Bar */}
            <div className="bg-slate-100 border-t border-slate-200 px-4 py-1.5 flex items-center gap-1">
              {['Casos de Prueba', 'Estimaciones', 'Matriz de Trazabilidad'].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveSheetTab(tab)}
                  className={`px-3 py-1 text-xs font-semibold rounded-t-md transition-colors ${
                    activeSheetTab === tab
                      ? 'bg-white text-emerald-700 shadow-2xs border-t-2 border-emerald-600'
                      : 'text-slate-600 hover:bg-slate-200/60'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

