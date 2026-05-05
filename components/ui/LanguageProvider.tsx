'use client'

import { createContext, useContext, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Lang = 'en' | 'mn'

interface LangContextValue {
  lang: Lang
  toggle: () => void
  registerUser: (userId: string, preferred: Lang) => void
}

const LangContext = createContext<LangContextValue>({ lang: 'en', toggle: () => {}, registerUser: () => {} })

export function useLang() { return useContext(LangContext) }

export default function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => {
    if (typeof window === 'undefined') return 'en'
    return (localStorage.getItem('ezsat-lang') as Lang) ?? 'en'
  })
  const [userId, setUserId] = useState<string | null>(null)

  function registerUser(uid: string, preferred: Lang) {
    setUserId(uid)
    setLang(preferred)
    localStorage.setItem('ezsat-lang', preferred)
  }

  async function toggle() {
    const next: Lang = lang === 'en' ? 'mn' : 'en'
    setLang(next)
    localStorage.setItem('ezsat-lang', next)
    console.log(`[Lang] switched to: ${next}`)

    if (userId) {
      const supabase = createClient()
      await supabase.from('users').update({ preferred_language: next }).eq('id', userId)
    }
  }

  return <LangContext.Provider value={{ lang, toggle, registerUser }}>{children}</LangContext.Provider>
}
