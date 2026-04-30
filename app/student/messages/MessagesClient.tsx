'use client'

import { useState, useEffect, useRef } from 'react'
import { Send, MessageSquare } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Teacher { id: string; name: string | null; email: string }
interface Problem { id: string; title: string | null; question: string }
interface Message {
  id: string
  sender_id: string
  receiver_id: string
  content: string
  problem_id: string | null
  created_at: string
  sender?: { id: string; name: string | null; email: string }
  receiver?: { id: string; name: string | null; email: string }
  problem?: { id: string; title: string | null; question: string }
}

export default function MessagesClient({
  userId, teachers, messages: initialMessages, problems,
}: {
  userId: string
  teachers: Teacher[]
  messages: Message[]
  problems: Problem[]
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(teachers[0] ?? null)
  const [content, setContent] = useState('')
  const [selectedProblemId, setSelectedProblemId] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  const thread = messages.filter(m =>
    (m.sender_id === userId && m.receiver_id === selectedTeacher?.id) ||
    (m.receiver_id === userId && m.sender_id === selectedTeacher?.id)
  )

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [thread.length])

  useEffect(() => {
    if (!selectedTeacher) return
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('messages')
        .select('*, sender:users!messages_sender_id_fkey(id, name, email), receiver:users!messages_receiver_id_fkey(id, name, email), problem:problems(id, title, question)')
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order('created_at', { ascending: true })
      if (data) setMessages(data as any[])
    }, 10000)
    return () => clearInterval(interval)
  }, [selectedTeacher, userId, supabase])

  async function sendMessage() {
    if (!content.trim() || !selectedTeacher || sending) return
    setSending(true)

    const { data } = await supabase
      .from('messages')
      .insert({
        sender_id: userId,
        receiver_id: selectedTeacher.id,
        content: content.trim(),
        problem_id: selectedProblemId || null,
      })
      .select('*, sender:users!messages_sender_id_fkey(id, name, email), receiver:users!messages_receiver_id_fkey(id, name, email), problem:problems(id, title, question)')
      .single()

    if (data) setMessages(prev => [...prev, data as any])
    setContent('')
    setSelectedProblemId('')
    setSending(false)
  }

  function displayName(t: Teacher) { return t.name ?? t.email }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white to-blue-300 bg-clip-text text-transparent">Messages</h1>
        <p className="text-slate-400 mt-2 text-lg">Chat with your teachers</p>
      </div>

      {teachers.length === 0 ? (
        <div className="rounded-2xl border border-white/10 p-14 text-center text-slate-500" style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015))' }}>
          No teachers available yet.
        </div>
      ) : (
        <div className="flex gap-6 h-[70vh]">
          {/* Teacher list */}
          <div className="w-56 shrink-0 flex flex-col gap-2">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Teachers</p>
            {teachers.map(t => (
              <button
                key={t.id}
                onClick={() => setSelectedTeacher(t)}
                className="text-left px-4 py-3 rounded-xl text-sm font-semibold transition-all"
                style={selectedTeacher?.id === t.id
                  ? { background: 'linear-gradient(90deg, rgba(59,130,246,0.18), rgba(59,130,246,0.08))', border: '1px solid rgba(59,130,246,0.3)', color: 'white' }
                  : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#94A3B8' }}
              >
                <p className="font-bold">{displayName(t)}</p>
                <p className="text-xs text-slate-500 mt-0.5 truncate">{t.email}</p>
              </button>
            ))}
          </div>

          {/* Thread */}
          {selectedTeacher && (
            <div
              className="flex-1 flex flex-col rounded-2xl border border-white/10 overflow-hidden"
              style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015))' }}
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-white/8 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: 'linear-gradient(135deg, #60A5FA, #1D4ED8)' }}>
                  {displayName(selectedTeacher)[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-white text-sm">{displayName(selectedTeacher)}</p>
                  <p className="text-xs text-slate-500">Teacher</p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-5 space-y-3">
                {thread.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-3">
                    <MessageSquare size={32} strokeWidth={1.25} />
                    <p className="text-sm">Start a conversation with {displayName(selectedTeacher)}</p>
                  </div>
                )}
                {thread.map(m => {
                  const isMine = m.sender_id === userId
                  return (
                    <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <div className="max-w-[75%]">
                        {m.problem && (
                          <div
                            className="mb-1 px-3 py-1.5 rounded-lg text-[11px]"
                            style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', color: '#93C5FD' }}
                          >
                            Re: {m.problem.title ?? m.problem.question.slice(0, 40)}…
                          </div>
                        )}
                        <div
                          className="px-4 py-2.5 rounded-2xl text-sm"
                          style={isMine
                            ? { background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)', color: 'white' }
                            : { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', color: '#E2E8F0' }}
                        >
                          {m.content}
                        </div>
                        <p className="text-[10px] text-slate-600 mt-1 px-1">{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                  )
                })}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div className="px-5 py-4 border-t border-white/8 space-y-2">
                {problems.length > 0 && (
                  <select
                    value={selectedProblemId}
                    onChange={e => setSelectedProblemId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-xs text-slate-300 focus:outline-none transition-all"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#94A3B8' }}
                  >
                    <option value="">Reference a problem (optional)</option>
                    {problems.map(p => (
                      <option key={p.id} value={p.id}>{p.title ?? p.question.slice(0, 60)}</option>
                    ))}
                  </select>
                )}
                <div className="flex gap-2">
                  <input
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                    placeholder="Type a message…"
                    className="flex-1 px-4 py-2.5 rounded-xl text-sm text-slate-200 focus:outline-none transition-all"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
                    onFocus={e => (e.target.style.borderColor = 'rgba(59,130,246,0.5)')}
                    onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!content.trim() || sending}
                    className="px-4 py-2.5 rounded-xl font-bold text-white transition-all disabled:opacity-40 hover:scale-105 active:scale-95"
                    style={{ background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)' }}
                  >
                    <Send size={16} strokeWidth={2} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
