import React from 'react';
import './toast.css';

export default function ToastContainer({ toasts }: { toasts: any[] }) {
  return (
    <div className="toastRoot">
      {toasts.map((t) => (
        <div key={t.id} className="toastItem">
          {t.text}
        </div>
      ))}
    </div>
  );
}
