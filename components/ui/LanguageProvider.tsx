'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type Lang = 'en' | 'mn'

interface LangContextValue {
  lang: Lang
  toggle: () => void
}

const LangContext = createContext<LangContextValue>({ lang: 'en', toggle: () => {} })

export function useLang() { return useContext(LangContext) }

export default function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>('en')

  useEffect(() => {
    const saved = localStorage.getItem('ezsat-lang') as Lang | null
    if (saved) setLang(saved)
  }, [])

  function toggle() {
    const next: Lang = lang === 'en' ? 'mn' : 'en'
    setLang(next)
    localStorage.setItem('ezsat-lang', next)
  }

  return <LangContext.Provider value={{ lang, toggle }}>{children}</LangContext.Provider>
}
