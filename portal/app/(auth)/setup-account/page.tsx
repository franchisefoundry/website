'use client'

import dynamic from 'next/dynamic'

const SetupAccountForm = dynamic(() => import('./SetupAccountForm'), { ssr: false })

export default function SetupAccountPage() {
  return <SetupAccountForm />
}
