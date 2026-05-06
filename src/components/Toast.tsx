import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, X, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
  message: string;
  type: ToastType;
  isOpen: boolean;
  onClose: () => void;
  duration?: number;
}

export const Toast = ({ message, type, isOpen, onClose, duration = 3000 }: ToastProps) => {
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose, duration]);

  const icons = {
    success: <CheckCircle2 className="text-emerald-500" size={20} />,
    error: <AlertCircle className="text-rose-500" size={20} />,
    info: <Info className="text-blue-500" size={20} />,
    warning: <AlertCircle className="text-amber-500" size={20} />
  };

  const bgColors = {
    success: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800',
    error: 'bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-800',
    info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800',
    warning: 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800'
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          className={cn(
            "fixed bottom-8 right-8 z-[100] flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-2xl min-w-[300px] max-w-md",
            bgColors[type]
          )}
        >
          <div className="shrink-0">{icons[type]}</div>
          <p className="text-sm font-bold text-slate-800 dark:text-slate-200 flex-1">{message}</p>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors text-slate-400"
          >
            <X size={16} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
