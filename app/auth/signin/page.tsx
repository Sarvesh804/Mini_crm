'use client'

import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { SignInForm } from '@/components/signInForm'
import { Toaster } from '@/components/ui/sonner'
import { useSession } from 'next-auth/react'

export default function SignInPage() {
  const {data:session} = useSession()

  if (session) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      <div className="relative z-10 w-full max-w-md">
        <Suspense fallback={<div>Loading...</div>}>
          <SignInForm />
        </Suspense>
      </div>
      <Toaster />
    </div>
  )
}