import React from 'react'
import { Sparkles } from 'lucide-react'

interface AppLoaderProps {
  /** If true, fills the whole viewport with an overlay/centered layout */
  fullScreen?: boolean
  /** Primary loading message to display */
  message?: string
  /** Optional secondary subtitle or hint */
  submessage?: string
  /** Size variant for the central logo */
  size?: 'sm' | 'md' | 'lg'
  /** Additional custom class names for the outer container */
  className?: string
}

export const AppLoader: React.FC<AppLoaderProps> = ({
  fullScreen = false,
  message = 'Cargando...',
  submessage,
  size = 'md',
  className = '',
}) => {
  const sizeClasses = {
    sm: {
      container: 'h-11 w-11 rounded-xl',
      icon: 'h-5 w-5',
      ring: 'h-14 w-14',
      dot: 'h-2 w-2 -top-1 -right-1',
      text: 'text-xs',
    },
    md: {
      container: 'h-16 w-16 rounded-2xl',
      icon: 'h-8 w-8',
      ring: 'h-20 w-20',
      dot: 'h-2.5 w-2.5 -top-1 -right-1',
      text: 'text-sm',
    },
    lg: {
      container: 'h-20 w-20 rounded-3xl',
      icon: 'h-10 w-10',
      ring: 'h-24 w-24',
      dot: 'h-3 w-3 -top-1.5 -right-1.5',
      text: 'text-base',
    },
  }[size]

  const content = (
    <div className={`relative z-10 flex flex-col items-center justify-center gap-4 text-center ${className}`}>
      {/* Central Animated App Logo */}
      <div className="relative flex items-center justify-center">
        {/* Orbital spinning glow ring */}
        <div
          className={`absolute ${sizeClasses.ring} rounded-full border-2 border-transparent border-t-[#004497] border-r-cyan-400 animate-spin`}
          style={{ animationDuration: '1.2s' }}
        />
        {/* Second soft counter-spinning ring */}
        <div
          className={`absolute ${sizeClasses.ring} rounded-full border border-slate-200/50 dark:border-slate-700/50 animate-pulse-soft`}
        />

        {/* Logo Card */}
        <div
          className={`relative flex ${sizeClasses.container} items-center justify-center bg-gradient-to-br from-[#002777] to-[#004497] text-white shadow-xl shadow-[#002777]/35 ring-2 ring-cyan-400/30 transition-transform duration-300`}
        >
          <Sparkles className={`${sizeClasses.icon} animate-pulse`} aria-hidden />
          <span
            className={`absolute ${sizeClasses.dot} rounded-full bg-cyan-400 ring-2 ring-white animate-pulse-soft`}
            aria-hidden
          />
        </div>
      </div>

      {/* Text Message */}
      <div className="space-y-1.5">
        <p className={`font-semibold text-slate-800 ${sizeClasses.text}`}>
          {message}
        </p>
        {submessage && (
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            {submessage}
          </p>
        )}
      </div>

      {/* Progress Bar Indicator */}
      <div className="h-1.5 w-36 overflow-hidden rounded-full bg-slate-200 ring-1 ring-slate-300/40">
        <div
          className="h-full w-1/2 animate-shimmer rounded-full bg-gradient-to-r from-[#002777] via-cyan-500 to-[#004497]"
          style={{
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite linear',
          }}
        />
      </div>
    </div>
  )

  if (fullScreen) {
    return (
      <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-slate-50/90 backdrop-blur-sm p-4">
        {/* Subtle background ambient gradients */}
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-blue-100/60 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-cyan-100/50 blur-3xl" />
        {content}
      </div>
    )
  }

  return <div className="py-10 flex items-center justify-center">{content}</div>
}

/** Lightweight inline logo spinner for buttons or small widgets */
export const LogoSpinner: React.FC<{ size?: 'xs' | 'sm'; className?: string }> = ({
  size = 'sm',
  className = '',
}) => {
  const dims = size === 'xs' ? 'h-4 w-4' : 'h-5 w-5'
  return (
    <div className={`relative inline-flex items-center justify-center ${dims} ${className}`}>
      <div className={`absolute inset-0 rounded-full border-2 border-transparent border-t-[#004497] border-r-cyan-400 animate-spin`} />
      <Sparkles className="h-2.5 w-2.5 text-[#002777]" />
    </div>
  )
}
