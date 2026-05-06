import React from 'react';
import { X, BookOpen, Plus, Check, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';
import { Teacher, Subject, Group } from '../types';
import { cn } from '../lib/utils';

interface AssignSubjectModalProps {
  teacher: Teacher;
  onClose: () => void;
  subjects: Subject[];
  careers: any[];
  onAssign: (subjectId: string, careerId?: string) => void;
  onSync?: () => Promise<void>;
}

export const AssignSubjectModal = ({ teacher, onClose, subjects, careers: allCareers, onAssign, onSync }: AssignSubjectModalProps) => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedCareer, setSelectedCareer] = React.useState('Todas');
  const [selectedSemester, setSelectedSemester] = React.useState('Todos');
  const [selectedType, setSelectedType] = React.useState<'todos' | 'common' | 'specialty'>('todos');
  const [assignmentCareers, setAssignmentCareers] = React.useState<Record<string, string>>({});
  const [isSyncing, setIsSyncing] = React.useState(false);

  const handleSync = async () => {
    if (!onSync) return;
    setIsSyncing(true);
    try {
      await onSync();
    } finally {
      setIsSyncing(false);
    }
  };

  const careers = React.useMemo(() => {
    const unique = new Set(subjects.map(s => s.career).filter(Boolean));
    return ['Todas', ...Array.from(unique)];
  }, [subjects]);

  const semesters = React.useMemo(() => {
    const allSemesters = new Set<string>();
    subjects.forEach(s => {
      if (s.semester) {
        const matches = String(s.semester).match(/\d+/g);
        if (matches) matches.forEach(m => allSemesters.add(m));
      }
    });
    return ['Todos', ...Array.from(allSemesters).sort((a, b) => Number(a) - Number(b))];
  }, [subjects]);

  const filteredSubjects = subjects.filter(s => {
    const matchesSearch = (s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
     s.code.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesTeacher = s.teacher !== teacher.name;

    const matchesCareer = selectedCareer === 'Todas' || s.career === selectedCareer;

    const matchesSemester = selectedSemester === 'Todos' || 
      (s.semester && String(s.semester).match(/\d+/g)?.includes(selectedSemester));

    const matchesType = selectedType === 'todos' 
      ? true 
      : selectedType === 'common' 
        ? s.isCommonCore 
        : !s.isCommonCore;

    return matchesSearch && matchesTeacher && matchesCareer && matchesSemester && matchesType;
  });

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[32px] shadow-2xl overflow-hidden flex flex-col transition-colors max-h-[90vh]"
      >
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Asignar Materia</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Profesor: {teacher.name}</p>
          </div>
          <div className="flex items-center gap-2">
            {onSync && (
              <button 
                onClick={handleSync}
                disabled={isSyncing}
                className={cn(
                  "p-2 rounded-full transition-all",
                  isSyncing ? "bg-slate-100 text-slate-400 animate-spin" : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                )}
                title="Sincronizar con Supabase"
              >
                <RefreshCw size={18} />
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-full text-slate-400 dark:hover:text-slate-200 transition-all">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-4 border-b border-slate-100 dark:border-slate-800 space-y-3">
          <div className="relative">
            <input 
              type="text" 
              placeholder="Buscar materia por nombre o código..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-4 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all dark:text-white"
            />
          </div>
          
          <div className="flex flex-wrap gap-2">
            <select
              value={selectedCareer}
              onChange={(e) => setSelectedCareer(e.target.value)}
              className="flex-1 min-w-[120px] px-3 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              {careers.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="flex-1 min-w-[100px] px-3 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="Todos">Cuatrimestre: Todos</option>
              {semesters.filter(s => s !== 'Todos').map(s => (
                <option key={s} value={s}>{s}° Cuatrimestre</option>
              ))}
            </select>
            
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as any)}
              className="flex-1 min-w-[120px] px-3 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="todos">Todos los tipos</option>
              <option value="common">Tronco Común</option>
              <option value="specialty">Especialidad</option>
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto max-h-[400px] p-4 space-y-3">
          {filteredSubjects.length > 0 ? (
            filteredSubjects.map((subject) => (
              <div
                key={subject.id}
                className="w-full p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl hover:border-blue-200 dark:hover:border-blue-900/50 transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-lg group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      <BookOpen size={18} />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold text-slate-800 dark:text-white">{subject.name}</p>
                      <p className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase">
                        {subject.code} • {subject.semester}° Cuatrimestre • {subject.studentsCount || 0} Alumnos
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => onAssign(subject.id, assignmentCareers[subject.id] || subject.career)}
                    className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2 text-xs font-bold"
                  >
                    <Plus size={16} />
                    Asignar
                  </button>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Carrera para Asignación</label>
                  <select
                    value={assignmentCareers[subject.id] || subject.career || 'Todas'}
                    onChange={(e) => setAssignmentCareers(prev => ({ ...prev, [subject.id]: e.target.value }))}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800/50 border-none rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="Todas">Tronco Común (Todas)</option>
                    {allCareers.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-sm italic">
              No se encontraron materias disponibles.
            </div>
          )}
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2 text-sm font-bold text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </motion.div>
    </div>
  );
};
