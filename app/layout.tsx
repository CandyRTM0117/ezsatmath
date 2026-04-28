import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'EzSAT',
  description: 'SAT prep platform',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full w-full">
      <body className="h-full w-full overflow-hidden">{children}</body>
    </html>
  )
}
