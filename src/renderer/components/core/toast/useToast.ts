import { useCallback, useState } from 'react';

export type Toast = {
  id: string;
  text: string;
};

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((text: string) => {
    const id = Math.random().toString(36).slice(2);

    setToasts((t) => [...t, { id, text }]);

    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 1400);
  }, []);

  return { toasts, show };
}
