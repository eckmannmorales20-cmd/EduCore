import React, { useState } from 'react';
import { 
  Users, 
  UserSquare2, 
  Layers, 
  BookOpen, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight,
  Clock,
  MoreHorizontal,
  RefreshCw
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { ActivityHistoryModal } from './ActivityHistoryModal';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

const StatCard = ({ title, value, icon: Icon, color, onClick }: any) => (
  <div 
    onClick={onClick}
    className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer group"
  >
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3 rounded-xl ${color} bg-opacity-10 group-hover:scale-110 transition-transform duration-300`}>
        <Icon size={24} className={color.replace('bg-', 'text-')} />
      </div>
      <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
        <MoreHorizontal size={20} />
      </button>
    </div>
    <div>
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{title}</p>
      <h3 className="text-2xl font-bold text-slate-800 dark:text-white">{value}</h3>
    </div>
  </div>
);

interface AdminDashboardProps {
  careers?: string[];
  semesters?: string[];
  onNavigate?: (tab: string) => void;
  onExport?: (type: 'csv' | 'excel') => void;
  onSync?: () => void;
  stats?: {
    students: number;
    teachers: number;
    groups: number;
    subjects: number;
  };
  history?: any[];
  rendimientoData?: any[];
}

export const AdminDashboard = ({ 
  careers = [], 
  semesters = [], 
  onNavigate, 
  onExport, 
  onSync,
  stats, 
  history = [],
  rendimientoData = []
}: AdminDashboardProps) => {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const handleExport = (type: 'csv' | 'excel') => {
    if (onExport) {
      onExport(type);
      return;
    }
    const exportData = rendimientoData.length > 0 ? rendimientoData.map(item => ({
      Mes: item.name,
      'Rendimiento Académico (%)': item.rendimiento
    })) : history.map(item => ({
      Fecha: item.date,
      Usuario: item.user,
      Acción: item.action,
      Detalle: item.details
    }));

    const fileName = rendimientoData.length > 0 ? 'reporte_rendimiento' : 'historial_actividad';

    if (type === 'csv') {
      const csv = Papa.unparse(exportData as any[]);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${fileName}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Rendimiento');
      XLSX.writeFile(workbook, `${fileName}.xlsx`);
    }
  };

  return (
    <div className="space-y-6 lg:space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-slate-900 dark:text-white">Panel de Control</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Bienvenido de nuevo, aquí tienes el resumen de hoy.</p>
        </div>
        <div className="flex gap-2 lg:gap-3 w-full sm:w-auto">
          {onSync && (
            <button 
              onClick={onSync}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs lg:text-sm font-medium transition-all duration-300 shadow-sm hover:shadow-md flex items-center gap-2"
            >
              <RefreshCw size={16} />
              <span className="hidden md:inline">Sincronizar Carga</span>
            </button>
          )}
          <div className="relative group flex-1 sm:flex-none">
            <button className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs lg:text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              Descargar Reporte
            </button>
            <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-30">
              <button 
                onClick={() => handleExport('excel')}
                className="w-full px-4 py-2 text-left text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-t-xl"
              >
                Excel (.xlsx)
              </button>
              <button 
                onClick={() => handleExport('csv')}
                className="w-full px-4 py-2 text-left text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-b-xl"
              >
                CSV (.csv)
              </button>
            </div>
          </div>
          <button className="flex-1 sm:flex-none px-4 py-2 bg-blue-600 rounded-xl text-xs lg:text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20">
            Nuevo Ciclo
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Alumnos" 
          value={stats?.students || 0} 
          icon={Users} 
          color="bg-blue-600" 
          onClick={() => onNavigate?.('students')}
        />
        <StatCard 
          title="Profesores" 
          value={stats?.teachers || 0} 
          icon={UserSquare2} 
          color="bg-violet-600" 
          onClick={() => onNavigate?.('teachers')}
        />
        <StatCard 
          title="Grupos Activos" 
          value={stats?.groups || 0} 
          icon={Layers} 
          color="bg-emerald-600" 
          onClick={() => onNavigate?.('groups')}
        />
        <StatCard 
          title="Materias" 
          value={stats?.subjects || 0} 
          icon={BookOpen} 
          color="bg-amber-600" 
          onClick={() => onNavigate?.('subjects')}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-4 lg:p-8 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm transition-colors min-w-0">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <h3 className="text-base lg:text-lg font-bold text-slate-800 dark:text-white">Rendimiento Académico</h3>
              <p className="text-xs lg:text-sm text-slate-500 dark:text-slate-400">Promedio general de la institución</p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <select className="flex-1 sm:flex-none bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-[10px] lg:text-xs px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500/20 font-medium text-slate-600 dark:text-slate-300">
                <option value="">Carrera</option>
                {careers.map((career, idx) => (
                  <option key={idx} value={career}>{career}</option>
                ))}
              </select>
              <select className="flex-1 sm:flex-none bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-[10px] lg:text-xs px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500/20 font-medium text-slate-600 dark:text-slate-300">
                <option value="">Cuatrimestre</option>
                {semesters.map((semester, idx) => (
                  <option key={idx} value={semester}>{semester}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="h-[200px] lg:h-[300px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={rendimientoData}>
                <defs>
                  <linearGradient id="colorRend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94a3b8', fontSize: 12}}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94a3b8', fontSize: 12}}
                  dx={-10}
                />
                <Tooltip 
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                />
                <Area 
                  type="monotone" 
                  dataKey="rendimiento" 
                  stroke="#2563eb" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorRend)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 lg:p-8 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm transition-colors">
          <h3 className="text-base lg:text-lg font-bold text-slate-800 dark:text-white mb-6">Actividad Reciente</h3>
          <div className="space-y-6">
            {history.length > 0 ? (
              history.slice(0, 5).map((item, idx) => (
                <div key={idx} className="flex gap-4 items-start">
                  <div className={`p-2 rounded-lg bg-opacity-10 ${
                    item.type === 'create' ? 'bg-emerald-600 text-emerald-600' :
                    item.type === 'update' ? 'bg-blue-600 text-blue-600' :
                    'bg-amber-600 text-amber-600'
                  }`}>
                    <Clock size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-white truncate">
                      {item.action}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {item.details}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {item.date}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-slate-400 text-sm py-8">
                No hay actividad reciente
              </div>
            )}
          </div>
          <button 
            onClick={() => setIsHistoryOpen(true)}
            className="w-full mt-8 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors"
          >
            Ver todo el historial
          </button>
        </div>
      </div>

      <ActivityHistoryModal 
        isOpen={isHistoryOpen} 
        onClose={() => setIsHistoryOpen(false)} 
        history={history}
      />
    </div>
  );
};
