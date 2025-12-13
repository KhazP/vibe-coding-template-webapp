
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { ToastPosition } from '../types';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  addToast: (message: string, type?: ToastType) => void;
  removeToast: (id: string) => void;
  position: ToastPosition;
  setPosition: (pos: ToastPosition) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

const STORAGE_KEY = 'VIBE_TOAST_POSITION';

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [position, setPositionState] = useState<ToastPosition>(() => {
      try {
          return (localStorage.getItem(STORAGE_KEY) as ToastPosition) || 'top-right';
      } catch {
          return 'top-right';
      }
  });

  const setPosition = useCallback((pos: ToastPosition) => {
      setPositionState(pos);
      localStorage.setItem(STORAGE_KEY, pos);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(7);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => removeToast(id), 5000);
  }, [removeToast]);

  const getPositionStyles = () => {
      switch (position) {
          case 'top-left': return 'top-4 left-4 flex-col';
          case 'top-right': return 'top-4 right-4 flex-col';
          case 'bottom-left': return 'bottom-4 left-4 flex-col-reverse';
          case 'bottom-right': return 'bottom-4 right-4 flex-col-reverse';
          default: return 'top-4 right-4 flex-col';
      }
  };

  return (
    <ToastContext.Provider value={{ addToast, removeToast, position, setPosition }}>
      {children}
      {createPortal(
        <div className={`fixed z-[10000] flex gap-2 pointer-events-none transition-all duration-300 ${getPositionStyles()}`}>
          <AnimatePresence mode="popLayout">
            {toasts.map((toast) => (
              <ToastItem key={toast.id} toast={toast} onDismiss={removeToast} position={position} />
            ))}
          </AnimatePresence>
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
};

const ToastItem: React.FC<{ toast: Toast; onDismiss: (id: string) => void; position: ToastPosition }> = ({ toast, onDismiss, position }) => {
  const icons = {
    success: <CheckCircle size={18} className="text-emerald-400" />,
    error: <AlertCircle size={18} className="text-red-400" />,
    warning: <AlertTriangle size={18} className="text-amber-400" />,
    info: <Info size={18} className="text-blue-400" />,
  };

  const styles = {
    success: 'bg-emerald-950/90 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]',
    error: 'bg-red-950/90 border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]',
    warning: 'bg-amber-950/90 border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]',
    info: 'bg-blue-950/90 border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]',
  };

  const isTop = position.startsWith('top');

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: isTop ? -20 : 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
      className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border backdrop-blur-md w-80 ${styles[toast.type]}`}
    >
      <div className="mt-0.5 shrink-0">{icons[toast.type]}</div>
      <p className="text-sm text-slate-200 font-medium leading-snug flex-1">{toast.message}</p>
      <button 
        onClick={() => onDismiss(toast.id)}
        className="text-slate-500 hover:text-slate-300 transition-colors shrink-0"
      >
        <X size={16} />
      </button>
    </motion.div>
  );
};
