import { NextRequest, NextResponse } from 'next/server';
import { query, getCache, setCache } from '@/lib/database';
import { ApiResponse } from '@/types/api';

// GET /api/portfolio/[wallet] - Get user portfolio
export async function GET(
  request: NextRequest,
  { params }: { params: { wallet: string } }
) {
  try {
    const walletAddress = params.wallet;

    if (!walletAddress || walletAddress.length < 32) {
      return NextResponse.json(
        { success: false, error: 'Invalid wallet address' } as ApiResponse,
        { status: 400 }
      );
    }

    // Check cache first
    const cacheKey = `portfolio:${walletAddress}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      return NextResponse.json({ success: true, data: cached } as ApiResponse);
    }

    // Get portfolio positions using the view
    const portfolioResult = await query(`
      SELECT 
        p.wallet_address,
        b.name as bond_name,
        b.issuer,
        b.coupon_rate,
        b.maturity_date,
        b.bond_mint,
        b.face_value,
        b.decimals,
        p.quantity_scaled,
        p.avg_price_scaled,
        p.total_cost,
        m.price_per_token_scaled as current_price,
        CASE 
          WHEN m.price_per_token_scaled IS NOT NULL 
          THEN (p.quantity_scaled::BIGINT * m.price_per_token_scaled::BIGINT / 1000000)
          ELSE 0 
        END as current_value,
        CASE 
          WHEN m.price_per_token_scaled IS NOT NULL 
          THEN ((p.quantity_scaled::BIGINT * m.price_per_token_scaled::BIGINT / 1000000) - p.total_cost)
          ELSE -p.total_cost 
        END as unrealized_pnl,
        b.status as bond_status,
        m.paused as market_paused
      FROM positions p
      JOIN bonds b ON p.bond_id = b.id
      LEFT JOIN markets m ON b.id = m.bond_id
      WHERE p.wallet_address = $1 AND p.quantity_scaled > 0
      ORDER BY p.updated_at DESC
    `, [walletAddress]);

    const positions = portfolioResult.rows;

    // Calculate portfolio summary
    let totalValue = 0;
    let totalCost = 0;
    let totalPnL = 0;

    positions.forEach((position: any) => {
      totalValue += position.current_value || 0;
      totalCost += position.total_cost || 0;
      totalPnL += position.unrealized_pnl || 0;
    });

    // Get recent trades for this wallet (last 10)
    const recentTrades = await query(`
      SELECT 
        t.id,
        t.tx_signature,
        t.side,
        t.amount,
        t.price_scaled,
        t.total_value,
        t.status,
        t.created_at,
        t.confirmed_at,
        b.name as bond_name,
        b.issuer
      FROM trades t
      JOIN markets m ON t.market_id = m.id
      JOIN bonds b ON m.bond_id = b.id
      WHERE t.user_wallet = $1
      ORDER BY t.created_at DESC
      LIMIT 10
    `, [walletAddress]);

    // Get pending trades
    const pendingTrades = await query(`
      SELECT 
        t.id,
        t.tx_signature,
        t.side,
        t.amount,
        t.price_scaled,
        t.total_value,
        t.created_at,
        b.name as bond_name,
        b.issuer
      FROM trades t
      JOIN markets m ON t.market_id = m.id
      JOIN bonds b ON m.bond_id = b.id
      WHERE t.user_wallet = $1 AND t.status = 'pending'
      ORDER BY t.created_at DESC
    `, [walletAddress]);

    // Get coupon earnings (if any)
    const couponEarnings = await query(`
      SELECT 
        c.id,
        c.payment_date,
        c.amount_per_token,
        c.status,
        c.paid_at,
        b.name as bond_name,
        b.issuer,
        (p.quantity_scaled * c.amount_per_token / 1000000) as earned_amount
      FROM coupons c
      JOIN bonds b ON c.bond_id = b.id
      JOIN positions p ON p.bond_id = b.id
      WHERE p.wallet_address = $1 
        AND c.status = 'paid'
        AND p.quantity_scaled > 0
      ORDER BY c.payment_date DESC
      LIMIT 20
    `, [walletAddress]);

    const portfolioData = {
      wallet_address: walletAddress,
      summary: {
        total_positions: positions.length,
        total_value: totalValue,
        total_cost: totalCost,
        total_pnl: totalPnL,
        pnl_percentage: totalCost > 0 ? ((totalPnL / totalCost) * 100) : 0
      },
      positions: positions,
      recent_trades: recentTrades.rows,
      pending_trades: pendingTrades.rows,
      coupon_earnings: couponEarnings.rows
    };

    // Cache for 30 seconds (frequently changing data)
    await setCache(cacheKey, portfolioData, 30);

    return NextResponse.json({ 
      success: true, 
      data: portfolioData 
    } as ApiResponse);
  } catch (error) {
    console.error('Error fetching portfolio:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch portfolio' } as ApiResponse,
      { status: 500 }
    );
  }
}

// PUT /api/portfolio/[wallet] - Update portfolio (used by reconciliation service)
export async function PUT(
  request: NextRequest,
  { params }: { params: { wallet: string } }
) {
  try {
    const walletAddress = params.wallet;
    const { bond_id, quantity_change, price_scaled, trade_value } = await request.json();

    // Validate inputs
    if (!bond_id || quantity_change === undefined || !price_scaled || !trade_value) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' } as ApiResponse,
        { status: 400 }
      );
    }

    // Start transaction
    await query('BEGIN');

    try {
      // Get current position
      const currentPosition = await query(`
        SELECT * FROM positions 
        WHERE wallet_address = $1 AND bond_id = $2
      `, [walletAddress, bond_id]);

      if (currentPosition.rows.length === 0) {
        // Create new position
        if (quantity_change > 0) {
          await query(`
            INSERT INTO positions (
              wallet_address, bond_id, quantity_scaled, 
              avg_price_scaled, total_cost
            ) VALUES ($1, $2, $3, $4, $5)
          `, [walletAddress, bond_id, quantity_change, price_scaled, trade_value]);
        }
      } else {
        // Update existing position
        const position = currentPosition.rows[0];
        const newQuantity = position.quantity_scaled + quantity_change;

        if (newQuantity <= 0) {
          // Remove position if quantity becomes zero or negative
          await query(`
            DELETE FROM positions 
            WHERE wallet_address = $1 AND bond_id = $2
          `, [walletAddress, bond_id]);
        } else {
          // Update position with new average price
          const newTotalCost = position.total_cost + trade_value;
          const newAvgPrice = newTotalCost > 0 
            ? Math.floor((newTotalCost * 1000000) / newQuantity)
            : position.avg_price_scaled;

          await query(`
            UPDATE positions 
            SET 
              quantity_scaled = $3,
              avg_price_scaled = $4,
              total_cost = $5,
              updated_at = NOW()
            WHERE wallet_address = $1 AND bond_id = $2
          `, [walletAddress, bond_id, newQuantity, newAvgPrice, newTotalCost]);
        }
      }

      // Commit transaction
      await query('COMMIT');

      // Clear cache
      await setCache(`portfolio:${walletAddress}`, null, 0);

      return NextResponse.json({
        success: true,
        message: 'Portfolio updated successfully'
      } as ApiResponse);
    } catch (error) {
      // Rollback transaction
      await query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error updating portfolio:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update portfolio' } as ApiResponse,
      { status: 500 }
    );
  }
}