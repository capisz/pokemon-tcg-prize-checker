"use client"
import { useEffect, useRef, type ComponentProps } from 'react'
import { Button } from './ui/button'

/** A tap is one action; a deliberate hold repeats until release or cancellation. */
export function RepeatButton({onRepeat, ...props}: ComponentProps<typeof Button> & {onRepeat: () => void}) {
  const action = useRef(onRepeat)
  action.current = onRepeat
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const repeated = useRef(false)
  const stop = () => { if (timer.current) clearTimeout(timer.current); timer.current = null }
  useEffect(() => {
    window.addEventListener('blur', stop)
    document.addEventListener('visibilitychange', stop)
    return () => { stop(); window.removeEventListener('blur', stop); document.removeEventListener('visibilitychange', stop) }
  }, [])
  useEffect(() => { if (props.disabled) stop() }, [props.disabled])
  return <Button {...props} style={{...props.style, touchAction:'none', userSelect:'none', WebkitTouchCallout:'none'}}
    onPointerDown={event => {
      if (!event.isPrimary || event.button !== 0) return
      stop(); repeated.current = false
      event.currentTarget.setPointerCapture(event.pointerId)
      timer.current = setTimeout(function repeat() { repeated.current = true; action.current(); timer.current = setTimeout(repeat, 130) }, 350)
    }}
    onPointerUp={stop} onPointerCancel={stop} onLostPointerCapture={stop}
    onContextMenu={event => event.preventDefault()}
    onClick={() => { if (!repeated.current) action.current(); repeated.current = false }} />
}
