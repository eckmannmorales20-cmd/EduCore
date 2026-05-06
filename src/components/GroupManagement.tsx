import React, { useState } from 'react';
import { 
  ChevronLeft, 
  Search, 
  Save, 
  UserCheck, 
  UserX, 
  Trash2,
  Clock,
  Calendar,
  Users,
  FileText,
  ClipboardList,
  Star,
  Plus,
  ChevronRight,
  Edit2,
  AlertCircle,
  CheckCircle2,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { AttendanceRecord, Rubric, Student, SubjectCriterion } from '../types';
import { RubricManager } from './RubricManager';
import { StudentEvaluation } from './StudentEvaluation';
import { SubjectCriteriaManager } from './SubjectCriteriaManager';
import { supabase } from '../lib/supabase';
import { MicrosoftTeamsService } from '../services/microsoftGraph.service';

interface GroupManagementProps {
  groupName: string;
  subjectName: string;
  groupId: string;
  subjectId?: string;
  ms_team_id?: string;
  onBack: () => void;
  students?: Student[];
  onSaveSuccess?: () => void;
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const GroupManagement = ({ groupName, subjectName, groupId, subjectId, ms_team_id, onBack, students = [], onSaveSuccess, showToast }: GroupManagementProps) => {
  const [activeTab, setActiveTab] = useState<'criteria' | 'attendance' | 'rubric' | 'evaluations'>('attendance');
  const [rubrics, setRubrics] = useState<Rubric[]>([]);
  const [subjectCriteria, setSubjectCriteria] = useState<SubjectCriterion[]>([]);
  const [selectedRubric, setSelectedRubric] = useState<Rubric | null>(null);
  const [editingRubric, setEditingRubric] = useState<Rubric | null>(null);
  const [hoveredRubricId, setHoveredRubricId] = useState<string | null>(null);
  
  // Initialize records based on students prop
  const [records, setRecords] = useState<AttendanceRecord[]>(() => 
    students.map(s => ({
      studentId: s.id,
      studentName: s.name,
      enrollment: s.enrollment,
      status: 'present'
    }))
  );

  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ id: string, name: string } | null>(null);

  // Fetch rubrics, subject criteria, and attendance on mount/date change/tab change
  React.useEffect(() => {
    const fetchData = async () => {
      if (!subjectId) return;
      
      try {
        // Fetch subject criteria
        let { data: criteriaData, error: criteriaError } = await supabase
          .from('subject_criteria')
          .select('*')
          .eq('subject_id', subjectId);
        
        console.log('Fetched subjectCriteria:', criteriaData);
        if (criteriaError) throw criteriaError;

        // Auto-generate default criteria if none exist (so RubricManager dropdown is populated)
        if (!criteriaData || criteriaData.length === 0) {
           const defaultCriteria = [
            { subject_id: subjectId, name: 'Examen', weight: 40, scope: 'all' },
            { subject_id: subjectId, name: 'Actividades', weight: 30, scope: 'all' },
            { subject_id: subjectId, name: 'Prácticas', weight: 30, scope: 'all' }
           ];
           const { data: newCriteria, error: insertError } = await supabase
             .from('subject_criteria')
             .insert(defaultCriteria)
             .select();
           
           if (!insertError && newCriteria) {
               criteriaData = newCriteria;
           }
        }

        setSubjectCriteria(criteriaData || []);

        // Fetch rubrics
        const { data: rubricsData, error: rubricsError } = await supabase
          .from('rubrics')
          .select('id, name, criterion_id')
          .eq('subject_id', subjectId);

        if (rubricsError) throw rubricsError;

        if (rubricsData) {
          const rubricIds = rubricsData.map(r => r.id);
          
          // Fetch criteria for these rubrics
          const { data: rubricCriteriaData, error: rubricCriteriaError } = await supabase
            .from('rubric_criteria')
            .select('id, rubric_id, name, weight')
            .in('rubric_id', rubricIds);

          if (rubricCriteriaError) throw rubricCriteriaError;

          const formattedRubrics: Rubric[] = rubricsData.map(r => {
            const criteriaForRubric = (rubricCriteriaData || []).filter(c => c.rubric_id === r.id);
            return {
              id: r.id,
              rubricName: r.name,
              criterionId: r.criterion_id || '',
              criteria: criteriaForRubric.map((c: any) => ({
                id: c.id,
                name: c.name,
                weight: c.weight
              }))
            };
          });
          setRubrics(formattedRubrics);
        }

        // Fetch existing attendance for the selected date
        const { data: attendanceData, error: attendanceError } = await supabase
          .from('attendance')
          .select('*')
          .eq('subject_id', subjectId)
          .eq('group_id', groupId)
          .eq('date', selectedDate);

        if (attendanceError) {
          console.warn('Error fetching attendance (table might not exist yet):', attendanceError.message);
        } else if (attendanceData && attendanceData.length > 0) {
          // Map existing attendance to records
          const updatedRecords = students.map(s => {
            const existing = attendanceData.find(a => String(a.student_id) === String(s.id));
            return {
              studentId: s.id,
              studentName: s.name,
              enrollment: s.enrollment,
              status: (existing?.status as AttendanceRecord['status']) || 'present'
            };
          });
          setRecords(updatedRecords);
        } else {
          // Reset to default if no attendance found for this date
          setRecords(students.map(s => ({
            studentId: s.id,
            studentName: s.name,
            enrollment: s.enrollment,
            status: 'present'
          })));
        }
      } catch (err) {
        console.error('Error fetching data:', err);
      }
    };

    fetchData();
  }, [subjectId, groupId, selectedDate, students, activeTab]);

  const handleStatusChange = (id: string, status: AttendanceRecord['status']) => {
    setRecords(prev => prev.map(r => r.studentId === id ? { ...r, status } : r));
  };

  const handleDeleteStudentRecord = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('¿Estás seguro de que deseas quitar a este alumno de este grupo?')) {
      setRecords(prev => prev.filter(r => r.studentId !== id));
    }
  };

  const handleSaveRubric = async (rubric: Rubric) => {
    if (!subjectId) {
      console.error('No subject ID provided for saving rubric');
      return;
    }

    setSaving(true);
    try {
      const isEditing = rubrics.some(r => r.id === rubric.id);

      if (isEditing) {
        // 1. Update Rubric
        const { error: rubricError } = await supabase
          .from('rubrics')
          .update({
            name: rubric.rubricName,
            criterion_id: rubric.criterionId
          })
          .eq('id', rubric.id);

        if (rubricError) throw rubricError;

        // 2. Delete old criteria and insert new ones
        await supabase.from('rubric_criteria').delete().eq('rubric_id', rubric.id);
        
        const criteriaToInsert = rubric.criteria.map(c => ({
          rubric_id: rubric.id,
          name: c.name,
          weight: c.weight
        }));

        const { error: criteriaError } = await supabase
          .from('rubric_criteria')
          .insert(criteriaToInsert);

        if (criteriaError) throw criteriaError;

        setRubrics(prev => prev.map(r => r.id === rubric.id ? rubric : r));
      } else {
        // 1. Insert Rubric
        const { data: rubricData, error: rubricError } = await supabase
          .from('rubrics')
          .insert([{
            name: rubric.rubricName,
            criterion_id: rubric.criterionId,
            subject_id: subjectId
          }])
          .select()
          .single();

        if (rubricError) throw rubricError;

        // 2. Insert Criteria
        const criteriaToInsert = rubric.criteria.map(c => ({
          rubric_id: rubricData.id,
          name: c.name,
          weight: c.weight
        }));

        const { data: criteriaData, error: criteriaError } = await supabase
          .from('rubric_criteria')
          .insert(criteriaToInsert)
          .select();

        if (criteriaError) throw criteriaError;

        // 3. Update local state with real IDs
        const savedRubric: Rubric = {
          id: rubricData.id,
          rubricName: rubricData.name,
          criterionId: rubricData.criterion_id,
          criteria: criteriaData.map(c => ({
            id: c.id,
            name: c.name,
            weight: c.weight
          }))
        };

        setRubrics(prev => [...prev, savedRubric]);
        
        // 4. Intentar notificar a Microsoft Teams usando Graph API (Si un equipo existe para este grupo)
        try {
          if (showToast) showToast('Sincronizando asignación con MS Teams...', 'info');
          const isNotified = await MicrosoftTeamsService.createActivityMessage(groupName, subjectName, rubric.rubricName, ms_team_id);
          if (isNotified) {
             console.log("✅ Mensaje de asignación de actividad enviado a MS Teams");
             if (showToast) showToast(`Notificación enviada al equipo de MS Teams exitosamente.`, 'success');
             await supabase.from('activity_history').insert({
                action: 'Asignación creada en Teams',
                details: `Se publicó la tarea '${rubric.rubricName}' en el equipo de ${groupName}.`,
                type: 'create'
             });
          } else {
             if (showToast) showToast(`La actividad se guardó, pero no se encontró un equipo o canal en MS Teams para notificar.`, 'error');
             await supabase.from('activity_history').insert({
                action: 'Asignación sin vincular en Teams',
                details: `La tarea '${rubric.rubricName}' se creó localmente pero no encontró el canal MS Teams.`,
                type: 'create'
             });
          }
          if (onSaveSuccess) onSaveSuccess(); // Refresh to fetch history
        } catch (e) {
          console.warn("No se pudo notificar sobre la actividad a Teams", e);
          if (showToast) showToast(`Error al intentar publicar la asignación en MS Teams.`, 'error');
        }
      }

      setActiveTab('evaluations');
      setEditingRubric(null);
      
      if (onSaveSuccess) {
        onSaveSuccess();
      }
    } catch (err) {
      console.error('Error saving rubric:', err);
      alert('Error al guardar la rúbrica en la base de datos.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRubric = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const rubricToDelete = rubrics.find(r => r.id === id);
    if (rubricToDelete) {
      setDeleteConfirmation({ id: rubricToDelete.id, name: rubricToDelete.rubricName });
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirmation) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('rubrics')
        .delete()
        .eq('id', deleteConfirmation.id);

      if (error) throw error;

      setRubrics(prev => prev.filter(r => r.id !== deleteConfirmation.id));
      if (selectedRubric?.id === deleteConfirmation.id) {
        setSelectedRubric(null);
      }
      setNotification({ type: 'success', message: 'Actividad eliminada correctamente' });
      setTimeout(() => setNotification(null), 3000);
    } catch (err) {
      console.error('Error deleting rubric:', err);
      setNotification({ type: 'error', message: 'Error al eliminar la actividad' });
      setTimeout(() => setNotification(null), 4000);
    } finally {
      setSaving(false);
      setDeleteConfirmation(null);
    }
  };

  const handleSave = async () => {
    if (!subjectId) {
      setNotification({ type: 'error', message: 'Error: No se encontró ID de la materia.' });
      return;
    }

    setSaving(true);
    try {
      // Validate if groupId is a valid UUID. If it starts with 'no-group-', it's a fallback ID
      const isValidUUID = (uuid: string) => {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(uuid);
      };

      const validGroupId = isValidUUID(groupId) ? groupId : null;

      // Prepare attendance data
      const attendanceData = records.map(r => ({
        student_id: r.studentId,
        subject_id: subjectId,
        group_id: validGroupId,
        date: selectedDate,
        status: r.status
      }));

      // Upsert attendance (using unique constraint on student_id, subject_id, date)
      const { error } = await supabase
        .from('attendance')
        .upsert(attendanceData, { 
          onConflict: 'student_id,subject_id,date' 
        });

      if (error) throw error;

      // Reset records to 'present' status after successful save as requested
      setRecords(prev => prev.map(r => ({ ...r, status: 'present' })));

      setNotification({ type: 'success', message: 'Asistencia guardada correctamente' });
      setTimeout(() => setNotification(null), 3000);
      
      if (onSaveSuccess) {
        onSaveSuccess();
      }
    } catch (err: any) {
      console.error('Error saving attendance:', err);
      const errorMessage = err.message?.includes('foreign key constraint') 
        ? 'Error de vinculación: Asegúrate de que los alumnos y materias existan en la base de datos.'
        : 'Error al guardar la asistencia. Asegúrate de haber ejecutado el SQL para crear la tabla.';
      
      setNotification({ type: 'error', message: errorMessage });
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setSaving(false);
    }
  };

  const filteredRecords = records.filter(r => 
    r.studentName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    present: records.filter(r => r.status === 'present').length,
    absent: records.filter(r => r.status === 'absent').length,
    late: records.filter(r => r.status === 'late').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="flex items-center gap-2 px-3 py-2 hover:bg-white dark:hover:bg-slate-800 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700 group"
          >
            <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-medium hidden sm:block">Volver al Dashboard</span>
          </button>
          <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 mx-2 hidden sm:block"></div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Gestión de Grupo</h1>
            <p className="text-slate-500 dark:text-slate-400">{subjectName} • {groupName}</p>
          </div>
        </div>
        
        {activeTab === 'attendance' && (
          <div className="flex gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
              <Calendar size={16} className="text-slate-400" />
              <input 
                type="date" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent border-none outline-none text-slate-700 dark:text-slate-200 cursor-pointer"
              />
            </div>
            <button 
              onClick={handleSave}
              disabled={saving}
              className={cn(
                "px-6 py-2 rounded-xl text-sm font-bold text-white transition-all flex items-center gap-2 shadow-lg",
                saving ? "bg-slate-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 shadow-blue-600/20"
              )}
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Guardando...
                </>
              ) : (
                <>
                  <Save size={16} /> Finalizar Pase
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Tab Switcher */}
      <div className="flex p-1 bg-slate-200/50 dark:bg-slate-800/50 rounded-2xl w-fit overflow-x-auto">
        <button
          onClick={() => setActiveTab('attendance')}
          className={cn(
            "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap",
            activeTab === 'attendance' 
              ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm" 
              : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          )}
        >
          <ClipboardList size={18} /> Asistencia
        </button>
        <button
          onClick={() => setActiveTab('criteria')}
          className={cn(
            "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap",
            activeTab === 'criteria' 
              ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm" 
              : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          )}
        >
          <FileText size={18} /> Criterios de Evaluación
        </button>
        <button
          onClick={() => {
            setEditingRubric(null);
            setActiveTab('rubric');
          }}
          className={cn(
            "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap",
            activeTab === 'rubric' 
              ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm" 
              : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          )}
        >
          <Plus size={18} /> Crear Actividad
        </button>
        <button
          onClick={() => {
            setActiveTab('evaluations');
            setSelectedRubric(null);
          }}
          className={cn(
            "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap",
            activeTab === 'evaluations' 
              ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm" 
              : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          )}
        >
          <Star size={18} /> Evaluar Alumnos
        </button>
      </div>

      {activeTab === 'criteria' ? (
        <SubjectCriteriaManager subjectId={subjectId || ''} />
      ) : activeTab === 'attendance' ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400">
                <UserCheck size={20} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Presentes</p>
                <p className="text-xl font-bold text-slate-800 dark:text-white">{stats.present}</p>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400">
                <UserX size={20} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Ausentes</p>
                <p className="text-xl font-bold text-slate-800 dark:text-white">{stats.absent}</p>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400">
                <Clock size={20} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Retardos</p>
                <p className="text-xl font-bold text-slate-800 dark:text-white">{stats.late}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
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
              <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                <Users size={14} /> {records.length} Alumnos Totales
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-800/50">
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider w-16">Matrícula</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Nombre del Alumno</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Asistencia</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredRecords.map((record) => (
                    <tr key={record.studentId} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 text-sm font-mono text-slate-400">{record.enrollment || 'N/A'}</td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-slate-800 dark:text-white">{record.studentName}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center gap-2">
                          <button 
                            onClick={() => handleStatusChange(record.studentId, 'present')}
                            className={cn(
                              "px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                              record.status === 'present' 
                                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20" 
                                : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                            )}
                          >
                            <UserCheck size={14} /> Presente
                          </button>
                          <button 
                            onClick={() => handleStatusChange(record.studentId, 'absent')}
                            className={cn(
                              "px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                              record.status === 'absent' 
                                ? "bg-rose-600 text-white shadow-lg shadow-rose-600/20" 
                                : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                            )}
                          >
                            <UserX size={14} /> Falta
                          </button>
                          <button 
                            onClick={() => handleStatusChange(record.studentId, 'late')}
                            className={cn(
                              "px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                              record.status === 'late' 
                                ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20" 
                                : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                            )}
                          >
                            <Clock size={14} /> Retardo
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={(e) => handleDeleteStudentRecord(record.studentId, e)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-all"
                          title="Quitar Alumno"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredRecords.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400 italic">
                        {searchTerm ? 'No se encontraron alumnos con ese nombre.' : 'No hay alumnos inscritos en esta materia.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : activeTab === 'rubric' ? (
        <RubricManager 
          onSave={handleSaveRubric} 
          onBack={() => {
            setActiveTab('evaluations');
            setEditingRubric(null);
          }} 
          availableCriteria={subjectCriteria} 
          initialRubric={editingRubric || undefined}
        />
      ) : activeTab === 'evaluations' ? (
        selectedRubric ? (
          <StudentEvaluation 
            rubric={selectedRubric} 
            students={students.map(s => ({ id: s.id, name: s.name, enrollment: s.enrollment }))} 
            onBack={() => setSelectedRubric(null)}
            criterionName={subjectCriteria.find(c => c.id === selectedRubric.criterionId)?.name || ''}
            onSaveSuccess={onSaveSuccess}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
            {rubrics.length > 0 ? (
              rubrics.map((r) => (
                <div key={r.id} className="relative">
                  <div
                    onClick={() => setSelectedRubric(r)}
                    onMouseEnter={() => setHoveredRubricId(r.id)}
                    onMouseLeave={() => setHoveredRubricId(null)}
                    className="w-full text-left bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-blue-200 dark:hover:border-blue-900 transition-all group cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                        <FileText size={24} />
                      </div>
                      <div className="flex items-center gap-2">
                        {r.partial && (
                          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[10px] font-black uppercase tracking-widest rounded-lg">
                            Parcial {r.partial}
                          </span>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingRubric(r);
                            setActiveTab('rubric');
                          }}
                          className="p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                          title="Editar Actividad"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={(e) => handleDeleteRubric(r.id, e)}
                          className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                          title="Eliminar Actividad"
                        >
                          <Trash2 size={18} />
                        </button>
                        <ChevronRight size={20} className="text-slate-300 group-hover:text-blue-600 transition-colors" />
                      </div>
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">{r.rubricName}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      {r.criteria.length} Criterios • Total 100%
                    </p>
                  </div>

                  <AnimatePresence>
                    {hoveredRubricId === r.id && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="absolute bottom-full left-0 mb-4 w-64 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-4 rounded-2xl shadow-xl z-50 pointer-events-none border border-slate-200 dark:border-slate-700"
                      >
                        <h4 className="text-xs font-black uppercase tracking-widest mb-3 border-b border-slate-200 dark:border-slate-700 pb-2 text-slate-800 dark:text-white">
                          Detalles de Actividad
                        </h4>
                        <div className="mb-3 px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded-lg text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                          Criterio: {subjectCriteria.find(c => c.id === r.criterionId)?.name || 'Sin asignar'}
                        </div>
                        <div className="space-y-2">
                          {r.criteria.map(c => (
                            <div key={c.id} className="flex justify-between items-center text-[11px]">
                              <span className="font-medium truncate pr-2 text-slate-600 dark:text-slate-300">{c.name}</span>
                              <span className="font-black shrink-0 text-slate-900 dark:text-white">{c.weight}%</span>
                            </div>
                          ))}
                        </div>
                        <div className="absolute bottom-[-6px] left-8 w-3 h-3 bg-white dark:bg-slate-800 border-b border-r border-slate-200 dark:border-slate-700 rotate-45"></div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))
            ) : (
              <div className="col-span-full flex flex-col items-center justify-center py-20 bg-slate-50 dark:bg-slate-800/30 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                <div className="p-4 rounded-full bg-white dark:bg-slate-900 shadow-sm mb-4">
                  <ClipboardList size={40} className="text-slate-300 dark:text-slate-600" />
                </div>
                <p className="text-slate-500 dark:text-slate-400 font-medium">No hay rúbricas configuradas aún.</p>
                <button 
                  onClick={() => setActiveTab('rubric')}
                  className="mt-4 text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Crear mi primera rúbrica
                </button>
              </div>
            )}
          </div>
        )
      ) : null}
      {activeTab === 'evaluations' && (
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
      )}

      <AnimatePresence>
        {deleteConfirmation && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-100 dark:border-slate-800"
            >
              <div className="w-16 h-16 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white text-center mb-2">Eliminar Actividad</h3>
              <p className="text-slate-500 dark:text-slate-400 text-center mb-8">
                ¿Estás seguro de que deseas eliminar la actividad <span className="font-bold text-slate-900 dark:text-white">"{deleteConfirmation.name}"</span>? Esta acción no se puede deshacer.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirmation(null)}
                  className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-sm transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={saving}
                  className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-rose-600/20 disabled:opacity-50"
                >
                  {saving ? 'Eliminando...' : 'Eliminar'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
