'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Menu, X, Check, ZoomIn, ZoomOut } from 'lucide-react'
import type { Problem, Choice } from '@/types'
import { useLang } from '@/components/ui/LanguageProvider'

const diffStyle = (d: string) => ({
  easy:   { background: 'rgba(16,185,129,0.15)', color: '#34D399', border: '1px solid rgba(16,185,129,0.3)' },
  medium: { background: 'rgba(245,158,11,0.15)',  color: '#FBBF24', border: '1px solid rgba(245,158,11,0.3)' },
  hard:   { background: 'rgba(239,68,68,0.15)',   color: '#F87171', border: '1px solid rgba(239,68,68,0.3)' },
}[d] ?? {})

function mcStyle(label: string, selectedMC: string | null, submitted: boolean, correctLabel: string | null) {
  if (!submitted) {
    if (selectedMC === label) return { borderColor: '#3B82F6', color: '#3B82F6', background: 'rgba(59,130,246,0.12)' }
    return { borderColor: 'var(--input-border)', color: '#94A3B8', background: 'var(--input-bg)' }
  }
  if (label === correctLabel) return { borderColor: '#10B981', color: '#34D399', background: 'rgba(16,185,129,0.12)' }
  if (label === selectedMC)   return { borderColor: '#EF4444', color: '#F87171', background: 'rgba(239,68,68,0.12)' }
  return { borderColor: 'var(--input-border)', color: '#475569', background: 'transparent' }
}

// ---------------------------------------------------------------------------
// Zoomable full-page image viewer
// ---------------------------------------------------------------------------
function ImageViewer({ src, onClose }: { src: string; onClose: () => void }) {
  const [zoom, setZoom] = useState(1)
  const [pan, setPan]   = useState({ x: 0, y: 0 })
  const dragging = useRef(false)
  const last     = useRef({ x: 0, y: 0 })

  const clampZoom = (z: number) => Math.min(8, Math.max(0.5, z))

  // Scroll to zoom
  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    setZoom(z => clampZoom(z - e.deltaY * 0.001 * z))
  }, [])

  // Drag to pan
  const onMouseDown = (e: React.MouseEvent) => {
    dragging.current = true
    last.current = { x: e.clientX, y: e.clientY }
    e.preventDefault()
  }
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging.current) return
    const dx = e.clientX - last.current.x
    const dy = e.clientY - last.current.y
    last.current = { x: e.clientX, y: e.clientY }
    setPan(p => ({ x: p.x + dx, y: p.y + dy }))
  }
  const onMouseUp = () => { dragging.current = false }

  // Touch pan/pinch
  const touches = useRef<React.TouchList | null>(null)
  const onTouchStart = (e: React.TouchEvent) => { touches.current = e.touches }
  const onTouchMove = (e: React.TouchEvent) => {
    if (!touches.current) return
    if (e.touches.length === 2 && touches.current.length === 2) {
      const prevDist = Math.hypot(
        touches.current[0].clientX - touches.current[1].clientX,
        touches.current[0].clientY - touches.current[1].clientY,
      )
      const newDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      )
      setZoom(z => clampZoom(z * (newDist / prevDist)))
    } else if (e.touches.length === 1 && touches.current.length === 1) {
      const dx = e.touches[0].clientX - touches.current[0].clientX
      const dy = e.touches[0].clientY - touches.current[0].clientY
      setPan(p => ({ x: p.x + dx, y: p.y + dy }))
    }
    touches.current = e.touches
  }

  // Esc to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const resetView = () => { setZoom(1); setPan({ x: 0, y: 0 }) }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: '#000' }}
    >
      {/* Toolbar */}
      <div
        className="flex items-center justify-between px-5 py-3 flex-shrink-0"
        style={{ background: 'rgba(0,0,0,0.7)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoom(z => clampZoom(z - 0.25))}
            className="p-2 rounded-lg hover:bg-white/10 text-slate-300 transition-colors"
          >
            <ZoomOut size={18} />
          </button>
          <span
            className="text-xs font-mono text-slate-400 w-12 text-center cursor-pointer select-none"
            onClick={resetView}
            title="Reset zoom"
          >
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom(z => clampZoom(z + 0.25))}
            className="p-2 rounded-lg hover:bg-white/10 text-slate-300 transition-colors"
          >
            <ZoomIn size={18} />
          </button>
        </div>

        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-white/10 text-slate-300 transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      {/* Canvas */}
      <div
        className="flex-1 overflow-hidden select-none"
        style={{ cursor: zoom > 1 ? 'grab' : 'zoom-out' }}
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={() => { touches.current = null }}
        onClick={(e) => {
          // click on backdrop (not during drag) closes
          if (e.target === e.currentTarget) onClose()
        }}
      >
        <div
          className="w-full h-full flex items-center justify-center"
          style={{ pointerEvents: 'none' }}
        >
          <img
            src={src}
            alt="Problem"
            draggable={false}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'center center',
              transition: dragging.current ? 'none' : 'transform 0.05s ease-out',
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          />
        </div>
      </div>

      <p className="text-center text-xs text-slate-600 py-2 flex-shrink-0">
        scroll to zoom · drag to pan · click background or Esc to close
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function ProblemDetailClient({ problem }: { problem: Problem & { choices: Choice[] } }) {
  const router = useRouter()
  const { lang } = useLang()

  const [selectedMC, setSelectedMC] = useState<string | null>(null)
  const [inputVal, setInputVal]     = useState('')
  const [submitted, setSubmitted]   = useState(false)
  const [expanded, setExpanded]     = useState(false)

  const choices     = problem.choices ?? []
  const shortId     = problem.id.slice(0, 8)
  const correctLabel = choices.find(c => c.is_correct)?.label ?? null

  const canSubmit = problem.type === 'mc' ? selectedMC !== null : inputVal.trim() !== ''

  const isCorrect = submitted
    ? problem.type === 'mc'
      ? correctLabel === selectedMC
      : inputVal.trim().toLowerCase() === (problem.solution ?? '').trim().toLowerCase()
    : false

  function handleSubmit() { if (canSubmit && !submitted) setSubmitted(true) }
  function handleTryAgain() { setSubmitted(false); setSelectedMC(null); setInputVal('') }

  return (
    <>
      {expanded && problem.image_url && (
        <ImageViewer src={problem.image_url} onClose={() => setExpanded(false)} />
      )}

      <div className="flex flex-col" style={{ height: '100vh', background: 'var(--app-bg)', color: 'var(--text-primary)' }}>
        {/* Header */}
        <div
          className="flex items-center gap-3 px-5 py-3 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--card-border)', height: 52 }}
        >
          <span
            className="px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize flex-shrink-0"
            style={diffStyle(problem.difficulty)}
          >
            {problem.difficulty}
          </span>

          <span
            className="px-2 py-0.5 rounded text-xs font-mono font-bold flex-shrink-0"
            style={{ background: 'var(--input-bg)', color: 'var(--text-muted)' }}
          >
            {shortId}
          </span>

          {(problem.category || problem.topic) && (
            <span className="text-xs text-slate-400 truncate flex-1 min-w-0">
              {[problem.category, problem.topic].filter(Boolean).join(' › ')}
            </span>
          )}

          <div className="flex items-center gap-1 flex-shrink-0 ml-auto">
            <button className="p-2 rounded-lg hover:bg-white/5 transition-colors text-slate-400 hover:text-slate-200">
              <Menu size={18} />
            </button>
            <button
              onClick={() => router.push('/student/problems')}
              className="p-2 rounded-lg hover:bg-white/5 transition-colors text-slate-400 hover:text-slate-200"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body — fixed split: left 62% | right 38% */}
        <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 52px)' }}>

          {/* Left — problem image / text */}
          <div
            className="overflow-y-auto flex flex-col"
            style={{ width: '62%', borderRight: '1px solid var(--card-border)' }}
          >
            {problem.image_url ? (
              <div className="flex flex-col h-full">
                <div
                  className="flex-1 flex items-center justify-center overflow-hidden cursor-zoom-in"
                  onClick={() => setExpanded(true)}
                >
                  <img
                    src={problem.image_url}
                    alt="Problem"
                    className="w-full h-full object-contain"
                    style={{ display: 'block' }}
                  />
                </div>
                <p className="text-center text-xs text-slate-500 py-2 flex-shrink-0">
                  click to expand
                </p>
              </div>
            ) : (
              <div className="p-8 flex flex-col gap-5">
                <p className="text-base leading-relaxed whitespace-pre-wrap">{problem.question}</p>
                {problem.type === 'mc' && choices.length > 0 && (
                  <div className="flex flex-col gap-3 mt-2">
                    {choices.map(c => (
                      <p key={c.id} className="text-sm">
                        <span className="font-semibold mr-2">{c.label}.</span>
                        {c.choice_text}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right — answer panel */}
          <div className="flex flex-col overflow-y-auto" style={{ width: '38%' }}>
            <div className="flex-1 p-8 flex flex-col">
              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-6">
                Your Answer
              </p>

              {problem.type === 'mc' && (
                <div className="flex gap-3 flex-wrap">
                  {choices.map(c => (
                    <div key={c.id} className="relative">
                      <button
                        disabled={submitted}
                        onClick={() => setSelectedMC(c.label)}
                        className="w-14 h-14 rounded-xl border-2 font-mono font-bold text-lg transition-all"
                        style={mcStyle(c.label, selectedMC, submitted, correctLabel)}
                      >
                        {c.label}
                      </button>
                      {submitted && c.label === correctLabel && (
                        <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                          <Check size={11} strokeWidth={3} color="white" />
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {problem.type === 'input' && (
                <div>
                  <input
                    type="text"
                    value={inputVal}
                    onChange={e => setInputVal(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
                    disabled={submitted}
                    placeholder="Enter your answer"
                    className="w-full px-4 py-3 rounded-xl font-mono text-base outline-none disabled:opacity-60"
                    style={{ background: 'var(--input-bg)', border: '2px solid #3B82F6', color: 'var(--input-color)' }}
                  />
                  <p className="text-xs text-slate-500 mt-1.5">fraction · decimal · integer</p>
                </div>
              )}

              {submitted && (
                <div className="mt-6">
                  <div className="flex items-center gap-2 mb-2">
                    {isCorrect
                      ? <Check size={15} className="text-emerald-400" />
                      : <X size={15} className="text-red-400" />
                    }
                    <span className={`text-sm font-semibold ${isCorrect ? 'text-emerald-400' : 'text-red-400'}`}>
                      {isCorrect ? 'Correct' : 'Incorrect'}
                    </span>
                  </div>

                  {!isCorrect && problem.solution && (
                    <p className="text-sm text-emerald-400 mb-3">
                      Answer: <span className="font-mono font-semibold">{problem.solution}</span>
                    </p>
                  )}

                  {(() => {
                    const text = lang === 'mn' && problem.explanation_mn ? problem.explanation_mn : problem.explanation
                    return text ? (
                      <div
                        className="rounded-xl p-4"
                        style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)' }}
                      >
                        <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                          {text}
                        </p>
                      </div>
                    ) : null
                  })()}
                </div>
              )}
            </div>

            {/* Bottom actions */}
            <div className="p-8 pt-0 flex flex-col gap-3">
              {submitted && (
                <button
                  onClick={handleTryAgain}
                  className="w-full py-3 rounded-full text-sm font-semibold transition-colors text-slate-400 hover:text-slate-200"
                  style={{ border: '1px solid var(--input-border)', color: 'var(--text-muted)' }}
                >
                  Try Again
                </button>
              )}
              <button
                onClick={submitted ? undefined : handleSubmit}
                disabled={!submitted && !canSubmit}
                className="w-full py-4 rounded-full font-semibold text-base transition-all"
                style={
                  submitted
                    ? { background: isCorrect ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', color: isCorrect ? '#34D399' : '#F87171' }
                    : canSubmit
                    ? { background: 'var(--input-textarea-bg)', color: 'var(--text-muted)' }
                    : { background: 'var(--input-bg)', color: '#475569' }
                }
              >
                {submitted ? (isCorrect ? '✓ Correct!' : 'Incorrect') : 'Submit Answer'}
              </button>
            </div>
          </div>

        </div>
      </div>
    </>
  )
}
