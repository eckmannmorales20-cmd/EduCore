import React from 'react';
import { 
  Layers, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  ArrowRight,
  TrendingUp
} from 'lucide-react';
import { cn } from '../lib/utils';

interface TeacherDashboardProps {
  onManageGroup: (group: any) => void;
  onCaptureGrades: () => void;
  groups?: any[];
  stats?: {
    totalGroups: number;
    gradedGroups: number;
    pendingGroups: number;
  };
}

export const TeacherDashboard = ({ onManageGroup, onCaptureGrades, groups = [], stats }: TeacherDashboardProps) => {
  return (
    <div className="space-y-6 lg:space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-slate-900 dark:text-white">Panel del Docente</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Bienvenido. Tienes {groups.length} grupos asignados este cuatrimestre.</p>
        </div>
        <button 
          onClick={onCaptureGrades}
          className="w-full sm:w-auto px-4 py-2 bg-blue-600 rounded-xl text-xs lg:text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
        >
          Capturar Calificaciones
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm transition-colors">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
              <Layers size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Grupos Totales</p>
              <h3 className="text-2xl font-bold text-slate-800 dark:text-white">{stats?.totalGroups || 0}</h3>
            </div>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-blue-600 h-full w-full"></div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm transition-colors">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Calificados</p>
              <h3 className="text-2xl font-bold text-slate-800 dark:text-white">{stats?.gradedGroups || 0}</h3>
            </div>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-emerald-600 h-full transition-all duration-500" style={{ width: `${(stats?.gradedGroups || 0) / (stats?.totalGroups || 1) * 100}%` }}></div>
          </div>
        </div>
 
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm transition-colors">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400">
              <Clock size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Pendientes</p>
              <h3 className="text-2xl font-bold text-slate-800 dark:text-white">{stats?.pendingGroups || 0}</h3>
            </div>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-amber-600 h-full transition-all duration-500" style={{ width: `${(stats?.pendingGroups || 0) / (stats?.totalGroups || 1) * 100}%` }}></div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Mis Grupos Asignados</h3>
        {groups.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
            <p className="text-slate-500 dark:text-slate-400">No tienes grupos asignados actualmente.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {groups.map((group) => (
              <div key={group.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden hover:shadow-md transition-all group">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-lg uppercase tracking-wider">
                      {group.subject}
                    </span>
                    {/* Status logic would need real data, defaulting to pending/not-started for now */}
                    <span className={cn(
                      "flex items-center text-[10px] font-bold uppercase",
                      group.captureProgress === 100 ? "text-emerald-500" : 
                      group.captureProgress > 0 ? "text-amber-500" : "text-slate-400 dark:text-slate-500"
                    )}>
                      {group.captureProgress === 100 ? (
                        <><CheckCircle2 size={12} className="mr-1" /> Completado</>
                      ) : group.captureProgress > 0 ? (
                        <><Clock size={12} className="mr-1" /> En progreso</>
                      ) : (
                        <><AlertCircle size={12} className="mr-1" /> Sin iniciar</>
                      )}
                    </span>
                  </div>
                  <h4 className="text-lg font-bold text-slate-800 dark:text-white mb-2">{group.name}</h4>
                  <div className="flex items-center text-sm text-slate-500 dark:text-slate-400 mb-6">
                    <TrendingUp size={14} className="mr-1" /> {group.studentsCount || 0} Alumnos inscritos
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-slate-400 dark:text-slate-500">Progreso de captura</span>
                      <span className="text-slate-800 dark:text-white">{group.captureProgress || 0}%</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full transition-all duration-500",
                          group.captureProgress === 100 ? "bg-emerald-500" : "bg-blue-500"
                        )}
                        style={{ width: `${group.captureProgress || 0}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => onManageGroup(group)}
                  className="w-full py-4 bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 text-sm font-bold flex items-center justify-center gap-2 group-hover:bg-blue-600 dark:group-hover:bg-blue-600 group-hover:text-white transition-all"
                >
                  Gestionar Grupo <ArrowRight size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
