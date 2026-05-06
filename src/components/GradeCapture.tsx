import React, { useState } from 'react';
import { 
  Save, 
  Download, 
  ChevronLeft, 
  Search, 
  CheckCircle2, 
  AlertCircle,
  FileSpreadsheet,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { Grade, Subject } from '../types';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';

interface GradeCaptureProps {
  onBack?: () => void;
  groups?: any[];
  students?: any[];
  careers?: any[];
  onSaveSuccess?: () => void;
}

export const GradeCapture = ({ onBack, groups = [], students = [], careers = [], onSaveSuccess }: GradeCaptureProps) => {
  const [selectedGroupId, setSelectedGroupId] = useState(groups[0]?.id || '');
  const [grades, setGrades] = useState<Grade[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // Initialize grades when group changes or students/groups load
  React.useEffect(() => {
    const fetchGrades = async () => {
      if (!selectedGroupId) return;

      const group = groups.find(g => g.id === selectedGroupId);
      if (!group) return;

      // 1. Get students for this group
      const targetGroupId = group.originalGroup?.id || group.id;
      const targetSubject = group.originalSubject;
      
      const groupStudents = students.filter(s => {
        const studentGroupId = s.group_id || s.group || s.groupId;
        const isInGroup = String(studentGroupId) === String(targetGroupId);
        
        if (targetSubject) {
          const studentSemester = Number(s.semester || s.cuatrimestre || 0);
          const studentCareerVal = s.career_id || s.career;
          const sSemester = Number(targetSubject.semester || 0);
          const sCareerVal = targetSubject.career_id || targetSubject.careerId || targetSubject.career;
          
          const getCareerIdLocal = (val: any) => {
            if (!val) return null;
            const valStr = String(val).trim();
            const career = careers.find(c => 
              String(c.id) === valStr || 
              String(c.code).toLowerCase() === valStr.toLowerCase() || 
              String(c.name).toLowerCase() === valStr.toLowerCase()
            );
            return career ? String(career.id) : valStr;
          };

          const studentCareerId = getCareerIdLocal(studentCareerVal);
          const sCareerId = getCareerIdLocal(sCareerVal);
          
          const matchesSemesterAndCareer = studentSemester === sSemester && (targetSubject.isCommonCore || (studentCareerId && sCareerId && studentCareerId === sCareerId));
          return isInGroup || matchesSemesterAndCareer;
        }
        
        return isInGroup;
      });
      
      // If we already have grades loaded for this exact set of students, don't re-fetch and overwrite unsaved changes
      if (grades.length > 0 && grades.length === groupStudents.length && grades.every(g => groupStudents.some(s => s.id === g.studentId))) {
        return;
      }

      setLoading(true);
      try {
        const groupId = group.originalGroup?.id || group.id;
        const subjectId = group.originalSubject?.id;

        if (!subjectId) {
          console.warn('No subjectId found for selected group');
          setGrades([]);
          setLoading(false);
          return;
        }

        // 2. Get existing grades from Supabase
        const { data: existingGrades, error } = await supabase
          .from('partial_grades')
          .select('*')
          .eq('group_id', groupId)
          .eq('subject_id', subjectId);

        if (error) throw error;

        const gradesMap = new Map();
        if (existingGrades) {
          existingGrades.forEach(g => gradesMap.set(g.student_id, g));
        }

        const newGrades: Grade[] = groupStudents.map(s => {
          const existing = gradesMap.get(s.id);
          if (existing) {
            return {
              studentId: s.id,
              studentName: s.name || `${s.first_name} ${s.last_name}`,
              enrollment: s.enrollment || '',
              p1: parseFloat(existing.p1),
              p2: parseFloat(existing.p2),
              p3: parseFloat(existing.p3),
              average: parseFloat(existing.average),
              status: existing.status
            };
          }
          return {
            studentId: s.id,
            studentName: s.name || `${s.first_name} ${s.last_name}`,
            enrollment: s.enrollment || '',
            p1: 0,
            p2: 0,
            p3: 0,
            average: 0,
            status: 'failed'
          };
        });

        setGrades(newGrades);
      } catch (err) {
        console.error('Error fetching grades:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchGrades();
  }, [selectedGroupId, groups, students]);

  const handleGradeChange = (id: string, field: 'p1' | 'p2' | 'p3', value: string) => {
    let numValue = parseFloat(value);
    
    if (value === '') {
      // Allow empty string by setting to 0 or keeping it as is.
      // Since the type is number, we'll use 0 but the input will show 0.
      // Wait, if we want the input to be empty, we need the type to be string | number.
      // For now, we'll set it to 0.
      numValue = 0;
    } else if (isNaN(numValue)) {
      return;
    }

    if (numValue < 0 || numValue > 10) return;

    setGrades(prev => prev.map(g => {
      if (g.studentId === id) {
        const newGrades = { ...g, [field]: numValue };
        const avg = (newGrades.p1 + newGrades.p2 + newGrades.p3) / 3;
        return {
          ...newGrades,
          average: parseFloat(avg.toFixed(1)),
          status: avg >= 6 ? 'approved' : 'failed'
        };
      }
      return g;
    }));
  };

  const handleSave = async () => {
    if (!selectedGroupId) return;
    const group = groups.find(g => g.id === selectedGroupId);
    if (!group) return;

    setSaving(true);
    try {
      const groupId = group.originalGroup?.id || group.id;
      const subjectId = group.originalSubject?.id;

      const gradesToUpsert = grades.map(g => ({
        student_id: g.studentId,
        subject_id: subjectId,
        group_id: groupId,
        p1: g.p1,
        p2: g.p2,
        p3: g.p3,
        average: g.average,
        status: g.status
      }));

      const { error } = await supabase
        .from('partial_grades')
        .upsert(gradesToUpsert, { onConflict: 'student_id,subject_id,group_id' });

      if (error) throw error;

      setNotification({ type: 'success', message: 'Calificaciones guardadas correctamente' });
      setTimeout(() => setNotification(null), 3000);
      
      if (onSaveSuccess) {
        onSaveSuccess();
      }
    } catch (err) {
      console.error('Error saving grades:', err);
      setNotification({ type: 'error', message: 'Error al guardar las calificaciones' });
      setTimeout(() => setNotification(null), 4000);
    } finally {
      setSaving(false);
    }
  };

  const handleExport = (type: 'csv' | 'excel') => {
    const exportData = grades.map(g => ({
      Matrícula: g.enrollment,
      Alumno: g.studentName,
      'Parcial 1': g.p1,
      'Parcial 2': g.p2,
      'Parcial 3': g.p3,
      Promedio: g.average,
      Estatus: g.status === 'approved' ? 'Aprobado' : 'Reprobado'
    }));

    const fileName = 'calificaciones_export';

    if (type === 'csv') {
      const csv = Papa.unparse(exportData);
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
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Calificaciones');
      XLSX.writeFile(workbook, `${fileName}.xlsx`);
    }
  };

  const filteredGrades = grades.filter(g => 
    g.studentName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 relative">
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

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Captura de Calificaciones</h1>
            <div className="flex items-center gap-2 mt-1">
              <select 
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                className="bg-transparent text-slate-500 dark:text-slate-400 font-medium outline-none border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer"
              >
                {groups.length > 0 ? (
                  groups.map(g => (
                    <option key={g.id} value={g.id} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">
                      {g.name} • {g.subject || g.code}
                    </option>
                  ))
                ) : (
                  <option value="">No hay grupos asignados</option>
                )}
              </select>
            </div>
          </div>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <div className="relative group flex-1 sm:flex-none">
            <button className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-2">
              <Download size={16} /> Exportar
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
          <button 
            onClick={handleSave}
            disabled={saving}
            className={cn(
              "px-6 py-2 rounded-xl text-sm font-bold text-white transition-all flex items-center gap-2 shadow-lg",
              saving ? "bg-slate-400 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
            )}
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Guardando...
              </>
            ) : (
              <>
                <Save size={16} /> Guardar Cambios
              </>
            )}
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/30 dark:bg-slate-800/30">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Buscar alumno..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 transition-all outline-none dark:text-white"
            />
          </div>
          <div className="hidden sm:flex items-center gap-6 text-xs font-bold text-slate-400 uppercase tracking-widest">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500"></div> Aprobado (≥ 6.0)
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-rose-500"></div> Reprobado (&lt; 6.0)
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-10 h-10 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin mb-4"></div>
              <p className="text-slate-500 dark:text-slate-400 font-medium">Cargando alumnos y calificaciones...</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/50">
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider w-32">Matrícula</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Nombre del Alumno</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center w-32">Parcial 1</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center w-32">Parcial 2</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center w-32">Parcial 3</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center w-32">Promedio</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center w-32">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredGrades.map((grade) => (
                <tr key={grade.studentId} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4 text-sm font-mono text-slate-400">{grade.enrollment}</td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-slate-800 dark:text-white">{grade.studentName}</p>
                  </td>
                  <td className="px-6 py-4">
                    <input 
                      type="number" 
                      min="0" 
                      max="10" 
                      step="0.1"
                      value={grade.p1}
                      onChange={(e) => handleGradeChange(grade.studentId, 'p1', e.target.value)}
                      className="w-20 mx-auto block text-center py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-slate-700 outline-none transition-all"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <input 
                      type="number" 
                      min="0" 
                      max="10" 
                      step="0.1"
                      value={grade.p2}
                      onChange={(e) => handleGradeChange(grade.studentId, 'p2', e.target.value)}
                      className="w-20 mx-auto block text-center py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-slate-700 outline-none transition-all"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <input 
                      type="number" 
                      min="0" 
                      max="10" 
                      step="0.1"
                      value={grade.p3}
                      onChange={(e) => handleGradeChange(grade.studentId, 'p3', e.target.value)}
                      className="w-20 mx-auto block text-center py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-slate-700 outline-none transition-all"
                    />
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={cn(
                      "text-base font-black",
                      grade.status === 'approved' ? "text-emerald-600" : "text-rose-600"
                    )}>
                      {grade.average.toFixed(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center">
                      {grade.status === 'approved' ? (
                        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-wider">
                          <CheckCircle2 size={12} /> Aprobado
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-600 text-[10px] font-black uppercase tracking-wider">
                          <AlertCircle size={12} /> Reprobado
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          )}
        </div>
      </div>
    </div>
  );
};
