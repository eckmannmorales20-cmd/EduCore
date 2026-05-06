import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Save, 
  AlertCircle,
  CheckCircle2,
  Percent,
  ClipboardList
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { SubjectCriterion } from '../types';

interface SubjectCriteriaManagerProps {
  subjectId: string;
}

export const SubjectCriteriaManager = ({ subjectId }: SubjectCriteriaManagerProps) => {
  const [criteria, setCriteria] = useState<SubjectCriterion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isDefault, setIsDefault] = useState(false);

  useEffect(() => {
    const fetchCriteria = async () => {
      try {
        const { data, error } = await supabase
          .from('subject_criteria')
          .select('*')
          .eq('subject_id', subjectId)
          .order('created_at', { ascending: true });

        if (error) throw error;

        if (data && data.length > 0) {
          setCriteria(data.map(c => ({
            id: c.id,
            name: c.name,
            weight: c.weight,
            scope: c.scope || 'all'
          })));
          setIsDefault(false);
        } else {
          // Default criteria
          setCriteria([
            { id: Math.random().toString(36).substr(2, 9), name: 'Examen', weight: 40, scope: 'all' },
            { id: Math.random().toString(36).substr(2, 9), name: 'Actividades', weight: 30, scope: 'all' },
            { id: Math.random().toString(36).substr(2, 9), name: 'Prácticas', weight: 30, scope: 'all' }
          ]);
          setIsDefault(true);
        }
      } catch (err) {
        console.error('Error fetching subject criteria:', err);
      } finally {
        setLoading(false);
      }
    };

    if (subjectId) {
      fetchCriteria();
    }
  }, [subjectId]);

  const totalWeight = criteria.reduce((sum, c) => sum + (c.weight || 0), 0);

  const addCriterion = () => {
    setCriteria([...criteria, { id: Math.random().toString(36).substr(2, 9), name: '', weight: 0, scope: 'all' }]);
  };

  const removeCriterion = (id: string) => {
    if (criteria.length > 1) {
      setCriteria(criteria.filter(c => c.id !== id));
    }
  };

  const updateCriterion = (id: string, field: keyof SubjectCriterion, value: string | number) => {
    setCriteria(criteria.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const handleSave = async () => {
    if (totalWeight !== 100) return;
    if (criteria.some(c => !c.name.trim())) return;

    setSaving(true);
    try {
      // Delete existing criteria
      const { error: deleteError } = await supabase
        .from('subject_criteria')
        .delete()
        .eq('subject_id', subjectId);

      if (deleteError) throw deleteError;

      // Insert new criteria
      const criteriaToInsert = criteria.map(c => ({
        subject_id: subjectId,
        name: c.name,
        weight: c.weight,
        scope: c.scope
      }));

      const { data, error: insertError } = await supabase
        .from('subject_criteria')
        .insert(criteriaToInsert)
        .select();

      if (insertError) throw insertError;

      if (data) {
        setCriteria(data.map(c => ({
          id: c.id,
          name: c.name,
          weight: c.weight,
          scope: c.scope || 'all'
        })));
        setIsDefault(false);
      }

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving subject criteria:', err);
      alert('Error al guardar los criterios.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-0 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 bg-emerald-500 text-white rounded-2xl shadow-2xl flex items-center gap-3 mt-6"
          >
            <CheckCircle2 size={20} />
            <span className="text-sm font-bold">Criterios guardados exitosamente</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm transition-colors">
        <div className="max-w-3xl mx-auto space-y-8">
          {isDefault && (
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl flex items-center gap-3 text-amber-800 dark:text-amber-200">
              <AlertCircle size={20} className="shrink-0" />
              <p className="text-sm font-medium">
                Estás viendo los criterios predeterminados. Cualquier cambio que guardes se aplicará específicamente a esta materia.
              </p>
            </div>
          )}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <ClipboardList size={18} className="text-blue-600 dark:text-blue-400" /> Criterios de Evaluación de la Materia
              </h3>
              <button 
                onClick={addCriterion}
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-lg transition-colors"
              >
                <Plus size={14} /> Agregar Criterio
              </button>
            </div>

            <div className="space-y-3">
              {criteria.map((criterion, index) => (
                <div key={criterion.id} className="flex gap-3 items-start group">
                  <div className="flex-1">
                    <input 
                      type="text" 
                      placeholder={`Criterio ${index + 1}`}
                      value={criterion.name}
                      onChange={(e) => updateCriterion(criterion.id, 'name', e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 transition-all outline-none dark:text-white"
                    />
                  </div>
                  <div className="w-32">
                    <select
                      value={criterion.scope}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateCriterion(criterion.id, 'scope', val === 'all' ? 'all' : Number(val) as 1 | 2 | 3);
                      }}
                      className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 transition-all outline-none dark:text-white font-medium"
                    >
                      <option value="all">Todos los parciales</option>
                      <option value={1}>Parcial 1</option>
                      <option value={2}>Parcial 2</option>
                      <option value={3}>Parcial 3</option>
                    </select>
                  </div>
                  <div className="w-24 relative">
                    <input 
                      type="number" 
                      placeholder="Peso"
                      value={criterion.weight || ''}
                      onChange={(e) => updateCriterion(criterion.id, 'weight', parseInt(e.target.value) || 0)}
                      className="w-full pl-4 pr-8 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 transition-all outline-none text-right font-bold dark:text-white"
                    />
                    <Percent size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                  </div>
                  <button 
                    onClick={() => removeCriterion(criterion.id)}
                    disabled={criteria.length <= 1}
                    className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl transition-all disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-500 dark:text-slate-400">Total:</span>
                <span className={`text-lg font-black ${totalWeight === 100 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {totalWeight}%
                </span>
                {totalWeight !== 100 && (
                  <span className="text-xs font-medium text-rose-500 flex items-center gap-1 ml-2">
                    <AlertCircle size={14} /> El total debe ser 100%
                  </span>
                )}
              </div>
              
              <button
                onClick={handleSave}
                disabled={totalWeight !== 100 || criteria.some(c => !c.name.trim()) || saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save size={16} /> Guardar Criterios
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
