import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Users, Plus, Shield, CheckCircle2, UserPlus, Lock } from 'lucide-react';

interface User {
  id: string;
  username: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showRoleModal, setShowRoleModal] = useState<boolean>(false);
  const [showRegisterModal, setShowRegisterModal] = useState<boolean>(false);

  const [newRole, setNewRole] = useState<string>('Observador');
  const [registerData, setRegisterData] = useState({ username: '', password: '', role: 'Analista_QA' });
  
  const [msg, setMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadUsers = async () => {
    try {
      const data = await api.getUsers();
      setUsers(data);
    } catch (err: any) {
      setErrorMsg('Error al cargar la lista de usuarios.');
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleUpdateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setErrorMsg(null);
    try {
      await api.updateRole(selectedUser.id, newRole);
      setMsg(`Rol del usuario ${selectedUser.username} actualizado a ${newRole}. Sus sesiones activas han sido revocadas.`);
      setShowRoleModal(false);
      loadUsers();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Error al actualizar el rol.');
    }
  };

  const handleRegisterUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      await api.registerUser(registerData);
      setMsg(`Usuario '${registerData.username}' registrado exitosamente con rol ${registerData.role}.`);
      setShowRegisterModal(false);
      setRegisterData({ username: '', password: '', role: 'Analista_QA' });
      loadUsers();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Error al registrar el usuario.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" />
            Gestión de Usuarios y Roles (RBAC)
          </h1>
          <p className="text-xs text-slate-400">Asignación e invalidación de sesiones activas al modificar roles (Req. 2.1 - 2.8)</p>
        </div>

        <button
          onClick={() => setShowRegisterModal(true)}
          className="py-2 px-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-medium flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all"
        >
          <UserPlus className="w-4 h-4" />
          Registrar Usuario
        </button>
      </div>

      {msg && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{msg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl">
          {errorMsg}
        </div>
      )}

      {/* Users Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
            <tr>
              <th className="p-3.5">Usuario</th>
              <th className="p-3.5">Rol Asignado</th>
              <th className="p-3.5">Estado</th>
              <th className="p-3.5">Fecha Registro</th>
              <th className="p-3.5 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                <td className="p-3.5 font-semibold text-slate-200">{u.username}</td>
                <td className="p-3.5">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-600/15 border border-indigo-500/30 text-indigo-300 font-medium text-[11px]">
                    <Shield className="w-3 h-3" />
                    {u.role}
                  </span>
                </td>
                <td className="p-3.5">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    u.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                  }`}>
                    {u.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="p-3.5 text-slate-400">{new Date(u.created_at).toLocaleDateString('es-ES')}</td>
                <td className="p-3.5 text-right">
                  <button
                    onClick={() => {
                      setSelectedUser(u);
                      setNewRole(u.role);
                      setShowRoleModal(true);
                    }}
                    className="py-1 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors"
                  >
                    Cambiar Rol
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Cambiar Rol */}
      {showRoleModal && selectedUser && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md space-y-4">
            <h3 className="text-base font-bold text-slate-100">Modificar Rol de Usuario</h3>
            <p className="text-xs text-slate-400">Usuario: <span className="font-semibold text-slate-200">{selectedUser.username}</span></p>

            <form onSubmit={handleUpdateRole} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nuevo Rol</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                >
                  <option value="Administrador">Administrador</option>
                  <option value="Líder_QA">Líder_QA</option>
                  <option value="Analista_QA">Analista_QA</option>
                  <option value="UAT_Tester">UAT_Tester</option>
                  <option value="Observador">Observador</option>
                </select>
              </div>

              <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-[11px] text-yellow-300">
                Al cambiar el rol, todas las sesiones activas (JWT) del usuario se revocarán automáticamente (Req. 2.4).
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRoleModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-xl shadow"
                >
                  Actualizar Rol
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Registrar Usuario */}
      {showRegisterModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md space-y-4">
            <h3 className="text-base font-bold text-slate-100">Registrar Nuevo Usuario</h3>
            <form onSubmit={handleRegisterUser} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nombre de Usuario</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: analista_qa"
                  value={registerData.username}
                  onChange={(e) => setRegisterData({ ...registerData, username: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Contraseña</label>
                <input
                  type="password"
                  required
                  placeholder="Mín 10 chars, 1 Mayús, 1 Minús, 1 Núm"
                  value={registerData.password}
                  onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Rol Asignado</label>
                <select
                  value={registerData.role}
                  onChange={(e) => setRegisterData({ ...registerData, role: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                >
                  <option value="Administrador">Administrador</option>
                  <option value="Líder_QA">Líder_QA</option>
                  <option value="Analista_QA">Analista_QA</option>
                  <option value="UAT_Tester">UAT_Tester</option>
                  <option value="Observador">Observador</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-xl shadow"
                >
                  Registrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
