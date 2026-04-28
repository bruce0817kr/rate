import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

const toastIcons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
  info: AlertCircle,
};

const toastColors = {
  success: { bg: 'rgba(45, 90, 39, 0.1)', border: 'var(--color-success)', icon: 'var(--color-success)' },
  error: { bg: 'rgba(211, 94, 59, 0.1)', border: 'var(--color-error)', icon: 'var(--color-error)' },
  warning: { bg: 'rgba(232, 168, 56, 0.1)', border: '#B8860B', icon: '#B8860B' },
  info: { bg: 'rgba(74, 124, 155, 0.1)', border: 'var(--color-info)', icon: 'var(--color-info)' },
};

let toastCounter = 0;
const toastListeners: Array<(toast: Toast) => void> = [];

export function showToast(type: ToastType, message: string) {
  const toast: Toast = { id: `toast-${++toastCounter}`, type, message };
  toastListeners.forEach(listener => listener(toast));
}

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const listener = (toast: Toast) => {
      setToasts(prev => [...prev, toast]);
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== toast.id));
      }, 4000);
    };
    toastListeners.push(listener);
    return () => {
      const index = toastListeners.indexOf(listener);
      if (index > -1) toastListeners.splice(index, 1);
    };
  }, []);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 24,
      right: 24,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      zIndex: 9999,
    }}>
      {toasts.map(toast => {
        const Icon = toastIcons[toast.type];
        const colors = toastColors[toast.type];
        return (
          <div
            key={toast.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 16px',
              backgroundColor: colors.bg,
              border: `1px solid ${colors.border}`,
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-lg)',
              minWidth: 300,
              maxWidth: 400,
              animation: 'slideIn 0.2s ease-out',
            }}
          >
            <Icon size={20} color={colors.icon} />
            <span style={{ flex: 1, fontSize: '0.875rem' }}>{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: 4,
                color: 'var(--color-text-muted)',
              }}
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
