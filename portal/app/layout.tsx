import type { Metadata, Viewport } from 'next'
import { Sora } from 'next/font/google'
import './globals.css'
import { DevRoleSwitcher } from '@/components/dev/DevRoleSwitcher'
import { ToastContainer } from '@/components/ui/ToastContainer'
import CookieNotice from '@/components/cookie-notice'
import { RegisterSW } from '@/components/pwa/RegisterSW'
import { InstallPrompt } from '@/components/pwa/InstallPrompt'

const sora = Sora({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sora',
})

export const metadata: Metadata = {
  title: 'Franchise Foundry Portal',
  description: 'Your Franchise Foundry partner portal',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Franchise Foundry',
  },
  icons: {
    apple: '/icon-192.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#3a4a3a',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sora.className} ${sora.variable}`}>
      <body>
        {children}
        <ToastContainer />
        <CookieNotice />
        <RegisterSW />
        <InstallPrompt />
        {process.env.NODE_ENV === 'development' && <DevRoleSwitcher />}
      </body>
    </html>
  )
}
