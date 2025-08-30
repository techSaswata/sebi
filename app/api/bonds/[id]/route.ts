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

    // Get bond details from database
    const bondQuery = `
      SELECT 
        b.*,
        m.market_id,
        m.current_price_scaled,
        m.total_supply_scaled,
        m.available_supply_scaled,
        m.last_trade_at,
        m.volume_24h,
        m.price_change_24h
      FROM bonds b
      LEFT JOIN markets m ON b.id = m.bond_id
      WHERE b.id = $1
    `

    const bonds = await query(bondQuery, [bondId])

    if (bonds.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Bond not found' },
        { status: 404 }
      )
    }

    const bond = bonds.rows[0]

    // Get recent price history
    const priceHistoryQuery = `
      SELECT price_scaled, created_at
      FROM price_history
      WHERE market_id = $1
      ORDER BY created_at DESC
      LIMIT 30
    `

    const priceHistory = await query(priceHistoryQuery, [(bond as any).market_id])

    // Get recent trades
    const tradesQuery = `
      SELECT 
        t.side,
        t.amount,
        t.price_scaled,
        t.total_value,
        t.created_at,
        t.user_wallet
      FROM trades t
      WHERE t.market_id = $1
      AND t.status = 'confirmed'
      ORDER BY t.created_at DESC
      LIMIT 10
    `

    const recentTrades = await query(tradesQuery, [(bond as any).market_id])

    return NextResponse.json({
      success: true,
      bond: {
        ...(bond as any),
        current_price: (bond as any).current_price_scaled ? (bond as any).current_price_scaled / 1000000 : 0,
        total_supply: (bond as any).total_supply_scaled ? (bond as any).total_supply_scaled / 1000000 : 0,
        available_supply: (bond as any).available_supply_scaled ? (bond as any).available_supply_scaled / 1000000 : 0,
        price_history: priceHistory.rows.map((p: any) => ({
          price: p.price_scaled / 1000000,
          timestamp: p.created_at
        })),
        recent_trades: recentTrades.rows.map((t: any) => ({
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