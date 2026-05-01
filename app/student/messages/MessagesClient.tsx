'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { Send, MessageSquare, ArrowLeft, Search, Check, CheckCheck, CornerUpLeft, Trash2, X } from 'lucide-react'
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
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null)
  const [view, setView] = useState<'list' | 'chat'>('list')
  const [content, setContent] = useState('')
  const [selectedProblemId, setSelectedProblemId] = useState('')
  const [sending, setSending] = useState(false)
  const [search, setSearch] = useState('')
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set())
  const [replyTo, setReplyTo] = useState<Message | null>(null)
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set())
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase = useMemo(() => createClient(), [])

  const visibleMessages = messages.filter(m => !deletedIds.has(m.id))

  function getThread(teacher: Teacher) {
    return visibleMessages.filter(m =>
      (m.sender_id === userId && m.receiver_id === teacher.id) ||
      (m.receiver_id === userId && m.sender_id === teacher.id)
    )
  }

  const thread = selectedTeacher ? getThread(selectedTeacher) : []

  function openChat(teacher: Teacher) {
    const t = visibleMessages.filter(m =>
      (m.sender_id === userId && m.receiver_id === teacher.id) ||
      (m.receiver_id === userId && m.sender_id === teacher.id)
    )
    setSelectedTeacher(teacher)
    setView('chat')
    setReplyTo(null)
    setSeenIds(prev => {
      const next = new Set(prev)
      t.forEach(m => next.add(m.id))
      return next
    })
  }

  function backToList() {
    setView('list')
    setReplyTo(null)
    setHoveredId(null)
  }

  function isSeen(msg: Message) {
    return thread.some(m => m.sender_id !== userId && new Date(m.created_at) > new Date(msg.created_at))
  }

  function unreadCount(teacher: Teacher) {
    return getThread(teacher).filter(m => m.sender_id !== userId && !seenIds.has(m.id)).length
  }

  useEffect(() => {
    if (view === 'chat') {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [thread.length, view])

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

    let msgContent = content.trim()
    if (replyTo) {
      const senderName = replyTo.sender_id === userId ? 'You' : (replyTo.sender?.name ?? replyTo.sender?.email ?? 'Teacher')
      const rawBody = replyTo.content.startsWith('↩ ')
        ? replyTo.content.split('\n\n').slice(1).join('\n\n')
        : replyTo.content
      const preview = rawBody.slice(0, 60) + (rawBody.length > 60 ? '…' : '')
      msgContent = `↩ ${senderName}: ${preview}\n\n${content.trim()}`
    }

    const { data } = await supabase
      .from('messages')
      .insert({
        sender_id: userId,
        receiver_id: selectedTeacher.id,
        content: msgContent,
        problem_id: selectedProblemId || null,
      })
      .select('*, sender:users!messages_sender_id_fkey(id, name, email), receiver:users!messages_receiver_id_fkey(id, name, email), problem:problems(id, title, question)')
      .single()

    if (data) {
      setMessages(prev => [...prev, data as any])
      setSeenIds(prev => new Set(prev).add((data as any).id))
    }
    setContent('')
    setSelectedProblemId('')
    setReplyTo(null)
    setSending(false)
  }

  function displayName(t: Teacher) { return t.name ?? t.email }

  const filteredTeachers = teachers.filter(t => {
    const q = search.toLowerCase()
    return !q || displayName(t).toLowerCase().includes(q) || t.email.toLowerCase().includes(q)
  })

  // ---- CONVERSATION LIST ----
  if (view === 'list') {
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
          <div className="max-w-lg">
            <div className="relative mb-4">
              <Search size={16} strokeWidth={1.75} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search conversations…"
                className="w-full pl-11 pr-4 py-3 rounded-xl text-sm text-slate-200 focus:outline-none transition-all"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
                onFocus={e => (e.target.style.borderColor = 'rgba(59,130,246,0.5)')}
                onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
              />
            </div>

            <div
              className="rounded-2xl border border-white/10 overflow-hidden"
              style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015))' }}
            >
              {filteredTeachers.length === 0 ? (
                <div className="p-10 text-center text-slate-500 text-sm">No conversations found</div>
              ) : (
                <div className="divide-y divide-white/5">
                  {filteredTeachers.map(t => {
                    const tThread = getThread(t)
                    const lastMsg = tThread[tThread.length - 1]
                    const unread = unreadCount(t)
                    const lastPreview = lastMsg
                      ? (lastMsg.content.startsWith('↩ ')
                          ? lastMsg.content.split('\n\n').slice(1).join(' ').slice(0, 50)
                          : lastMsg.content.slice(0, 50))
                      : ''
                    return (
                      <button
                        key={t.id}
                        onClick={() => openChat(t)}
                        className="w-full text-left px-4 py-4 flex items-center gap-3 hover:bg-white/5 transition-all"
                      >
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                          style={{ background: 'linear-gradient(135deg, #60A5FA, #1D4ED8)' }}
                        >
                          {displayName(t)[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="font-bold text-white text-sm truncate">{displayName(t)}</span>
                            {lastMsg && (
                              <span className="text-[10px] text-slate-500 shrink-0 ml-2">
                                {new Date(lastMsg.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs text-slate-400 truncate">
                              {lastMsg
                                ? (lastMsg.sender_id === userId ? 'You: ' : '') + lastPreview
                                : 'Start a conversation'}
                            </p>
                            {unread > 0 && (
                              <span
                                className="shrink-0 min-w-[20px] h-5 px-1 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                                style={{ background: '#3B82F6' }}
                              >
                                {unread > 9 ? '9+' : unread}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ---- CHAT VIEW ----
  if (!selectedTeacher) return null

  return (
    <div
      className="flex flex-col rounded-2xl overflow-hidden border border-white/10"
      style={{ height: 'calc(100svh - 7rem)', background: '#0B1224' }}
    >
      {/* Header */}
      <div
        className="px-3 py-3 flex items-center gap-3 shrink-0"
        style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}
      >
        <button
          onClick={backToList}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all shrink-0"
        >
          <ArrowLeft size={18} strokeWidth={2} />
        </button>
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
          style={{ background: 'linear-gradient(135deg, #60A5FA, #1D4ED8)' }}
        >
          {displayName(selectedTeacher)[0].toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="font-bold text-white text-sm truncate">{displayName(selectedTeacher)}</p>
          <p className="text-xs text-slate-500">Teacher</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3">
        {thread.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-3">
            <MessageSquare size={32} strokeWidth={1.25} />
            <p className="text-sm">Start a conversation with {displayName(selectedTeacher)}</p>
          </div>
        )}
        {thread.map(m => {
          const isMine = m.sender_id === userId
          const seen = isMine && isSeen(m)
          const isReplyMsg = m.content.startsWith('↩ ')
          let replyLine = ''
          let bodyContent = m.content
          if (isReplyMsg) {
            const parts = m.content.split('\n\n')
            replyLine = parts[0]
            bodyContent = parts.slice(1).join('\n\n')
          }
          const isHovered = hoveredId === m.id
          return (
            <div
              key={m.id}
              className={`flex ${isMine ? 'justify-end' : 'justify-start'} group`}
              onMouseEnter={() => setHoveredId(m.id)}
              onMouseLeave={() => setHoveredId(null)}
              onTouchStart={() => setHoveredId(prev => prev === m.id ? null : m.id)}
            >
              <div className={`flex items-end gap-1.5 max-w-[82%] ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                {/* Hover actions */}
                <div
                  className={`flex flex-col gap-1 transition-opacity ${isHovered ? 'opacity-100' : 'opacity-0'} ${isMine ? 'items-end' : 'items-start'}`}
                >
                  <button
                    onClick={() => setReplyTo(m)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-white/5 transition-all"
                    title="Reply"
                  >
                    <CornerUpLeft size={13} strokeWidth={2} />
                  </button>
                  {isMine && (
                    <button
                      onClick={() => setDeletedIds(prev => new Set(prev).add(m.id))}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-white/5 transition-all"
                      title="Delete"
                    >
                      <Trash2 size={13} strokeWidth={2} />
                    </button>
                  )}
                </div>

                <div className="flex flex-col">
                  {/* Reply quote */}
                  {isReplyMsg && (
                    <div
                      className={`mb-1 px-3 py-1.5 rounded-lg text-[11px] max-w-full truncate ${isMine ? 'self-end' : 'self-start'}`}
                      style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', color: '#93C5FD' }}
                    >
                      {replyLine}
                    </div>
                  )}
                  {/* Problem reference */}
                  {m.problem && (
                    <div
                      className={`mb-1 px-3 py-1.5 rounded-lg text-[11px] max-w-full truncate ${isMine ? 'self-end' : 'self-start'}`}
                      style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', color: '#93C5FD' }}
                    >
                      Re: {m.problem.title ?? m.problem.question.slice(0, 40)}…
                    </div>
                  )}
                  {/* Bubble */}
                  <div
                    className="px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap break-words"
                    style={isMine
                      ? { background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)', color: 'white' }
                      : { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', color: '#E2E8F0' }}
                  >
                    {bodyContent}
                  </div>
                  {/* Time + seen */}
                  <div className={`flex items-center gap-1 mt-0.5 ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <p className="text-[10px] text-slate-600">
                      {new Date(m.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    {isMine && (
                      seen
                        ? <CheckCheck size={12} strokeWidth={2} className="text-blue-400" />
                        : <Check size={12} strokeWidth={2} className="text-slate-500" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Reply preview bar */}
      {replyTo && (
        <div
          className="px-3 py-2 flex items-center gap-3 shrink-0"
          style={{ background: 'rgba(59,130,246,0.06)', borderTop: '1px solid rgba(59,130,246,0.2)' }}
        >
          <CornerUpLeft size={14} strokeWidth={2} className="text-blue-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold text-blue-400">
              {replyTo.sender_id === userId ? 'You' : (replyTo.sender?.name ?? replyTo.sender?.email)}
            </p>
            <p className="text-xs text-slate-400 truncate">
              {replyTo.content.startsWith('↩ ')
                ? replyTo.content.split('\n\n').slice(1).join(' ')
                : replyTo.content}
            </p>
          </div>
          <button onClick={() => setReplyTo(null)} className="text-slate-500 hover:text-white transition-colors p-1 shrink-0">
            <X size={14} strokeWidth={2} />
          </button>
        </div>
      )}

      {/* Input */}
      <div className="px-6 py-4 shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        {problems.length > 0 && (
          <select
            value={selectedProblemId}
            onChange={e => setSelectedProblemId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-xs focus:outline-none transition-all mb-3"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', color: '#94A3B8' }}
          >
            <option value="">Reference a problem (optional)</option>
            {problems.map(p => (
              <option key={p.id} value={p.id}>{p.title ?? p.question.slice(0, 60)}</option>
            ))}
          </select>
        )}
        <div className="flex gap-3 items-end">
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
            placeholder="Type a message…"
            rows={3}
            className="flex-1 px-4 py-3 rounded-xl text-sm text-slate-200 focus:outline-none transition-all resize-none min-h-[80px]"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)' }}
            onFocus={e => (e.target.style.borderColor = 'rgba(59,130,246,0.6)')}
            onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.18)')}
          />
          <button
            onClick={sendMessage}
            disabled={!content.trim() || sending}
            className="px-4 py-3 rounded-xl font-bold text-white transition-all disabled:opacity-40 hover:scale-105 active:scale-95 shrink-0"
            style={{ background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)', boxShadow: '0 4px 16px rgba(59,130,246,0.35)' }}
          >
            <Send size={16} strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  )
}
