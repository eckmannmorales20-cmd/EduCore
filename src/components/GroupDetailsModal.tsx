import React from 'react';
import { X, Users, BookOpen, UserSquare2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Group, Student, Subject } from '../types';

interface GroupDetailsModalProps {
  group: Group;
  students: Student[];
  subjects: Subject[];
  onClose: () => void;
}

export const GroupDetailsModal = ({ group, students, subjects, onClose }: GroupDetailsModalProps) => {
  // Filter students belonging to this group
  const enrolledStudents = students.filter(s => s.group === group.id || s.group === group.name);
  
  // Filter subjects for this group's semester
  const groupSemesters = String(group.semester).match(/\d+/g)?.map(Number) || [];
  const groupSubjects = subjects.filter(s => {
    const sSemesters = String(s.semester).match(/\d+/g)?.map(Number) || [];
    return groupSemesters.some(sem => sSemesters.includes(sem));
  });

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
        >
          <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Detalles del Grupo: {group.name}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Cuatrimestre: {group.semester} | Modalidad: {group.modality}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-6 overflow-y-auto space-y-8">
            {/* Subjects Section */}
            <section>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                <BookOpen size={20} className="text-blue-500" />
                Materias y Docentes
              </h3>
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100/50 dark:bg-slate-800">
                      <th className="px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Materia</th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Código</th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Docente Asignado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {groupSubjects.length > 0 ? (
                      groupSubjects.map(subject => (
                        <tr key={subject.id} className="hover:bg-white dark:hover:bg-slate-800 transition-colors">
                          <td className="px-4 py-3 text-sm font-medium text-slate-800 dark:text-slate-200">{subject.name}</td>
                          <td className="px-4 py-3 text-sm font-mono text-slate-500 dark:text-slate-400">{subject.code}</td>
                          <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300 flex items-center gap-2">
                            <UserSquare2 size={16} className="text-slate-400" />
                            {subject.teacher || 'Sin asignar'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                          No hay materias registradas para este cuatrimestre.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Students Section */}
            <section>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                <Users size={20} className="text-emerald-500" />
                Alumnos Inscritos ({enrolledStudents.length})
              </h3>
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100/50 dark:bg-slate-800">
                      <th className="px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Matrícula</th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Nombre Completo</th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {enrolledStudents.length > 0 ? (
                      enrolledStudents.map(student => (
                        <tr key={student.id} className="hover:bg-white dark:hover:bg-slate-800 transition-colors">
                          <td className="px-4 py-3 text-sm font-mono text-slate-500 dark:text-slate-400">{student.enrollment}</td>
                          <td className="px-4 py-3 text-sm font-medium text-slate-800 dark:text-slate-200">{student.name}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                              student.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'
                            }`}>
                              {student.status === 'active' ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                          No hay alumnos inscritos en este grupo.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
