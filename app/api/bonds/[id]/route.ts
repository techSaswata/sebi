import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const bondId = params.id

    if (!bondId) {
      return NextResponse.json(
        { success: false, error: 'Bond ID is required' },
        { status: 400 }
      )
    }

    // Get bond data
    const { getSupabase } = await import('@/lib/database')
    const supabase = getSupabase()
    
    const { data: bondData, error: bondError } = await supabase
      .from('bonds')
      .select('*')
      .eq('id', parseInt(bondId))
      .single()
    
    if (bondError) {
      console.error('Bond query error:', bondError)
      return NextResponse.json(
        { success: false, error: `Bond not found: ${bondError.message}` },
        { status: 404 }
      )
    }
    
    if (!bondData) {
      return NextResponse.json(
        { success: false, error: 'Bond not found' },
        { status: 404 }
      )
    }
    
    const bond = bondData

    // Get market data for this bond
    const { data: marketData, error: marketError } = await supabase
      .from('markets')
      .select('*')
      .eq('bond_id', (bond as any).id)
      .single()
    
    // Get recent price history
    const { data: priceHistoryData, error: priceHistoryError } = await supabase
      .from('price_history')
      .select('price_scaled, created_at')
      .eq('market_id', (marketData as any)?.id || 0)
      .order('created_at', { ascending: false })
      .limit(30)
    
    // Get recent trades
    const { data: tradesData, error: tradesError } = await supabase
      .from('trades')
      .select('side, amount, price_scaled, total_value, created_at, user_wallet')
      .eq('market_id', (marketData as any)?.id || 0)
      .eq('status', 'confirmed')
      .order('created_at', { ascending: false })
      .limit(10)

    return NextResponse.json({
      success: true,
      bond: {
        ...(bond as any),
        ...(marketData as any),
        current_price: (marketData as any)?.current_price_scaled ? (marketData as any).current_price_scaled / 1000000 : 0,
        total_supply: (marketData as any)?.total_supply_scaled ? (marketData as any).total_supply_scaled / 1000000 : 0,
        available_supply: (marketData as any)?.available_supply_scaled ? (marketData as any).available_supply_scaled / 1000000 : 0,
        price_history: (priceHistoryData || []).map((p: any) => ({
          price: p.price_scaled / 1000000,
          timestamp: p.created_at
        })),
        recent_trades: (tradesData || []).map((t: any) => ({
          ...t,
          price: t.price_scaled / 1000000,
          amount: t.amount / 1000000,
          total_value: t.total_value / 1000000,
          user_wallet: t.user_wallet.slice(0, 8) + '...' + t.user_wallet.slice(-8)
        }))
      }
    })

  } catch (error) {
    console.error('Error fetching bond details:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}