import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { FileSpreadsheet, Download, Upload, AlertCircle, CheckCircle2, FileText } from 'lucide-react';

interface Project {
  id: string;
  name: string;
}

interface Iteration {
  id: string;
  name: string;
}

interface RowError {
  row: number;
  errors: string[];
}

export default function ImportExportPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [iterations, setIterations] = useState<Iteration[]>([]);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);

  const [importEntity, setImportEntity] = useState<'stories' | 'test_cases'>('stories');
  const [exportEntity, setExportEntity] = useState<'stories' | 'test_cases' | 'defects'>('test_cases');
  
  const [uploading, setUploading] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<RowError[]>([]);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const loadProjects = async () => {
    try {
      const data = await api.getProjects();
      setProjects(data);
      if (data.length > 0) setSelectedProjectId(data[0].id);
    } catch (err) {}
  };

  const loadIterations = async (projId: string) => {
    try {
      const data = await api.getIterations(projId);
      setIterations(data);
      if (data.length > 0) setSelectedTargetId(data[0].id);
    } catch (err) {}
  };

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      loadIterations(selectedProjectId);
    }
  }, [selectedProjectId]);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedProjectId || !selectedTargetId) return;

    setUploading(true);
    setSuccessMsg(null);
    setRowErrors([]);
    setGeneralError(null);

    try {
      const res = await api.importData(selectedProjectId, importEntity, selectedTargetId, file);
      setSuccessMsg(res.message);
    } catch (err: any) {
      if (err.response?.data?.detail) {
        const detail = err.response.data.detail;
        if (typeof detail === 'object' && detail.row_errors) {
          setRowErrors(detail.row_errors);
          setGeneralError(detail.message || 'Se encontraron errores de validación en el archivo XLSX.');
        } else {
          setGeneralError(typeof detail === 'string' ? detail : 'Error al procesar el archivo.');
        }
      } else {
        setGeneralError('Error al importar datos desde el archivo XLSX.');
      }
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleExport = () => {
    if (!selectedProjectId) return;
    const url = api.exportDataUrl(selectedProjectId, exportEntity);
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-indigo-400" />
            Importación / Exportación mediante Hojas de Cálculo (XLSX)
          </h1>
          <p className="text-xs text-slate-400">Intercambio masivo de información de historias, casos de prueba y defectos (Req. 10.1 - 10.6)</p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-400">Proyecto:</label>
          <select
            value={selectedProjectId || ''}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Export Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">Exportar Datos a XLSX</h3>
              <p className="text-xs text-slate-400">Descargar reporte estructurado con encabezados en español</p>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Entidad a Exportar</label>
              <select
                value={exportEntity}
                onChange={(e: any) => setExportEntity(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
              >
                <option value="test_cases">Casos de Prueba</option>
                <option value="stories">Historias de Usuario</option>
                <option value="defects">Defectos Registrados</option>
              </select>
            </div>

            <button
              onClick={handleExport}
              disabled={!selectedProjectId}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-xs rounded-xl shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all"
            >
              <Download className="w-4 h-4" />
              Descargar Archivo XLSX
            </button>
          </div>
        </div>

        {/* Import Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">Importar Datos desde XLSX</h3>
              <p className="text-xs text-slate-400">Carga atómica con reporte de errores por fila (Req. 10.4)</p>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Tipo de Registro</label>
                <select
                  value={importEntity}
                  onChange={(e: any) => setImportEntity(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                >
                  <option value="stories">Historias de Usuario</option>
                  <option value="test_cases">Casos de Prueba</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Iteración Destino</label>
                <select
                  value={selectedTargetId || ''}
                  onChange={(e) => setSelectedTargetId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                >
                  {iterations.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <label className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-medium text-xs rounded-xl shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all">
              <Upload className="w-4 h-4" />
              <span>{uploading ? 'Validando e Importando...' : 'Seleccionar e Importar XLSX'}</span>
              <input type="file" onChange={handleImport} accept=".xlsx" disabled={uploading || !selectedTargetId} className="hidden" />
            </label>
          </div>
        </div>
      </div>

      {/* Messages & Row Error Report */}
      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {generalError && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs space-y-2">
          <div className="flex items-center gap-2 font-bold">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{generalError}</span>
          </div>
          {rowErrors.length > 0 && (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2 mt-2">
              <h4 className="font-semibold text-slate-300 text-xs">Reporte de Inconformidades por Fila:</h4>
              <div className="max-h-48 overflow-y-auto space-y-1.5 text-[11px]">
                {rowErrors.map((re, idx) => (
                  <div key={idx} className="p-2 bg-slate-900 rounded border border-slate-800">
                    <span className="font-bold text-red-300">Fila {re.row}:</span> {re.errors.join(' | ')}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
