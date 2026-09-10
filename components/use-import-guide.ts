"use client"
import {useEffect,useState} from 'react'
import {readStorage,writeStorage} from '@/lib/storage'

// Isolated first-visit experiment; remove this hook and its two hints to revert.
export function useImportGuide(imported:boolean, hasText:boolean){
 const [step,setStep]=useState<'off'|'import'|'confirm'|'start'|'done'>('off')
 const [visible,setVisible]=useState(false)
 useEffect(()=>{if(readStorage('prizecheck:import-guide:v1'))return;const timer=setTimeout(()=>{setStep('import');setVisible(true);writeStorage('prizecheck:import-guide:v1','true')},1200);return()=>clearTimeout(timer)},[])
 useEffect(()=>{if((step==='import'||step==='confirm')&&imported){setStep('start');setVisible(true)}},[imported,step])
 useEffect(()=>{if(step==='import'&&hasText&&!imported){setStep('confirm');setVisible(true)}},[hasText,imported,step])
 useEffect(()=>{if(!visible)return;const timer=setTimeout(()=>setVisible(false),6000);return()=>clearTimeout(timer)},[step,visible])
 return {step,visible,dismiss:()=>{setVisible(false);setStep('done')}}
}
