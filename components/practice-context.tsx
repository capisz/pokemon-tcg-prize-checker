"use client"
import { createContext, useContext, useState, type ReactNode } from 'react'
export type DeckBinding = { uid: string; id: string; version: string; name: string; coverCardId?: string }
const Context = createContext<{
  binding: DeckBinding | null; setBinding: (value: DeckBinding | null) => void;
  source: string; setSource: (value: string) => void;
  duration: number; setDuration: (value: number) => void;
  roundUid: string | null; setRoundUid: (value: string | null) => void;
} | null>(null)
export function PracticeProvider({children}:{children:ReactNode}) {
  const [binding,setBinding] = useState<DeckBinding | null>(null)
  const [source,setSource] = useState('')
  const [duration,setDuration] = useState(120)
  const [roundUid,setRoundUid] = useState<string | null>(null)
  return <Context.Provider value={{binding,setBinding,source,setSource,duration,setDuration,roundUid,setRoundUid}}>{children}</Context.Provider>
}
export function usePractice() { const context = useContext(Context); if(!context) throw new Error('Practice context missing'); return context }
