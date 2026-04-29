'use client'

import { useState } from 'react'
import Sidebar from './Sidebar'

interface AppShellProps {
  role: 'admin' | 'student'
  userName: string
  children: React.ReactNode
}

export default function AppShell({ role, userName, children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar
        role={role}
        userName={userName}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile topbar */}
        <div className="md:hidden flex items-center gap-3 px-4 shrink-0 border-b border-slate-200 bg-white" style={{ height: '56px' }}>
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-600"
            aria-label="Open menu"
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M3 6h18M3 12h18M3 18h18"/>
            </svg>
          </button>
          <span className="font-extrabold text-slate-900 tracking-tight">
            Ez<span className="text-blue-600">SAT</span>
          </span>
        </div>

        <main className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-6 lg:p-10">
          {children}
        </main>
      </div>
    </div>
  )
}
