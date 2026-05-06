import React, { useState, useRef } from 'react';
import { Save, Bell, Shield, Palette, User, Sun, Moon, Monitor, Camera, Cloud, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { useTheme } from '../lib/ThemeContext';
import { User as UserType } from '../types';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

interface SettingsViewProps {
  user: UserType;
  onUpdateUser: (user: Partial<UserType>) => void;
  onPasswordChange: (current: string, newPass: string) => Promise<void>;
}

export const SettingsView = ({ user, onUpdateUser, onPasswordChange }: SettingsViewProps) => {
  const [activeSection, setActiveSection] = useState('profile');
  const { theme, setTheme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user.avatar_url || null);
  const [isTestingGraph, setIsTestingGraph] = useState(false);
  const [graphTestResult, setGraphTestResult] = useState<{ success: boolean; message: string; organization?: string } | null>(null);

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  const sections = [
    { id: 'profile', label: 'Perfil', icon: User },
    { id: 'notifications', label: 'Notificaciones', icon: Bell },
    { id: 'security', label: 'Seguridad', icon: Shield },
    { id: 'appearance', label: 'Apariencia', icon: Palette },
  ];

  if (user.role === 'ADMIN') {
    sections.push({ id: 'integrations', label: 'Integraciones', icon: Cloud });
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      onUpdateUser({ avatarFile: file });
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert('Las contraseñas nuevas no coinciden');
      return;
    }
    if (newPassword.length < 6) {
      alert('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    
    try {
      setPasswordLoading(true);
      await onPasswordChange(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      // Error is handled by parent
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="space-y-6 lg:space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-slate-900 dark:text-white transition-colors">Configuración del Sistema</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 transition-colors">Administra las preferencias de tu cuenta y del sistema.</p>
        </div>
        <button className="w-full sm:w-auto px-8 py-3 bg-blue-600 rounded-2xl text-sm font-bold text-white hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 flex items-center justify-center gap-2">
          <Save size={18} />
          Guardar Cambios
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Settings */}
        <div className="lg:col-span-1 space-y-2">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all",
                  activeSection === section.id
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                    : "text-slate-500 hover:bg-white dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                <Icon size={18} />
                {section.label}
              </button>
            );
          })}
        </div>

        {/* Content Settings */}
        <div className="lg:col-span-3 bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
          <div className="p-6 lg:p-10 space-y-8">
            {activeSection === 'profile' && (
              <div className="space-y-8">
                {/* User Info Section */}
                <div className="space-y-6">
                  <div className="pb-4 border-b border-slate-100 dark:border-slate-800">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Mi Perfil</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Gestiona tu información personal y de contacto.</p>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row items-center gap-6 mb-8">
                    <div className="relative group">
                      <div className="w-24 h-24 rounded-3xl bg-slate-100 dark:bg-slate-800 border-4 border-white dark:border-slate-700 shadow-xl flex items-center justify-center text-slate-400 overflow-hidden">
                        {avatarPreview ? (
                          <img src={avatarPreview} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <User size={40} />
                        )}
                      </div>
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute -bottom-2 -right-2 p-2 bg-blue-600 text-white rounded-xl shadow-lg hover:bg-blue-700 transition-all"
                      >
                        <Camera size={16} />
                      </button>
                    </div>
                    <div className="space-y-2 text-center sm:text-left">
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 dark:hover:bg-slate-100 transition-all"
                      >
                        Cambiar Foto
                      </button>
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">JPG, PNG o GIF. Máximo 1MB.</p>
                      <input 
                        type="file" 
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*"
                        className="hidden"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Nombre Completo</label>
                      <input 
                        type="text" 
                        defaultValue={user.name}
                        onChange={(e) => onUpdateUser({ name: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-transparent rounded-2xl outline-none focus:border-blue-600/20 focus:bg-white dark:focus:bg-slate-700 transition-all text-slate-800 dark:text-white font-medium"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Correo Electrónico</label>
                      <input 
                        type="email" 
                        defaultValue={user.email}
                        disabled
                        readOnly
                        className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800/50 border-2 border-transparent rounded-2xl outline-none cursor-not-allowed opacity-70 text-slate-500 dark:text-slate-400 font-medium"
                      />
                    </div>
                  </div>
                </div>

                {/* Institution Info Section (Unified) */}
                <div className="space-y-6 pt-4">
                  <div className="pb-4 border-b border-slate-100 dark:border-slate-800">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Información de la Institución</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Datos informativos de la institución (Solo lectura).</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Nombre de la Institución</label>
                      <input 
                        type="text" 
                        defaultValue="Universidad Tres Culturas"
                        disabled
                        readOnly
                        className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800/50 border-2 border-transparent rounded-2xl outline-none cursor-not-allowed opacity-70 text-slate-500 dark:text-slate-400 font-medium"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Ciclo Escolar Activo</label>
                      <input 
                        type="text" 
                        defaultValue="2024-1 (Enero - Abril)"
                        disabled
                        readOnly
                        className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800/50 border-2 border-transparent rounded-2xl outline-none cursor-not-allowed opacity-70 text-slate-500 dark:text-slate-400 font-medium"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Dirección</label>
                      <input 
                        type="text" 
                        defaultValue="Av. Principal #123, Col. Centro, Ciudad de México"
                        disabled
                        readOnly
                        className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800/50 border-2 border-transparent rounded-2xl outline-none cursor-not-allowed opacity-70 text-slate-500 dark:text-slate-400 font-medium"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'security' && (
              <div className="space-y-6">
                <div className="pb-4 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Seguridad de la Cuenta</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Cambia tu contraseña y configura la autenticación.</p>
                </div>
                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Contraseña Actual</label>
                    <input 
                      type="password" 
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-transparent rounded-2xl outline-none focus:border-blue-600/20 focus:bg-white dark:focus:bg-slate-700 transition-all text-slate-800 dark:text-white font-medium"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Nueva Contraseña</label>
                      <input 
                        type="password" 
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-transparent rounded-2xl outline-none focus:border-blue-600/20 focus:bg-white dark:focus:bg-slate-700 transition-all text-slate-800 dark:text-white font-medium"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Confirmar Nueva Contraseña</label>
                      <input 
                        type="password" 
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-transparent rounded-2xl outline-none focus:border-blue-600/20 focus:bg-white dark:focus:bg-slate-700 transition-all text-slate-800 dark:text-white font-medium"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end pt-4">
                    <button 
                      type="submit" 
                      disabled={passwordLoading || !currentPassword || !newPassword || !confirmPassword}
                      className={cn(
                        "px-6 py-2 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all",
                        (passwordLoading || !currentPassword || !newPassword || !confirmPassword) && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      {passwordLoading ? 'Actualizando...' : 'Actualizar Contraseña'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {activeSection === 'appearance' && (
              <div className="space-y-6">
                <div className="pb-4 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Apariencia</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Personaliza el aspecto visual de la plataforma.</p>
                </div>
                <div className="space-y-4">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Tema del Sistema</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <button 
                      onClick={() => setTheme('light')}
                      className={cn(
                        "flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all",
                        theme === 'light' 
                          ? "border-blue-600 bg-blue-50/50 dark:bg-blue-900/20" 
                          : "border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700"
                      )}
                    >
                      <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-amber-500">
                        <Sun size={20} />
                      </div>
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Claro</span>
                    </button>
                    <button 
                      onClick={() => setTheme('dark')}
                      className={cn(
                        "flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all",
                        theme === 'dark' 
                          ? "border-blue-600 bg-blue-50/50 dark:bg-blue-900/20" 
                          : "border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700"
                      )}
                    >
                      <div className="w-10 h-10 rounded-xl bg-slate-900 shadow-sm flex items-center justify-center text-indigo-400">
                        <Moon size={20} />
                      </div>
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Oscuro</span>
                    </button>
                    <button 
                      onClick={() => setTheme('system')}
                      className={cn(
                        "flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all",
                        theme === 'system' 
                          ? "border-blue-600 bg-blue-50/50 dark:bg-blue-900/20" 
                          : "border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700"
                      )}
                    >
                      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 shadow-sm flex items-center justify-center text-slate-400">
                        <Monitor size={20} />
                      </div>
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Sistema</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'integrations' && user.role === 'ADMIN' && (
              <div className="space-y-6">
                <div className="pb-4 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Integraciones de Terceros</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Verifica y gestiona las conexiones con servicios externos.</p>
                </div>
                
                <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-700 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center text-blue-600">
                        <Monitor size={24} />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white">Microsoft 365 / Graph API</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Creación automática de equipos de Teams.</p>
                      </div>
                    </div>
                    <button 
                      onClick={async () => {
                        setIsTestingGraph(true);
                        setGraphTestResult(null);
                        try {
                          const res = await fetch('/api/graph/test');
                          const data = await res.json();
                          setGraphTestResult({
                            success: data.success,
                            message: data.message || data.error || 'Resultado desconocido',
                            organization: data.organization
                          });
                        } catch (err: any) {
                          setGraphTestResult({
                            success: false,
                            message: 'No se pudo contactar con el servidor. Verifica que el backend esté corriendo.'
                          });
                        } finally {
                          setIsTestingGraph(false);
                        }
                      }}
                      disabled={isTestingGraph}
                      className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-bold hover:bg-slate-800 dark:hover:bg-slate-100 transition-all flex items-center gap-2"
                    >
                      {isTestingGraph ? <Loader2 size={14} className="animate-spin" /> : 'Verificar Conexión'}
                    </button>
                  </div>

                  {graphTestResult && (
                    <div className={cn(
                      "p-4 rounded-2xl flex items-start gap-3 animate-in slide-in-from-top-2 duration-300",
                      graphTestResult.success ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400"
                    )}>
                      {graphTestResult.success ? <CheckCircle2 size={18} className="mt-0.5 shrink-0" /> : <XCircle size={18} className="mt-0.5 shrink-0" />}
                      <div className="text-sm">
                        <p className="font-bold">{graphTestResult.success ? 'Conexión Exitosa' : 'Error de Conexión'}</p>
                        <p>{graphTestResult.message}</p>
                        {graphTestResult.organization && <p className="mt-1 font-mono text-xs opacity-80">Org: {graphTestResult.organization}</p>}
                      </div>
                    </div>
                  )}

                  <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                          <Shield size={20} />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-800 dark:text-white">Supabase DB</h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Base de datos principal del sistema.</p>
                        </div>
                      </div>
                      <div className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                        isSupabaseConfigured 
                          ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                          : "bg-rose-50 text-rose-600 border-rose-100"
                      )}>
                        {isSupabaseConfigured ? 'Conectado' : 'Desconectado'}
                      </div>
                    </div>
                    
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-2">Variables de Entorno</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-[10px]">
                      <div className="flex items-center gap-2 p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800">
                        <span className="text-blue-500">VITE_SUPABASE_URL</span>
                        <span className={cn("ml-auto", import.meta.env.VITE_SUPABASE_URL ? "text-emerald-500" : "text-rose-500")}>
                          {import.meta.env.VITE_SUPABASE_URL ? 'OK' : 'Faltante'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800">
                        <span className="text-blue-500">VITE_SUPABASE_ANON_KEY</span>
                        <span className={cn("ml-auto", import.meta.env.VITE_SUPABASE_ANON_KEY ? "text-emerald-500" : "text-rose-500")}>
                          {import.meta.env.VITE_SUPABASE_ANON_KEY ? 'OK' : 'Faltante'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-2">Variables requeridas en .env</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-[10px]">
                      <div className="flex items-center gap-2 p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800">
                        <span className="text-blue-500">AZURE_TENANT_ID</span>
                        <span className="text-emerald-500 ml-auto">Configurado</span>
                      </div>
                      <div className="flex items-center gap-2 p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800">
                        <span className="text-blue-500">AZURE_CLIENT_ID</span>
                        <span className="text-emerald-500 ml-auto">Configurado</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'notifications' && (
              <div className="py-20 text-center space-y-4">
                <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-300">
                  <Bell size={32} />
                </div>
                <div>
                  <p className="text-slate-800 dark:text-white font-bold">Módulo en construcción</p>
                  <p className="text-slate-400 text-sm">Estamos trabajando para traerte estas opciones pronto.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const SettingsIcon = ({ size }: { size: number }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
