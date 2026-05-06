import React, { useState } from 'react';
import { 
  ChevronLeft, 
  Search, 
  CheckCircle2, 
  Clock,
  User,
  Star,
  Save,
  ChevronRight,
  AlertCircle,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { Rubric, Evaluation, StudentGrade } from '../types';
import { supabase } from '../lib/supabase';

interface StudentEvaluationProps {
  rubric: Rubric;
  students: { id: string, name: string, enrollment?: string }[];
  onBack: () => void;
  criterionName: string;
  onSaveSuccess?: () => void;
}

export const StudentEvaluation = ({ rubric, students, onBack, criterionName, onSaveSuccess }: StudentEvaluationProps) => {
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [evaluations, setEvaluations] = useState<Record<string, Evaluation>>({});
  const [currentGrades, setCurrentGrades] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // Fetch existing evaluations on mount
  React.useEffect(() => {
    const fetchEvaluations = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('evaluations')
          .select('*')
          .eq('rubric_id', rubric.id);

        if (error) throw error;

        if (data) {
          const evalMap: Record<string, Evaluation> = {};
          data.forEach((ev: any) => {
            evalMap[ev.student_id] = {
              id: ev.id,
              studentId: ev.student_id,
              studentName: students.find(s => s.id === ev.student_id)?.name || '',
              rubricId: ev.rubric_id,
              scores: ev.scores,
              totalScore: parseFloat(ev.total_score),
              status: ev.status as 'pending' | 'completed'
            };
          });
          setEvaluations(evalMap);
        }
      } catch (err) {
        console.error('Error fetching evaluations:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEvaluations();
  }, [rubric.id, students]);

  const selectedStudent = students.find(s => s.id === selectedStudentId);

  const handleGradeChange = (criterionId: string, value: string) => {
    if (value === '') {
      setCurrentGrades(prev => {
        const next = { ...prev };
        delete next[criterionId];
        return next;
      });
      return;
    }
    
    const score = parseFloat(value);
    if (isNaN(score)) return;
    if (score < 0 || score > 10) return;
    
    setCurrentGrades(prev => ({ ...prev, [criterionId]: score }));
  };

  const calculateTotal = (grades: Record<string, number>) => {
    return rubric.criteria.reduce((total, criterion) => {
      const score = grades[criterion.id] || 0;
      return total + (score * (criterion.weight / 100));
    }, 0);
  };

  const saveEvaluation = async () => {
    if (!selectedStudentId) return;

    const totalScore = calculateTotal(currentGrades);
    setSaving(true);

    try {
      const existingEval = evaluations[selectedStudentId];
      
      if (existingEval) {
        // Update
        const { error } = await supabase
          .from('evaluations')
          .update({
            scores: currentGrades,
            total_score: totalScore,
            status: 'completed'
          })
          .eq('id', existingEval.id);

        if (error) throw error;
      } else {
        // Insert
        const { data, error } = await supabase
          .from('evaluations')
          .insert([{
            student_id: selectedStudentId,
            rubric_id: rubric.id,
            scores: currentGrades,
            total_score: totalScore,
            status: 'completed'
          }])
          .select()
          .single();

        if (error) throw error;

        if (data) {
          setEvaluations(prev => ({
            ...prev,
            [selectedStudentId]: {
              id: data.id,
              studentId: data.student_id,
              studentName: selectedStudent?.name || '',
              rubricId: data.rubric_id,
              scores: data.scores,
              totalScore: parseFloat(data.total_score),
              status: data.status as 'pending' | 'completed'
            }
          }));
        }
      }

      // Update local state for immediate feedback if update
      if (existingEval) {
        setEvaluations(prev => ({
          ...prev,
          [selectedStudentId]: {
            ...existingEval,
            scores: currentGrades,
            totalScore
          }
        }));
      }

      setSelectedStudentId(null);
      setCurrentGrades({});
      setNotification({ type: 'success', message: `Evaluación de ${selectedStudent?.name} guardada con éxito` });
      setTimeout(() => setNotification(null), 3000);
      
      if (onSaveSuccess) {
        onSaveSuccess();
      }
    } catch (err) {
      console.error('Error saving evaluation:', err);
      setNotification({ type: 'error', message: 'Error al guardar la evaluación. Por favor intente de nuevo.' });
      setTimeout(() => setNotification(null), 4000);
    } finally {
      setSaving(false);
    }
  };

  const startEvaluation = (studentId: string) => {
    setSelectedStudentId(studentId);
    const existing = evaluations[studentId];
    if (existing) {
      setCurrentGrades(existing.scores);
    } else {
      setCurrentGrades({});
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (selectedStudentId && selectedStudent) {
    const total = calculateTotal(currentGrades);

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setSelectedStudentId(null)}
            className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Evaluando a {selectedStudent.name}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{rubric.rubricName}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {rubric.criteria.map((criterion) => (
              <div key={criterion.id} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-white">{criterion.name}</h4>
                    <p className="text-xs text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wider">Peso: {criterion.weight}%</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="number" 
                      min="0" 
                      max="10" 
                      step="0.1"
                      value={currentGrades[criterion.id] ?? ''}
                      onChange={(e) => handleGradeChange(criterion.id, e.target.value)}
                      className="w-20 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-center font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                    />
                    <span className="text-sm font-bold text-slate-400 dark:text-slate-500">/ 10</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                    <button
                      key={n}
                      onClick={() => handleGradeChange(criterion.id, n.toString())}
                      className={cn(
                        "flex-1 h-8 rounded-lg text-xs font-bold transition-all",
                        (currentGrades[criterion.id] || 0) >= n
                          ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                          : "bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
                      )}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-6">
            <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-xl shadow-slate-900/20 sticky top-6">
              <div className="text-center space-y-4">
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Calificación Final</p>
                <h3 className="text-6xl font-black">{total.toFixed(1)}</h3>
                <div className="pt-4">
                  <span className={cn(
                    "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest",
                    total >= 6 ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
                  )}>
                    {total >= 6 ? 'Aprobado' : 'Reprobado'}
                  </span>
                </div>
              </div>

              <div className="mt-8 space-y-3">
                <button 
                  onClick={saveEvaluation}
                  disabled={saving}
                  className={cn(
                    "w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2",
                    saving && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <Save size={18} /> {saving ? 'Guardando...' : 'Guardar Evaluación'}
                </button>
                <button 
                  onClick={() => setSelectedStudentId(null)}
                  className="w-full py-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-bold text-sm transition-all"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300 relative">
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 20, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className={cn(
              "fixed top-0 left-1/2 z-[100] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 min-w-[320px] border",
              notification.type === 'success' 
                ? "bg-emerald-500 text-white border-emerald-400" 
                : "bg-rose-500 text-white border-rose-400"
            )}
          >
            {notification.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            <span className="text-sm font-bold flex-1">{notification.message}</span>
            <button onClick={() => setNotification(null)} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 px-3 py-2 hover:bg-white dark:hover:bg-slate-800 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700 group"
        >
          <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-medium">Volver a Actividades</span>
        </button>
        <div className="flex items-center gap-3">
          {criterionName && (
            <div className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800">
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">{criterionName}</span>
            </div>
          )}
          <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Actividad: {rubric.rubricName}</span>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/30 dark:bg-slate-800/30">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Buscar alumno..." 
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 transition-all outline-none dark:text-white"
            />
          </div>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {students.map((student) => {
            const evaluation = evaluations[student.id];
            return (
              <div 
                key={student.id} 
                className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
                onClick={() => startEvaluation(student.id)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500">
                    <User size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-white">{student.name}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">Matrícula: {student.enrollment || 'N/A'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  {evaluation ? (
                    <div className="text-right">
                      <p className="text-sm font-black text-slate-800 dark:text-white">{evaluation.totalScore.toFixed(1)}</p>
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                        <CheckCircle2 size={10} /> Evaluado
                      </span>
                    </div>
                  ) : (
                    <span className="text-[10px] font-bold text-amber-500 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
                      <Clock size={10} /> Pendiente
                    </span>
                  )}
                  <ChevronRight size={20} className="text-slate-300 dark:text-slate-600 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
