"use client"

import { useState, useEffect } from "react"
import { User } from "@supabase/supabase-js"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Calendar, MapPin, Globe, Edit, Sparkles } from "lucide-react"

interface UserWelcomeProps {
  user: User
}

export function UserWelcome({ user }: UserWelcomeProps) {
  const [timeOfDay, setTimeOfDay] = useState("")
  
  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 12) setTimeOfDay("morning")
    else if (hour < 17) setTimeOfDay("afternoon")
    else setTimeOfDay("evening")
  }, [])

  const getDisplayName = () => {
    if (user.user_metadata?.display_name) {
      return user.user_metadata.display_name
    }
    if (user.user_metadata?.full_name) {
      return user.user_metadata.full_name
    }
    return user.email?.split('@')[0] || 'Investor'
  }

  const getInitials = () => {
    const name = getDisplayName()
    return name.split(' ').map(n => n[0]).join('').toUpperCase()
  }

  const joinDate = new Date(user.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long'
  })

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="relative overflow-hidden border-0 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4">
              <Avatar className="h-16 w-16 ring-2 ring-primary/20">
                <AvatarImage 
                  src={user.user_metadata?.avatar_url || user.user_metadata?.picture} 
                  alt={getDisplayName()} 
                />
                <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              
              <div className="space-y-2">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">
                    Good {timeOfDay}, {getDisplayName()}! 
                    <Sparkles className="ml-2 h-5 w-5 inline text-primary" />
                  </h1>
                  <p className="text-muted-foreground">
                    Welcome to your NyayChain portfolio dashboard
                  </p>
                </div>
                
                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-4 w-4" />
                    <span>Member since {joinDate}</span>
                  </div>
                  {user.user_metadata?.location && (
                    <div className="flex items-center space-x-1">
                      <MapPin className="h-4 w-4" />
                      <span>{user.user_metadata.location}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary" className="text-xs">
                    {user.email_confirmed_at ? "Verified" : "Unverified"}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    Retail Investor
                  </Badge>
                </div>
              </div>
            </div>
            
            <Button variant="outline" size="sm" className="shrink-0">
              <Edit className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
          </div>
        </CardContent>
        
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/20 to-transparent rounded-full blur-2xl" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-secondary/20 to-transparent rounded-full blur-xl" />
      </Card>
    </motion.div>
  )
}
