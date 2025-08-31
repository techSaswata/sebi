import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// GET - Fetch user profile with wallets
export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies()
    console.log('🍪 Available cookies:', cookieStore.getAll().map(c => c.name))
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet: any[]) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          }
        }
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get or create user profile
    let { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    // If no profile exists, create one
    if (profileError && profileError.code === 'PGRST116') {
      const displayName = user.user_metadata?.display_name || 
                         user.user_metadata?.full_name || 
                         user.email?.split('@')[0] || 
                         'User'

      const { data: newProfile, error: createError } = await supabase
        .from('user_profiles')
        .insert({
          user_id: user.id,
          display_name: displayName,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (createError) {
        console.error('Error creating profile:', createError)
        return NextResponse.json(
          { success: false, error: 'Failed to create profile' },
          { status: 500 }
        )
      }

      profile = newProfile
    } else if (profileError) {
      console.error('Error fetching profile:', profileError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch profile' },
        { status: 500 }
      )
    }

    // Get user's wallets
    const { data: wallets, error: walletsError } = await supabase
      .from('user_wallets')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (walletsError) {
      console.error('Error fetching wallets:', walletsError)
    }

    // Combine profile with wallets
    const profileWithWallets = {
      ...profile,
      wallets: wallets || []
    }

    if (profileError) {
      console.error('Error fetching profile:', profileError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch profile' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      profile: profileWithWallets
    })

  } catch (error) {
    console.error('Profile fetch error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT - Update user profile
export async function PUT(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const updates = await request.json()
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            cookieStore.set(name, value, options)
          },
          remove(name: string, options: any) {
            cookieStore.set(name, '', { ...options, maxAge: 0 })
          },
        },
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Update profile
    const { data: updatedProfile, error } = await supabase
      .from('user_profiles')
      .update({
        display_name: updates.display_name,
        bio: updates.bio,
        location: updates.location,
        website: updates.website,
        investment_experience: updates.investment_experience,
        risk_tolerance: updates.risk_tolerance,
        preferred_investment_amount: updates.preferred_investment_amount,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating profile:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to update profile' },
        { status: 500 }
      )
    }

    // Get updated profile with wallets  
    const { data: wallets } = await supabase
      .from('user_wallets')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    const fullProfile = {
      ...updatedProfile,
      wallets: wallets || []
    }

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      profile: fullProfile
    })

  } catch (error) {
    console.error('Profile update error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create user profile
export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies()
    
    // Create Supabase client with user session
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            cookieStore.set(name, value, options)
          },
          remove(name: string, options: any) {
            cookieStore.set(name, '', { ...options, maxAge: 0 })
          },
        },
      }
    )

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check if profile already exists
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (existingProfile) {
      return NextResponse.json({
        success: true,
        message: 'Profile already exists',
        profile: existingProfile
      })
    }

    // Extract display name from user metadata or email
    const displayName = user.user_metadata?.display_name || 
                       user.user_metadata?.full_name || 
                       user.email?.split('@')[0] || 
                       'User'

    // Create new profile with authenticated session context
    const { data: newProfile, error } = await supabase
      .from('user_profiles')
      .insert({
        user_id: user.id,
        display_name: displayName
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating user profile:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to create profile', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Profile created successfully',
      profile: newProfile
    })

  } catch (error) {
    console.error('Profile creation error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
