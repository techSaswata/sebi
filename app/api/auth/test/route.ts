import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: NextRequest) {
  try {
    // Test if our tables exist and are accessible
    const tests = {
      user_profiles: false,
      user_wallets: false,
      user_notifications: false,
      user_activity_log: false,
      view_accessible: false
    }

    // Test user_profiles table
    try {
      const { error } = await supabase.from('user_profiles').select('id').limit(1)
      tests.user_profiles = !error
    } catch (e) {
      console.log('user_profiles test failed:', e)
    }

    // Test user_wallets table
    try {
      const { error } = await supabase.from('user_wallets').select('id').limit(1)
      tests.user_wallets = !error
    } catch (e) {
      console.log('user_wallets test failed:', e)
    }

    // Test user_notifications table
    try {
      const { error } = await supabase.from('user_notifications').select('id').limit(1)
      tests.user_notifications = !error
    } catch (e) {
      console.log('user_notifications test failed:', e)
    }

    // Test user_activity_log table
    try {
      const { error } = await supabase.from('user_activity_log').select('id').limit(1)
      tests.user_activity_log = !error
    } catch (e) {
      console.log('user_activity_log test failed:', e)
    }

    // Test view
    try {
      const { error } = await supabase.from('user_profiles_with_wallets').select('id').limit(1)
      tests.view_accessible = !error
    } catch (e) {
      console.log('view test failed:', e)
    }

    const allTestsPassed = Object.values(tests).every(test => test === true)

    return NextResponse.json({
      success: true,
      message: allTestsPassed ? 'All auth tables are working!' : 'Some tables may need setup',
      tests,
      database_url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Connected' : 'Not configured',
      environment: 'ready'
    })

  } catch (error) {
    console.error('Auth test error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Auth test failed',
        details: (error as Error).message 
      },
      { status: 500 }
    )
  }
}
