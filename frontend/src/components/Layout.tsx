import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { api } from '../services/api';
import { 
  FolderKanban, MessageSquare, FileUp, Sparkles, FileText, 
  FileSpreadsheet, Users, LogOut, Shield, PlaySquare, Bug, 
  Award, UserCheck, ShieldCheck 
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { username, role, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await api.logout();
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/projects', label: 'Proyectos', icon: FolderKanban, roles: ['Administrador', 'Líder_QA', 'Analista_QA', 'UAT_Tester', 'Observador'] },
    { to: '/test-executions', label: 'Ejecuciones QA', icon: PlaySquare, roles: ['Administrador', 'Líder_QA', 'Analista_QA'] },
    { to: '/defects', label: 'Defectos & Jira', icon: Bug, roles: ['Administrador', 'Líder_QA', 'Analista_QA'] },
    { to: '/qas', label: 'Certificación QaS', icon: Award, roles: ['Administrador', 'Líder_QA', 'Observador'] },
    { to: '/uat', label: 'Sesiones UAT', icon: UserCheck, roles: ['Administrador', 'Líder_QA', 'UAT_Tester', 'Observador'] },
    { to: '/chat', label: 'Asistente RAG', icon: MessageSquare, roles: ['Administrador', 'Líder_QA', 'Analista_QA'] },
    { to: '/ingest', label: 'Ingesta RAG', icon: FileUp, roles: ['Administrador', 'Líder_QA'] },
    { to: '/ai-review', label: 'Revisión IA', icon: Sparkles, roles: ['Administrador', 'Líder_QA'] },
    { to: '/documents', label: 'Documentos', icon: FileText, roles: ['Administrador', 'Líder_QA', 'Analista_QA', 'UAT_Tester', 'Observador'] },
    { to: '/import-export', label: 'Import / Export', icon: FileSpreadsheet, roles: ['Administrador', 'Líder_QA'] },
    { to: '/audit-log', label: 'Audit Log', icon: ShieldCheck, roles: ['Administrador', 'Líder_QA'] },
    { to: '/admin/users', label: 'Usuarios & Roles', icon: Users, roles: ['Administrador'] },
  ];

  const allowedNav = navItems.filter(item => !role || item.roles.includes(role));

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900/80 backdrop-blur-md border-r border-slate-800 flex flex-col justify-between">
        <div>
          {/* Header */}
          <div className="p-5 border-b border-slate-800/60 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20">
              QA
            </div>
            <div>
              <h1 className="font-bold text-slate-100 text-sm leading-tight">QA Project Mgmt</h1>
              <span className="text-[10px] uppercase font-semibold tracking-wider text-indigo-400">Escritorio Corporativo</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="p-3 space-y-1">
            {allowedNav.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* User Badge & Logout */}
        <div className="p-4 border-t border-slate-800/60 bg-slate-900/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-indigo-300">
                {username ? username.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-200 truncate">{username || 'Usuario'}</p>
                <div className="flex items-center gap-1 text-[10px] text-slate-400">
                  <Shield className="w-3 h-3 text-indigo-400" />
                  <span className="capitalize">{role || 'Sin rol'}</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              title="Cerrar Sesión"
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800/80 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-slate-950 p-8">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
