import { useEffect } from 'react';

export function useEscapeKey(handler: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') handler(); };
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, [handler, enabled]);
}
