import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { FileUp, FileText, CheckCircle2, AlertTriangle, Trash2, Clock, UploadCloud } from 'lucide-react';

interface Project {
  id: string;
  name: string;
}

interface RagDoc {
  id: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  status: string;
  fragment_count: number;
  ingested_at: string;
}

export default function IngestPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [ragDocs, setRagDocs] = useState<RagDoc[]>([]);
  const [uploading, setUploading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadProjects = async () => {
    try {
      const data = await api.getProjects();
      setProjects(data);
      if (data.length > 0) {
        setSelectedProjectId(data[0].id);
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error al cargar lista de proyectos.' });
    }
  };

  const loadRagDocs = async (projId: string) => {
    try {
      const data = await api.getRagDocuments(projId);
      setRagDocs(data);
    } catch (err) {
      setRagDocs([]);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      loadRagDocs(selectedProjectId);
    }
  }, [selectedProjectId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedProjectId) return;

    setUploading(true);
    setMessage(null);

    try {
      const res = await api.uploadRagDocument(selectedProjectId, file);
      setMessage({ type: 'success', text: res.message });
      loadRagDocs(selectedProjectId);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Error al cargar el documento para ingesta RAG.' });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (docId: string) => {
    if (!selectedProjectId) return;
    try {
      await api.httpClient.delete(`/rag-documents/${docId}`);
      loadRagDocs(selectedProjectId);
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Error al eliminar el documento.' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <FileUp className="w-5 h-5 text-indigo-400" />
            Ingesta Documental RAG
          </h1>
          <p className="text-xs text-slate-400">Carga e indexación de documentos corporativos (PDF, TXT, MD, DOCX) por Proyecto</p>
        </div>

        {/* Project Selector */}
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

      {message && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-red-500/10 border-red-500/20 text-red-400'
          }`}
        >
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Upload Zone */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center mx-auto text-indigo-400">
          <UploadCloud className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-200">Cargar nuevo documento corporativo</h3>
          <p className="text-xs text-slate-400 mt-1">Soporta PDF, TXT, MD y DOCX hasta 50 MB por archivo (Req. 9.2)</p>
        </div>

        <label className="inline-flex items-center gap-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-medium text-xs rounded-xl shadow-lg shadow-indigo-600/20 cursor-pointer transition-all">
          <FileUp className="w-4 h-4" />
          <span>{uploading ? 'Procesando e Indexando...' : 'Seleccionar Archivo'}</span>
          <input type="file" onChange={handleFileUpload} disabled={uploading || !selectedProjectId} className="hidden" />
        </label>
      </div>

      {/* Document Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-800">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Documentos Indexados en el Proyecto</h3>
        </div>

        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
            <tr>
              <th className="p-3.5">Nombre de Archivo</th>
              <th className="p-3.5">Tipo MIME</th>
              <th className="p-3.5">Tamaño</th>
              <th className="p-3.5">Fragmentos</th>
              <th className="p-3.5">Estado</th>
              <th className="p-3.5 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {ragDocs.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-slate-500 italic">
                  No hay documentos indexados para este proyecto.
                </td>
              </tr>
            ) : (
              ragDocs.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="p-3.5 font-medium text-slate-200 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>{doc.filename}</span>
                  </td>
                  <td className="p-3.5 text-slate-400 font-mono text-[11px]">{doc.mime_type}</td>
                  <td className="p-3.5 text-slate-400">{(doc.size_bytes / (1024 * 1024)).toFixed(2)} MB</td>
                  <td className="p-3.5 text-indigo-400 font-semibold">{doc.fragment_count}</td>
                  <td className="p-3.5">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      doc.status === 'Indexado' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-yellow-500/10 text-yellow-400'
                    }`}>
                      <CheckCircle2 className="w-3 h-3" />
                      {doc.status}
                    </span>
                  </td>
                  <td className="p-3.5 text-right">
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="p-1 rounded text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
                      title="Eliminar del Índice"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
