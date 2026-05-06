import React from 'react';
import { X, Clock, User, Shield, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ActivityHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history?: any[];
}

export const ActivityHistoryModal = ({ isOpen, onClose, history = [] }: ActivityHistoryModalProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] transition-colors duration-300"
          >
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-600 rounded-2xl shadow-xl shadow-blue-600/20">
                  <Activity className="text-white" size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Historial Detallado de Actividad</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Registro completo de acciones desglosado cada 30 minutos.</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
              <div className="space-y-4">
                <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <div className="col-span-2 flex items-center gap-2"><Clock size={12} /> Hora</div>
                  <div className="col-span-3 flex items-center gap-2"><User size={12} /> Nombre</div>
                  <div className="col-span-2 flex items-center gap-2"><Shield size={12} /> Rol</div>
                  <div className="col-span-5 flex items-center gap-2"><Activity size={12} /> Acción Realizada</div>
                </div>

                <div className="space-y-2">
                  {history.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">No hay actividad registrada.</div>
                  ) : (
                    history.map((item, index) => (
                      <motion.div 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03 }}
                        key={index} 
                        className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-slate-50 dark:bg-slate-800 rounded-2xl transition-colors border border-transparent hover:border-slate-100 dark:hover:border-slate-700 group"
                      >
                        <div className="col-span-2 flex items-center">
                          <span className="text-sm font-bold text-slate-900 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-lg group-hover:bg-blue-50 dark:group-hover:bg-blue-900/40 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {item.time}
                          </span>
                        </div>
                        <div className="col-span-3 flex items-center">
                          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{item.name}</span>
                        </div>
                        <div className="col-span-2 flex items-center">
                          <span className={`text-[10px] font-bold px-2 py-1 rounded-lg uppercase tracking-wider ${
                            item.role === 'ADMIN' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 
                            item.role === 'DOCENTE' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' : 
                            item.role === 'COBRANZA' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400' : 
                            'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                          }`}>
                            {item.role}
                          </span>
                        </div>
                        <div className="col-span-5 flex items-center">
                          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{item.action}</p>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center">
              <p className="text-xs text-slate-400 font-medium dark:text-slate-500">
                Mostrando {history.length} registros del día de hoy.
              </p>
              <button 
                onClick={onClose}
                className="px-8 py-3 bg-slate-900 dark:bg-blue-600 text-white rounded-2xl text-sm font-bold hover:bg-slate-800 dark:hover:bg-blue-700 transition-all shadow-xl shadow-slate-900/10 dark:shadow-blue-600/20"
              >
                Cerrar Historial
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
