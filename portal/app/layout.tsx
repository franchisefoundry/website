import type { Metadata } from 'next'
import { Sora } from 'next/font/google'
import './globals.css'

const sora = Sora({
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Franchise Foundry Portal',
  description: 'Your Franchise Foundry partner portal',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={sora.className}>
      <body>{children}</body>
    </html>
  )
}
