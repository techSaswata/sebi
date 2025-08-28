import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { walletAddress, walletType, nickname } = await request.json()

    if (!walletAddress || !walletType) {
      return NextResponse.json(
        { success: false, error: 'Wallet address and type are required' },
        { status: 400 }
      )
    }

    // Get user from session
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // For now, we'll use the supabase client with RLS
    // In production, you'd want to verify the JWT token properly
    
    // Check if wallet is already linked to any user
    const { data: existingWallet } = await supabase
      .from('user_wallets')
      .select('id, user_id')
      .eq('wallet_address', walletAddress)
      .single()

    if (existingWallet) {
      return NextResponse.json(
        { success: false, error: 'Wallet is already linked to an account' },
        { status: 409 }
      )
    }

    // Get current user session
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'User not authenticated' },
        { status: 401 }
      )
    }

    // Check if this user already has this wallet
    const { data: userWallet } = await supabase
      .from('user_wallets')
      .select('id')
      .eq('user_id', user.id)
      .eq('wallet_address', walletAddress)
      .single()

    if (userWallet) {
      return NextResponse.json({
        success: true,
        message: 'Wallet already linked to your account',
        wallet: userWallet
      })
    }

    // Count existing wallets to determine if this should be primary
    const { count: walletCount } = await supabase
      .from('user_wallets')
      .select('id', { count: 'exact' })
      .eq('user_id', user.id)

    const isPrimary = (walletCount || 0) === 0

    // Link wallet to user account
    const { data: newWallet, error: linkError } = await supabase
      .from('user_wallets')
      .insert({
        user_id: user.id,
        wallet_address: walletAddress,
        wallet_type: walletType,
        nickname: nickname || `${walletType} Wallet`,
        is_primary: isPrimary,
        verified: true, // Auto-verify since user connected it
        last_used_at: new Date().toISOString()
      })
      .select()
      .single()

    if (linkError) {
      console.error('Error linking wallet:', linkError)
      return NextResponse.json(
        { success: false, error: 'Failed to link wallet to account' },
        { status: 500 }
      )
    }

    // Log the activity
    await supabase
      .from('user_activity_log')
      .insert({
        user_id: user.id,
        wallet_address: walletAddress,
        activity_type: 'wallet_linked',
        description: `Linked ${walletType} wallet`,
        metadata: {
          wallet_type: walletType,
          is_primary: isPrimary
        }
      })

    return NextResponse.json({
      success: true,
      message: 'Wallet linked successfully',
      wallet: newWallet,
      isPrimary
    })

  } catch (error) {
    console.error('Wallet linking error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get current user session
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'User not authenticated' },
        { status: 401 }
      )
    }

    // Get user's linked wallets
    const { data: wallets, error } = await supabase
      .from('user_wallets')
      .select('*')
      .eq('user_id', user.id)
      .order('is_primary', { ascending: false })
      .order('last_used_at', { ascending: false })

    if (error) {
      console.error('Error fetching wallets:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch wallets' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      wallets: wallets || []
    })

  } catch (error) {
    console.error('Error fetching wallets:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { walletAddress } = await request.json()

    if (!walletAddress) {
      return NextResponse.json(
        { success: false, error: 'Wallet address is required' },
        { status: 400 }
      )
    }

    // Get current user session
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'User not authenticated' },
        { status: 401 }
      )
    }

    // Remove wallet link
    const { error: deleteError } = await supabase
      .from('user_wallets')
      .delete()
      .eq('user_id', user.id)
      .eq('wallet_address', walletAddress)

    if (deleteError) {
      console.error('Error unlinking wallet:', deleteError)
      return NextResponse.json(
        { success: false, error: 'Failed to unlink wallet' },
        { status: 500 }
      )
    }

    // Log the activity
    await supabase
      .from('user_activity_log')
      .insert({
        user_id: user.id,
        wallet_address: walletAddress,
        activity_type: 'wallet_unlinked',
        description: 'Unlinked wallet from account',
        metadata: { wallet_address: walletAddress }
      })

    return NextResponse.json({
      success: true,
      message: 'Wallet unlinked successfully'
    })

  } catch (error) {
    console.error('Wallet unlinking error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
