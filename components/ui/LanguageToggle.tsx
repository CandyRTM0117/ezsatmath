'use client'

import { useLang } from './LanguageProvider'

export default function LanguageToggle() {
  const { lang, toggle } = useLang()
  const isMn = lang === 'mn'

  return (
    <div className="flex items-center gap-3">
      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest w-16 shrink-0">Lang</span>
      <button
        onClick={toggle}
        title={isMn ? 'Switch to English' : 'Монгол хэл рүү шилжих'}
        className="relative w-12 h-6 rounded-full transition-all duration-300 flex items-center"
        style={{
          background: isMn ? 'rgba(99,102,241,0.35)' : 'rgba(255,255,255,0.12)',
          border: isMn ? '1px solid rgba(99,102,241,0.5)' : '1px solid rgba(255,255,255,0.15)',
        }}
      >
        <span
          className="absolute w-5 h-5 rounded-full transition-all duration-300 shadow-md flex items-center justify-center text-[9px] font-bold"
          style={{
            left: isMn ? '25px' : '2px',
            background: isMn ? '#6366F1' : '#1E293B',
            color: '#FFFFFF',
          }}
        >
          {isMn ? 'МН' : 'EN'}
        </span>
      </button>
      <span className="text-xs font-medium text-slate-400">{isMn ? 'Монгол' : 'English'}</span>
    </div>
  )
}
