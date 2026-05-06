import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Save, 
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  Percent,
  ChevronLeft
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Rubric, RubricCriterion, SubjectCriterion } from '../types';

interface RubricManagerProps {
  onSave: (rubric: Rubric) => void;
  onBack?: () => void;
  availableCriteria: SubjectCriterion[];
  initialRubric?: Rubric;
}

export const RubricManager = ({ onSave, onBack, availableCriteria, initialRubric }: RubricManagerProps) => {
  const [rubricName, setRubricName] = useState(initialRubric?.rubricName || '');
  const [criterionId, setCriterionId] = useState(initialRubric?.criterionId || '');
  const [criteria, setCriteria] = useState<RubricCriterion[]>(initialRubric?.criteria || [
    { id: '1', name: '', weight: 0 }
  ]);
  const [showSuccess, setShowSuccess] = useState(false);

  const totalWeight = criteria.reduce((sum, c) => sum + (c.weight || 0), 0);

  const addCriterion = () => {
    setCriteria([...criteria, { id: Math.random().toString(36).substr(2, 9), name: '', weight: 0 }]);
  };

  const removeCriterion = (id: string) => {
    if (criteria.length > 1) {
      setCriteria(criteria.filter(c => c.id !== id));
    }
  };

  const updateCriterion = (id: string, field: keyof RubricCriterion, value: string | number) => {
    setCriteria(criteria.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const handleSave = () => {
    if (!rubricName.trim()) return;
    if (!criterionId) return;
    if (totalWeight !== 100) return;
    if (criteria.some(c => !c.name.trim())) return;

    const newRubric: Rubric = {
      id: initialRubric?.id || Math.random().toString(36).substr(2, 9),
      rubricName,
      criterionId,
      criteria
    };

    onSave(newRubric);
    setShowSuccess(true);
    setRubricName('');
    setCriterionId('');
    setCriteria([{ id: '1', name: '', weight: 0 }]);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      {onBack && (
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="flex items-center gap-2 px-3 py-2 hover:bg-white dark:hover:bg-slate-800 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700 group"
          >
            <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-medium">Volver a Actividades</span>
          </button>
        </div>
      )}
      <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm transition-colors">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Nombre de la Actividad</label>
              <input 
                type="text" 
                placeholder="Ej: Proyecto Final..."
                value={rubricName}
                onChange={(e) => setRubricName(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 transition-all outline-none dark:text-white"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Criterio de Evaluación (Obligatorio)</label>
              <select 
                value={criterionId}
                onChange={(e) => setCriterionId(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 transition-all outline-none dark:text-white"
                required
              >
                <option value="" disabled>Seleccionar criterio...</option>
                {availableCriteria.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <ClipboardList size={18} className="text-blue-600 dark:text-blue-400" /> Criterios de Evaluación
              </h3>
              <div className="flex gap-2">
                <button 
                  onClick={addCriterion}
                  className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-lg transition-colors"
                >
                  <Plus size={14} /> Agregar Criterio
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {criteria.map((criterion, index) => (
                <div key={criterion.id} className="flex gap-3 items-start group">
                  <div className="flex-1">
                    <input 
                      type="text" 
                      placeholder={`Criterio ${index + 1}`}
                      value={criterion.name}
                      onChange={(e) => {
                        const newCriteria = [...criteria];
                        newCriteria[index].name = e.target.value;
                        setCriteria(newCriteria);
                      }}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 transition-all outline-none dark:text-white"
                    />
                  </div>
                  <div className="w-24 relative">
                    <input 
                      type="number" 
                      placeholder="Peso"
                      value={criterion.weight || ''}
                      onChange={(e) => {
                        const newCriteria = [...criteria];
                        newCriteria[index].weight = parseInt(e.target.value) || 0;
                        setCriteria(newCriteria);
                      }}
                      className="w-full pl-4 pr-8 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 transition-all outline-none text-right font-bold dark:text-white"
                    />
                    <Percent size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                  </div>
                  <button 
                    onClick={() => removeCriterion(criterion.id)}
                    className="p-2.5 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>

            <div className={cn(
              "p-4 rounded-xl flex justify-between items-center transition-all",
              totalWeight === 100 
                ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800" 
                : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-700"
            )}>
              <span className="text-sm font-bold">Total acumulado:</span>
              <div className="flex items-center gap-2">
                <span className={cn("text-lg font-black", totalWeight > 100 ? "text-rose-600 dark:text-rose-400" : "")}>
                  {totalWeight}%
                </span>
                {totalWeight === 100 && <CheckCircle2 size={20} className="text-emerald-600 dark:text-emerald-400" />}
              </div>
            </div>

            {totalWeight !== 100 && totalWeight > 0 && (
              <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 font-medium">
                <AlertCircle size={14} />
                <span>El total debe ser exactamente 100% para poder guardar.</span>
              </div>
            )}
          </div>

          <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
            <button 
              onClick={handleSave}
              disabled={totalWeight !== 100 || !rubricName.trim()}
              className={cn(
                "w-full py-4 rounded-xl text-sm font-bold text-white transition-all flex items-center justify-center gap-2 shadow-lg",
                (totalWeight !== 100 || !rubricName.trim()) 
                  ? "bg-slate-300 dark:bg-slate-700 cursor-not-allowed shadow-none text-slate-500" 
                  : "bg-blue-600 hover:bg-blue-700 shadow-blue-600/20"
              )}
            >
              <Save size={18} /> Guardar Actividad y Habilitar Evaluación
            </button>
          </div>

          {showSuccess && (
            <div className="flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold animate-bounce">
              <CheckCircle2 size={20} />
              <span>¡Actividad configurada correctamente!</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
