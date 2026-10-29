import { useEffect, useRef, useState, type FocusEvent } from 'react'

interface ToastProps {
  message: string
  onUndo: () => void
  /** Called when the toast times out or is dismissed. */
  onClose: () => void
  duration?: number
}

// The countdown pauses while the toast is hovered or keyboard-focused, so
// there's always time to reach Undo (WCAG 2.2.1 Timing Adjustable).
export function Toast({ message, onUndo, onClose, duration = 6000 }: ToastProps) {
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const remaining = useRef(duration)
  const undoRef = useRef<HTMLButtonElement>(null)
  const paused = hovered || focused

  useEffect(() => {
    if (paused) return
    const start = Date.now()
    const timer = setTimeout(onClose, remaining.current)
    return () => {
      clearTimeout(timer)
      remaining.current -= Date.now() - start
    }
  }, [paused, onClose])

  // Deleting removes the focused button with its card; catch focus here
  // instead of letting it fall back to the page.
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (document.activeElement === document.body || !document.activeElement) undoRef.current?.focus()
    })
    return () => cancelAnimationFrame(frame)
  }, [])

  // Only keyboard focus pauses: a mouse click leaves focus here without :focus-visible.
  const handleFocus = (e: FocusEvent<HTMLDivElement>) => setFocused(e.target.matches(':focus-visible'))
  const handleBlur = (e: FocusEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false)
  }

  return (
    <div
      className="toast"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose()
      }}
    >
      <span className="toast-message">{message}</span>
      <button ref={undoRef} type="button" className="toast-undo" onClick={onUndo}>
        Undo
      </button>
      <button type="button" className="toast-close" onClick={onClose} aria-label="Dismiss">
        ✕
      </button>
    </div>
  )
}
