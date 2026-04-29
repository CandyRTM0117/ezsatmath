'use client'

import Sidebar from './Sidebar'

interface AppShellProps {
  role: 'admin' | 'student'
  userName: string
  children: React.ReactNode
}

export default function AppShell({ role, userName, children }: AppShellProps) {
  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar role={role} userName={userName} />

      {/*
        pt-16 on mobile so content clears the fixed hamburger button (top-4 + h-10 = ~56px).
        md:pt-0 resets once the sidebar is in-flow and there's no fixed button.
      */}
      <main className="flex-1 overflow-y-auto bg-slate-50 px-4 pt-16 pb-4 md:p-6 lg:p-10">
        {children}
      </main>
    </div>
  )
}
