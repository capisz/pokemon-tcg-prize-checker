"use client"

import * as Dialog from '@radix-ui/react-dialog'
import { useRef, type ReactNode } from 'react'

export function Modal({ open, onOpenChange, title, children, overlayClassName, className, returnFocusSelector }: {
  open: boolean; onOpenChange: (open: boolean) => void; title: string
  children: ReactNode; overlayClassName: string; className: string; returnFocusSelector?: string
}) {
  const previousFocus = useRef<HTMLElement | null>(null)
  return <Dialog.Root open={open} onOpenChange={onOpenChange}>
    <Dialog.Portal>
      <Dialog.Overlay className={overlayClassName} />
      <Dialog.Content aria-describedby={undefined}
        onEscapeKeyDown={event=>{if((event.target as HTMLElement)?.closest('[data-escape-local="true"]'))event.preventDefault()}}
        onOpenAutoFocus={() => { previousFocus.current = document.activeElement as HTMLElement }}
        onCloseAutoFocus={event => {
          event.preventDefault()
          const target = returnFocusSelector ? document.querySelector<HTMLElement>(returnFocusSelector) : previousFocus.current
          if (target?.isConnected) target.focus()
        }}
        className={`fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 max-h-[90dvh] overflow-y-auto focus:outline-none ${className}`}>
        <Dialog.Title className="sr-only">{title}</Dialog.Title>
        {children}
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
}
