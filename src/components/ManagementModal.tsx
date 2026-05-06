import React, { useState } from 'react';
import { X, Save, User, BookOpen, GraduationCap, Users, Layers, Lock, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface ManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'student' | 'teacher' | 'career' | 'subject' | 'group';
  onSave: (data: any) => void;
  initialData?: any;
  careers?: any[];
  groups?: any[];
  teachers?: any[];
}

export const ManagementModal = ({ isOpen, onClose, type, onSave, initialData, careers = [], groups = [], teachers = [] }: ManagementModalProps) => {
  const [formData, setFormData] = useState<any>(initialData || {});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Update formData when initialData changes or modal opens
  React.useEffect(() => {
    if (isOpen) {
      setFormData(initialData || {});
      setShowPassword(false);
    }
  }, [isOpen, initialData]);

  const isEditing = !!initialData?.id;

  const titles = {
    student: isEditing ? 'Modificar Alumno' : 'Nuevo Alumno',
    teacher: isEditing ? 'Modificar Profesor' : 'Nuevo Profesor',
    career: isEditing ? 'Modificar Carrera' : 'Nueva Carrera',
    subject: isEditing ? 'Modificar Materia' : 'Nueva Materia',
    group: isEditing ? 'Modificar Grupo' : 'Nuevo Grupo'
  };

  const icons = {
    student: User,
    teacher: Users,
    career: GraduationCap,
    subject: BookOpen,
    group: Layers
  };

  const Icon = icons[type];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const dataToSave = { ...formData };

    // The actual save logic is in App.tsx
    onSave(dataToSave);
    setLoading(false);
    onClose();
    setFormData({});
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  const renderForm = () => {
    switch (type) {
      case 'student':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase">Nombre Completo</label>
              <input required name="name" value={formData.name || ''} onChange={handleChange} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none dark:text-white" placeholder="Ej. Juan Pérez" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase">Matrícula</label>
              <input required name="enrollment" value={formData.enrollment || ''} onChange={handleChange} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none dark:text-white" placeholder="Ej. 20240001" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase">Carrera</label>
              <select required name="career" value={formData.career || ''} onChange={handleChange} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none dark:text-white">
                <option value="">Seleccionar...</option>
                {careers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase">Cuatrimestre</label>
              <input required type="text" name="semester" value={formData.semester || ''} onChange={handleChange} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none dark:text-white" placeholder="Ej. 1 o 1 y 2" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase">Grupo</label>
              <select required name="group" value={formData.group || ''} onChange={handleChange} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none dark:text-white">
                <option value="">Seleccionar...</option>
                {groups.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase">Modalidad</label>
              <select required name="modality" value={formData.modality || ''} onChange={handleChange} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none dark:text-white">
                <option value="">Seleccionar...</option>
                <option value="Escolarizada">Escolarizada</option>
                <option value="Ejecutiva">Ejecutiva</option>
                <option value="Sabatina">Sabatina</option>
              </select>
            </div>
          </div>
        );
      case 'teacher':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase">Nombre Completo</label>
              <input required name="name" value={formData.name || ''} onChange={handleChange} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none dark:text-white" placeholder="Ej. Dr. Armando Casas" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase">ID Empleado</label>
              <input required name="employeeId" value={formData.employeeId || ''} onChange={handleChange} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none dark:text-white" placeholder="Ej. EMP-123" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase">Especialidad</label>
              <input required name="specialty" value={formData.specialty || ''} onChange={handleChange} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none dark:text-white" placeholder="Ej. Inteligencia Artificial" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase">Correo Institucional</label>
              <input required type="email" name="email" value={formData.email || ''} onChange={handleChange} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none dark:text-white" placeholder="ejemplo@edu.mx" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase">Contraseña de Acceso</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input 
                  required={!isEditing} 
                  type={showPassword ? "text" : "password"} 
                  name="pasword" 
                  value={formData.pasword || ''} 
                  onChange={handleChange} 
                  className="w-full pl-9 pr-10 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none dark:text-white" 
                  placeholder={isEditing ? "(Sin cambios)" : "Definir contraseña"} 
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
          </div>
        );
      case 'career':
        return (
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase">Nombre de la Carrera</label>
              <input required name="name" value={formData.name || ''} onChange={handleChange} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none dark:text-white" placeholder="Ej. Ingeniería de Sistemas Computacionales" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase">Código</label>
                <input required name="code" value={formData.code || ''} onChange={handleChange} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none dark:text-white" placeholder="Ej. ISC" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase">Jefe de Carrera</label>
                <input name="headOfCareer" value={formData.headOfCareer || ''} onChange={handleChange} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none dark:text-white" placeholder="Ej. Ing. María González" />
              </div>
            </div>
          </div>
        );
      case 'subject':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-bold text-slate-400 uppercase">Nombre de la Materia</label>
              <input required name="name" value={formData.name || ''} onChange={handleChange} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none dark:text-white" placeholder="Ej. Cálculo Diferencial" />
            </div>
            
            <div className="space-y-1 md:col-span-2">
              <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors">
                <input 
                  type="checkbox" 
                  name="isCommonCore" 
                  checked={formData.isCommonCore || false} 
                  onChange={(e) => {
                    setFormData((prev: any) => ({ 
                      ...prev, 
                      isCommonCore: e.target.checked,
                      career: e.target.checked ? 'Todas' : '' 
                    }));
                  }}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-slate-300"
                />
                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Es Materia de Tronco Común</span>
              </label>
            </div>

            {!formData.isCommonCore && (
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-bold text-slate-400 uppercase">Carrera</label>
                <select 
                  required={!formData.isCommonCore}
                  name="career" 
                  value={formData.career || formData.career_id || ''} 
                  onChange={handleChange} 
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none dark:text-white"
                >
                  <option value="">Seleccionar...</option>
                  {careers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase">Código</label>
              <input required name="code" value={formData.code || ''} onChange={handleChange} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none dark:text-white" placeholder="Ej. MAT-101" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase">Cuatrimestre</label>
              <input required type="text" name="semester" value={formData.semester || ''} onChange={handleChange} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none dark:text-white" placeholder="Ej. 1 o 1 y 2" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase">Créditos</label>
              <input required type="number" name="credits" value={formData.credits || ''} onChange={handleChange} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none dark:text-white" placeholder="Ej. 8" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase">Docente (Opcional)</label>
              <select name="teacher" value={formData.teacher || ''} onChange={handleChange} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none dark:text-white">
                <option value="">Seleccionar...</option>
                {teachers.map(t => (
                  <option key={t.id} value={t.name}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>
        );
      case 'group':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase">Nombre del Grupo</label>
              <input required name="name" value={formData.name || ''} onChange={handleChange} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none dark:text-white" placeholder="Ej. 6ALEINSCMA" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase">Cuatrimestre</label>
              <input required type="text" name="semester" value={formData.semester || ''} onChange={handleChange} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none dark:text-white" placeholder="Ej. 6 o 6 y 7" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase">Carrera</label>
              <select required name="career" value={formData.career || ''} onChange={handleChange} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none dark:text-white">
                <option value="">Seleccionar...</option>
                {careers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase">Modalidad</label>
              <select required name="modality" value={formData.modality || ''} onChange={handleChange} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none dark:text-white">
                <option value="">Seleccionar...</option>
                <option value="Escolarizada">Escolarizada</option>
                <option value="Ejecutiva">Ejecutiva</option>
                <option value="Sabatina">Sabatina</option>
              </select>
            </div>
          </div>
        );
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-colors duration-300"
          >
            <div className="p-4 lg:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 lg:p-2.5 bg-blue-600 rounded-2xl shadow-lg shadow-blue-600/20">
                  <Icon className="text-white" size={18} />
                </div>
                <div>
                  <h3 className="text-base lg:text-lg font-bold text-slate-900 dark:text-white">{titles[type]}</h3>
                  <p className="text-[10px] lg:text-xs text-slate-500 dark:text-slate-400">
                    {isEditing ? 'Modifica los campos necesarios para actualizar el registro.' : 'Completa los campos para registrar un nuevo elemento.'}
                  </p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
              >
                <X size={20} />
              </button>
            </div>
 
            <form onSubmit={handleSubmit} className="p-6 lg:p-8 overflow-y-auto">
              {renderForm()}
 
              <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-end">
                <button 
                  type="button"
                  onClick={onClose}
                  className="order-2 sm:order-1 px-6 py-2.5 text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={loading}
                  className={cn(
                    "order-1 sm:order-2 px-8 py-2.5 bg-blue-600 text-white rounded-2xl text-sm font-bold shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-2",
                    loading && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Save size={18} />
                  )}
                  Guardar Registro
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
