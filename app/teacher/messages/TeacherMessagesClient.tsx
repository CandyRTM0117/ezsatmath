'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { Send, MessageSquare } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Student { id: string; name: string | null; email: string }
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

export default function TeacherMessagesClient({
  userId, students, activeStudents, messages: initialMessages,
}: {
  userId: string
  students: Student[]
  activeStudents: Student[]
  messages: Message[]
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(activeStudents[0] ?? null)
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const supabase = useMemo(() => createClient(), [])

  const thread = messages.filter(m =>
    (m.sender_id === userId && m.receiver_id === selectedStudent?.id) ||
    (m.receiver_id === userId && m.sender_id === selectedStudent?.id)
  )

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [thread.length])

  useEffect(() => {
    if (!selectedStudent) return
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('messages')
        .select('*, sender:users!messages_sender_id_fkey(id, name, email), receiver:users!messages_receiver_id_fkey(id, name, email), problem:problems(id, title, question)')
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order('created_at', { ascending: true })
      if (data) setMessages(data as any[])
    }, 10000)
    return () => clearInterval(interval)
  }, [selectedStudent, userId, supabase])

  async function sendMessage() {
    if (!content.trim() || !selectedStudent || sending) return
    setSending(true)

    const { data } = await supabase
      .from('messages')
      .insert({ sender_id: userId, receiver_id: selectedStudent.id, content: content.trim() })
      .select('*, sender:users!messages_sender_id_fkey(id, name, email), receiver:users!messages_receiver_id_fkey(id, name, email), problem:problems(id, title, question)')
      .single()

    if (data) setMessages(prev => [...prev, data as any])
    setContent('')
    setSending(false)
  }

  function displayName(s: Student) { return s.name ?? s.email }

  const sidebarStudents = activeStudents.length > 0 ? activeStudents : students

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white to-blue-300 bg-clip-text text-transparent">Messages</h1>
        <p className="text-slate-400 mt-2 text-lg">Conversations with students</p>
      </div>

      {sidebarStudents.length === 0 ? (
        <div className="rounded-2xl border border-white/10 p-14 text-center text-slate-500" style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015))' }}>
          No student conversations yet.
        </div>
      ) : (
        <div className="flex gap-6 h-[70vh]">
          <div className="w-56 shrink-0 flex flex-col gap-2">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Students</p>
            {sidebarStudents.map(s => (
              <button key={s.id} onClick={() => setSelectedStudent(s)}
                className="text-left px-4 py-3 rounded-xl text-sm font-semibold transition-all"
                style={selectedStudent?.id === s.id
                  ? { background: 'linear-gradient(90deg, rgba(59,130,246,0.18), rgba(59,130,246,0.08))', border: '1px solid rgba(59,130,246,0.3)', color: 'white' }
                  : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#94A3B8' }}>
                <p className="font-bold">{displayName(s)}</p>
                <p className="text-xs text-slate-500 mt-0.5 truncate">{s.email}</p>
              </button>
            ))}
          </div>

          {selectedStudent && (
            <div className="flex-1 flex flex-col rounded-2xl border border-white/10 overflow-hidden"
              style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015))' }}>
              <div className="px-6 py-4 border-b border-white/8 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: 'linear-gradient(135deg, #60A5FA, #1D4ED8)' }}>
                  {displayName(selectedStudent)[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-white text-sm">{displayName(selectedStudent)}</p>
                  <p className="text-xs text-slate-500">Student</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-3">
                {thread.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-3">
                    <MessageSquare size={32} strokeWidth={1.25} />
                    <p className="text-sm">No messages yet with {displayName(selectedStudent)}</p>
                  </div>
                )}
                {thread.map(m => {
                  const isMine = m.sender_id === userId
                  return (
                    <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <div className="max-w-[75%]">
                        {m.problem && (
                          <div className="mb-1 px-3 py-1.5 rounded-lg text-[11px]" style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', color: '#93C5FD' }}>
                            Re: {(m.problem as any).title ?? (m.problem as any).question?.slice(0, 40)}…
                          </div>
                        )}
                        <div className="px-4 py-2.5 rounded-2xl text-sm"
                          style={isMine
                            ? { background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)', color: 'white' }
                            : { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', color: '#E2E8F0' }}>
                          {m.content}
                        </div>
                        <p className="text-[10px] text-slate-600 mt-1 px-1">{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                  )
                })}
                <div ref={bottomRef} />
              </div>

              <div className="px-5 py-4 border-t border-white/8">
                <div className="flex gap-2">
                  <input
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                    placeholder="Type a reply…"
                    className="flex-1 px-4 py-2.5 rounded-xl text-sm text-slate-200 focus:outline-none transition-all"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
                    onFocus={e => (e.target.style.borderColor = 'rgba(59,130,246,0.5)')}
                    onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                  />
                  <button onClick={sendMessage} disabled={!content.trim() || sending}
                    className="px-4 py-2.5 rounded-xl font-bold text-white transition-all disabled:opacity-40 hover:scale-105"
                    style={{ background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)' }}>
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
