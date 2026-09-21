import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { FileText, Plus, CheckCircle2, Download, Check, Sparkles } from 'lucide-react';

interface Project {
  id: string;
  name: string;
}

interface Template {
  id: string;
  name: string;
  description: string;
  version: number;
  status: string;
}

interface VersionedDoc {
  id: string;
  version: number;
  content: string;
  status: string;
  generated_at: string;
  approved_at?: string;
}

export default function DocumentsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [documents, setDocuments] = useState<VersionedDoc[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<VersionedDoc | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const loadInitial = async () => {
    try {
      const projData = await api.getProjects();
      setProjects(projData);
      if (projData.length > 0) setSelectedProjectId(projData[0].id);

      const tplData = await api.getDocTemplates();
      setTemplates(tplData);
      if (tplData.length > 0) setSelectedTemplateId(tplData[0].id);
    } catch (err) {}
  };

  const loadDocuments = async (projId: string) => {
    try {
      const data = await api.getProjectDocuments(projId);
      setDocuments(data);
      if (data.length > 0) setSelectedDoc(data[0]);
    } catch (err) {
      setDocuments([]);
    }
  };

  useEffect(() => {
    loadInitial();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      loadDocuments(selectedProjectId);
    }
  }, [selectedProjectId]);

  const handleGenerateDocument = async () => {
    if (!selectedProjectId || !selectedTemplateId) return;
    try {
      const newDoc = await api.generateDocument(selectedProjectId, selectedTemplateId);
      setMsg(`Documento Versión ${newDoc.version} generado correctamente.`);
      loadDocuments(selectedProjectId);
    } catch (err: any) {
      setMsg(err.response?.data?.detail || 'Error al generar el documento.');
    }
  };

  const handleApprove = async (docId: string) => {
    try {
      const approved = await api.approveDocument(docId);
      setMsg(`Documento v${approved.version} aprobado formalmente.`);
      if (selectedProjectId) loadDocuments(selectedProjectId);
    } catch (err: any) {
      setMsg('Error al aprobar el documento.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-400" />
            Generación Documental Versionada
          </h1>
          <p className="text-xs text-slate-400">Creación, aprobación e historial de versiones de actas, informes y certificados (Req. 6.1 - 6.6)</p>
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

      {msg && (
        <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs rounded-xl">
          {msg}
        </div>
      )}

      {/* Generator Control Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-slate-300">Plantilla Documental:</label>
          <select
            value={selectedTemplateId || ''}
            onChange={(e) => setSelectedTemplateId(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 min-w-[240px]"
          >
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} (v{t.version})
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleGenerateDocument}
          disabled={!selectedTemplateId || !selectedProjectId}
          className="py-2 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-xs rounded-xl shadow-lg shadow-indigo-600/20 flex items-center gap-2 transition-all"
        >
          <Sparkles className="w-4 h-4" />
          Generar Documento Versionado
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Document History List */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Historial de Documentos</h2>
          <div className="space-y-2">
            {documents.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-4 text-center">No hay documentos generados.</p>
            ) : (
              documents.map((d) => (
                <div
                  key={d.id}
                  onClick={() => setSelectedDoc(d)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    selectedDoc?.id === d.id
                      ? 'bg-indigo-600/15 border-indigo-500/40 text-slate-100'
                      : 'bg-slate-950 border-slate-800/80 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-200">Versión {d.version}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                      d.status === 'Aprobado' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {d.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">{new Date(d.generated_at).toLocaleString('es-ES')}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Preview Panel */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          {!selectedDoc ? (
            <div className="h-64 flex items-center justify-center text-xs text-slate-500 italic">
              Selecciona un documento del historial para previsualizar.
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-100">Documento Versión {selectedDoc.version}</h3>
                  <span className="text-[11px] text-slate-500">Estado: {selectedDoc.status}</span>
                </div>
                <div className="flex items-center gap-2">
                  {selectedDoc.status !== 'Aprobado' && (
                    <button
                      onClick={() => handleApprove(selectedDoc.id)}
                      className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-medium flex items-center gap-1.5 shadow"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Aprobar
                    </button>
                  )}
                  <a
                    href={`${api.httpClient.defaults.baseURL}/documents/${selectedDoc.id}/download`}
                    target="_blank"
                    rel="noreferrer"
                    className="py-1.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-medium flex items-center gap-1.5 shadow"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Descargar Markdown
                  </a>
                </div>
              </div>

              <div className="w-full h-96 bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs text-slate-200 overflow-y-auto font-mono leading-relaxed whitespace-pre-wrap">
                {selectedDoc.content}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
