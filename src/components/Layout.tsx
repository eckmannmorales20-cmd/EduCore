import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  UserSquare2, 
  BookOpen, 
  GraduationCap, 
  Layers, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  Bell,
  Search,
  ChevronRight,
  User as UserIcon,
  DollarSign,
  Calculator,
  FileText,
  UserPlus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { Role, User } from '../types';

interface SidebarItemProps {
  key?: React.Key;
  icon: React.ElementType;
  label: string;
  active?: boolean;
  onClick: () => void;
  collapsed?: boolean;
}

const SidebarItem = ({ icon: Icon, label, active, onClick, collapsed }: SidebarItemProps) => (
  <button
    onClick={onClick}
    className={cn(
      "flex items-center w-full p-3 my-1 rounded-xl transition-all duration-200 group",
      active 
        ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" 
        : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
    )}
  >
    <Icon size={20} className={cn("min-w-[20px]", !collapsed && "mr-3")} />
    {!collapsed && <span className="font-medium text-sm">{label}</span>}
    {active && !collapsed && (
      <motion.div 
        layoutId="active-pill"
        className="ml-auto w-1.5 h-1.5 rounded-full bg-white"
      />
    )}
  </button>
);

interface LayoutProps {
  children: React.ReactNode;
  user: User;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  notifications?: any[];
  isSupabaseConfigured?: boolean;
}

export const Layout = ({ children, user, activeTab, setActiveTab, onLogout, notifications = [], isSupabaseConfigured }: LayoutProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showProfilePanel, setShowProfilePanel] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);

  React.useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isDesktop = windowWidth >= 1024;

  const adminItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'students', label: 'Alumnos', icon: Users },
    { id: 'teachers', label: 'Profesores', icon: UserSquare2 },
    { id: 'careers', label: 'Carreras', icon: GraduationCap },
    { id: 'subjects', label: 'Materias', icon: BookOpen },
    { id: 'groups', label: 'Grupos', icon: Layers },
    { id: 'teams', label: 'Crear Equipo', icon: UserPlus },
  ];

  const teacherItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'my-groups', label: 'Mis Grupos', icon: Layers },
    { id: 'grades', label: 'Calificaciones', icon: GraduationCap },
  ];

  const collectionsItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'debts', label: 'Adeudos', icon: DollarSign },
    { id: 'reports', label: 'Reportes', icon: FileText },
    { id: 'calculator', label: 'Calculadora', icon: Calculator },
  ];

  const menuItems = user.role === 'ADMIN' ? adminItems : user.role === 'DOCENTE' ? teacherItems : collectionsItems;

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden font-sans transition-colors duration-300">
      {/* Mobile Sidebar Backdrop */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-30 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ 
          width: collapsed ? 80 : 260,
          x: isMobileMenuOpen ? 0 : (isDesktop ? 0 : -260)
        }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className={cn(
          "bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col z-40 fixed lg:relative h-full lg:translate-x-0",
          !isMobileMenuOpen && "-translate-x-full lg:translate-x-0"
        )}
      >
        <button 
          onClick={() => setActiveTab('dashboard')}
          className="p-6 flex items-center hover:opacity-80 transition-opacity w-full text-left"
        >
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl mr-3">
            U
          </div>
          {!collapsed && (
            <span className="font-bold text-xl text-slate-800 dark:text-white tracking-tight">UTC</span>
          )}
        </button>

        <nav className="flex-1 px-4 mt-4 overflow-y-auto">
          {menuItems.map((item) => (
            <SidebarItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              active={activeTab === item.id}
              onClick={() => {
                setActiveTab(item.id);
                setIsMobileMenuOpen(false);
              }}
              collapsed={collapsed}
            />
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800">
          <SidebarItem
            icon={Settings}
            label="Configuración"
            active={activeTab === 'settings'}
            onClick={() => {
              setActiveTab('settings');
              setIsMobileMenuOpen(false);
            }}
            collapsed={collapsed}
          />
          <SidebarItem
            icon={LogOut}
            label="Cerrar Sesión"
            onClick={onLogout}
            collapsed={collapsed}
          />
        </div>
      </motion.aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 lg:px-8 z-10 shrink-0 transition-colors duration-300">
          <div className="flex items-center gap-2 lg:gap-4">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition-colors lg:hidden"
            >
              <Menu size={20} />
            </button>
            <button 
              onClick={() => setCollapsed(!collapsed)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition-colors hidden lg:block"
            >
              <Menu size={20} />
            </button>
            <div className="hidden md:flex items-center text-sm text-slate-400">
              <button 
                onClick={() => setActiveTab('dashboard')}
                className="hover:text-blue-600 transition-colors"
              >
                UTC
              </button>
              <ChevronRight size={14} className="mx-2" />
              <span className="text-slate-600 dark:text-slate-300 font-medium capitalize">
                {activeTab === 'dashboard' ? 'Dashboard' : 
                 activeTab === 'students' ? 'Alumnos' :
                 activeTab === 'teachers' ? 'Profesores' :
                 activeTab === 'careers' ? 'Carreras' :
                 activeTab === 'subjects' ? 'Materias' :
                 activeTab === 'groups' ? 'Grupos' :
                 activeTab === 'settings' ? 'Configuración' :
                 activeTab === 'my-groups' ? 'Mis Grupos' :
                 activeTab === 'grades' ? 'Calificaciones' :
                 activeTab === 'debts' ? 'Adeudos' :
                 activeTab === 'reports' ? 'Reportes' :
                 activeTab === 'calculator' ? 'Calculadora' :
                 activeTab.replace('-', ' ')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 lg:gap-6">
            <div className="relative hidden lg:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Buscar..." 
                className="pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-full text-sm w-48 xl:w-64 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none dark:text-white"
              />
            </div>

            <div className="flex items-center gap-2">
              <div className={cn(
                "hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all duration-500",
                isSupabaseConfigured 
                  ? "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800" 
                  : "bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800 animate-pulse"
              )}>
                <div className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  isSupabaseConfigured ? "bg-emerald-500" : "bg-rose-500"
                )} />
                {isSupabaseConfigured ? 'Supabase Conectado' : 'Sin Conexión DB'}
              </div>
            </div>
            
            <div 
              className="relative"
              onMouseEnter={() => setShowNotifications(true)}
              onMouseLeave={() => setShowNotifications(false)}
            >
              <button className="relative p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                <Bell size={20} />
                {notifications.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"></span>
                )}
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 p-2 z-50 overflow-hidden"
                  >
                    <div className="p-3 border-b border-slate-100 dark:border-slate-800">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">Notificaciones</h4>
                    </div>
                    <div className="max-h-80 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                      {notifications.length > 0 ? notifications.map((notif, idx) => (
                        <div key={idx} className="p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{notif.action}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{notif.details}</p>
                        </div>
                      )) : (
                        <div className="p-4 text-center">
                          <p className="text-sm text-slate-500">No hay notificaciones recientes.</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div 
              className="relative"
              onMouseEnter={() => setShowProfilePanel(true)}
              onMouseLeave={() => setShowProfilePanel(false)}
            >
              <button 
                onClick={() => setActiveTab('settings')}
                className="flex items-center gap-2 lg:gap-3 pl-2 lg:pl-4 border-l border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 py-1 px-2 rounded-xl transition-all group"
              >
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-semibold text-slate-800 dark:text-white truncate max-w-[100px] group-hover:text-blue-600 transition-colors">{user.name}</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    {user.role === 'ADMIN' ? 'Administrador' : user.role === 'DOCENTE' ? 'Docente' : 'Cobranza'}
                  </p>
                </div>
                <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 overflow-hidden border-2 border-white dark:border-slate-700 shadow-sm shrink-0 group-hover:border-blue-600 transition-all">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <UserIcon size={18} />
                  )}
                </div>
              </button>

              <AnimatePresence>
                {showProfilePanel && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 rounded-[24px] shadow-2xl border border-slate-100 dark:border-slate-800 p-6 z-50 overflow-hidden transition-colors duration-300"
                  >
                    <div className="flex flex-col items-center text-center space-y-4">
                      <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 border-4 border-white dark:border-slate-800 shadow-md overflow-hidden">
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <UserIcon size={32} />
                        )}
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-slate-900 dark:text-white">{user.name}</h4>
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{user.email}</p>
                        <span className="inline-block mt-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-black rounded-full uppercase tracking-widest">
                          {user.role === 'ADMIN' ? 'Administrador' : user.role === 'DOCENTE' ? 'Docente' : 'Cobranza'}
                        </span>
                      </div>
                      <div className="w-full pt-4 border-t border-slate-100 dark:border-slate-800">
                        <button 
                          onClick={onLogout}
                          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-xl text-sm font-bold hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-all"
                        >
                          <LogOut size={18} /> Cerrar Sesión
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8 bg-slate-50/50 dark:bg-slate-950/50 transition-colors duration-300">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};
