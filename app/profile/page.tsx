"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { useWallet } from "@solana/wallet-adapter-react"
import { Header } from "@/components/app-shell/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { 
  User, 
  Wallet, 
  MapPin, 
  Globe, 
  Briefcase, 
  TrendingUp,
  DollarSign,
  Shield,
  Clock,
  Edit,
  Save,
  X,
  Copy,
  ExternalLink,
  Trash2
} from "lucide-react"

interface UserProfile {
  id: string
  user_id: string
  display_name: string
  bio: string
  location: string
  website: string
  investment_experience: 'beginner' | 'intermediate' | 'advanced' | 'professional'
  risk_tolerance: 'conservative' | 'moderate' | 'aggressive'
  preferred_investment_amount: number
  kyc_status: 'not_started' | 'pending' | 'approved' | 'rejected'
  settings: any
  created_at: string
  updated_at: string
  wallets: UserWallet[]
}

interface UserWallet {
  id: string
  wallet_address: string
  wallet_type: string
  nickname: string
  is_primary: boolean
  verified: boolean
  last_used_at: string
  created_at: string
}

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth()
  const { publicKey, connected } = useWallet()
  const router = useRouter()
  
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<Partial<UserProfile>>({})

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/')
      return
    }
    
    if (user) {
      fetchProfile()
    }
  }, [user, authLoading, router])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/auth/profile', {
        method: 'GET',
        credentials: 'include'
      })
      
      const result = await response.json()
      
      if (result.success) {
        setProfile(result.profile)
        setFormData(result.profile)
      } else {
        toast.error('Failed to load profile')
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
      toast.error('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData)
      })
      
      const result = await response.json()
      
      if (result.success) {
        setProfile(result.profile)
        setEditing(false)
        toast.success('Profile updated successfully')
      } else {
        toast.error(result.error || 'Failed to update profile')
      }
    } catch (error) {
      console.error('Error updating profile:', error)
      toast.error('Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const copyWalletAddress = (address: string) => {
    navigator.clipboard.writeText(address)
    toast.success('Wallet address copied to clipboard')
  }

  const openInExplorer = (address: string) => {
    const url = `https://explorer.solana.com/address/${address}?cluster=devnet`
    window.open(url, '_blank')
  }

  const unlinkWallet = async (walletAddress: string) => {
    try {
      const response = await fetch('/api/wallets/link', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ walletAddress })
      })
      
      const result = await response.json()
      
      if (result.success) {
        toast.success('Wallet unlinked successfully')
        fetchProfile() // Refresh profile data
      } else {
        toast.error(result.error || 'Failed to unlink wallet')
      }
    } catch (error) {
      console.error('Error unlinking wallet:', error)
      toast.error('Failed to unlink wallet')
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[100dvh] flex-col">
        <Header />
        <main className="flex-1 bg-gradient-to-br from-background via-background to-muted/20">
          <div className="container px-4 py-8 space-y-8">
            <div className="space-y-4">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-96" />
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <Skeleton className="h-96" />
              <Skeleton className="h-96" />
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n.charAt(0)).join('').toUpperCase() || 'U'
  }

  const getKycStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <Header />
      <main className="flex-1 bg-gradient-to-br from-background via-background to-muted/20">
        <div className="container px-4 py-8 space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
              <p className="text-muted-foreground">
                Manage your account information and connected wallets
              </p>
            </div>
            
            {!editing && (
              <Button onClick={() => setEditing(true)} variant="outline">
                <Edit className="mr-2 h-4 w-4" />
                Edit Profile
              </Button>
            )}
            
            {editing && (
              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={saving}>
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? 'Saving...' : 'Save'}
                </Button>
                <Button 
                  onClick={() => {
                    setEditing(false)
                    setFormData(profile || {})
                  }} 
                  variant="outline"
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
              </div>
            )}
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Profile Information */}
            <div className="lg:col-span-2 space-y-6">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Basic Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-20 w-20">
                      <AvatarImage 
                        src={user.user_metadata?.avatar_url || user.user_metadata?.picture} 
                        alt={profile?.display_name || 'User'} 
                      />
                      <AvatarFallback className="text-lg">
                        {getInitials(profile?.display_name || user.email || 'User')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                      <h3 className="text-xl font-semibold">
                        {profile?.display_name || user.email?.split('@')[0]}
                      </h3>
                      <p className="text-muted-foreground">{user.email}</p>
                      <Badge className={getKycStatusColor(profile?.kyc_status || 'not_started')}>
                        <Shield className="mr-1 h-3 w-3" />
                        KYC: {profile?.kyc_status?.replace('_', ' ').toUpperCase() || 'NOT STARTED'}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="display_name">Display Name</Label>
                      {editing ? (
                        <Input
                          id="display_name"
                          value={formData.display_name || ''}
                          onChange={(e) => setFormData({...formData, display_name: e.target.value})}
                          placeholder="Your display name"
                        />
                      ) : (
                        <p className="text-sm py-2">{profile?.display_name || 'Not set'}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="location">Location</Label>
                      {editing ? (
                        <Input
                          id="location"
                          value={formData.location || ''}
                          onChange={(e) => setFormData({...formData, location: e.target.value})}
                          placeholder="Your location"
                        />
                      ) : (
                        <p className="text-sm py-2 flex items-center gap-1">
                          {profile?.location ? (
                            <>
                              <MapPin className="h-3 w-3" />
                              {profile.location}
                            </>
                          ) : (
                            'Not set'
                          )}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="website">Website</Label>
                      {editing ? (
                        <Input
                          id="website"
                          value={formData.website || ''}
                          onChange={(e) => setFormData({...formData, website: e.target.value})}
                          placeholder="Your website URL"
                        />
                      ) : (
                        <p className="text-sm py-2">
                          {profile?.website ? (
                            <a 
                              href={profile.website} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-blue-600 hover:underline"
                            >
                              <Globe className="h-3 w-3" />
                              {profile.website}
                            </a>
                          ) : (
                            'Not set'
                          )}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="preferred_investment_amount">Preferred Investment Amount ($)</Label>
                      {editing ? (
                        <Input
                          id="preferred_investment_amount"
                          type="number"
                          value={formData.preferred_investment_amount || ''}
                          onChange={(e) => setFormData({...formData, preferred_investment_amount: Number(e.target.value)})}
                          placeholder="Amount in USD"
                        />
                      ) : (
                        <p className="text-sm py-2 flex items-center gap-1">
                          {profile?.preferred_investment_amount ? (
                            <>
                              <DollarSign className="h-3 w-3" />
                              {profile.preferred_investment_amount.toLocaleString()}
                            </>
                          ) : (
                            'Not set'
                          )}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    {editing ? (
                      <Textarea
                        id="bio"
                        value={formData.bio || ''}
                        onChange={(e) => setFormData({...formData, bio: e.target.value})}
                        placeholder="Tell us about yourself"
                        rows={3}
                      />
                    ) : (
                      <p className="text-sm py-2">{profile?.bio || 'No bio provided'}</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Investment Preferences */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Investment Preferences
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="investment_experience">Investment Experience</Label>
                      {editing ? (
                        <Select 
                          value={formData.investment_experience || ''} 
                          onValueChange={(value) => setFormData({...formData, investment_experience: value as any})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select experience level" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="beginner">Beginner</SelectItem>
                            <SelectItem value="intermediate">Intermediate</SelectItem>
                            <SelectItem value="advanced">Advanced</SelectItem>
                            <SelectItem value="professional">Professional</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="text-sm py-2 flex items-center gap-1">
                          <Briefcase className="h-3 w-3" />
                          {profile?.investment_experience ? (profile.investment_experience.charAt(0).toUpperCase() + profile.investment_experience.slice(1)) : 'Not set'}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="risk_tolerance">Risk Tolerance</Label>
                      {editing ? (
                        <Select 
                          value={formData.risk_tolerance || ''} 
                          onValueChange={(value) => setFormData({...formData, risk_tolerance: value as any})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select risk tolerance" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="conservative">Conservative</SelectItem>
                            <SelectItem value="moderate">Moderate</SelectItem>
                            <SelectItem value="aggressive">Aggressive</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="text-sm py-2 flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          {profile?.risk_tolerance ? (profile.risk_tolerance.charAt(0).toUpperCase() + profile.risk_tolerance.slice(1)) : 'Not set'}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Connected Wallets */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="h-5 w-5" />
                    Connected Wallets
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {profile?.wallets && profile.wallets.length > 0 ? (
                    <div className="space-y-4">
                      {profile.wallets.map((wallet) => (
                        <div key={wallet.id} className="border rounded-lg p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                                <Wallet className="h-4 w-4 text-purple-600" />
                              </div>
                              <div>
                                <p className="font-medium">{wallet.nickname}</p>
                                <p className="text-xs text-muted-foreground">
                                  {wallet.wallet_type.charAt(0).toUpperCase() + wallet.wallet_type.slice(1)}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              {wallet.is_primary && (
                                <Badge variant="secondary" className="text-xs">Primary</Badge>
                              )}
                              {wallet.verified && (
                                <Badge variant="default" className="text-xs bg-green-100 text-green-800">
                                  <Shield className="mr-1 h-2 w-2" />
                                  Verified
                                </Badge>
                              )}
                            </div>
                          </div>
                          
                          <div className="text-xs text-muted-foreground font-mono bg-muted p-2 rounded">
                            {wallet.wallet_address.slice(0, 8)}...{wallet.wallet_address.slice(-8)}
                          </div>
                          
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Last used: {new Date(wallet.last_used_at).toLocaleDateString()}
                            </div>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => copyWalletAddress(wallet.wallet_address)}
                                className="h-6 w-6 p-0"
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openInExplorer(wallet.wallet_address)}
                                className="h-6 w-6 p-0"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => unlinkWallet(wallet.wallet_address)}
                                className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Wallet className="mx-auto h-12 w-12 mb-4 opacity-50" />
                      <p className="text-sm mb-2">No wallets connected</p>
                      <p className="text-xs">Connect a wallet to start trading</p>
                    </div>
                  )}
                  
                  {connected && publicKey && (
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800 mb-2">
                        <strong>Currently Connected:</strong>
                      </p>
                      <p className="text-xs font-mono text-blue-700">
                        {publicKey.toBase58().slice(0, 8)}...{publicKey.toBase58().slice(-8)}
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        This wallet will be automatically linked to your account
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Account Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Account Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm">
                    <p className="text-muted-foreground">Account ID</p>
                    <p className="font-mono text-xs">{user.id}</p>
                  </div>
                  <div className="text-sm">
                    <p className="text-muted-foreground">Member Since</p>
                    <p>{new Date(user.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="text-sm">
                    <p className="text-muted-foreground">Last Profile Update</p>
                    <p>{profile?.updated_at ? new Date(profile.updated_at).toLocaleDateString() : 'Never'}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
