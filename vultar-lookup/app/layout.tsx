import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'clanner catch | Cheater Lookup',
  description: 'clanner catch — Discord cheater lookup database',
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&family=Barlow+Condensed:ital,wght@0,400;0,600;0,700;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-void text-bright antialiased min-h-screen">
        <div className="noise-overlay" />
        {children}
      </body>
    </html>
  )
}
