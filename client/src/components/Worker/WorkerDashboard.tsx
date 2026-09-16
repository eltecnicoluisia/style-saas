import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Clienta, Servicio, Cita } from '../../types';
import { CalendarView } from './CalendarView';
import { ExchangeRateWidget } from '../Common/ExchangeRateWidget';
import { 
  Calendar, 
  Users, 
  Scissors, 
  Plus, 
  DollarSign, 
  LogOut, 
  Phone, 
  MapPin, 
  Sparkles, 
  X, 
  Search, 
  CalendarCheck, 
  ShieldAlert, 
  Key, 
  Edit2, 
  Trash2,
  CheckCircle2,
  AlertTriangle,
  MessageCircle,
  FileText,
  Send,
  Copy,
  Check
} from 'lucide-react';

interface WorkerDashboardProps {
  user: any;
  onLogout: () => void;
}

export const WorkerDashboard: React.FC<WorkerDashboardProps> = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'calendar' | 'clientas' | 'servicios'>('calendar');
  const [loading, setLoading] = useState(true);
  const [licenseError, setLicenseError] = useState<string | null>(null);
  const [bcvRate, setBcvRate] = useState<number>(846.50);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Data State
  const [summary, setSummary] = useState<any>(null);
  const [citas, setCitas] = useState<Cita[]>([]);
  const [clientas, setClientas] = useState<Clienta[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [showNewClientaModal, setShowNewClientaModal] = useState(false);
  const [showNewServicioModal, setShowNewServicioModal] = useState(false);
  const [showNewCitaModal, setShowNewCitaModal] = useState(false);

  // Modals de Edición y Eliminación de Cliente
  const [editingClienta, setEditingClienta] = useState<Clienta | null>(null);
  const [editCNombre, setEditCNombre] = useState('');
  const [editCTelefono, setEditCTelefono] = useState('');
  const [editCDireccion, setEditCDireccion] = useState('');
  const [clientaToDelete, setClientaToDelete] = useState<Clienta | null>(null);

  // Modals de Edición y Eliminación de Servicio
  const [editingServicio, setEditingServicio] = useState<Servicio | null>(null);
  const [editSNombre, setEditSNombre] = useState('');
  const [editSPrecio, setEditSPrecio] = useState<number>(20);
  const [servicioToDelete, setServicioToDelete] = useState<Servicio | null>(null);

  // Modal de Factura / Recibo Digital WhatsApp
  const [activeInvoiceCita, setActiveInvoiceCita] = useState<Cita | null>(null);
  const [copiedInvoice, setCopiedInvoice] = useState(false);

  // Formulario: Registrar Cliente (Solo 3 campos: Nombre, Teléfono, Dirección Corta)
  const [cNombre, setCNombre] = useState('');
  const [cTelefono, setCTelefono] = useState('');
  const [cDireccion, setCDireccion] = useState('');

  // Formulario: Crear Servicio (Solo 2 campos: Cuál es el servicio, Precio en $)
  const [sNombre, setSNombre] = useState('');
  const [sPrecio, setSPrecio] = useState<number>(20);

  // New Cita Form
  const [selectedClientaId, setSelectedClientaId] = useState('');
  const [selectedServicioId, setSelectedServicioId] = useState('');
  const [citaFecha, setCitaFecha] = useState(new Date().toISOString().split('T')[0]);
  const [citaHora, setCitaHora] = useState('10:00');
  const [citaPrecio, setCitaPrecio] = useState(20);
  const [citaNotas, setCitaNotas] = useState('');

  const loadData = async () => {
    setLoading(true);
    setLicenseError(null);
    try {
      const [dashRes, clientsRes, srvRes, appRes] = await Promise.all([
        api.getWorkerDashboard(),
        api.getClients(),
        api.getServices(),
        api.getAppointments(),
      ]);

      setSummary(dashRes.summary || {});
      setClientas(clientsRes.clientas || []);
      setServicios(srvRes.servicios || []);
      setCitas(appRes.appointments || []);

      if (clientsRes.clientas?.length > 0 && !selectedClientaId) {
        setSelectedClientaId(clientsRes.clientas[0].id);
      }
      if (srvRes.servicios?.length > 0) {
        if (!selectedServicioId) {
          setSelectedServicioId(srvRes.servicios[0].id);
          setCitaPrecio(Number(srvRes.servicios[0].precio));
        }
      }
    } catch (err: any) {
      if (err.code === 'LICENSE_EXPIRED' || err.status === 403) {
        setLicenseError(err.message || 'Tu licencia ha expirado. Contacta al Administrador de Sistemas.');
      } else {
        console.error(err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateClienta = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.createClient({
        nombre: cNombre,
        telefono: cTelefono,
        direccion: cDireccion,
      });

      showToast('Cliente registrado con éxito', 'success');
      setShowNewClientaModal(false);
      setCNombre('');
      setCTelefono('');
      setCDireccion('');
      if (res.clienta?.id) setSelectedClientaId(res.clienta.id);
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Error al registrar cliente', 'error');
    }
  };

  // Helper: Formato de Enlace de WhatsApp
  const formatWhatsAppLink = (phone?: string | null, text?: string) => {
    if (!phone) return '#';
    let clean = phone.replace(/[^0-9]/g, '');
    if (clean.startsWith('0')) {
      clean = '58' + clean.slice(1);
    } else if (!clean.startsWith('58') && clean.length === 10) {
      clean = '58' + clean;
    }
    const baseUrl = `https://wa.me/${clean}`;
    return text ? `${baseUrl}?text=${encodeURIComponent(text)}` : baseUrl;
  };

  // Helper: Generador de Texto de Factura / Recibo para WhatsApp
  const generateInvoiceText = (cita: Cita) => {
    const fechaStr = new Date(cita.fechaHora).toLocaleDateString('es-VE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const horaStr = new Date(cita.fechaHora).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    const totalUsd = Number(cita.precioCobrado || 0).toFixed(2);
    const totalBs = (Number(cita.precioCobrado || 0) * bcvRate).toLocaleString('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const rateStr = bcvRate.toLocaleString('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    return `🧾 *COMPROBANTE DE ATENCIÓN / RECIBO DIGITAL*\n` +
           `━━━━━━━━━━━━━━━━━━━━━━\n` +
           `👤 *Cliente:* ${cita.clienta?.nombre || 'Cliente'}\n` +
           `💼 *Profesional:* ${user.firstName} ${user.lastName}\n` +
           `📅 *Fecha y Hora:* ${fechaStr} a las ${horaStr}\n` +
           `✂️ *Servicio:* ${cita.servicio?.nombre || 'Servicio General'}\n` +
           `━━━━━━━━━━━━━━━━━━━━━━\n` +
           `💵 *Total:* $${totalUsd}\n` +
           `📊 *Tasa BCV Oficial:* Bs. ${rateStr} / USD\n` +
           `🇻🇪 *Equivalente:* Bs. ${totalBs}\n` +
           `━━━━━━━━━━━━━━━━━━━━━━\n` +
           `✅ *Estado:* CULMINADO / PAGADO\n\n` +
           `✨ *¡Muchas gracias por su preferencia y confianza!* ⭐`;
  };

  const handleCopyInvoice = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedInvoice(true);
      showToast('Factura copiada al portapapeles', 'success');
      setTimeout(() => setCopiedInvoice(false), 3000);
    } catch {
      showToast('No se pudo copiar automáticamente', 'error');
    }
  };

  const handleOpenEditClienta = (cl: Clienta) => {
    setEditingClienta(cl);
    setEditCNombre(cl.nombre);
    setEditCTelefono(cl.telefono || '');
    setEditCDireccion(cl.direccion || '');
  };

  const handleUpdateClienta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClienta) return;
    try {
      await api.updateClient(editingClienta.id, {
        nombre: editCNombre,
        telefono: editCTelefono,
        direccion: editCDireccion,
      });
      showToast('Cliente actualizado con éxito', 'success');
      setEditingClienta(null);
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Error al actualizar cliente', 'error');
    }
  };

  const handleDeleteClienta = async () => {
    if (!clientaToDelete) return;
    try {
      await api.deleteClient(clientaToDelete.id);
      showToast('Cliente eliminado con éxito', 'success');
      setClientaToDelete(null);
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Error al eliminar cliente', 'error');
    }
  };

  const handleCreateServicio = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.createService({
        nombre: sNombre,
        precio: Number(sPrecio),
      });
      showToast('Servicio creado con éxito', 'success');
      setShowNewServicioModal(false);
      setSNombre('');
      setSPrecio(20);
      setSelectedServicioId(res.servicio.id);
      setCitaPrecio(Number(res.servicio.precio));
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Error al crear servicio', 'error');
    }
  };

  const handleOpenEditServicio = (srv: Servicio) => {
    setEditingServicio(srv);
    setEditSNombre(srv.nombre);
    setEditSPrecio(Number(srv.precio));
  };

  const handleUpdateServicio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingServicio) return;
    try {
      await api.updateService(editingServicio.id, {
        nombre: editSNombre,
        precio: Number(editSPrecio),
      });
      showToast('Servicio actualizado con éxito', 'success');
      setEditingServicio(null);
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Error al actualizar servicio', 'error');
    }
  };

  const handleDeleteServicio = async () => {
    if (!servicioToDelete) return;
    try {
      await api.deleteService(servicioToDelete.id);
      showToast('Servicio eliminado con éxito', 'success');
      setServicioToDelete(null);
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Error al eliminar servicio', 'error');
    }
  };

  const handleCreateCita = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const fechaHoraISO = new Date(`${citaFecha}T${citaHora}:00`).toISOString();
      const srv = servicios.find(s => s.id === selectedServicioId);

      await api.createAppointment({
        clientaId: selectedClientaId,
        servicioId: selectedServicioId,
        fechaHora: fechaHoraISO,
        duracionMinutos: srv ? srv.duracion : 45,
        precioCobrado: Number(citaPrecio),
        notas: citaNotas,
      });

      setShowNewCitaModal(false);
      setCitaNotas('');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Error al agendar cita');
    }
  };

  const handleUpdateCitaStatus = async (citaId: string, status: string) => {
    try {
      await api.updateAppointmentStatus(citaId, status);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Error al actualizar cita');
    }
  };

  const handleSelectDateToBook = (dateStr: string, timeStr: string) => {
    setCitaFecha(dateStr);
    setCitaHora(timeStr);
    setShowNewCitaModal(true);
  };

  const filteredClientas = clientas.filter(c =>
    c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.telefono?.includes(searchTerm)
  );

  // Pantalla de Bloqueo si la licencia expiró
  if (licenseError) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-6 text-center">
        <div className="bg-slate-900 border border-red-800/60 max-w-md w-full p-8 rounded-2xl shadow-2xl space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-red-950 border border-red-800 flex items-center justify-center mx-auto text-red-400">
            <ShieldAlert className="w-9 h-9" />
          </div>
          <h2 className="text-xl font-bold text-white">Licencia No Activa / Vencida</h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            {licenseError}
          </p>
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-left text-xs space-y-1 text-slate-400">
            <div>Profesional: <strong className="text-white">{user.firstName} {user.lastName}</strong></div>
            <div>Cédula: <span className="font-mono text-amber-400">{user.nationalId}</span></div>
          </div>
          <div className="pt-2 flex space-x-3">
            <button
              onClick={loadData}
              className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg transition"
            >
              Reintentar
            </button>
            <button
              onClick={onLogout}
              className="flex-1 py-2 bg-red-900 hover:bg-red-800 text-white text-xs font-bold rounded-lg transition"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header Responsivo */}
      <header className="bg-slate-900 border-b border-slate-800 px-3 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sticky top-0 z-30 shadow-md">
        <div className="flex items-center justify-between sm:justify-start space-x-3 w-full sm:w-auto">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-700 flex items-center justify-center font-bold text-slate-950 shadow-md flex-shrink-0">
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-slate-950" />
            </div>
            <div>
              <h1 className="text-sm sm:text-lg font-bold tracking-tight text-white flex items-center space-x-1.5">
                <span className="truncate max-w-[170px] sm:max-w-none">Portal Profesional</span>
                <span className="px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full font-mono flex items-center space-x-1 flex-shrink-0">
                  <Key className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-400" />
                  <span>Activo</span>
                </span>
              </h1>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate max-w-[210px] sm:max-w-none">
                {user.firstName} {user.lastName} (Cédula: <span className="font-mono text-amber-400">{user.nationalId}</span>)
              </p>
            </div>
          </div>

          {/* Botón Salir Móvil */}
          <button
            onClick={onLogout}
            className="sm:hidden p-2 bg-red-950/40 hover:bg-red-900/60 text-red-300 rounded-xl border border-red-800/40 transition active:scale-95"
            title="Cerrar Sesión"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-between sm:justify-end space-x-2 sm:space-x-3 w-full sm:w-auto">
          {/* Tasa Oficial BCV */}
          <ExchangeRateWidget onRateLoaded={setBcvRate} />

          <button
            onClick={() => setShowNewCitaModal(true)}
            className="px-3 sm:px-3.5 py-1.5 sm:py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 text-xs font-bold rounded-xl flex items-center space-x-1 shadow transition active:scale-95 flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Agendar Cita</span>
            <span className="sm:hidden">Agendar</span>
          </button>

          <button
            onClick={onLogout}
            className="hidden sm:flex px-3 py-2 bg-red-950/40 hover:bg-red-900/60 text-red-300 text-xs font-semibold rounded-xl items-center space-x-1.5 border border-red-800/40 transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Salir</span>
          </button>
        </div>
      </header>

      {/* Tabs Desktop (ocultos en móvil porque usamos la barra inferior nativa) */}
      <div className="hidden sm:flex bg-slate-900/50 border-b border-slate-800/60 px-6 space-x-8">
        {[
          { id: 'calendar', label: 'Mi Calendario & Agenda', icon: Calendar, badge: citas.filter(c => c.estado === 'SCHEDULED').length },
          { id: 'clientas', label: 'Mis Clientas', icon: Users, badge: clientas.length },
          { id: 'servicios', label: 'Mis Servicios & Tarifas', icon: Scissors, badge: servicios.length },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-3 text-sm font-semibold flex items-center space-x-2 border-b-2 transition ${
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

      {/* Barra de Navegación Inferior Móvil (Mobile Bottom Navigation Bar) */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800 px-3 py-1.5 flex justify-around items-center shadow-2xl safe-area-bottom">
        {[
          { id: 'calendar', label: 'Agenda', icon: Calendar, badge: citas.filter(c => c.estado === 'SCHEDULED').length },
          { id: 'clientas', label: 'Clientes', icon: Users, badge: clientas.length },
          { id: 'servicios', label: 'Servicios', icon: Scissors, badge: servicios.length },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-1.5 flex flex-col items-center justify-center relative transition rounded-xl ${
                isActive ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 px-1 min-w-[16px] h-4 bg-amber-500 text-slate-950 font-extrabold text-[9px] rounded-full flex items-center justify-center font-mono">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-1">{tab.label}</span>
            </button>
          );
        })}

        {/* Botón Central Rápido para Agendar */}
        <button
          onClick={() => setShowNewCitaModal(true)}
          className="flex-1 py-1 flex flex-col items-center justify-center text-amber-300 font-bold active:scale-95 transition"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-600 to-amber-500 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Plus className="w-5 h-5 text-slate-950 stroke-[3]" />
          </div>
          <span className="text-[10px] mt-0.5 font-bold text-amber-400">+Cita</span>
        </button>
      </div>

      {/* Main Content */}
      <main className="flex-1 p-3 sm:p-6 pb-28 sm:pb-8 max-w-6xl w-full mx-auto space-y-4 sm:space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-2xl shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Ingresos Generados</span>
              <DollarSign className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="mt-2 sm:mt-3 text-xl sm:text-2xl font-bold text-emerald-300 font-mono">
              ${Number(summary?.totalIngresos || 0).toFixed(2)}
            </div>
            <span className="text-[10px] sm:text-[11px] text-slate-500 mt-1 block">Facturación de citas concluidas</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-2xl shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Citas Programadas (Hoy)</span>
              <CalendarCheck className="w-5 h-5 text-amber-400" />
            </div>
            <div className="mt-2 sm:mt-3 text-xl sm:text-2xl font-bold text-amber-300 font-mono">
              {summary?.todayAppointmentsCount || 0}
            </div>
            <span className="text-[10px] sm:text-[11px] text-slate-500 mt-1 block">Atenciones agendadas para el día</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-2xl shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Cartera de Clientes</span>
              <Users className="w-5 h-5 text-purple-400" />
            </div>
            <div className="mt-2 sm:mt-3 text-xl sm:text-2xl font-bold text-white font-mono">
              {summary?.totalClientas || 0}
            </div>
            <span className="text-[10px] sm:text-[11px] text-slate-500 mt-1 block">Fichas de clientes registradas</span>
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center text-slate-500 text-sm">Cargando datos...</div>
        ) : (
          <>
            {/* Tab: Mi Calendario & Agenda */}
            {activeTab === 'calendar' && (
              <CalendarView
                citas={citas}
                clientas={clientas}
                servicios={servicios}
                onSelectDateToBook={handleSelectDateToBook}
                onUpdateStatus={handleUpdateCitaStatus}
                onOpenInvoice={(c) => setActiveInvoiceCita(c)}
              />
            )}

            {/* Tab: Mis Clientas */}
            {activeTab === 'clientas' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="relative flex-1 max-w-md">
                    <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="Buscar por nombre, teléfono o dirección..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <button
                    onClick={() => setShowNewClientaModal(true)}
                    className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 text-xs font-bold rounded-xl flex items-center space-x-1.5 shadow transition self-start sm:self-auto"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Nueva Clienta</span>
                  </button>
                </div>

                {filteredClientas.length === 0 ? (
                  <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center">
                    <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <h3 className="text-sm font-semibold text-slate-300">No hay clientas registradas</h3>
                    <p className="text-xs text-slate-500 mt-1">Haz clic en "Nueva Clienta" para crear tu primera ficha.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredClientas.map((cl) => (
                      <div key={cl.id} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg hover:border-slate-700 transition flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start">
                            <h3 className="font-bold text-white text-base">{cl.nombre}</h3>
                            <span className="px-2 py-0.5 bg-slate-800 text-amber-300 rounded text-[10px] font-mono font-semibold">
                              {cl._count?.citas || 0} Citas
                            </span>
                          </div>

                          <div className="mt-3 space-y-2 text-xs text-slate-400">
                            {cl.telefono && (
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                                  <span className="font-mono text-slate-300">{cl.telefono}</span>
                                </div>
                                <a
                                  href={formatWhatsAppLink(cl.telefono, `Hola ${cl.nombre}, ¡un gusto saludarte!`)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-semibold transition"
                                  title="Abrir chat en WhatsApp"
                                >
                                  <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>WhatsApp</span>
                                </a>
                              </div>
                            )}

                            {cl.direccion && (
                              <div className="flex items-center space-x-2 text-slate-300">
                                <MapPin className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                                <span className="truncate">{cl.direccion}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Botones de Acción: Editar y Eliminar */}
                        <div className="mt-4 pt-3 border-t border-slate-800/80 flex justify-end space-x-2">
                          <button
                            onClick={() => handleOpenEditClienta(cl)}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg inline-flex items-center space-x-1 transition"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-amber-400" />
                            <span>Editar</span>
                          </button>
                          <button
                            onClick={() => setClientaToDelete(cl)}
                            className="px-3 py-1.5 bg-red-950/60 hover:bg-red-900 text-red-300 text-xs font-semibold rounded-lg inline-flex items-center space-x-1 border border-red-800/40 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Eliminar</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab: Mis Servicios */}
            {activeTab === 'servicios' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-base font-bold text-white">Catálogo de Servicios Propios</h2>
                    <p className="text-xs text-slate-400">Define el servicio y tu precio en dólares ($). El sistema calcula el equivalente en Bolívares.</p>
                  </div>

                  <button
                    onClick={() => setShowNewServicioModal(true)}
                    className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 text-xs font-bold rounded-xl flex items-center space-x-1.5 shadow transition"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Crear Servicio</span>
                  </button>
                </div>

                {servicios.length === 0 ? (
                  <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center">
                    <Scissors className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <h3 className="text-sm font-semibold text-slate-300">No has registrado servicios todavía</h3>
                    <p className="text-xs text-slate-500 mt-1">Haz clic en "Crear Servicio" para definir qué servicio ofreces y su precio.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {servicios.map((srv) => (
                      <div key={srv.id} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg relative flex flex-col justify-between hover:border-slate-700 transition">
                        <div>
                          <div className="flex justify-between items-start">
                            <h3 className="font-bold text-white text-base">{srv.nombre}</h3>
                            <div className="text-right">
                              <span className="text-xl font-bold font-mono text-emerald-400">
                                ${Number(srv.precio).toFixed(2)}
                              </span>
                              <div className="text-[11px] text-amber-400 font-mono">
                                ~ Bs. {(Number(srv.precio) * bcvRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-5 pt-3 border-t border-slate-800 flex justify-end space-x-2">
                          <button
                            onClick={() => handleOpenEditServicio(srv)}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg inline-flex items-center space-x-1 transition"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-amber-400" />
                            <span>Editar</span>
                          </button>
                          <button
                            onClick={() => setServicioToDelete(srv)}
                            className="px-3 py-1.5 bg-red-950/60 hover:bg-red-900 text-red-300 text-xs font-semibold rounded-lg inline-flex items-center space-x-1 border border-red-800/40 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Eliminar</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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

      {/* Modal: Registrar Nueva Clienta (Exactamente 3 campos) */}
      {showNewClientaModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl sm:rounded-2xl shadow-2xl p-5 sm:p-6 relative">
            <button onClick={() => setShowNewClientaModal(false)} className="absolute top-5 right-5 text-slate-400 hover:text-white p-1">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-base sm:text-lg font-bold text-white mb-4">Registrar Nuevo Cliente</h2>
            <form onSubmit={handleCreateClienta} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Nombre Completo</label>
                <input
                  type="text"
                  required
                  value={cNombre}
                  onChange={(e) => setCNombre(e.target.value)}
                  placeholder="Ej. Sofía Hernández"
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm sm:text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Número de Teléfono / WhatsApp</label>
                <input
                  type="tel"
                  required
                  value={cTelefono}
                  onChange={(e) => setCTelefono(e.target.value)}
                  placeholder="Ej. 04121234567"
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-sm sm:text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Dirección Corta</label>
                <input
                  type="text"
                  required
                  value={cDireccion}
                  onChange={(e) => setCDireccion(e.target.value)}
                  placeholder="Ej. Urb. Las Delicias, Calle 3"
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm sm:text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowNewClientaModal(false)}
                  className="px-4 py-2.5 bg-slate-800 text-slate-300 rounded-xl font-semibold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-xl shadow text-xs active:scale-95"
                >
                  Guardar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Crear Nuevo Servicio (Solo 2 campos: Servicio y Precio) */}
      {showNewServicioModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl sm:rounded-2xl shadow-2xl p-5 sm:p-6 relative">
            <button onClick={() => setShowNewServicioModal(false)} className="absolute top-5 right-5 text-slate-400 hover:text-white p-1">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-base sm:text-lg font-bold text-white mb-4">Crear Nuevo Servicio</h2>
            <form onSubmit={handleCreateServicio} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">¿Cuál es el servicio?</label>
                <input
                  type="text"
                  required
                  value={sNombre}
                  onChange={(e) => setSNombre(e.target.value)}
                  placeholder="Ej. Corte de Cabello, Uñas, Cejas..."
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm sm:text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Precio en Dólares ($)</label>
                <input
                  type="number"
                  step="0.5"
                  required
                  value={sPrecio}
                  onChange={(e) => setSPrecio(Number(e.target.value))}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-sm sm:text-xs"
                />
                <div className="mt-1 text-xs text-amber-400 font-mono">
                  Equivalente oficial: <strong>Bs. {(Number(sPrecio) * bcvRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                </div>
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button type="button" onClick={() => setShowNewServicioModal(false)} className="px-4 py-2.5 bg-slate-800 text-slate-300 rounded-xl font-semibold text-xs">
                  Cancelar
                </button>
                <button type="submit" className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-xl shadow text-xs active:scale-95">
                  Guardar Servicio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Servicio */}
      {editingServicio && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl sm:rounded-2xl shadow-2xl p-5 sm:p-6 relative">
            <button onClick={() => setEditingServicio(null)} className="absolute top-5 right-5 text-slate-400 hover:text-white p-1">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-base sm:text-lg font-bold text-white mb-4 flex items-center space-x-2">
              <Edit2 className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
              <span>Editar Servicio</span>
            </h2>
            <form onSubmit={handleUpdateServicio} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Nombre del Servicio</label>
                <input
                  type="text"
                  required
                  value={editSNombre}
                  onChange={(e) => setEditSNombre(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm sm:text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Precio en Dólares ($)</label>
                <input
                  type="number"
                  step="0.5"
                  required
                  value={editSPrecio}
                  onChange={(e) => setEditSPrecio(Number(e.target.value))}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-sm sm:text-xs"
                />
                <div className="mt-1 text-xs text-amber-400 font-mono">
                  Equivalente oficial: <strong>Bs. {(Number(editSPrecio) * bcvRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                </div>
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button type="button" onClick={() => setEditingServicio(null)} className="px-4 py-2.5 bg-slate-800 text-slate-300 rounded-xl font-semibold text-xs">
                  Cancelar
                </button>
                <button type="submit" className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-xl shadow text-xs active:scale-95">
                  Actualizar Servicio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirmar Eliminación de Servicio */}
      {servicioToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-red-900/60 w-full max-w-md rounded-2xl shadow-2xl p-6 relative">
            <h3 className="text-lg font-bold text-white flex items-center space-x-2">
              <Trash2 className="w-5 h-5 text-red-400" />
              <span>Eliminar Servicio</span>
            </h3>
            <p className="text-xs text-slate-300 mt-3">
              ¿Estás seguro de que deseas eliminar el servicio <strong className="text-white">{servicioToDelete.nombre}</strong> (${Number(servicioToDelete.precio).toFixed(2)})?
            </p>
            <div className="mt-5 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setServicioToDelete(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteServicio}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold shadow"
              >
                Sí, Eliminar Servicio
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Agendar Cita en Calendario */}
      {showNewCitaModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl p-6 relative">
            <button onClick={() => setShowNewCitaModal(false)} className="absolute top-5 right-5 text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold text-white mb-4">Agendar Cita en Mi Calendario</h2>
            <form onSubmit={handleCreateCita} className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-slate-300 font-medium">Cliente</label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewCitaModal(false);
                      setShowNewClientaModal(true);
                    }}
                    className="text-amber-400 hover:text-amber-300 text-[11px] font-semibold"
                  >
                    + Registrar Nuevo Cliente
                  </button>
                </div>
                {clientas.length === 0 ? (
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-slate-400 text-center">
                    No tienes clientas registradas aún. Registra una para agendar.
                  </div>
                ) : (
                  <select
                    value={selectedClientaId}
                    onChange={(e) => setSelectedClientaId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
                  >
                    {clientas.map(cl => (
                      <option key={cl.id} value={cl.id}>{cl.nombre} {cl.telefono ? `(${cl.telefono})` : ''}</option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-slate-300 font-medium">Servicio</label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewCitaModal(false);
                      setShowNewServicioModal(true);
                    }}
                    className="text-amber-400 hover:text-amber-300 text-[11px] font-semibold"
                  >
                    + Crear Nuevo Servicio
                  </button>
                </div>
                {servicios.length === 0 ? (
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-slate-400 text-center">
                    No tienes servicios definidos aún. Crea uno primero.
                  </div>
                ) : (
                  <select
                    value={selectedServicioId}
                    onChange={(e) => {
                      setSelectedServicioId(e.target.value);
                      const srv = servicios.find(s => s.id === e.target.value);
                      if (srv) setCitaPrecio(Number(srv.precio));
                    }}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
                  >
                    {servicios.map(srv => (
                      <option key={srv.id} value={srv.id}>
                        {srv.nombre} — ${Number(srv.precio).toFixed(2)} (~ Bs. {(Number(srv.precio) * bcvRate).toLocaleString('es-VE', { minimumFractionDigits: 2 })})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Fecha</label>
                  <input
                    type="date"
                    required
                    value={citaFecha}
                    onChange={(e) => setCitaFecha(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Hora</label>
                  <input
                    type="time"
                    required
                    value={citaHora}
                    onChange={(e) => setCitaHora(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Precio a Cobrar ($)</label>
                <input
                  type="number"
                  step="0.5"
                  required
                  value={citaPrecio}
                  onChange={(e) => setCitaPrecio(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono"
                />
                <div className="mt-1 text-xs text-amber-400 font-mono">
                  Equivalente oficial: <strong>Bs. {(Number(citaPrecio) * bcvRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                </div>
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button type="button" onClick={() => setShowNewCitaModal(false)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg font-semibold">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={clientas.length === 0 || servicios.length === 0}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-lg shadow disabled:opacity-40"
                >
                  Confirmar en Mi Agenda
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Cliente */}
      {editingClienta && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl shadow-2xl p-6 relative">
            <button onClick={() => setEditingClienta(null)} className="absolute top-5 right-5 text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold text-white mb-4 flex items-center space-x-2">
              <Edit2 className="w-5 h-5 text-amber-400" />
              <span>Editar Cliente</span>
            </h2>
            <form onSubmit={handleUpdateClienta} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Nombre Completo</label>
                <input
                  type="text"
                  required
                  value={editCNombre}
                  onChange={(e) => setEditCNombre(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Número de Teléfono / WhatsApp</label>
                <input
                  type="tel"
                  required
                  value={editCTelefono}
                  onChange={(e) => setEditCTelefono(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Dirección Corta</label>
                <input
                  type="text"
                  required
                  value={editCDireccion}
                  onChange={(e) => setEditCDireccion(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingClienta(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-lg shadow"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirmar Eliminación de Cliente */}
      {clientaToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-red-900/60 w-full max-w-md rounded-2xl shadow-2xl p-6 relative">
            <h3 className="text-lg font-bold text-white flex items-center space-x-2">
              <Trash2 className="w-5 h-5 text-red-400" />
              <span>Eliminar Cliente</span>
            </h3>
            <p className="text-xs text-slate-300 mt-3">
              ¿Estás seguro de que deseas eliminar la ficha de <strong className="text-white">{clientaToDelete.nombre}</strong>?
            </p>
            <div className="mt-5 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setClientaToDelete(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteClienta}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold shadow"
              >
                Sí, Eliminar Cliente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Factura / Recibo Digital WhatsApp */}
      {activeInvoiceCita && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-600/50 w-full max-w-md rounded-2xl shadow-2xl p-6 relative">
            <button onClick={() => setActiveInvoiceCita(null)} className="absolute top-5 right-5 text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Factura / Recibo Digital</h2>
                <p className="text-xs text-emerald-400 font-semibold">Listo para enviar por WhatsApp</p>
              </div>
            </div>

            {/* Recibo Slip Visual */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3 text-xs font-mono">
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <span className="text-slate-400">Profesional:</span>
                <span className="text-white font-bold">{user.firstName} {user.lastName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Cliente:</span>
                <span className="text-white font-bold">{activeInvoiceCita.clienta?.nombre}</span>
              </div>
              {activeInvoiceCita.clienta?.telefono && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Teléfono:</span>
                  <span className="text-amber-400">{activeInvoiceCita.clienta.telefono}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Servicio:</span>
                <span className="text-amber-300 font-bold">{activeInvoiceCita.servicio?.nombre}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Fecha / Hora:</span>
                <span className="text-slate-300">
                  {new Date(activeInvoiceCita.fechaHora).toLocaleDateString('es-VE')} {new Date(activeInvoiceCita.fechaHora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="border-t border-dashed border-slate-800 pt-2 space-y-1">
                <div className="flex justify-between items-center text-sm font-bold">
                  <span className="text-slate-300">Total en Divisas:</span>
                  <span className="text-emerald-400">${Number(activeInvoiceCita.precioCobrado).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-[11px] text-slate-400">
                  <span>Tasa BCV Oficial:</span>
                  <span>Bs. {bcvRate.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center text-xs font-bold text-amber-400">
                  <span>Total en Bolívares:</span>
                  <span>Bs. {(Number(activeInvoiceCita.precioCobrado) * bcvRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
              <div className="bg-emerald-950/40 border border-emerald-800/40 rounded-lg py-1.5 px-2 text-center text-emerald-300 font-sans text-[11px] font-semibold">
                ✅ Estado: Trabajo Culminado / Pagado
              </div>
            </div>

            {/* Acciones */}
            <div className="mt-5 space-y-2">
              <a
                href={formatWhatsAppLink(activeInvoiceCita.clienta?.telefono, generateInvoiceText(activeInvoiceCita))}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center space-x-2 shadow-lg transition"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Enviar Factura por WhatsApp</span>
              </a>

              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => handleCopyInvoice(generateInvoiceText(activeInvoiceCita))}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center justify-center space-x-1.5 transition"
                >
                  {copiedInvoice ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedInvoice ? '¡Copiado!' : 'Copiar Texto Factura'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveInvoiceCita(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
