"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { 
  User, 
  Settings, 
  Wallet, 
  PieChart, 
  Bell,
  LogOut,
  Shield
} from 'lucide-react'

export function UserMenu() {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)

  if (!user) return null

  const handleSignOut = async () => {
    try {
      setSigningOut(true)
      await signOut()
      toast.success('Signed out successfully')
      router.push('/')
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign out')
    } finally {
      setSigningOut(false)
    }
  }

  const getInitials = (email: string) => {
    return email.charAt(0).toUpperCase()
  }

  const getDisplayName = () => {
    if (user.user_metadata?.display_name) {
      return user.user_metadata.display_name
    }
    if (user.user_metadata?.full_name) {
      return user.user_metadata.full_name
    }
    return user.email?.split('@')[0] || 'User'
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage 
              src={user.user_metadata?.avatar_url || user.user_metadata?.picture} 
              alt={getDisplayName()} 
            />
            <AvatarFallback>
              {getInitials(user.email || 'U')}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {getDisplayName()}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={() => router.push('/profile')}
          className="cursor-pointer"
        >
          <User className="mr-2 h-4 w-4" />
          <span>Profile</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          onClick={() => router.push('/portfolio')}
          className="cursor-pointer"
        >
          <PieChart className="mr-2 h-4 w-4" />
          <span>Portfolio</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          onClick={() => router.push('/wallets')}
          className="cursor-pointer"
        >
          <Wallet className="mr-2 h-4 w-4" />
          <span>Connected Wallets</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          onClick={() => router.push('/notifications')}
          className="cursor-pointer"
        >
          <Bell className="mr-2 h-4 w-4" />
          <span>Notifications</span>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={() => router.push('/settings')}
          className="cursor-pointer"
        >
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          onClick={() => router.push('/security')}
          className="cursor-pointer"
        >
          <Shield className="mr-2 h-4 w-4" />
          <span>Security</span>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={handleSignOut}
          className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
          disabled={signingOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>{signingOut ? 'Signing out...' : 'Sign out'}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
