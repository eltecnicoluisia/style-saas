import React, { useState } from 'react';
import { Cita, Servicio, Clienta } from '../../types';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Clock, 
  Plus, 
  CheckCircle, 
  XCircle,
  Phone,
  Sparkles,
  FileText
} from 'lucide-react';

interface CalendarViewProps {
  citas: Cita[];
  clientas: Clienta[];
  servicios: Servicio[];
  onSelectDateToBook: (dateStr: string, timeStr: string) => void;
  onUpdateStatus: (citaId: string, status: string) => void;
  onOpenInvoice: (cita: Cita) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  citas,
  clientas,
  servicios,
  onSelectDateToBook,
  onUpdateStatus,
  onOpenInvoice,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'day'>('month');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Días del mes
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Citas para un día específico
  const getCitasForDay = (day: number) => {
    const targetDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return citas.filter(c => {
      const citaDate = new Date(c.fechaHora);
      const citaDateStr = `${citaDate.getFullYear()}-${String(citaDate.getMonth() + 1).padStart(2, '0')}-${String(citaDate.getDate()).padStart(2, '0')}`;
      return citaDateStr === targetDateStr;
    });
  };

  // Citas del día seleccionado
  const selectedDayCitas = citas.filter(c => {
    const citaDate = new Date(c.fechaHora);
    return (
      citaDate.getFullYear() === selectedDay.getFullYear() &&
      citaDate.getMonth() === selectedDay.getMonth() &&
      citaDate.getDate() === selectedDay.getDate()
    );
  }).sort((a, b) => new Date(a.fechaHora).getTime() - new Date(b.fechaHora).getTime());

  // Horas del día (8:00 AM a 8:00 PM)
  const timeSlots = [
    '08:00', '09:00', '10:00', '11:00', '12:00',
    '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'
  ];

  return (
    <div className="space-y-4">
      {/* Header del Calendario */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-3 sm:p-4 rounded-2xl shadow-lg">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 flex-shrink-0">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center space-x-2">
              <span>{monthNames[month]} {year}</span>
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-400">Calendario interactivo de atenciones</p>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end space-x-1.5 sm:space-x-2 w-full sm:w-auto">
          {/* Switch de Modo: Mes / Día */}
          <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex text-xs font-semibold">
            <button
              onClick={() => setViewMode('month')}
              className={`px-2.5 sm:px-3 py-1 rounded-lg transition text-xs ${
                viewMode === 'month' ? 'bg-amber-600 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Mes
            </button>
            <button
              onClick={() => setViewMode('day')}
              className={`px-2.5 sm:px-3 py-1 rounded-lg transition text-xs ${
                viewMode === 'day' ? 'bg-amber-600 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Día
            </button>
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={handlePrevMonth}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
              title="Mes Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-2.5 sm:px-3 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-amber-400 rounded-xl transition"
            >
              Hoy
            </button>
            <button
              onClick={handleNextMonth}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
              title="Mes Siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* VISTA MENSUAL (CUADRÍCULA DE 31 DÍAS) */}
      {viewMode === 'month' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl p-2 sm:p-4">
          {/* Días de la semana */}
          <div className="grid grid-cols-7 gap-1 text-center font-bold text-[11px] sm:text-xs text-slate-400 uppercase tracking-wider pb-2 sm:pb-3 border-b border-slate-800">
            <div><span className="sm:hidden">D</span><span className="hidden sm:inline">Dom</span></div>
            <div><span className="sm:hidden">L</span><span className="hidden sm:inline">Lun</span></div>
            <div><span className="sm:hidden">M</span><span className="hidden sm:inline">Mar</span></div>
            <div><span className="sm:hidden">M</span><span className="hidden sm:inline">Mié</span></div>
            <div><span className="sm:hidden">J</span><span className="hidden sm:inline">Jue</span></div>
            <div><span className="sm:hidden">V</span><span className="hidden sm:inline">Vie</span></div>
            <div><span className="sm:hidden">S</span><span className="hidden sm:inline">Sáb</span></div>
          </div>

          {/* Días del Mes */}
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5 pt-2 sm:pt-3">
            {/* Espacios vacíos antes del día 1 */}
            {Array.from({ length: firstDayOfMonth }).map((_, index) => (
              <div key={`empty-${index}`} className="min-h-[48px] sm:min-h-[90px] rounded-lg sm:rounded-xl bg-slate-950/20 border border-transparent" />
            ))}

            {/* Días del mes actual */}
            {Array.from({ length: daysInMonth }).map((_, index) => {
              const day = index + 1;
              const dayCitas = getCitasForDay(day);
              const isToday =
                new Date().getDate() === day &&
                new Date().getMonth() === month &&
                new Date().getFullYear() === year;
              const isSelected =
                selectedDay.getDate() === day &&
                selectedDay.getMonth() === month &&
                selectedDay.getFullYear() === year;

              return (
                <div
                  key={`day-${day}`}
                  onClick={() => {
                    const newSel = new Date(year, month, day);
                    setSelectedDay(newSel);
                  }}
                  className={`min-h-[50px] sm:min-h-[95px] p-1 sm:p-2 rounded-xl border flex flex-col justify-between transition cursor-pointer relative group ${
                    isSelected
                      ? 'bg-amber-950/40 border-amber-500 shadow-md ring-1 ring-amber-500/50'
                      : isToday
                      ? 'bg-slate-800/60 border-amber-500/50'
                      : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex justify-between items-center w-full">
                    <span className={`text-[11px] sm:text-xs font-mono font-bold ${
                      isToday
                        ? 'w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-extrabold text-[10px] sm:text-xs'
                        : isSelected
                        ? 'text-amber-400 font-bold'
                        : 'text-slate-300'
                    }`}>
                      {day}
                    </span>

                    {/* Botón rápido para agendar en este día (visible en hover o desktop) */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const targetDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        onSelectDateToBook(targetDateStr, '10:00');
                      }}
                      className="hidden sm:inline-flex opacity-0 group-hover:opacity-100 p-1 bg-amber-600 hover:bg-amber-500 text-slate-950 rounded text-[10px] transition"
                      title="Agendar en este día"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Indicadores de Citas: Puntos en móvil, chips detallados en desktop */}
                  {dayCitas.length > 0 && (
                    <>
                      {/* Móvil: Puntos de colores */}
                      <div className="flex sm:hidden justify-center items-center space-x-0.5 mt-1">
                        {dayCitas.slice(0, 3).map((c) => (
                          <span
                            key={c.id}
                            style={{ backgroundColor: c.servicio?.color || '#d97706' }}
                            className="w-1.5 h-1.5 rounded-full"
                          />
                        ))}
                        {dayCitas.length > 3 && (
                          <span className="text-[8px] font-mono text-amber-400 font-bold">+</span>
                        )}
                      </div>

                      {/* Desktop: Chips detallados */}
                      <div className="hidden sm:block mt-1 space-y-1 overflow-hidden">
                        {dayCitas.slice(0, 2).map((c) => (
                          <div
                            key={c.id}
                            style={{ borderLeftColor: c.servicio?.color || '#d97706' }}
                            className="text-[10px] truncate px-1.5 py-0.5 rounded bg-slate-900 border-l-2 text-slate-200 font-medium"
                          >
                            <span className="font-mono text-amber-300 mr-1">
                              {new Date(c.fechaHora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span>{c.clienta?.nombre}</span>
                          </div>
                        ))}
                        {dayCitas.length > 2 && (
                          <div className="text-[9px] text-amber-400 font-bold text-right">
                            +{dayCitas.length - 2} más
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* DETALLE DEL DÍA SELECCIONADO / VISTA DIARIA */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 sm:p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-4 border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 flex-shrink-0" />
            <h3 className="text-xs sm:text-base font-bold text-white capitalize">
              {selectedDay.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
            </h3>
          </div>

          <button
            type="button"
            onClick={() => {
              const targetDateStr = `${selectedDay.getFullYear()}-${String(selectedDay.getMonth() + 1).padStart(2, '0')}-${String(selectedDay.getDate()).padStart(2, '0')}`;
              onSelectDateToBook(targetDateStr, '11:00');
            }}
            className="w-full sm:w-auto justify-center px-3 py-2 sm:py-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs rounded-xl flex items-center space-x-1 shadow transition active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Agendar en este Día</span>
          </button>
        </div>

        {selectedDayCitas.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-xs">
            No hay citas programadas para este día. Haz clic en "Agendar en este Día" para registrar una atención.
          </div>
        ) : (
          <div className="space-y-2.5">
            {selectedDayCitas.map((c) => {
              const isCompleted = c.estado === 'COMPLETED';
              const isCancelled = c.estado === 'CANCELLED';

              return (
                <div
                  key={c.id}
                  style={{ borderLeftColor: c.servicio?.color || '#d97706' }}
                  className={`p-3 sm:p-4 rounded-xl border-l-4 bg-slate-950/70 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition ${
                    isCompleted ? 'opacity-75' : isCancelled ? 'opacity-60' : 'hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center font-mono text-xs text-amber-400 font-bold flex-shrink-0">
                      <span>{new Date(c.fechaHora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <span className="text-[10px] text-slate-500 font-normal">{c.duracionMinutos}m</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-bold text-white text-sm truncate">{c.clienta?.nombre}</h4>
                        <span className={`px-2 py-0.2 rounded-full text-[10px] font-semibold border ${
                          isCompleted
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                            : isCancelled
                            ? 'bg-red-950 text-red-300 border-red-800'
                            : 'bg-amber-950 text-amber-300 border-amber-800'
                        }`}>
                          {c.estado}
                        </span>
                      </div>

                      <div className="text-xs text-slate-400 flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1">
                        <span className="font-semibold text-amber-300">{c.servicio?.nombre}</span>
                        {c.clienta?.telefono && (
                          <>
                            <span className="text-slate-600">•</span>
                            <span className="flex items-center space-x-1">
                              <Phone className="w-3 h-3 text-slate-500" />
                              <a href={`https://wa.me/${c.clienta.telefono.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" className="hover:text-amber-400 font-mono text-slate-300">
                                {c.clienta.telefono}
                              </a>
                            </span>
                          </>
                        )}
                      </div>

                      {c.notas && <p className="text-[11px] text-slate-400 italic mt-1">{c.notas}</p>}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/60 w-full sm:w-auto">
                    <span className="font-mono text-base font-bold text-emerald-400">
                      ${Number(c.precioCobrado).toFixed(2)}
                    </span>

                    <div className="flex items-center space-x-1.5 ml-auto sm:ml-0">
                      {/* Botón Factura WhatsApp */}
                      <button
                        onClick={() => onOpenInvoice(c)}
                        className="px-2.5 py-1.5 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-600/40 text-emerald-300 rounded-lg text-xs font-semibold flex items-center space-x-1 shadow transition active:scale-95"
                        title="Generar y Enviar Factura / Recibo por WhatsApp"
                      >
                        <FileText className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="hidden sm:inline">Factura WhatsApp</span>
                        <span className="sm:hidden">Recibo</span>
                      </button>

                      {c.estado === 'SCHEDULED' && (
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => {
                              onUpdateStatus(c.id, 'COMPLETED');
                              onOpenInvoice(c);
                            }}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center space-x-1 shadow transition active:scale-95"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Concluir</span>
                          </button>
                          <button
                            onClick={() => onUpdateStatus(c.id, 'CANCELLED')}
                            className="p-1.5 bg-slate-800 hover:bg-red-950 text-slate-400 hover:text-red-300 rounded-lg text-xs transition"
                            title="Cancelar Cita"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
