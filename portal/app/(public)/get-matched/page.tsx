'use client'
import dynamic from 'next/dynamic'

const QuizForm = dynamic(() => import('./QuizForm'), { ssr: false })

export default function GetMatchedPage() {
  return <QuizForm />
}
