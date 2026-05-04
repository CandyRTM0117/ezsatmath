'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { Send, MessageSquare, ArrowLeft, Search, CornerUpLeft, Trash2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface User { id: string; name: string | null; email: string }
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

export default function AdminMessagesClient({
  userId, users, activeUsers, messages: initialMessages,
}: {
  userId: string
  users: User[]
  activeUsers: User[]
  messages: Message[]
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [view, setView] = useState<'list' | 'chat'>('list')
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const [search, setSearch] = useState('')
  const [replyTo, setReplyTo] = useState<Message | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase = useMemo(() => createClient(), [])

  const sidebarUsers = activeUsers.length > 0 ? activeUsers : users

  const filteredUsers = sidebarUsers.filter(u => {
    const q = search.toLowerCase()
    return !q || displayName(u).toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
  })

  const thread = messages.filter(m =>
    (m.sender_id === userId && m.receiver_id === selectedUser?.id) ||
    (m.receiver_id === userId && m.sender_id === selectedUser?.id)
  )

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [thread.length, view])

  useEffect(() => {
    if (!selectedUser) return
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('messages')
        .select('*, sender:users!messages_sender_id_fkey(id, name, email), receiver:users!messages_receiver_id_fkey(id, name, email), problem:problems(id, title, question)')
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order('created_at', { ascending: true })
      if (data) setMessages(data as any[])
    }, 10000)
    return () => clearInterval(interval)
  }, [selectedUser, userId, supabase])

  async function sendMessage() {
    if (!content.trim() || !selectedUser || sending) return
    setSending(true)

    let msgContent = content.trim()
    if (replyTo) {
      const senderName = replyTo.sender_id === userId ? 'You' : (replyTo.sender?.name ?? replyTo.sender?.email ?? 'User')
      const rawBody = replyTo.content.startsWith('↩ ')
        ? replyTo.content.split('\n\n').slice(1).join('\n\n')
        : replyTo.content
      const preview = rawBody.slice(0, 60) + (rawBody.length > 60 ? '…' : '')
      msgContent = `↩ ${senderName}: ${preview}\n\n${content.trim()}`
    }

    const { data } = await supabase
      .from('messages')
      .insert({ sender_id: userId, receiver_id: selectedUser.id, content: msgContent })
      .select('*, sender:users!messages_sender_id_fkey(id, name, email), receiver:users!messages_receiver_id_fkey(id, name, email), problem:problems(id, title, question)')
      .single()

    if (data) setMessages(prev => [...prev, data as any])
    setContent('')
    setReplyTo(null)
    setSending(false)
  }

  async function deleteMessage(id: string) {
    await supabase.from('messages').delete().eq('id', id)
    setMessages(prev => prev.filter(m => m.id !== id))
  }

  function displayName(u: User) { return u.name ?? u.email }

  function openChat(u: User) {
    setSelectedUser(u)
    setView('chat')
    setReplyTo(null)
  }

  function backToList() {
    setView('list')
    setReplyTo(null)
  }

  function getLastMsg(u: User) {
    return messages.filter(m =>
      (m.sender_id === userId && m.receiver_id === u.id) ||
      (m.receiver_id === userId && m.sender_id === u.id)
    ).at(-1)
  }

  // ---- LIST PANEL ----
  const listPanel = (
    <div className="flex flex-col gap-3 w-full md:w-64 md:shrink-0">
      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Users</p>
      <div className="relative">
        <Search size={14} strokeWidth={1.75} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search users…"
          className="w-full pl-9 pr-3 py-2.5 rounded-xl text-xs focus:outline-none transition-all"
          style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--input-color)' }}
          onFocus={e => (e.target.style.borderColor = 'rgba(59,130,246,0.5)')}
          onBlur={e => (e.target.style.borderColor = 'var(--input-border)')}
        />
      </div>
      <div className="c-card flex-1 overflow-y-auto rounded-2xl overflow-hidden">
        {filteredUsers.length === 0 ? (
          <div className="p-6 text-center text-slate-500 text-xs">No users found</div>
        ) : (
          <div className="divide-y divide-white/5">
            {filteredUsers.map(u => {
              const lastMsg = getLastMsg(u)
              const lastPreview = lastMsg
                ? (lastMsg.content.startsWith('↩ ')
                    ? lastMsg.content.split('\n\n').slice(1).join(' ').slice(0, 50)
                    : lastMsg.content.slice(0, 50))
                : ''
              return (
                <button
                  key={u.id}
                  onClick={() => openChat(u)}
                  className="w-full text-left px-4 py-4 flex items-center gap-3 hover:bg-white/5 transition-all"
                  style={selectedUser?.id === u.id ? { background: 'rgba(59,130,246,0.1)' } : {}}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                    style={{ background: 'linear-gradient(135deg, #60A5FA, #1D4ED8)' }}
                  >
                    {displayName(u)[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-bold text-white text-sm truncate">{displayName(u)}</span>
                      {lastMsg && (
                        <span className="text-[10px] text-slate-500 shrink-0 ml-2">
                          {new Date(lastMsg.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 truncate">
                      {lastMsg ? (lastMsg.sender_id === userId ? 'You: ' : '') + lastPreview : 'No messages yet'}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )

  // ---- CHAT PANEL ----
  const chatPanel = selectedUser ? (
    <div
      className="flex-1 flex flex-col rounded-2xl border border-white/10 overflow-hidden"
      style={{ background: 'var(--chat-bg)', height: 'calc(100svh - 7rem)' }}
    >
      {/* Header */}
      <div
        className="px-3 py-3 flex items-center gap-3 shrink-0"
        style={{ background: 'var(--chat-header-bg)', borderBottom: '1px solid var(--chat-header-border)' }}
      >
        <button
          onClick={backToList}
          className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all shrink-0"
        >
          <ArrowLeft size={18} strokeWidth={2} />
        </button>
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
          style={{ background: 'linear-gradient(135deg, #60A5FA, #1D4ED8)' }}
        >
          {displayName(selectedUser)[0].toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="font-bold text-white text-sm truncate">{displayName(selectedUser)}</p>
          <p className="text-xs text-slate-500">{selectedUser.email}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3">
        {thread.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-3">
            <MessageSquare size={32} strokeWidth={1.25} />
            <p className="text-sm">No messages yet with {displayName(selectedUser)}</p>
          </div>
        )}
        {thread.map(m => {
          const isMine = m.sender_id === userId
          const isReplyMsg = m.content.startsWith('↩ ')
          let replyLine = ''
          let bodyContent = m.content
          if (isReplyMsg) {
            const parts = m.content.split('\n\n')
            replyLine = parts[0]
            bodyContent = parts.slice(1).join('\n\n')
          }
          return (
            <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex items-end gap-1.5 max-w-[82%] ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                {/* Action buttons — always visible */}
                <div className={`flex flex-col gap-1 ${isMine ? 'items-end' : 'items-start'}`}>
                  <button
                    onClick={() => setReplyTo(m)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-white/5 transition-all"
                    title="Reply"
                  >
                    <CornerUpLeft size={13} strokeWidth={2} />
                  </button>
                  <button
                    onClick={() => deleteMessage(m.id)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-white/5 transition-all"
                    title="Delete"
                  >
                    <Trash2 size={13} strokeWidth={2} />
                  </button>
                </div>

                <div className="flex flex-col">
                  {isReplyMsg && (
                    <div
                      className={`mb-1 px-3 py-1.5 rounded-lg text-[11px] max-w-full truncate ${isMine ? 'self-end' : 'self-start'}`}
                      style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', color: '#93C5FD' }}
                    >
                      {replyLine}
                    </div>
                  )}
                  {m.problem && (
                    <div
                      className={`mb-1 px-3 py-1.5 rounded-lg text-[11px] max-w-full truncate ${isMine ? 'self-end' : 'self-start'}`}
                      style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', color: '#93C5FD' }}
                    >
                      Re: {(m.problem as any).title ?? (m.problem as any).question?.slice(0, 40)}…
                    </div>
                  )}
                  <div
                    className="px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap break-words"
                    style={isMine
                      ? { background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)', color: 'white' }
                      : { background: 'var(--bubble-other-bg)', border: '1px solid var(--bubble-other-border)', color: 'var(--bubble-other-color)' }}
                  >
                    {bodyContent}
                  </div>
                  <p className={`text-[10px] text-slate-600 mt-0.5 px-1 ${isMine ? 'text-right' : 'text-left'}`}>
                    {new Date(m.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Reply preview */}
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
      <div className="px-3 py-3 shrink-0" style={{ borderTop: '1px solid var(--divider-color)' }}>
        <div className="flex gap-2 items-end">
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
            placeholder="Type a reply…"
            rows={3}
            className="flex-1 px-4 py-3 rounded-xl text-sm text-slate-200 focus:outline-none transition-all resize-none min-h-[80px]"
            style={{ background: 'var(--input-textarea-bg)', border: '1px solid var(--input-textarea-border)', color: 'var(--input-color)' }}
            onFocus={e => (e.target.style.borderColor = 'rgba(59,130,246,0.6)')}
            onBlur={e => (e.target.style.borderColor = 'var(--input-textarea-border)')}
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
  ) : (
    <div className="c-card hidden md:flex flex-1 items-center justify-center text-slate-500 rounded-2xl">
      <p className="text-sm">Select a user to view messages</p>
    </div>
  )

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white to-blue-300 bg-clip-text text-transparent">Messages</h1>
        <p className="text-slate-400 mt-2 text-lg">Conversations with users</p>
      </div>

      {sidebarUsers.length === 0 ? (
        <div className="c-card rounded-2xl p-14 text-center text-slate-500">
          No conversations yet.
        </div>
      ) : (
        <>
          {/* Mobile: one panel at a time */}
          <div className="md:hidden">
            {view === 'list' ? listPanel : chatPanel}
          </div>
          {/* Desktop: side by side */}
          <div className="hidden md:flex gap-6" style={{ height: '70vh' }}>
            {listPanel}
            {chatPanel}
          </div>
        </>
      )}
    </div>
  )
}
