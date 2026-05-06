import React from 'react';
import { X, CheckCircle2, Clock, User, ChevronRight, BarChart3 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { Subject, Rubric, Evaluation, Student, SubjectCriterion } from '../types';

interface SubjectEvaluationModalProps {
  subject: Subject;
  onClose: () => void;
  rubrics: Rubric[];
  evaluations: Evaluation[];
  students: Student[];
  subjectCriteria: SubjectCriterion[];
  loading?: boolean;
}

export const SubjectEvaluationModal = ({ 
  subject, 
  onClose, 
  rubrics, 
  evaluations, 
  students, 
  subjectCriteria,
  loading 
}: SubjectEvaluationModalProps) => {
  const [activeView, setActiveView] = React.useState<'assignments' | 'students' | 'criteria'>('assignments');

  const subjectRubrics = rubrics;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[90vh] rounded-[32px] shadow-2xl overflow-hidden flex flex-col transition-colors"
      >
        {/* Header */}
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start bg-slate-50/50 dark:bg-slate-800/50">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="px-3 py-1 bg-blue-600 text-white text-[10px] font-black rounded-full uppercase tracking-widest">
                {subject.code}
              </span>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{subject.name}</h2>
            </div>
            <p className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-2">
              <User size={16} /> {subject.teacher} • {subject.semester}° Cuatrimestre
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all shadow-sm"
          >
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-8 pt-4 flex gap-6 border-b border-slate-100 dark:border-slate-800">
          <button 
            onClick={() => setActiveView('assignments')}
            className={cn(
              "pb-4 text-sm font-bold uppercase tracking-widest transition-all relative",
              activeView === 'assignments' ? "text-blue-600 dark:text-blue-400" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            )}
          >
            Asignaciones y Criterios
            {activeView === 'assignments' && (
              <motion.div layoutId="modal-tab" className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 dark:bg-blue-400 rounded-full" />
            )}
          </button>
          <button 
            onClick={() => setActiveView('students')}
            className={cn(
              "pb-4 text-sm font-bold uppercase tracking-widest transition-all relative",
              activeView === 'students' ? "text-blue-600 dark:text-blue-400" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            )}
          >
            Evaluación por Alumno
            {activeView === 'students' && (
              <motion.div layoutId="modal-tab" className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 dark:bg-blue-400 rounded-full" />
            )}
          </button>
          <button 
            onClick={() => setActiveView('criteria')}
            className={cn(
              "pb-4 text-sm font-bold uppercase tracking-widest transition-all relative",
              activeView === 'criteria' ? "text-blue-600 dark:text-blue-400" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            )}
          >
            Criterios de Materia
            {activeView === 'criteria' && (
              <motion.div layoutId="modal-tab" className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 dark:bg-blue-400 rounded-full" />
            )}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-slate-500 font-medium">Cargando información real...</p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {activeView === 'assignments' ? (
                <motion.div 
                  key="assignments"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="space-y-6"
                >
                  {subjectRubrics.length > 0 ? (
                    subjectRubrics.map((rubric) => (
                      <div key={rubric.id} className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <div className="p-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                          <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <ChevronRight size={18} className="text-blue-500 dark:text-blue-400" />
                            {rubric.rubricName}
                          </h4>
                          <span className="text-[10px] font-black uppercase px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-md">
                            Evaluada
                          </span>
                        </div>
                        <div className="p-6">
                          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Criterios de Evaluación</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {rubric.criteria.map((c) => (
                              <div key={c.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{c.name}</span>
                                <span className="text-xs font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-lg">{c.weight}%</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12 text-slate-400 dark:text-slate-500 italic">
                      No hay asignaciones registradas para esta materia.
                    </div>
                  )}
                </motion.div>
              ) : activeView === 'students' ? (
                <motion.div 
                  key="students"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                >
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/50">
                          <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Alumno</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Matrícula</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Estado</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Calificación</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {students.length > 0 ? (
                          students.map((student) => {
                            const evaluation = evaluations.find(e => e.studentId === student.id);
                            return (
                              <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500">
                                      <User size={14} />
                                    </div>
                                    <span className="text-sm font-bold text-slate-800 dark:text-white">{student.name}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-xs font-mono font-bold text-slate-400 dark:text-slate-500">{student.enrollment}</td>
                                <td className="px-6 py-4 text-center">
                                  {evaluation?.status === 'completed' ? (
                                    <CheckCircle2 className="text-emerald-500 dark:text-emerald-400 mx-auto" size={18} />
                                  ) : (
                                    <Clock className="text-amber-400 dark:text-amber-500 mx-auto" size={18} />
                                  )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <span className={cn(
                                    "text-sm font-black",
                                    evaluation?.totalScore && evaluation.totalScore >= 6 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                                  )}>
                                    {evaluation?.totalScore?.toFixed(1) || 'N/A'}
                                  </span>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={4} className="px-6 py-12 text-center text-slate-400 dark:text-slate-500 italic">
                              No se encontraron alumnos inscritos en esta materia para este cuatrimestre y carrera.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="criteria"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[1, 2, 3].map((partial) => {
                      const defaultCriteria: SubjectCriterion[] = [
                        { id: 'def-1', name: 'Examen', weight: 40, scope: 'all' },
                        { id: 'def-2', name: 'Actividades', weight: 30, scope: 'all' },
                        { id: 'def-3', name: 'Prácticas', weight: 30, scope: 'all' }
                      ];
                      
                      const criteriaToDisplay = subjectCriteria.length > 0 ? subjectCriteria : defaultCriteria;
                      const filteredCriteria = criteriaToDisplay.filter(c => 
                        String(c.scope) === String(partial) || c.scope === 'all'
                      );
                      const totalWeight = filteredCriteria.reduce((sum, c) => sum + c.weight, 0);

                      return (
                        <div key={partial} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col">
                          <div className="flex justify-between items-center mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">
                            <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">
                              Parcial {partial}
                            </h4>
                            <span className={cn(
                              "text-[10px] font-black px-2 py-0.5 rounded-full",
                              totalWeight === 100 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                            )}>
                              {totalWeight}%
                            </span>
                          </div>
                          <div className="space-y-3 flex-1">
                            {filteredCriteria.map(c => (
                              <div key={c.id} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{c.name}</span>
                                <span className="text-xs font-black text-blue-600 dark:text-blue-400">{c.weight}%</span>
                              </div>
                            ))}
                            {filteredCriteria.length === 0 && (
                              <p className="text-xs text-slate-400 italic text-center py-4">Sin criterios configurados</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {subjectCriteria.length === 0 && (
                    <p className="text-center text-xs text-slate-400 italic bg-slate-50 dark:bg-slate-800/30 py-3 rounded-xl">
                      Mostrando criterios predeterminados (no se han configurado criterios específicos para esta materia).
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>

        {/* Footer Stats */}
        <div className="p-4 bg-slate-900 text-white flex justify-around items-center shrink-0">
          <div className="text-center">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Progreso General</p>
            <p className="text-lg font-black">{subject.evaluationProgress || 0}%</p>
          </div>
          <div className="w-px h-6 bg-white/10" />
          <div className="text-center">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Evaluados</p>
            <p className="text-lg font-black text-emerald-400">
              {evaluations.filter(e => e.rubricId.startsWith(subject.id) && e.status === 'completed').length} / {students.length}
            </p>
          </div>
          <div className="w-px h-6 bg-white/10" />
          <div className="text-center">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Promedio Grupal</p>
            <p className="text-lg font-black text-blue-400">
              {evaluations.length > 0 
                ? (evaluations.reduce((acc, e) => acc + e.totalScore, 0) / evaluations.length).toFixed(1) 
                : '0.0'}
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
