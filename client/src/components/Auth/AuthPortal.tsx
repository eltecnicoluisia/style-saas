import React, { useState } from 'react';
import { api } from '../../services/api';
import { ShieldCheck, UserCheck, Sparkles, ArrowRight, Lock, User, Mail, Phone, MapPin, IdCard } from 'lucide-react';

interface AuthPortalProps {
  onLoginSuccess: (user: any) => void;
}

export const AuthPortal: React.FC<AuthPortalProps> = ({ onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form State
  const [nationalId, setNationalId] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [role, setRole] = useState<'WORKER' | 'CLIENT'>('WORKER');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (isLogin) {
        const response = await api.login({ nationalId, password });
        api.setToken(response.token);
        api.setUser(response.user);
        onLoginSuccess(response.user);
      } else {
        const response = await api.register({
          firstName,
          lastName,
          email,
          nationalId,
          phone,
          address,
          password,
          role,
        });

        setSuccessMsg(response.message);
        setIsLogin(true);
        // Limpiar contraseña
        setPassword('');
      }
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error inesperado');
    } finally {
      setLoading(false);
    }
  };

  // Helper para credenciales maestras rápidas
  const fillMasterAdmin = () => {
    setNationalId('12832779');
    setPassword('qwerty1234');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-brand-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-700 to-amber-600 text-white shadow-xl shadow-brand-900/30 mb-4 border border-brand-500/30">
          <Sparkles className="w-8 h-8 text-amber-200" />
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          STYLE <span className="bg-gradient-to-r from-amber-400 to-brand-400 bg-clip-text text-transparent">SAAS</span>
        </h2>
        <p className="mt-2 text-sm text-slate-400 font-medium">
          Plataforma Integral de Gestión para Centros de Estética y Barberías
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg z-10">
        <div className="bg-slate-900/90 backdrop-blur-xl py-8 px-6 shadow-2xl rounded-2xl border border-slate-800/80 sm:px-10">
          
          {/* Tabs Selector */}
          <div className="flex border-b border-slate-800 mb-6">
            <button
              onClick={() => { setIsLogin(true); setError(null); }}
              className={`flex-1 pb-3 text-sm font-semibold transition-all border-b-2 ${
                isLogin
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Iniciar Sesión
            </button>
            <button
              onClick={() => { setIsLogin(false); setError(null); }}
              className={`flex-1 pb-3 text-sm font-semibold transition-all border-b-2 ${
                !isLogin
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Registro de Usuario
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-950/60 border border-red-800/50 text-red-200 text-sm flex items-start space-x-2">
              <span className="font-bold">Error:</span>
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-950/60 border border-emerald-800/50 text-emerald-200 text-sm">
              {successMsg}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            
            {/* Campos exclusivos de Registro */}
            {!isLogin && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Nombre</label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                      <input
                        type="text"
                        required
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="Ej. Carlos"
                        className="w-full pl-9 pr-3 py-2 bg-slate-950/60 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Apellido</label>
                    <input
                      type="text"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Ej. Barbero"
                      className="w-full px-3 py-2 bg-slate-950/60 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Correo Electrónico</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ejemplo@correo.com"
                      className="w-full pl-9 pr-3 py-2 bg-slate-950/60 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Número de Celular</label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+58414..."
                        className="w-full pl-9 pr-3 py-2 bg-slate-950/60 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Rol a Solicitar</label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-950/60 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="WORKER">Trabajador / Estilista</option>
                      <option value="CLIENT">Cliente</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Dirección de Residencia</label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Av. Principal, Edificio, Ciudad"
                      className="w-full pl-9 pr-3 py-2 bg-slate-950/60 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Cédula (ID de Usuario para Login y Registro) */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Número de Cédula <span className="text-amber-400 font-semibold">(ID de Usuario)</span>
              </label>
              <div className="relative">
                <IdCard className="w-4 h-4 text-amber-500 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value)}
                  placeholder="Ej. 12832779"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950/80 border border-slate-700 rounded-lg text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Contraseña */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Contraseña</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950/80 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 flex items-center justify-center space-x-2 py-3 px-4 bg-gradient-to-r from-amber-600 via-brand-600 to-amber-700 hover:from-amber-500 hover:to-brand-500 text-white text-sm font-semibold rounded-lg shadow-lg shadow-amber-950/40 transition-all disabled:opacity-50"
            >
              {loading ? (
                <span>Procesando...</span>
              ) : (
                <>
                  <span>{isLogin ? 'Ingresar al Sistema' : 'Completar Registro'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Acceso Rápido Super Admin Seeder */}
          {isLogin && (
            <div className="mt-6 pt-4 border-t border-slate-800/80 text-center">
              <button
                type="button"
                onClick={fillMasterAdmin}
                className="text-xs text-slate-400 hover:text-amber-400 transition-colors inline-flex items-center space-x-1"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                <span>Usar credenciales Super Admin Maestro (Luis Uzcategui)</span>
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
