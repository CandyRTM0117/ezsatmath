import type { Metadata } from 'next'
import './globals.css'
import ThemeProvider from '@/components/ui/ThemeProvider'
import LanguageProvider from '@/components/ui/LanguageProvider'

export const metadata: Metadata = {
  title: 'EzSAT',
  description: 'SAT prep platform',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full w-full">
      <body className="h-full w-full">
        <ThemeProvider><LanguageProvider>{children}</LanguageProvider></ThemeProvider>
      </body>
    </html>
  )
}
