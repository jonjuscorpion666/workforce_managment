'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastType = 'success' | 'error' | 'info' | 'warning';
interface ToastItem { id: string; type: ToastType; message: string; }

interface ToastCtx {
  success: (msg: string) => void;
  error: (msg: string) => void;
  info: (msg: string) => void;
  warning: (msg: string) => void;
}

const ToastContext = createContext<ToastCtx | null>(null);

const STYLES: Record<ToastType, { bg: string; Icon: any; ic: string }> = {
  success: { bg: 'bg-green-50 border-green-200', Icon: CheckCircle2, ic: 'text-green-500' },
  error:   { bg: 'bg-red-50 border-red-200',     Icon: AlertCircle,  ic: 'text-red-500'   },
  warning: { bg: 'bg-amber-50 border-amber-200', Icon: AlertTriangle,ic: 'text-amber-500' },
  info:    { bg: 'bg-blue-50 border-blue-200',   Icon: Info,         ic: 'text-blue-500'  },
};

function ToastBubble({ t, dismiss }: { t: ToastItem; dismiss: (id: string) => void }) {
  const { bg, Icon, ic } = STYLES[t.type];
  return (
    <div className={cn('flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg w-80 max-w-[calc(100vw-2rem)]', bg)}>
      <Icon className={cn('w-5 h-5 flex-shrink-0 mt-0.5', ic)} />
      <p className="text-sm text-gray-800 flex-1 leading-snug">{t.message}</p>
      <button onClick={() => dismiss(t.id)} className="text-gray-400 hover:text-gray-600 flex-shrink-0 mt-0.5"><X className="w-4 h-4" /></button>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => setToasts((p) => p.filter((t) => t.id !== id)), []);

  const push = useCallback((message: string, type: ToastType) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((p) => [...p.slice(-4), { id, type, message }]);
    setTimeout(() => dismiss(id), 4500);
  }, [dismiss]);

  const success = useCallback((m: string) => push(m, 'success'), [push]);
  const error   = useCallback((m: string) => push(m, 'error'),   [push]);
  const info    = useCallback((m: string) => push(m, 'info'),    [push]);
  const warning = useCallback((m: string) => push(m, 'warning'), [push]);

  return (
    <ToastContext.Provider value={{ success, error, info, warning }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <ToastBubble t={t} dismiss={dismiss} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be inside ToastProvider');
  return ctx;
}
