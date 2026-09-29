import { useEffect, useRef, useState } from 'react'
import {
  FileText,
  FileSpreadsheet,
  Download,
  Eye,
  RefreshCw,
  Image as ImageIcon,
  Check,
  Tag,
} from 'lucide-react'
import type { UniverAdapter } from '../../document_agent/adapters/UniverAdapter'
import type { DocumentKind } from '../../document_agent/core/types'

interface UniverContainerProps {
  adapter: UniverAdapter
  kind: DocumentKind
  title: string
  content: string
  headerContent?: string
  footerContent?: string
  images: Array<{ id: string; sectionId: string; url: string; caption?: string }>
  onInspect: () => void
  onExport: (format: 'docx' | 'xlsx' | 'json') => void
  onReloadFixture: () => void
  onContentChange?: (newContent: string) => void
  activeLineIndex?: number | null
  onActiveLineChange?: (lineIdx: number) => void
  hideHeader?: boolean
}

export const UniverContainer = ({
  adapter,
  kind,
  title,
  content,
  headerContent,
  footerContent,
  images,
  onInspect,
  onExport,
  onReloadFixture,
  onContentChange,
  activeLineIndex,
  onActiveLineChange,
  hideHeader = false,
}: UniverContainerProps) => {
  const mountRef = useRef<HTMLDivElement>(null)
  const [activeSheetTab, setActiveSheetTab] = useState('Casos de Prueba')
  const [internalActiveLine, setInternalActiveLine] = useState<number>(0)

  const activeIdx = activeLineIndex !== undefined && activeLineIndex !== null ? activeLineIndex : internalActiveLine

  useEffect(() => {
    if (mountRef.current) {
      void adapter.attach(mountRef.current, { kind })
    }
    return () => {
      adapter.detach()
    }
  }, [adapter, kind])

  const handleLineFocus = (lineIdx: number) => {
    setInternalActiveLine(lineIdx)
    onActiveLineChange?.(lineIdx)
  }

  const handleLineUpdate = (lineIdx: number, newText: string) => {
    if (!onContentChange) return
    const lines = (content || '').split(/\r?\n/)
    lines[lineIdx] = newText
    onContentChange(lines.join('\n'))
  }

  const handleLineDrop = (lineIdx: number, e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const droppedText = e.dataTransfer.getData('text/plain')
    if (droppedText && onContentChange) {
      const formattedTag = `{{${droppedText.replace(/[{}]/g, '').toUpperCase()}}}`
      const lines = (content || '').split(/\r?\n/)
      const targetLine = lines[lineIdx] || ''
      lines[lineIdx] = targetLine.trim() ? `${targetLine} ${formattedTag}` : formattedTag
      onContentChange(lines.join('\n'))
      handleLineFocus(lineIdx)
    }
  }

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

  const renderBlocks = (textToRender: string, sectionPrefix: string = 'body') => {
    if (!textToRender || !textToRender.trim()) {
      if (sectionPrefix !== 'body') return null
      return (
        <div
          contentEditable={true}
          suppressContentEditableWarning={true}
          onFocus={() => handleLineFocus(0)}
          onBlur={(e) => handleLineUpdate(0, e.currentTarget.innerText)}
          className="p-8 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-slate-500 italic text-sm text-center cursor-text"
        >
          El documento está vacío. Haz clic aquí para comenzar a escribir o arrastra placeholders desde el panel izquierdo.
        </div>
      )
    }

    const lines = textToRender.split(/\r?\n/)
    const elements: React.ReactNode[] = []

    let inTable = false
    let tableLineIndices: number[] = []
    let tableRows: string[][] = []

    const flushTable = (endIdx: number) => {
      if (tableRows.length === 0) return
      const headerRow = tableRows[0]
      const bodyRows = tableRows.slice(1).filter((r) => !r.every((cell) => /^[\s\:\-]*$/.test(cell)))
      const headerLineIdx = tableLineIndices[0]

      elements.push(
        <div
          key={`table-${sectionPrefix}-${endIdx}`}
          className={`my-4 overflow-x-auto rounded-xl border border-slate-300 shadow-xs bg-white transition-all ${
            sectionPrefix === 'body' && tableLineIndices.includes(activeIdx) ? 'ring-2 ring-blue-500/80 border-blue-400' : ''
          }`}
        >
          <table className="w-full text-left border-collapse text-xs font-sans">
            <thead>
              <tr className="bg-[#002777] border-b border-blue-900 text-white font-bold">
                {headerRow.map((cell, cIdx) => (
                  <th
                    key={cIdx}
                    contentEditable={sectionPrefix === 'body'}
                    suppressContentEditableWarning={true}
                    onFocus={() => sectionPrefix === 'body' && handleLineFocus(headerLineIdx)}
                    onBlur={(e) => {
                      if (sectionPrefix !== 'body') return
                      const newCellVal = e.currentTarget.innerText.trim()
                      const updatedCells = [...headerRow]
                      updatedCells[cIdx] = newCellVal
                      handleLineUpdate(headerLineIdx, `| ${updatedCells.join(' | ')} |`)
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => sectionPrefix === 'body' && handleLineDrop(headerLineIdx, e)}
                    className="px-4 py-2.5 border-r border-blue-800/80 last:border-r-0 focus:outline-none focus:bg-blue-900/60 cursor-text"
                  >
                    {renderFormattedInlineText(cell)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bodyRows.map((row, rIdx) => {
                const lineIdx = tableLineIndices[rIdx + 1] || headerLineIdx
                return (
                  <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                    {row.map((cell, cIdx) => (
                      <td
                        key={cIdx}
                        contentEditable={sectionPrefix === 'body'}
                        suppressContentEditableWarning={true}
                        onFocus={() => sectionPrefix === 'body' && handleLineFocus(lineIdx)}
                        onBlur={(e) => {
                          if (sectionPrefix !== 'body') return
                          const newCellVal = e.currentTarget.innerText.trim()
                          const updatedCells = [...row]
                          updatedCells[cIdx] = newCellVal
                          handleLineUpdate(lineIdx, `| ${updatedCells.join(' | ')} |`)
                        }}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => sectionPrefix === 'body' && handleLineDrop(lineIdx, e)}
                        className="px-4 py-2.5 border-t border-r border-slate-200 last:border-r-0 text-slate-700 font-medium focus:outline-none focus:bg-blue-50/70 cursor-text"
                      >
                        {renderFormattedInlineText(cell)}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>,
      )

      tableRows = []
      tableLineIndices = []
      inTable = false
    }

    lines.forEach((line, idx) => {
      const trimmed = line.trim()

      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        inTable = true
        const cells = trimmed.split('|').slice(1, -1).map((c) => c.trim())
        tableRows.push(cells)
        tableLineIndices.push(idx)
      } else {
        if (inTable) {
          flushTable(idx)
        }

        const isActive = sectionPrefix === 'body' && idx === activeIdx

        if (!trimmed) {
          elements.push(
            <div
              key={`${sectionPrefix}-${idx}`}
              contentEditable={sectionPrefix === 'body'}
              suppressContentEditableWarning={true}
              onFocus={() => sectionPrefix === 'body' && handleLineFocus(idx)}
              onBlur={(e) => sectionPrefix === 'body' && handleLineUpdate(idx, e.currentTarget.innerText)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => sectionPrefix === 'body' && handleLineDrop(idx, e)}
              className={`h-4 rounded-sm transition-all cursor-text ${
                isActive ? 'bg-blue-50 border border-dashed border-blue-300' : 'hover:bg-slate-100/60'
              }`}
            />,
          )
        } else if (trimmed === '---' || trimmed === '***') {
          elements.push(<hr key={`${sectionPrefix}-${idx}`} className="my-4 border-slate-200" />)
        } else if (trimmed.startsWith('# ')) {
          elements.push(
            <h1
              key={`${sectionPrefix}-${idx}`}
              contentEditable={sectionPrefix === 'body'}
              suppressContentEditableWarning={true}
              onFocus={() => sectionPrefix === 'body' && handleLineFocus(idx)}
              onBlur={(e) => {
                if (sectionPrefix !== 'body') return
                const text = e.currentTarget.innerText.trim()
                handleLineUpdate(idx, `# ${text}`)
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => sectionPrefix === 'body' && handleLineDrop(idx, e)}
              className={`text-lg md:text-xl font-bold text-[#002777] border-b border-[#002777]/30 pb-1.5 mt-5 mb-2 font-serif transition-all focus:outline-none focus:ring-1 focus:ring-[#002777]/40 cursor-text ${
                isActive ? 'bg-blue-50/40 rounded-lg p-1' : ''
              }`}
            >
              {renderFormattedInlineText(trimmed.slice(2))}
            </h1>,
          )
        } else if (trimmed.startsWith('## ')) {
          elements.push(
            <h2
              key={`${sectionPrefix}-${idx}`}
              contentEditable={sectionPrefix === 'body'}
              suppressContentEditableWarning={true}
              onFocus={() => sectionPrefix === 'body' && handleLineFocus(idx)}
              onBlur={(e) => {
                if (sectionPrefix !== 'body') return
                const text = e.currentTarget.innerText.trim()
                handleLineUpdate(idx, `## ${text}`)
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => sectionPrefix === 'body' && handleLineDrop(idx, e)}
              className={`text-sm md:text-base font-bold text-[#002777] border-b border-[#002777]/25 pb-1 mt-4 mb-2 uppercase tracking-wide transition-all focus:outline-none focus:ring-1 focus:ring-[#002777]/40 cursor-text ${
                isActive ? 'bg-blue-50/40 rounded-lg p-1' : ''
              }`}
            >
              {renderFormattedInlineText(trimmed.slice(3))}
            </h2>,
          )
        } else if (trimmed.startsWith('### ')) {
          elements.push(
            <h3
              key={`${sectionPrefix}-${idx}`}
              contentEditable={sectionPrefix === 'body'}
              suppressContentEditableWarning={true}
              onFocus={() => sectionPrefix === 'body' && handleLineFocus(idx)}
              onBlur={(e) => {
                if (sectionPrefix !== 'body') return
                const text = e.currentTarget.innerText.trim()
                handleLineUpdate(idx, `### ${text}`)
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => sectionPrefix === 'body' && handleLineDrop(idx, e)}
              className={`text-xs md:text-sm font-bold text-[#002777] border-b border-slate-200 pb-0.5 mt-3 mb-1.5 uppercase tracking-wide transition-all focus:outline-none focus:ring-1 focus:ring-[#002777]/40 cursor-text ${
                isActive ? 'bg-blue-50/40 rounded-lg p-1' : ''
              }`}
            >
              {renderFormattedInlineText(trimmed.slice(4))}
            </h3>,
          )
        } else if (/^\d+\.\s+.{3,}$/.test(trimmed) && trimmed.length <= 80 && !/[.,:;]$/.test(trimmed) && !/^\d+\.\s+(validar|verificar|confirmar|comprobar)/i.test(trimmed) && !/^\d+\.\s+\{\{/.test(trimmed)) {
          // Numbered section titles (e.g., "1. NECESIDAD IDENTIFICADA" or "1. Necesidad identificada")
          elements.push(
            <h2
              key={`${sectionPrefix}-${idx}`}
              contentEditable={sectionPrefix === 'body'}
              suppressContentEditableWarning={true}
              onFocus={() => sectionPrefix === 'body' && handleLineFocus(idx)}
              onBlur={(e) => sectionPrefix === 'body' && handleLineUpdate(idx, e.currentTarget.innerText.trim())}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => sectionPrefix === 'body' && handleLineDrop(idx, e)}
              className={`text-sm md:text-base font-bold text-[#002777] border-b border-[#002777]/25 pb-1 mt-4 mb-2 uppercase tracking-wide transition-all focus:outline-none focus:ring-1 focus:ring-[#002777]/40 cursor-text ${
                isActive ? 'bg-blue-50/40 rounded-lg p-1' : ''
              }`}
            >
              {renderFormattedInlineText(trimmed)}
            </h2>,
          )
        } else if (
          trimmed.length >= 4 &&
          trimmed.length <= 65 &&
          trimmed === trimmed.toUpperCase() &&
          !/[.:,]$/.test(trimmed) &&
          !trimmed.startsWith('-') &&
          !trimmed.startsWith('*') &&
          !trimmed.startsWith('{{')
        ) {
          // Standalone uppercase section titles (e.g., "FORMATO DOCUMENTACIÓN DE MEJORAS")
          elements.push(
            <h2
              key={`${sectionPrefix}-${idx}`}
              contentEditable={sectionPrefix === 'body'}
              suppressContentEditableWarning={true}
              onFocus={() => sectionPrefix === 'body' && handleLineFocus(idx)}
              onBlur={(e) => sectionPrefix === 'body' && handleLineUpdate(idx, e.currentTarget.innerText.trim())}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => sectionPrefix === 'body' && handleLineDrop(idx, e)}
              className={`text-xs md:text-sm font-bold text-[#002777] border-b border-[#002777]/25 pb-0.5 mt-3 mb-1.5 uppercase tracking-wide transition-all focus:outline-none focus:ring-1 focus:ring-[#002777]/40 cursor-text ${
                isActive ? 'bg-blue-50/40 rounded-lg p-1' : ''
              }`}
            >
              {renderFormattedInlineText(trimmed)}
            </h2>,
          )
        } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          elements.push(
            <div
              key={`${sectionPrefix}-${idx}`}
              contentEditable={sectionPrefix === 'body'}
              suppressContentEditableWarning={true}
              onFocus={() => sectionPrefix === 'body' && handleLineFocus(idx)}
              onBlur={(e) => {
                if (sectionPrefix !== 'body') return
                const text = e.currentTarget.innerText.trim()
                handleLineUpdate(idx, `- ${text.replace(/^•\s*/, '')}`)
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => sectionPrefix === 'body' && handleLineDrop(idx, e)}
              className={`flex items-start gap-2.5 ml-4 my-0.5 text-slate-600 leading-relaxed text-[11px] md:text-xs transition-all focus:outline-none focus:ring-1 focus:ring-blue-300 cursor-text ${
                isActive ? 'bg-blue-50/40 rounded' : ''
              }`}
            >
              <span contentEditable={false} className="text-[#002777] font-bold text-base leading-none select-none">•</span>
              <div className="flex-1">
                {renderFormattedInlineText(trimmed.slice(2))}
              </div>
            </div>,
          )
        } else if (/^\d+\.\s/.test(trimmed)) {
          elements.push(
            <div
              key={`${sectionPrefix}-${idx}`}
              contentEditable={sectionPrefix === 'body'}
              suppressContentEditableWarning={true}
              onFocus={() => sectionPrefix === 'body' && handleLineFocus(idx)}
              onBlur={(e) => sectionPrefix === 'body' && handleLineUpdate(idx, e.currentTarget.innerText.trim())}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => sectionPrefix === 'body' && handleLineDrop(idx, e)}
              className={`flex items-start gap-2.5 ml-4 my-0.5 text-slate-600 leading-relaxed text-[11px] md:text-xs transition-all focus:outline-none focus:ring-1 focus:ring-blue-300 cursor-text ${
                isActive ? 'bg-blue-50/40 rounded' : ''
              }`}
            >
              <div className="flex-1">
                {renderFormattedInlineText(line)}
              </div>
            </div>,
          )
        } else if (trimmed.startsWith('> ')) {
          elements.push(
            <blockquote
              key={`${sectionPrefix}-${idx}`}
              contentEditable={sectionPrefix === 'body'}
              suppressContentEditableWarning={true}
              onFocus={() => sectionPrefix === 'body' && handleLineFocus(idx)}
              onBlur={(e) => {
                if (sectionPrefix !== 'body') return
                const text = e.currentTarget.innerText.trim()
                handleLineUpdate(idx, `> ${text}`)
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => sectionPrefix === 'body' && handleLineDrop(idx, e)}
              className={`border-l-4 border-blue-500 bg-blue-50/60 p-3.5 rounded-r-xl my-3 text-slate-600 italic text-xs md:text-sm leading-relaxed transition-all focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-text ${
                isActive ? 'ring-2 ring-blue-500/80' : ''
              }`}
            >
              {renderFormattedInlineText(trimmed.slice(2))}
            </blockquote>,
          )
        } else {
          // Regular body text & example text under section headings
          elements.push(
            <div
              key={`${sectionPrefix}-${idx}`}
              contentEditable={sectionPrefix === 'body'}
              suppressContentEditableWarning={true}
              onFocus={() => sectionPrefix === 'body' && handleLineFocus(idx)}
              onBlur={(e) => sectionPrefix === 'body' && handleLineUpdate(idx, e.currentTarget.innerText.trim())}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => sectionPrefix === 'body' && handleLineDrop(idx, e)}
              className={`my-0.5 py-0.5 text-slate-600 font-sans leading-relaxed text-[11px] md:text-xs transition-all focus:outline-none focus:ring-1 focus:ring-blue-300 cursor-text ${
                isActive ? 'bg-blue-50/40 rounded' : ''
              }`}
            >
              {renderFormattedInlineText(line)}
            </div>,
          )
        }
      }
    })

    if (inTable) {
      flushTable(lines.length)
    }

    return <div className="space-y-1 font-sans">{elements}</div>
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-50/50 overflow-hidden border-0">
      {/* Top Workspace Toolbar (Hidden if hideHeader=true) */}
      {!hideHeader && (
        <div className="bg-white px-5 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl text-white ${kind === 'spreadsheet' ? 'bg-emerald-600' : 'bg-[#002777]'}`}>
              {kind === 'spreadsheet' ? <FileSpreadsheet className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-slate-900 text-sm">{title}</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-blue-50 text-[#002777] border border-blue-200">
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
              className="px-3 py-1.5 bg-slate-50 hover:bg-blue-50 hover:text-[#002777] text-slate-700 rounded-lg text-xs font-semibold border border-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Inspecciona el modelo canónico del documento"
            >
              <Eye className="h-4 w-4 text-[#002777]" />
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
              className="px-3.5 py-1.5 bg-[#002777] hover:bg-[#003399] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Exportar {kind === 'spreadsheet' ? 'XLSX' : 'DOCX'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Univer Document / Spreadsheet Canvas */}
      <div className="flex-1 overflow-y-auto p-6 flex justify-center">
        {kind === 'document' ? (
          /* DOCX Document Viewport with Direct Inline Editing and Targeted Drag-and-Drop */
          <div
            ref={mountRef}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleLineDrop(activeIdx, e)}
            className="bg-white w-full max-w-4xl shadow-md border border-slate-200 rounded-lg p-8 md:p-12 min-h-[750px] space-y-6 text-slate-800 font-sans transition-all"
          >
            {/* Header Content Table Section */}
            {headerContent ? (
              <div className="border-b-2 border-slate-200 pb-3 mb-5 space-y-1">
                <div className="flex items-center justify-between text-[10px] font-bold text-[#002777] uppercase tracking-wider">
                  <span>ENCABEZADO DE DOCUMENTO CORPORATIVO</span>
                  <span className="font-mono font-semibold text-slate-400">Word / PDF Header Table</span>
                </div>
                <div className="p-1">
                  {renderBlocks(headerContent, 'header')}
                </div>
              </div>
            ) : null}

            {/* Document Body Content */}
            <div className="space-y-0.5 text-xs leading-relaxed font-sans">
              {renderBlocks(content, 'body')}
            </div>

            {/* Footer Content Table Section */}
            {footerContent ? (
              <div className="border-t-2 border-slate-200 pt-3 mt-6 space-y-1">
                <div className="flex items-center justify-between text-[10px] font-bold text-[#002777] uppercase tracking-wider">
                  <span>PIE DE PÁGINA CORPORATIVO</span>
                  <span className="font-mono font-semibold text-slate-400">Word / PDF Footer</span>
                </div>
                <div className="p-1 text-xs text-slate-600">
                  {renderBlocks(footerContent, 'footer')}
                </div>
              </div>
            ) : null}

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

function renderFormattedInlineText(text: string) {
  const parts = text.split(/(\{\{[A-Za-z0-9_\-\.]+\}\}|\*\*.*?\*\*|_.*?_|\*.*?\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('{{') && part.endsWith('}}')) {
      return (
        <span
          key={i}
          contentEditable={false}
          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 mx-1 rounded-full text-xs font-mono font-bold bg-blue-100 text-[#002777] border border-blue-300 shadow-2xs select-none hover:bg-blue-200 transition cursor-pointer"
          title={`Placeholder: ${part}`}
        >
          <Tag className="h-3.5 w-3.5 text-[#002777] shrink-0" />
          <span>{part}</span>
        </span>
      )
    }
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-bold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      )
    }
    if (
      (part.startsWith('*') && part.endsWith('*')) ||
      (part.startsWith('_') && part.endsWith('_'))
    ) {
      return (
        <em key={i} className="italic text-slate-800">
          {part.slice(1, -1)}
        </em>
      )
    }
    return part
  })
}
