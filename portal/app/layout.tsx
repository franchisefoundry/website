import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Franchise Foundry Portal',
  description: 'Your Franchise Foundry partner portal',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
