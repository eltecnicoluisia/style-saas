import React, { useState } from 'react';
import { api } from '../../services/api';
import { UserCheck, Sparkles, ArrowRight, Lock, User, Mail, Phone, MapPin, IdCard, CheckCircle2, XCircle, ShieldCheck, KeyRound, ArrowLeft } from 'lucide-react';
import { AestheticFloatingVectors } from './AestheticFloatingVectors';

interface AuthPortalProps {
  onLoginSuccess: (user: any) => void;
}

export const AuthPortal: React.FC<AuthPortalProps> = ({ onLoginSuccess }) => {
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot'>('login');
  const isLogin = authMode === 'login';
  const isForgot = authMode === 'forgot';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form State
  const [nationalId, setNationalId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [role, setRole] = useState<'WORKER' | 'CLIENT'>('WORKER');

  // Requisitos y validaciones de contraseña para el semáforo interactivo
  const reqLength = password.length >= 8;
  const reqUpper = /[A-Z]/.test(password);
  const reqLower = /[a-z]/.test(password);
  const reqNumber = /[0-9]/.test(password);
  const isPasswordValid = reqLength && reqUpper && reqLower && reqNumber;
  const isConfirmValid = !isForgot || (password === confirmPassword && confirmPassword.length > 0);

  // Cálculo del semáforo (Fuerza de la contraseña)
  const getPasswordStrength = () => {
    let score = 0;
    if (reqLength) score++;
    if (reqUpper) score++;
    if (reqLower) score++;
    if (reqNumber) score++;
    if (password.length >= 12 && /[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 1) return { score: 1, label: 'Débil', color: 'bg-rose-500' };
    if (score === 2) return { score: 2, label: 'Aceptable', color: 'bg-amber-500' };
    if (score === 3 || score === 4) return { score: 3, label: 'Segura', color: 'bg-teal-500' };
    return { score: 4, label: 'Muy segura', color: 'bg-emerald-500' };
  };

  const passStrength = getPasswordStrength();

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
      } else if (isForgot) {
        if (password !== confirmPassword) {
          setError('Las contraseñas no coinciden');
          setLoading(false);
          return;
        }
        const response = await api.resetPassword({
          nationalId,
          email,
          newPassword: password,
        });
        setSuccessMsg(response.message);
        setAuthMode('login');
        setPassword('');
        setConfirmPassword('');
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
        setAuthMode('login');
        setPassword('');
      }
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error inesperado');
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Canvas 2D de Vectores Estéticos Flotantes (32 figuras temáticas de Belleza, Barbería y Estética) */}
      <AestheticFloatingVectors />

      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-brand-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10">
        <div className="inline-flex items-center justify-center mb-4">
          <div className="w-20 h-20 rounded-full bg-slate-900 border-2 border-amber-500/50 shadow-2xl shadow-amber-500/25 p-2 flex items-center justify-center overflow-hidden hover:scale-105 transition-transform">
            <img
              src="./logo_emblem.svg"
              alt="Informáticos Venezuela"
              className="w-full h-full object-contain rounded-full"
            />
          </div>
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          STYLE <span className="bg-gradient-to-r from-amber-400 to-brand-400 bg-clip-text text-transparent">SAAS</span>
        </h2>
        <p className="mt-1 text-xs text-amber-400/90 font-semibold tracking-wider uppercase">
          Informáticos Venezuela
        </p>
        <p className="mt-1 text-sm text-slate-400 font-medium">
          Plataforma Integral de Gestión para Centros de Estética y Barberías
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg z-10">
        <div className="bg-slate-900/90 backdrop-blur-xl py-8 px-6 shadow-2xl rounded-2xl border border-slate-800/80 sm:px-10">
          
          {/* Tabs Selector o Encabezado de Recuperación */}
          {isForgot ? (
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-6">
              <div className="flex items-center space-x-2 text-amber-400 font-semibold text-sm">
                <KeyRound className="w-4 h-4" />
                <span>Restablecer Contraseña</span>
              </div>
              <button
                type="button"
                onClick={() => { setAuthMode('login'); setError(null); }}
                className="text-xs text-slate-400 hover:text-white flex items-center space-x-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Volver al Login</span>
              </button>
            </div>
          ) : (
            <div className="flex border-b border-slate-800 mb-6">
              <button
                type="button"
                onClick={() => { setAuthMode('login'); setError(null); }}
                className={`flex-1 pb-3 text-sm font-semibold transition-all border-b-2 ${
                  isLogin
                    ? 'border-amber-500 text-amber-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Iniciar Sesión
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode('register'); setError(null); }}
                className={`flex-1 pb-3 text-sm font-semibold transition-all border-b-2 ${
                  !isLogin && !isForgot
                    ? 'border-amber-500 text-amber-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Registro de Usuario
              </button>
            </div>
          )}

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
            {/* Mensaje descriptivo para Recuperación de Contraseña */}
            {isForgot && (
              <div className="p-3 bg-amber-950/30 border border-amber-800/40 rounded-xl text-xs text-amber-200/90 leading-relaxed">
                Ingresa tu Cédula y el Correo Electrónico con el que estás registrado para verificar tu identidad y asignar tu nueva contraseña.
              </div>
            )}
            
            {/* Campos exclusivos de Registro */}
            {!isLogin && !isForgot && (
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

            {/* Correo Electrónico en modo Recuperación */}
            {isForgot && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Correo Electrónico Registrado</label>
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
            )}

            {/* Cédula (ID de Usuario para Login, Registro y Recuperación) */}
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
                  placeholder="Ej. 20123456"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950/80 border border-slate-700 rounded-lg text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Contraseña / Nueva Contraseña */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-slate-300">
                  {isForgot ? 'Nueva Contraseña' : 'Contraseña'}
                </label>
                {!isLogin && (
                  <span className="text-[11px] text-slate-400 font-medium">Requisitos de seguridad</span>
                )}
                {isLogin && (
                  <button
                    type="button"
                    onClick={() => { setAuthMode('forgot'); setError(null); }}
                    className="text-[11px] text-amber-400 hover:text-amber-300 underline font-medium"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                )}
              </div>
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

              {/* Semáforo y Checklist de Requisitos de Contraseña (En Registro o Recuperación) */}
              {!isLogin && (
                <div className="mt-2.5 p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2.5 text-xs">
                  {/* Semáforo de Fuerza */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-400 font-medium">Seguridad de la contraseña:</span>
                      <span
                        className={`font-semibold font-mono ${
                          passStrength.label === 'Muy segura'
                            ? 'text-emerald-400'
                            : passStrength.label === 'Segura'
                            ? 'text-teal-400'
                            : passStrength.label === 'Aceptable'
                            ? 'text-amber-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {password ? passStrength.label : 'Sin ingresar'}
                      </span>
                    </div>

                    {/* Barra de progreso / semáforo visual */}
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden flex gap-1">
                      {[1, 2, 3, 4].map((step) => (
                        <div
                          key={step}
                          className={`h-full flex-1 transition-all duration-300 rounded-full ${
                            passStrength.score >= step
                              ? passStrength.color
                              : 'bg-slate-800'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Checklist interactivo de requisitos */}
                  <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px]">
                    <div className={`flex items-center space-x-1.5 ${reqLength ? 'text-emerald-400' : 'text-slate-500'}`}>
                      {reqLength ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <XCircle className="w-3.5 h-3.5 shrink-0" />}
                      <span>Mínimo 8 caracteres</span>
                    </div>
                    <div className={`flex items-center space-x-1.5 ${reqUpper ? 'text-emerald-400' : 'text-slate-500'}`}>
                      {reqUpper ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <XCircle className="w-3.5 h-3.5 shrink-0" />}
                      <span>Una mayúscula (A-Z)</span>
                    </div>
                    <div className={`flex items-center space-x-1.5 ${reqLower ? 'text-emerald-400' : 'text-slate-500'}`}>
                      {reqLower ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <XCircle className="w-3.5 h-3.5 shrink-0" />}
                      <span>Una minúscula (a-z)</span>
                    </div>
                    <div className={`flex items-center space-x-1.5 ${reqNumber ? 'text-emerald-400' : 'text-slate-500'}`}>
                      {reqNumber ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <XCircle className="w-3.5 h-3.5 shrink-0" />}
                      <span>Al menos un número (0-9)</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Confirmar contraseña en modo Recuperación */}
            {isForgot && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Confirmar Nueva Contraseña</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repite la contraseña"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-950/80 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
                {confirmPassword && (
                  <p className={`text-[11px] mt-1 font-medium ${password === confirmPassword ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {password === confirmPassword ? '✓ Las contraseñas coinciden' : '✗ Las contraseñas no coinciden'}
                  </p>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || (!isLogin && (!isPasswordValid || !isConfirmValid))}
              className="w-full mt-4 flex items-center justify-center space-x-2 py-3 px-4 bg-gradient-to-r from-amber-600 via-brand-600 to-amber-700 hover:from-amber-500 hover:to-brand-500 text-white text-sm font-semibold rounded-lg shadow-lg shadow-amber-950/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span>Procesando...</span>
              ) : (
                <>
                  <span>
                    {isLogin ? 'Ingresar al Sistema' : isForgot ? 'Restablecer mi Contraseña' : 'Completar Registro'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>



        </div>
      </div>
    </div>
  );
};
