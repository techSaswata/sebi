"use client"

import { useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { AuthModal } from './auth-modal'
import { UserMenu } from './user-menu'
import { Skeleton } from '@/components/ui/skeleton'

export function AuthButtons() {
  const { user, loading } = useAuth()
  const [showAuthModal, setShowAuthModal] = useState(false)

  if (loading) {
    return <Skeleton className="h-8 w-20" />
  }

  if (user) {
    return <UserMenu />
  }

  return (
    <>
      <Button 
        onClick={() => setShowAuthModal(true)}
        variant="default"
        size="sm"
        className="rounded-full"
      >
        Sign In
      </Button>
      
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />
    </>
  )
}
