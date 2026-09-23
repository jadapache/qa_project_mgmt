import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  type: ToastType
  message: string
  title?: string
  duration?: number
}

interface ToastContextValue {
  toasts: Toast[]
  showToast: (toast: Omit<Toast, 'id'>) => string
  dismissToast: (id: string) => void
  toast: {
    success: (message: string, title?: string, duration?: number) => string
    error: (message: string, title?: string, duration?: number) => string
    warning: (message: string, title?: string, duration?: number) => string
    info: (message: string, title?: string, duration?: number) => string
    dismiss: (id: string) => void
  }
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

export const DEFAULT_TOAST_DURATION = 10000 // 10 seconds auto-dismiss

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback(
    ({ type, message, title, duration = DEFAULT_TOAST_DURATION }: Omit<Toast, 'id'>) => {
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const newToast: Toast = {
        id,
        type,
        message,
        title,
        duration,
      }

      setToasts((prev) => {
        // Limit to max 5 simultaneous toasts to avoid screen clutter
        const updated = [...prev, newToast]
        return updated.slice(-5)
      })

      return id
    },
    [],
  )

  const toastHelpers = useMemo(
    () => ({
      success: (message: string, title?: string, duration?: number) =>
        showToast({ type: 'success', message, title, duration }),
      error: (message: string, title?: string, duration?: number) =>
        showToast({ type: 'error', message, title, duration }),
      warning: (message: string, title?: string, duration?: number) =>
        showToast({ type: 'warning', message, title, duration }),
      info: (message: string, title?: string, duration?: number) =>
        showToast({ type: 'info', message, title, duration }),
      dismiss: dismissToast,
    }),
    [showToast, dismissToast],
  )

  const value = useMemo(
    () => ({
      toasts,
      showToast,
      dismissToast,
      toast: toastHelpers,
    }),
    [toasts, showToast, dismissToast, toastHelpers],
  )

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
}

export const useToast = (): ToastContextValue => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
