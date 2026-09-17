import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { User, AuditLog, SubscriptionPlan } from '../../types';
import { ExchangeRateWidget } from '../Common/ExchangeRateWidget';
import { 
  Users, 
  ShieldCheck, 
  CreditCard, 
  Activity, 
  CheckCircle2, 
  XCircle, 
  LogOut, 
  TrendingUp, 
  Clock, 
  AlertTriangle, 
  UserPlus, 
  Server, 
  Key, 
  X, 
  Calendar,
  Sparkles,
  RefreshCw,
  Ban,
  Trash2
} from 'lucide-react';

interface SuperAdminDashboardProps {
  user: any;
  onLogout: () => void;
}

export const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'workers' | 'subscriptions' | 'audit' | 'overview'>('workers');
  const [workers, setWorkers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Modal: Registrar Nuevo Trabajador
  const [showCreateWorkerModal, setShowCreateWorkerModal] = useState(false);
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newNationalId, setNewNationalId] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newPassword, setNewPassword] = useState('worker123');
  const [initialLicenseMonths, setInitialLicenseMonths] = useState(1);

  // Modal: Confirmar Eliminación de Usuario
  const [workerToDelete, setWorkerToDelete] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);

  // Modal: Gestionar Licencia de Usuario
  const [selectedWorkerForLicense, setSelectedWorkerForLicense] = useState<User | null>(null);
  const [licenseMode, setLicenseMode] = useState<'QUICK' | 'CUSTOM'>('QUICK');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [licenseActionLoading, setLicenseActionLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [workersRes, logsRes, plansRes, metricsRes] = await Promise.all([
        api.getWorkers(),
        api.getAuditLogs(),
        api.getPlans(),
        api.getMetrics(),
      ]);

      setWorkers(workersRes.workers || []);
      setAuditLogs(logsRes.logs || []);
      setPlans(plansRes.plans || []);
      setMetrics(metricsRes.metrics || null);
    } catch (err) {
      console.error('Error al cargar datos del Super Admin:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateWorker = async (workerId: string, status: string) => {
    try {
      await api.updateWorkerStatus(workerId, { status });
      showToast(`Estado actualizado a ${status}`, 'success');
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Error al actualizar usuario', 'error');
    }
  };

  const handleConfirmDelete = async () => {
    if (!workerToDelete) return;
    setDeletingUser(true);
    try {
      const res = await api.deleteWorker(workerToDelete.id);
      showToast(res.message || 'Usuario eliminado con éxito', 'success');
      setWorkerToDelete(null);
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Error al eliminar usuario', 'error');
    } finally {
      setDeletingUser(false);
    }
  };

  const handleCreateWorkerDirectly = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createWorker({
        firstName: newFirstName,
        lastName: newLastName,
        nationalId: newNationalId,
        email: newEmail,
        phone: newPhone,
        address: newAddress,
        password: newPassword,
        status: 'ACTIVE',
        initialLicenseMonths: Number(initialLicenseMonths),
      });
      showToast('Usuario registrado exitosamente con licencia activa', 'success');
      setShowCreateWorkerModal(false);
      setNewFirstName('');
      setNewLastName('');
      setNewNationalId('');
      setNewEmail('');
      setNewPhone('');
      setNewAddress('');
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Error al registrar usuario', 'error');
    }
  };

  const handleApplyLicense = async (unit: 'DAYS' | 'MONTHS' | 'YEARS' | 'CUSTOM', amount: number, customDate?: string) => {
    if (!selectedWorkerForLicense) return;
    setLicenseActionLoading(true);
    try {
      const res = await api.manageWorkerLicense(selectedWorkerForLicense.id, {
        unit,
        amount,
        customEndDate: customDate,
        status: 'ACTIVE',
      });
      showToast(res.message || 'Licencia actualizada con éxito', 'success');
      setSelectedWorkerForLicense(null);
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Error al aplicar licencia', 'error');
    } finally {
      setLicenseActionLoading(false);
    }
  };

  const handleRevokeLicense = async (workerId: string) => {
    setLicenseActionLoading(true);
    try {
      await api.revokeWorkerLicense(workerId);
      showToast('Licencia revocada con éxito. El usuario no podrá acceder.', 'success');
      setSelectedWorkerForLicense(null);
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Error al revocar licencia', 'error');
    } finally {
      setLicenseActionLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header SysAdmin */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 z-30">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-slate-800 flex items-center justify-center font-bold text-white shadow-md border border-amber-500/40">
            <Server className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center space-x-2">
              <span>Administración de Sistemas & Plataforma SaaS</span>
              <span className="px-2 py-0.5 text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full font-mono">
                Root SysAdmin
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              {user.firstName} {user.lastName} (Cédula: <span className="font-mono text-amber-400">{user.nationalId}</span>)
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 self-end sm:self-auto">
          {/* Tasa Oficial BCV en Vivo */}
          <ExchangeRateWidget />

          <button
            onClick={() => setShowCreateWorkerModal(true)}
            className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs rounded-lg flex items-center space-x-1.5 shadow transition"
          >
            <UserPlus className="w-4 h-4" />
            <span>Registrar Usuario</span>
          </button>

          <button
            onClick={onLogout}
            className="px-3 py-2 bg-red-950/40 hover:bg-red-900/60 text-red-300 text-xs font-semibold rounded-lg flex items-center space-x-1.5 border border-red-800/40 transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Salir</span>
          </button>
        </div>
      </header>

      {/* Navigation Tabs (Desktop / Tablet) */}
      <div className="hidden sm:flex bg-slate-900/50 border-b border-slate-800/60 px-6 space-x-6 overflow-x-auto">
        {[
          { id: 'workers', label: 'Administración de Usuarios & Licencias', icon: Users, badge: workers.filter(w => w.status === 'PENDING_APPROVAL' || !w.license?.isActive).length },
          { id: 'subscriptions', label: 'Licencias & Planes SaaS', icon: CreditCard },
          { id: 'overview', label: 'Métricas de Infraestructura', icon: TrendingUp },
          { id: 'audit', label: 'Auditoría & Logs de Seguridad', icon: Activity },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-3 text-sm font-semibold flex items-center space-x-2 border-b-2 transition flex-shrink-0 ${
                activeTab === tab.id
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="px-1.5 py-0.2 text-[10px] bg-amber-500 text-slate-950 font-bold rounded-full">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Main Container */}
      <main className="flex-1 p-3 sm:p-6 max-w-7xl w-full mx-auto pb-24 sm:pb-8">
        {loading ? (
          <div className="py-20 text-center text-slate-500 text-sm">Cargando datos de plataforma...</div>
        ) : (
          <>
            {/* Direct Tab: Usuarios y Control de Licencias */}
            {activeTab === 'workers' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                      <span>Directorio de Usuarios y Control de Licencias</span>
                      <span className="sm:hidden px-2 py-0.5 text-[10px] bg-amber-500/20 text-amber-300 rounded-full font-mono">
                        {workers.length}
                      </span>
                    </h2>
                    <p className="text-xs text-slate-400">Asigna, extiende por días/meses/años o revoca licencias de uso para cada profesional.</p>
                  </div>
                  <span className="hidden sm:inline-block text-xs text-slate-400 font-mono">{workers.length} cuentas registradas</span>
                </div>

                {/* VISTA MÓVIL: Tarjetas adaptadas a celulares con todas las opciones visibles */}
                <div className="block md:hidden space-y-3">
                  {workers.map((w) => {
                    const hasActiveLicense = w.license?.isActive;
                    const isExpired = w.license?.isExpired;
                    const daysLeft = w.license?.daysRemaining || 0;

                    return (
                      <div key={w.id} className="bg-slate-900 border border-slate-800/90 rounded-2xl p-4 shadow-xl space-y-3.5">
                        {/* Cabecera de la tarjeta: Nombre y Estado */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-bold text-white text-sm flex items-center gap-1.5">
                              <span>{w.firstName} {w.lastName}</span>
                              <span className="text-[10px] text-slate-400 font-normal">({w.role === 'SUPER_ADMIN' ? 'Admin' : 'Estilista/Barbero'})</span>
                            </div>
                            <div className="text-xs text-slate-400">{w.email}</div>
                          </div>
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border shrink-0 ${
                            w.status === 'ACTIVE'
                              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60'
                              : w.status === 'PENDING_APPROVAL'
                              ? 'bg-amber-950/80 text-amber-300 border-amber-800/60 animate-pulse'
                              : 'bg-red-950/80 text-red-300 border-red-800/60'
                          }`}>
                            {w.status === 'PENDING_APPROVAL' ? 'PENDIENTE' : w.status}
                          </span>
                        </div>

                        {/* Datos de Acceso y Contacto */}
                        <div className="grid grid-cols-2 gap-2 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/80 text-xs">
                          <div>
                            <span className="text-[10px] text-slate-500 uppercase block font-medium">Cédula (ID Login)</span>
                            <span className="font-mono text-amber-400 font-bold text-xs">{w.nationalId}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 uppercase block font-medium">Teléfono / WhatsApp</span>
                            <span className="text-slate-300 text-xs">{w.phone || 'N/A'}</span>
                          </div>
                          <div className="col-span-2 pt-1 border-t border-slate-800/60">
                            <span className="text-[10px] text-slate-500 uppercase block font-medium">Dirección / Salón</span>
                            <span className="text-slate-400 text-[11px] truncate block">{w.address || 'No especificada'}</span>
                          </div>
                        </div>

                        {/* Estado de Licencia */}
                        <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/60 text-xs">
                          <span className="text-[10px] text-slate-400 uppercase block font-semibold mb-1">Estado de Licencia:</span>
                          {hasActiveLicense ? (
                            <div className="flex items-center justify-between">
                              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-950/90 text-emerald-300 border border-emerald-800/70">
                                <Sparkles className="w-3 h-3 text-emerald-400" />
                                <span>Activa: {daysLeft} días</span>
                              </span>
                              <span className="text-[11px] text-slate-400 font-mono">
                                Vence: {w.license?.endDate ? new Date(w.license.endDate).toLocaleDateString() : 'N/A'}
                              </span>
                            </div>
                          ) : isExpired ? (
                            <div className="flex items-center justify-between">
                              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-950/90 text-red-300 border border-red-800/70">
                                <AlertTriangle className="w-3 h-3 text-red-400" />
                                <span>Expirada</span>
                              </span>
                              <span className="text-[11px] text-red-400/80 font-mono">
                                Venció: {w.license?.endDate ? new Date(w.license.endDate).toLocaleDateString() : 'N/A'}
                              </span>
                            </div>
                          ) : (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                              <span>Sin Licencia Asignada</span>
                            </span>
                          )}
                        </div>

                        {/* Botones de Acción Accesibles para Celulares */}
                        <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedWorkerForLicense(w);
                              setLicenseMode('QUICK');
                              if (w.license?.endDate) {
                                setCustomEndDate(w.license.endDate.split('T')[0]);
                              } else {
                                const nextMonth = new Date();
                                nextMonth.setMonth(nextMonth.getMonth() + 1);
                                setCustomEndDate(nextMonth.toISOString().split('T')[0]);
                              }
                            }}
                            className="flex-1 min-w-[130px] py-2.5 bg-amber-600 hover:bg-amber-500 active:scale-95 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 shadow transition"
                          >
                            <Key className="w-4 h-4" />
                            <span>Control Licencia</span>
                          </button>

                          {w.status === 'PENDING_APPROVAL' && (
                            <button
                              onClick={() => handleUpdateWorker(w.id, 'ACTIVE')}
                              className="px-3 py-2.5 bg-emerald-700 hover:bg-emerald-600 active:scale-95 text-white rounded-xl text-xs font-bold inline-flex items-center space-x-1 shadow"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Aprobar</span>
                            </button>
                          )}

                          {w.status === 'ACTIVE' && (
                            <button
                              onClick={() => handleUpdateWorker(w.id, 'SUSPENDED')}
                              className="px-3 py-2.5 bg-slate-800 hover:bg-red-950 active:scale-95 text-slate-300 hover:text-red-300 rounded-xl text-xs font-semibold inline-flex items-center space-x-1 border border-slate-700"
                            >
                              <XCircle className="w-4 h-4" />
                              <span>Suspender</span>
                            </button>
                          )}

                          {w.status === 'SUSPENDED' && (
                            <button
                              onClick={() => handleUpdateWorker(w.id, 'ACTIVE')}
                              className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-emerald-400 rounded-xl text-xs font-semibold inline-flex items-center space-x-1 border border-slate-700"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Reactivar</span>
                            </button>
                          )}

                          <button
                            onClick={() => setWorkerToDelete(w)}
                            className="p-2.5 bg-red-950/80 hover:bg-red-900 active:scale-95 text-red-300 rounded-xl border border-red-800/60 shadow transition"
                            title="Eliminar usuario"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* VISTA ESCRITORIO: Tabla completa con scroll horizontal seguro */}
                <div className="hidden md:block bg-slate-900 border border-slate-800 rounded-2xl overflow-x-auto shadow-xl">
                  <table className="w-full text-left text-xs min-w-[700px]">
                    <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                      <tr>
                        <th className="p-4">Usuario</th>
                        <th className="p-4">Cédula (ID Login)</th>
                        <th className="p-4">Contacto</th>
                        <th className="p-4">Estado Cuenta</th>
                        <th className="p-4">Estado Licencia / Vigencia</th>
                        <th className="p-4 text-right">Acciones SysAdmin</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      {workers.map((w) => {
                        const hasActiveLicense = w.license?.isActive;
                        const isExpired = w.license?.isExpired;
                        const daysLeft = w.license?.daysRemaining || 0;

                        return (
                          <tr key={w.id} className="hover:bg-slate-800/30 transition">
                            <td className="p-4">
                              <div className="font-semibold text-white text-sm">{w.firstName} {w.lastName}</div>
                              <div className="text-[11px] text-slate-500">{w.email}</div>
                            </td>
                            <td className="p-4 font-mono text-amber-400 font-bold">{w.nationalId}</td>
                            <td className="p-4">
                              <div>{w.phone}</div>
                              <div className="text-[11px] text-slate-500 truncate max-w-xs">{w.address}</div>
                            </td>
                            <td className="p-4">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border ${
                                w.status === 'ACTIVE'
                                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/50'
                                  : w.status === 'PENDING_APPROVAL'
                                  ? 'bg-amber-950/60 text-amber-300 border-amber-800/50 animate-pulse'
                                  : 'bg-red-950/60 text-red-300 border-red-800/50'
                              }`}>
                                {w.status === 'PENDING_APPROVAL' ? 'PENDIENTE' : w.status}
                              </span>
                            </td>
                            <td className="p-4">
                              {hasActiveLicense ? (
                                <div className="space-y-0.5">
                                  <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-800/60">
                                    <Sparkles className="w-3 h-3 text-emerald-400" />
                                    <span>Activa: {daysLeft} días restantes</span>
                                  </span>
                                  <div className="text-[10px] text-slate-500 font-mono">
                                    Vence: {w.license?.endDate ? new Date(w.license.endDate).toLocaleDateString() : 'N/A'}
                                  </div>
                                </div>
                              ) : isExpired ? (
                                <div className="space-y-0.5">
                                  <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-950/80 text-red-300 border border-red-800/60">
                                    <AlertTriangle className="w-3 h-3 text-red-400" />
                                    <span>Licencia Expirada</span>
                                  </span>
                                  <div className="text-[10px] text-red-400/70 font-mono">
                                    Venció: {w.license?.endDate ? new Date(w.license.endDate).toLocaleDateString() : 'N/A'}
                                  </div>
                                </div>
                              ) : (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                                  <span>Sin Licencia Asignada</span>
                                </span>
                              )}
                            </td>
                            <td className="p-4 text-right space-x-2">
                              <button
                                onClick={() => {
                                  setSelectedWorkerForLicense(w);
                                  setLicenseMode('QUICK');
                                  if (w.license?.endDate) {
                                    setCustomEndDate(w.license.endDate.split('T')[0]);
                                  } else {
                                    const nextMonth = new Date();
                                    nextMonth.setMonth(nextMonth.getMonth() + 1);
                                    setCustomEndDate(nextMonth.toISOString().split('T')[0]);
                                  }
                                }}
                                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-lg inline-flex items-center space-x-1.5 shadow transition"
                              >
                                <Key className="w-3.5 h-3.5" />
                                <span>Control Licencia</span>
                              </button>

                              {w.status === 'PENDING_APPROVAL' && (
                                <button
                                  onClick={() => handleUpdateWorker(w.id, 'ACTIVE')}
                                  className="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg font-semibold inline-flex items-center space-x-1"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Aprobar</span>
                                </button>
                              )}

                              {w.status === 'ACTIVE' && (
                                <button
                                  onClick={() => handleUpdateWorker(w.id, 'SUSPENDED')}
                                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-red-950 text-slate-400 hover:text-red-300 rounded-lg font-semibold inline-flex items-center space-x-1 border border-slate-700"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span>Suspender</span>
                                </button>
                              )}

                              {w.status === 'SUSPENDED' && (
                                <button
                                  onClick={() => handleUpdateWorker(w.id, 'ACTIVE')}
                                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-semibold inline-flex items-center space-x-1"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>Reactivar</span>
                                </button>
                              )}

                              <button
                                onClick={() => setWorkerToDelete(w)}
                                className="px-2.5 py-1.5 bg-red-950/80 hover:bg-red-900 text-red-300 hover:text-white rounded-lg font-semibold inline-flex items-center space-x-1 border border-red-800/60 shadow transition"
                                title="Eliminar cuenta y registros de este usuario"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Eliminar</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Subscriptions Tab */}
            {activeTab === 'subscriptions' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-white">Estado Global de Licencias y Suscripciones</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg">
                    <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Licencias Activas Vigentes</span>
                    <div className="mt-3 text-3xl font-bold text-emerald-400 font-mono">
                      {workers.filter(w => w.license?.isActive).length}
                    </div>
                    <span className="text-[11px] text-slate-500 mt-1 block">Usuarios con acceso habilitado</span>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg">
                    <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Licencias Expiradas / Sin Licencia</span>
                    <div className="mt-3 text-3xl font-bold text-red-400 font-mono">
                      {workers.filter(w => !w.license?.isActive).length}
                    </div>
                    <span className="text-[11px] text-slate-500 mt-1 block">Requieren renovación para operar</span>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg">
                    <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Total Cuentas Gestionadas</span>
                    <div className="mt-3 text-3xl font-bold text-white font-mono">
                      {workers.length}
                    </div>
                    <span className="text-[11px] text-slate-500 mt-1 block">Base de usuarios en la plataforma</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {plans.map((p) => (
                    <div key={p.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-lg font-bold text-white">{p.name}</h3>
                          <p className="text-xs text-slate-400 mt-1">{p.description}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-2xl font-bold font-mono text-amber-400">${Number(p.price).toFixed(2)}</span>
                          <span className="text-xs text-slate-500 block">/ {p.billingCycle.toLowerCase()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Overview Metrics */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg">
                    <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Total Usuarios</span>
                    <div className="mt-3 text-3xl font-bold text-white font-mono">{metrics?.totalWorkers || 0}</div>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg">
                    <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Usuarios Activos</span>
                    <div className="mt-3 text-3xl font-bold text-emerald-400 font-mono">{metrics?.activeWorkers || 0}</div>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg">
                    <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Pendientes de Aprobación</span>
                    <div className="mt-3 text-3xl font-bold text-amber-400 font-mono">{metrics?.pendingWorkers || 0}</div>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg">
                    <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Licencias Activas</span>
                    <div className="mt-3 text-3xl font-bold text-amber-500 font-mono">{metrics?.activeSubscriptions || 0}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Audit Logs */}
            {activeTab === 'audit' && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h2 className="text-base font-bold text-white">Registro de Eventos de Seguridad & Auditoría</h2>
                    <p className="text-xs text-slate-400">Historial inmutable de operaciones administrativas y cambios de estado.</p>
                  </div>
                  <button
                    onClick={loadData}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold flex items-center space-x-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Actualizar</span>
                  </button>
                </div>

                <div className="divide-y divide-slate-800/80 max-h-[600px] overflow-y-auto">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="py-3 flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <Activity className="w-4 h-4 text-amber-500 mt-1" />
                        <div>
                          <div className="text-xs font-semibold text-white">
                            {log.action} <span className="text-slate-500 font-normal font-mono">({log.targetEntity})</span>
                          </div>
                          <div className="text-slate-400 text-[11px] mt-0.5">
                            Actor: {log.actor ? `${log.actor.firstName} ${log.actor.lastName} (${log.actor.nationalId})` : 'Sistema Automático'}
                          </div>
                          {log.metadata && (
                            <pre className="mt-1 text-[10px] text-slate-500 font-mono bg-slate-950 p-2 rounded max-w-xl overflow-x-auto">
                              {JSON.stringify(log.metadata, null, 2)}
                            </pre>
                          )}
                        </div>
                      </div>
                      <div className="text-right text-[11px] text-slate-500 flex items-center space-x-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{new Date(log.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Floating Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-2xl border flex items-center space-x-3 text-xs font-semibold backdrop-blur-md transition-all ${
          toast.type === 'success'
            ? 'bg-emerald-950/90 border-emerald-600/80 text-emerald-200'
            : 'bg-red-950/90 border-red-600/80 text-red-200'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <AlertTriangle className="w-5 h-5 text-red-400" />}
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="text-slate-400 hover:text-white ml-2">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Modal: Confirmación de Eliminación */}
      {workerToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-red-900/60 w-full max-w-md rounded-2xl shadow-2xl p-6 relative">
            <h3 className="text-lg font-bold text-white flex items-center space-x-2">
              <Trash2 className="w-5 h-5 text-red-400" />
              <span>Confirmar Eliminación de Usuario</span>
            </h3>
            <p className="text-xs text-slate-300 mt-3">
              ¿Estás seguro de que deseas eliminar permanentemente la cuenta de <strong className="text-white">{workerToDelete.firstName} {workerToDelete.lastName}</strong> (Cédula: <span className="font-mono text-amber-400 font-bold">{workerToDelete.nationalId}</span>)?
            </p>
            <div className="text-[11px] text-red-300 bg-red-950/60 p-3 rounded-xl border border-red-900/50 mt-3">
              ⚠️ Esta acción eliminará su acceso y todos sus registros (clientas, citas, servicios y licencias) de forma irreversible.
            </div>
            <div className="mt-5 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setWorkerToDelete(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deletingUser}
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold shadow disabled:opacity-40"
              >
                {deletingUser ? 'Eliminando...' : 'Sí, Eliminar Usuario'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Gestión y Control de Licencias */}
      {selectedWorkerForLicense && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl p-6 relative">
            <button
              onClick={() => setSelectedWorkerForLicense(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2 text-amber-400 mb-1">
              <Key className="w-5 h-5" />
              <h2 className="text-lg font-bold text-white">Control de Licencia SaaS</h2>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Profesional: <strong className="text-white">{selectedWorkerForLicense.firstName} {selectedWorkerForLicense.lastName}</strong> (Cédula: <span className="font-mono text-amber-400">{selectedWorkerForLicense.nationalId}</span>)
            </p>

            {/* Estado Actual */}
            <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl mb-4 text-xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Estado de Acceso:</span>
                <span className={`font-bold px-2.5 py-0.5 rounded-full text-[10px] ${
                  selectedWorkerForLicense.license?.isActive 
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60' 
                    : 'bg-red-950 text-red-300 border border-red-800/60'
                }`}>
                  {selectedWorkerForLicense.license?.isActive ? 'ACTIVA Y VIGENTE' : 'SIN LICENCIA / VENCIDA'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Fecha de Expiración:</span>
                <span className="font-mono font-semibold text-white">
                  {selectedWorkerForLicense.license?.endDate ? new Date(selectedWorkerForLicense.license.endDate).toLocaleDateString() : 'Sin fecha asignada'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Días de Acceso Restantes:</span>
                <span className="font-mono font-bold text-amber-400 text-sm">
                  {selectedWorkerForLicense.license?.daysRemaining || 0} días
                </span>
              </div>
            </div>

            {/* Selector de Modo */}
            <div className="flex space-x-2 mb-4 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setLicenseMode('QUICK')}
                className={`flex-1 py-1.5 rounded-lg transition ${
                  licenseMode === 'QUICK' ? 'bg-amber-600 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                ⚡ Extensión Rápida
              </button>
              <button
                type="button"
                onClick={() => setLicenseMode('CUSTOM')}
                className={`flex-1 py-1.5 rounded-lg transition ${
                  licenseMode === 'CUSTOM' ? 'bg-amber-600 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                📅 Fijar Fecha Exacta
              </button>
            </div>

            {licenseMode === 'QUICK' && (
              <div className="space-y-3 mb-6">
                <label className="block text-slate-300 text-xs font-semibold">
                  Selecciona el tiempo a agregar a la licencia:
                </label>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  <button
                    type="button"
                    disabled={licenseActionLoading}
                    onClick={() => handleApplyLicense('DAYS', 7)}
                    className="p-2.5 bg-slate-800 hover:bg-amber-600 hover:text-slate-950 rounded-lg text-slate-200 font-bold border border-slate-700 transition"
                  >
                    +7 Días (Prueba)
                  </button>
                  <button
                    type="button"
                    disabled={licenseActionLoading}
                    onClick={() => handleApplyLicense('DAYS', 15)}
                    className="p-2.5 bg-slate-800 hover:bg-amber-600 hover:text-slate-950 rounded-lg text-slate-200 font-bold border border-slate-700 transition"
                  >
                    +15 Días
                  </button>
                  <button
                    type="button"
                    disabled={licenseActionLoading}
                    onClick={() => handleApplyLicense('MONTHS', 1)}
                    className="p-2.5 bg-slate-800 hover:bg-amber-600 hover:text-slate-950 rounded-lg text-slate-200 font-bold border border-slate-700 transition"
                  >
                    +1 Mes (30 días)
                  </button>
                  <button
                    type="button"
                    disabled={licenseActionLoading}
                    onClick={() => handleApplyLicense('MONTHS', 3)}
                    className="p-2.5 bg-slate-800 hover:bg-amber-600 hover:text-slate-950 rounded-lg text-slate-200 font-bold border border-slate-700 transition"
                  >
                    +3 Meses
                  </button>
                  <button
                    type="button"
                    disabled={licenseActionLoading}
                    onClick={() => handleApplyLicense('MONTHS', 6)}
                    className="p-2.5 bg-slate-800 hover:bg-amber-600 hover:text-slate-950 rounded-lg text-slate-200 font-bold border border-slate-700 transition"
                  >
                    +6 Meses
                  </button>
                  <button
                    type="button"
                    disabled={licenseActionLoading}
                    onClick={() => handleApplyLicense('YEARS', 1)}
                    className="p-2.5 bg-amber-600 hover:bg-amber-500 text-slate-950 rounded-lg font-bold shadow transition"
                  >
                    +1 Año (365 días)
                  </button>
                </div>
              </div>
            )}

            {licenseMode === 'CUSTOM' && (
              <div className="space-y-3 mb-6 text-xs">
                <label className="block text-slate-300 font-semibold">
                  Selecciona la fecha exacta en la que debe expirar la licencia:
                </label>
                
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
                  />
                  <button
                    type="button"
                    disabled={licenseActionLoading || !customEndDate}
                    onClick={() => handleApplyLicense('CUSTOM', 0, customEndDate)}
                    className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 rounded-lg font-bold disabled:opacity-40 shadow transition"
                  >
                    Establecer Fecha
                  </button>
                </div>

                {customEndDate && (() => {
                  const parts = customEndDate.split('-');
                  if (parts.length === 3) {
                    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 23, 59, 59);
                    const diffDays = Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                    return (
                      <div className="text-[11px] text-amber-300 bg-amber-950/40 p-2.5 rounded-lg border border-amber-800/50 mt-2">
                        🗓️ La licencia quedará configurada hasta el <strong>{d.toLocaleDateString()}</strong> ({diffDays > 0 ? `${diffDays} días a partir de hoy` : 'Fecha en el pasado'}).
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            )}

            <div className="pt-4 border-t border-slate-800 flex justify-between items-center">
              <button
                type="button"
                disabled={licenseActionLoading || !selectedWorkerForLicense.license?.isActive}
                onClick={() => handleRevokeLicense(selectedWorkerForLicense.id)}
                className="px-3 py-1.5 bg-red-950/60 hover:bg-red-900 text-red-300 rounded-lg text-xs font-semibold border border-red-800/40 flex items-center space-x-1 disabled:opacity-40"
              >
                <Ban className="w-3.5 h-3.5" />
                <span>Revocar Licencia Inmediatamente</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedWorkerForLicense(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Registrar Usuario Directamente */}
      {showCreateWorkerModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl p-6 relative">
            <button
              onClick={() => setShowCreateWorkerModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-bold text-white flex items-center space-x-2 mb-1">
              <UserPlus className="w-5 h-5 text-amber-400" />
              <span>Registrar Nuevo Usuario / Trabajador</span>
            </h2>
            <p className="text-xs text-slate-400 mb-5">
              Crea una cuenta con activación y asignación de licencia inicial inmediata.
            </p>

            <form onSubmit={handleCreateWorkerDirectly} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Nombre</label>
                  <input
                    type="text"
                    required
                    value={newFirstName}
                    onChange={(e) => setNewFirstName(e.target.value)}
                    placeholder="Ej. Maresa"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Apellido</label>
                  <input
                    type="text"
                    required
                    value={newLastName}
                    onChange={(e) => setNewLastName(e.target.value)}
                    placeholder="Ej. Navarro"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Número de Cédula <span className="text-amber-400 font-semibold">(ID Login)</span>
                </label>
                <input
                  type="text"
                  required
                  value={newNationalId}
                  onChange={(e) => setNewNationalId(e.target.value)}
                  placeholder="Ej. 24620872"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Correo Electrónico</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="maresa@email.com"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Celular / WhatsApp</label>
                  <input
                    type="tel"
                    required
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="+58414..."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Contraseña Inicial</label>
                  <input
                    type="text"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Dirección</label>
                  <input
                    type="text"
                    required
                    value={newAddress}
                    onChange={(e) => setNewAddress(e.target.value)}
                    placeholder="Caracas"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Licencia Inicial</label>
                  <select
                    value={initialLicenseMonths}
                    onChange={(e) => setInitialLicenseMonths(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
                  >
                    <option value={1}>1 Mes (30 días)</option>
                    <option value={3}>3 Meses</option>
                    <option value={6}>6 Meses</option>
                    <option value={12}>1 Año (365 días)</option>
                    <option value={0}>Sin licencia inicial (bloqueado)</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCreateWorkerModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-lg shadow"
                >
                  Crear Usuario con Licencia
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 border-t border-slate-800 backdrop-blur-lg px-2 py-2 flex items-center justify-around shadow-2xl">
        {[
          { id: 'workers', label: 'Usuarios', icon: Users, badge: workers.filter(w => w.status === 'PENDING_APPROVAL' || !w.license?.isActive).length },
          { id: 'subscriptions', label: 'Licencias', icon: CreditCard },
          { id: 'overview', label: 'Métricas', icon: TrendingUp },
          { id: 'audit', label: 'Auditoría', icon: Activity },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex flex-col items-center justify-center py-1 rounded-xl transition relative ${
                isActive ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="absolute -top-1 -right-2 px-1 text-[9px] bg-amber-500 text-slate-950 font-bold rounded-full">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight">{tab.label}</span>
            </button>
          );
        })}

        <button
          onClick={() => setShowCreateWorkerModal(true)}
          className="flex-1 flex flex-col items-center justify-center py-1 text-amber-500 hover:text-amber-400 transition"
        >
          <div className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow">
            <UserPlus className="w-3.5 h-3.5" />
          </div>
          <span className="text-[10px] mt-0.5 font-bold text-amber-400">+Nuevo</span>
        </button>
      </nav>
    </div>
  );
};
