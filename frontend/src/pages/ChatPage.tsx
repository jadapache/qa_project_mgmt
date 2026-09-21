import React, { useEffect, useState, useRef } from 'react';
import { api } from '../services/api';
import { MessageSquare, Send, BookOpen, FileText, AlertCircle, Bot, User as UserIcon } from 'lucide-react';

interface Project {
  id: string;
  name: string;
}

interface RagSource {
  filename: string;
  fragment_id: string;
  page_or_section: string;
  snippet?: string;
}

interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  rag_sources?: RagSource[];
  timestamp?: string;
}

export default function ChatPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputQuery, setInputQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadProjects = async () => {
    try {
      const data = await api.getProjects();
      setProjects(data);
      if (data.length > 0) {
        setSelectedProjectId(data[0].id);
      }
    } catch (err) {
      setErrorMsg('Error al cargar lista de proyectos.');
    }
  };

  const startSession = async (projId: string) => {
    try {
      const data = await api.createChatSession(projId);
      setSessionId(data.id);
      setMessages([]);
    } catch (err: any) {
      setErrorMsg('Error al iniciar la sesión de chat con el Motor RAG.');
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      startSession(selectedProjectId);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputQuery.trim() || !sessionId || loading) return;

    const userText = inputQuery.trim();
    setInputQuery('');
    setMessages((prev) => [...prev, { role: 'user', content: userText }]);
    setLoading(true);
    setErrorMsg(null);

    try {
      const assistantMsg = await api.sendChatMessage(sessionId, userText);
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Error al comunicarse con el Motor RAG.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-100">Asistente de IA con RAG</h1>
            <p className="text-xs text-slate-400">Consultas contextualizadas por Proyecto sobre documentación corporativa indexada</p>
          </div>
        </div>

        {/* Project Selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-400">Proyecto:</label>
          <select
            value={selectedProjectId || ''}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Chat Messages Body */}
      <div className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl p-6 overflow-y-auto space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Bot className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-200">Inicia una conversación sobre el proyecto</h3>
            <p className="text-xs text-slate-400 max-w-md">
              Haz preguntas sobre requisitos, casos de prueba o documentación indexada. Las respuestas citarán las fuentes corporativas exactas.
            </p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex gap-3 max-w-3xl ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800 border border-slate-700 text-indigo-400'
                }`}
              >
                {msg.role === 'user' ? <UserIcon className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div className="space-y-2">
                <div
                  className={`p-4 rounded-2xl text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10'
                      : 'bg-slate-950 border border-slate-800/80 text-slate-200'
                  }`}
                >
                  {msg.content}
                </div>

                {/* Visualización visible de Fuentes RAG (Req. 7.3, 7.4, Propiedad 11) */}
                {msg.role === 'assistant' && msg.rag_sources && msg.rag_sources.length > 0 && (
                  <div className="bg-slate-950/60 border border-slate-800/60 rounded-xl p-3 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-400 uppercase tracking-wider">
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Fuentes RAG Consultadas:</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {msg.rag_sources.map((src, sIdx) => (
                        <div key={sIdx} className="bg-slate-900 border border-slate-800 p-2 rounded-lg flex items-center gap-2">
                          <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[11px] font-semibold text-slate-300 truncate">{src.filename}</p>
                            <p className="text-[10px] text-slate-500">{src.page_or_section}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {loading && (
          <div className="flex gap-3 max-w-xl">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-indigo-400">
              <Bot className="w-4 h-4 animate-spin" />
            </div>
            <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-2xl text-xs text-slate-400 animate-pulse">
              Recuperando fragmentos e integrando respuestas RAG...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <form onSubmit={handleSendMessage} className="flex gap-2">
        <input
          type="text"
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          placeholder="Escribe tu consulta sobre el proyecto o los documentos..."
          disabled={loading || !sessionId}
          className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
        />
        <button
          type="submit"
          disabled={loading || !inputQuery.trim() || !sessionId}
          className="px-5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20 transition-all"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
