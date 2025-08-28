import { NextRequest, NextResponse } from 'next/server';
import { query, getCache, setCache } from '@/lib/database';
import { ApiResponse, Market } from '@/types/api';

// GET /api/markets/[id] - Get market details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const marketId = params.id;

    // Check cache first
    const cacheKey = `market:${marketId}:details`;
    const cached = await getCache(cacheKey);
    if (cached) {
      return NextResponse.json({ success: true, data: cached } as ApiResponse);
    }

    // Get market with bond details
    const marketResult = await query(`
      SELECT 
        m.*,
        b.name as bond_name,
        b.issuer,
        b.bond_mint,
        b.coupon_rate,
        b.maturity_date,
        b.face_value,
        b.status as bond_status,
        b.credit_rating,
        b.listed_yield
      FROM markets m
      JOIN bonds b ON m.bond_id = b.id
      WHERE m.id = $1
    `, [marketId]);

    if (marketResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Market not found' } as ApiResponse,
        { status: 404 }
      );
    }

    const market = marketResult.rows[0];

    // Get recent price history (24 hours)
    const priceHistory = await query(`
      SELECT 
        price_scaled,
        source,
        created_at
      FROM price_history 
      WHERE market_id = $1 
        AND created_at >= NOW() - INTERVAL '24 hours'
      ORDER BY created_at ASC
    `, [marketId]);

    // Get order book (last 20 trades for each side)
    const orderBook = await query(`
      (
        SELECT 'buy' as side, price_scaled, SUM(amount) as total_amount
        FROM trades 
        WHERE market_id = $1 AND side = 'buy' AND status = 'confirmed'
          AND created_at >= NOW() - INTERVAL '24 hours'
        GROUP BY price_scaled
        ORDER BY price_scaled DESC
        LIMIT 20
      )
      UNION ALL
      (
        SELECT 'sell' as side, price_scaled, SUM(amount) as total_amount
        FROM trades 
        WHERE market_id = $1 AND side = 'sell' AND status = 'confirmed'
          AND created_at >= NOW() - INTERVAL '24 hours'
        GROUP BY price_scaled
        ORDER BY price_scaled ASC
        LIMIT 20
      )
    `, [marketId]);

    // Get 24h statistics
    const stats = await query(`
      SELECT 
        COUNT(*) as trade_count,
        SUM(CASE WHEN side = 'buy' THEN amount ELSE 0 END) as buy_volume,
        SUM(CASE WHEN side = 'sell' THEN amount ELSE 0 END) as sell_volume,
        SUM(total_value) as total_volume,
        MIN(price_scaled) as min_price,
        MAX(price_scaled) as max_price,
        AVG(price_scaled) as avg_price
      FROM trades 
      WHERE market_id = $1 
        AND status = 'confirmed'
        AND created_at >= NOW() - INTERVAL '24 hours'
    `, [marketId]);

    const marketDetails = {
      market,
      price_history: priceHistory.rows,
      order_book: orderBook.rows,
      stats_24h: stats.rows[0]
    };

    // Cache for 1 minute
    await setCache(cacheKey, marketDetails, 60);

    return NextResponse.json({ 
      success: true, 
      data: marketDetails 
    } as ApiResponse);
  } catch (error) {
    console.error('Error fetching market details:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch market details' } as ApiResponse,
      { status: 500 }
    );
  }
}

// PUT /api/markets/[id] - Update market (Admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Admin authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.includes(process.env.ADMIN_API_KEY || '')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' } as ApiResponse,
        { status: 401 }
      );
    }

    const marketId = params.id;
    const updateData = await request.json();

    // Build dynamic update query
    const allowedFields = ['paused', 'liquidity_bond', 'liquidity_usdc'];
    
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updateData)) {
      if (allowedFields.includes(key) && value !== undefined) {
        updateFields.push(`${key} = $${paramIndex}`);
        updateValues.push(value);
        paramIndex++;
      }
    }

    if (updateFields.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid fields to update' } as ApiResponse,
        { status: 400 }
      );
    }

    updateValues.push(marketId);
    const updateQuery = `
      UPDATE markets 
      SET ${updateFields.join(', ')}, updated_at = NOW()
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await query(updateQuery, updateValues);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Market not found' } as ApiResponse,
        { status: 404 }
      );
    }

    const updatedMarket = result.rows[0];

    // Clear cache
    await setCache(`market:${marketId}:details`, null, 0);

    // Log system event
    const eventType = updateData.paused !== undefined 
      ? (updateData.paused ? 'pause' : 'resume')
      : 'market_update';
      
    await query(`
      INSERT INTO system_events (event_type, entity_id, data) 
      VALUES ($1, $2, $3)
    `, [eventType, marketId, JSON.stringify({ old: updateData, new: updatedMarket })]);

    return NextResponse.json({
      success: true,
      data: updatedMarket,
      message: 'Market updated successfully'
    } as ApiResponse<Market>);
  } catch (error) {
    console.error('Error updating market:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update market' } as ApiResponse,
      { status: 500 }
    );
  }
}

// DELETE /api/markets/[id] - Delete market (Admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Admin authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.includes(process.env.ADMIN_API_KEY || '')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' } as ApiResponse,
        { status: 401 }
      );
    }

    const marketId = params.id;

    // Check if market has active trades
    const activeTrades = await query(`
      SELECT COUNT(*) as count 
      FROM trades 
      WHERE market_id = $1 AND status = 'pending'
    `, [marketId]);

    if (parseInt(activeTrades.rows[0].count) > 0) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete market with pending trades' } as ApiResponse,
        { status: 409 }
      );
    }

    // Delete market
    const result = await query('DELETE FROM markets WHERE id = $1 RETURNING *', [marketId]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Market not found' } as ApiResponse,
        { status: 404 }
      );
    }

    // Clear cache
    await setCache(`market:${marketId}:details`, null, 0);

    return NextResponse.json({
      success: true,
      message: 'Market deleted successfully'
    } as ApiResponse);
  } catch (error) {
    console.error('Error deleting market:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete market' } as ApiResponse,
      { status: 500 }
    );
  }
}
