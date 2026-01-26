import { useState, useEffect, useCallback, createContext, useContext } from 'react'

// Toast context for global toast management
const ToastContext = createContext(null)

/**
 * Toast types with their styles
 */
const toastStyles = {
  success: {
    background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
        <path d="M20 6L9 17l-5-5"/>
      </svg>
    )
  },
  error: {
    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
        <circle cx="12" cy="12" r="10"/>
        <path d="M15 9l-6 6M9 9l6 6"/>
      </svg>
    )
  },
  warning: {
    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    )
  },
  info: {
    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="16" x2="12" y2="12"/>
        <line x1="12" y1="8" x2="12.01" y2="8"/>
      </svg>
    )
  }
}

/**
 * Single toast component
 */
function ToastItem({ toast, onDismiss }) {
  const [isExiting, setIsExiting] = useState(false)
  const style = toastStyles[toast.type] || toastStyles.info

  useEffect(() => {
    if (toast.duration > 0) {
      const timer = setTimeout(() => {
        setIsExiting(true)
        setTimeout(() => onDismiss(toast.id), 300)
      }, toast.duration)
      return () => clearTimeout(timer)
    }
  }, [toast.id, toast.duration, onDismiss])

  const handleDismiss = () => {
    setIsExiting(true)
    setTimeout(() => onDismiss(toast.id), 300)
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '14px 16px',
        borderRadius: '10px',
        background: style.background,
        color: 'white',
        boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
        marginBottom: '8px',
        animation: isExiting ? 'toastExit 0.3s ease forwards' : 'toastEnter 0.3s ease',
        maxWidth: '400px',
        minWidth: '300px'
      }}
    >
      <div style={{ flexShrink: 0 }}>{style.icon}</div>
      <div style={{ flex: 1, fontSize: '14px', fontWeight: '500' }}>
        {toast.title && <div style={{ fontWeight: '600', marginBottom: '2px' }}>{toast.title}</div>}
        <div style={{ opacity: 0.95 }}>{toast.message}</div>
      </div>
      <button
        onClick={handleDismiss}
        style={{
          background: 'rgba(255,255,255,0.2)',
          border: 'none',
          borderRadius: '6px',
          padding: '4px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
    </div>
  )
}

/**
 * Toast container component - renders all toasts
 */
export function ToastContainer() {
  const { toasts, removeToast } = useToast()

  if (toasts.length === 0) return null

  return (
    <>
      <style>{`
        @keyframes toastEnter {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes toastExit {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(100%);
            opacity: 0;
          }
        }
      `}</style>
      <div
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 9999
        }}
      >
        {toasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} onDismiss={removeToast} />
        ))}
      </div>
    </>
  )
}

/**
 * Toast provider component
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, options = {}) => {
    const id = Date.now() + Math.random()
    const toast = {
      id,
      message,
      type: options.type || 'info',
      title: options.title,
      duration: options.duration !== undefined ? options.duration : 5000
    }
    setToasts(prev => [...prev, toast])
    return id
  }, [])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const success = useCallback((message, options = {}) => {
    return addToast(message, { ...options, type: 'success' })
  }, [addToast])

  const error = useCallback((message, options = {}) => {
    return addToast(message, { ...options, type: 'error', duration: options.duration || 8000 })
  }, [addToast])

  const warning = useCallback((message, options = {}) => {
    return addToast(message, { ...options, type: 'warning' })
  }, [addToast])

  const info = useCallback((message, options = {}) => {
    return addToast(message, { ...options, type: 'info' })
  }, [addToast])

  const value = {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    warning,
    info
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  )
}

/**
 * Hook to use toast notifications
 */
export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

export default ToastProvider
