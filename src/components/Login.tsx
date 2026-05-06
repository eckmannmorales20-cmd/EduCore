import React, { useState } from 'react';
import { Lock, Mail, Eye, EyeOff, LogIn } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { User } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface LoginProps {
  onLogin: (role: User['role']) => void;
}

export const Login = ({ onLogin }: LoginProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (!isSupabaseConfigured) {
      setError('Error de configuración: Las variables de entorno de Supabase no han sido configuradas correctamente.');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      const cleanEmail = email.trim().toLowerCase();
      const cleanPassword = password.trim();

      console.log(`[Auth] Intentando inicio de sesión para: ${cleanEmail}`);

      // 1. Consulta a la tabla de perfiles para verificar credenciales
      const { data: user, error: queryError } = await supabase
        .from('profiles')
        .select('*')
        .ilike('email', cleanEmail)
        .single();

      if (queryError) {
        console.error("[Auth] Error al buscar perfil:", queryError.message);
        throw new Error('Credenciales inválidas. Verifica tu correo y contraseña.');
      }

      if (!user) {
        console.error("[Auth] Usuario no encontrado en tabla profiles");
        throw new Error('Credenciales inválidas. Verifica tu correo y contraseña.');
      }

      // Verificar la contraseña directamente con la tabla profiles (nota: la columna en DB se llama 'pasword')
      const dbPassword = (user.pasword || '').trim();
      if (dbPassword !== cleanPassword) {
        console.error("[Auth] Contraseña incorrecta para el usuario. DB:", dbPassword, "Input:", cleanPassword);
        throw new Error('Credenciales inválidas. Verifica tu correo y contraseña.');
      }

      console.log("[Auth] Perfil verificado exitosamente:", user.role);

      // 2. Intentar autenticación con Supabase Auth (opcional, para mantener sincronización si existe)
      try {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: cleanPassword
        });

        if (authError) {
          if (authError.message.includes('Email logins are disabled')) {
            console.warn("Supabase auth ignorado porque Email logins are disabled, usando MSAL de Azure.");
          } else {
            console.warn('Supabase Auth falló, pero las credenciales de la tabla profiles son correctas:', authError.message);
          }
        }
      } catch (authException) {
        console.warn("Excepción llamando a supabase.auth.signInWithPassword", authException);
      }

      // Guardar sesión localmente para que App.tsx la reconozca
      localStorage.setItem('user_session', JSON.stringify(user));
      onLogin(user.role as User['role']);
      
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión. Verifica tus credenciales.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 font-sans transition-colors duration-500">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl shadow-slate-200/50 dark:shadow-black/50 overflow-hidden transition-colors"
      >
        <div className="p-8 pt-12 text-center">
          <div className="w-20 h-20 bg-blue-600 rounded-3xl mx-auto flex items-center justify-center shadow-xl shadow-blue-600/20 mb-6 rotate-3">
            <LogIn className="text-white" size={40} />
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-2">Bienvenido</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Ingresa tus credenciales para acceder al sistema escolar.</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 pt-0 space-y-6">
          {error && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-900/30 rounded-2xl text-rose-600 dark:text-rose-400 text-sm font-bold flex items-center gap-3"
            >
              <div className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
              {error}
            </motion.div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Correo Institucional</label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ejemplo@edu.mx"
                className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent rounded-2xl outline-none focus:border-blue-600/20 focus:bg-white dark:focus:bg-slate-700 transition-all text-slate-800 dark:text-white font-medium"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Contraseña</label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
              <input 
                type={showPassword ? "text" : "password"} 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-12 pr-12 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent rounded-2xl outline-none focus:border-blue-600/20 focus:bg-white dark:focus:bg-slate-700 transition-all text-slate-800 dark:text-white font-medium"
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between px-1">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input type="checkbox" className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-blue-600 focus:ring-blue-500/20" />
              <span className="text-sm text-slate-500 dark:text-slate-400 font-medium group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors">Recordarme</span>
            </label>
            <button type="button" className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors">
              ¿Olvidaste tu contraseña?
            </button>
          </div>

          <button 
            type="submit"
            disabled={isLoading}
            className={cn(
              "w-full py-4 rounded-2xl font-black text-white shadow-xl transition-all flex items-center justify-center gap-3",
              isLoading 
                ? "bg-slate-400 dark:bg-slate-700 cursor-not-allowed" 
                : "bg-blue-600 hover:bg-blue-700 shadow-blue-600/20 hover:shadow-blue-600/40 active:scale-[0.98]"
            )}
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                Iniciando sesión...
              </>
            ) : (
              <>
                Entrar al Sistema
                <LogIn size={20} />
              </>
            )}
          </button>
        </form>

        <div className="p-8 bg-slate-50/50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
            ¿No tienes cuenta? <button className="font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">Contacta a Control Escolar</button>
          </p>
        </div>
      </motion.div>
    </div>
  );
};
