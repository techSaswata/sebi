import { NextRequest, NextResponse } from 'next/server';
import { query, setCache } from '@/lib/database';
import { ApiResponse, PriceUpdateRequest } from '@/types/api';

// GET /api/oracle - Get oracle status and recent updates
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const marketId = searchParams.get('market_id');
    const limit = parseInt(searchParams.get('limit') || '20');

    let whereClause = '';
    const params = [limit];

    if (marketId) {
      whereClause = 'WHERE ou.market_id = $2';
      params.push(marketId);
    }

    // Get recent oracle updates
    const updatesResult = await query(`
      SELECT 
        ou.*,
        b.name as bond_name,
        b.issuer,
        m.market_pda
      FROM oracle_updates ou
      JOIN markets m ON ou.market_id = m.id
      JOIN bonds b ON m.bond_id = b.id
      ${whereClause}
      ORDER BY ou.created_at DESC
      LIMIT $1
    `, params);

    // Get oracle statistics
    const statsResult = await query(`
      SELECT 
        COUNT(*) as total_updates,
        COUNT(DISTINCT market_id) as markets_updated,
        MAX(created_at) as last_update,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as updates_24h
      FROM oracle_updates
      ${marketId ? 'WHERE market_id = $1' : ''}
    `, marketId ? [marketId] : []);

    const oracleData = {
      updates: updatesResult.rows,
      statistics: statsResult.rows[0],
      status: 'active',
      last_health_check: new Date().toISOString()
    };

    return NextResponse.json({ 
      success: true, 
      data: oracleData 
    } as ApiResponse);
  } catch (error) {
    console.error('Error fetching oracle data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch oracle data' } as ApiResponse,
      { status: 500 }
    );
  }
}

// POST /api/oracle - Publish price update (Oracle service only)
export async function POST(request: NextRequest) {
  try {
    // Oracle authentication
    const authHeader = request.headers.get('authorization');
    // const oracleKey = request.headers.get('x-oracle-key');
    
    if (!authHeader || !authHeader.includes(process.env.ADMIN_API_KEY || '')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' } as ApiResponse,
        { status: 401 }
      );
    }

    const updates: PriceUpdateRequest[] = await request.json();

    if (!Array.isArray(updates)) {
      return NextResponse.json(
        { success: false, error: 'Expected array of price updates' } as ApiResponse,
        { status: 400 }
      );
    }

    const results = [];

    // Process each price update
    for (const update of updates) {
      try {
        // Validate required fields
        if (!update.market_id || !update.new_price_scaled) {
          results.push({
            market_id: update.market_id,
            success: false,
            error: 'Missing required fields'
          });
          continue;
        }

        // Get current market data
        const marketResult = await query(`
          SELECT 
            m.id,
            m.price_per_token_scaled as current_price,
            m.paused,
            b.status as bond_status,
            b.name as bond_name
          FROM markets m
          JOIN bonds b ON m.bond_id = b.id
          WHERE m.id = $1
        `, [update.market_id]);

        if (marketResult.rows.length === 0) {
          results.push({
            market_id: update.market_id,
            success: false,
            error: 'Market not found'
          });
          continue;
        }

        const market = marketResult.rows[0];
        
        // Skip if market is paused or bond is not active
        if (market.paused || market.bond_status !== 'active') {
          results.push({
            market_id: update.market_id,
            success: false,
            error: 'Market is paused or bond is not active'
          });
          continue;
        }

        const oldPrice = market.current_price;
        const newPrice = update.new_price_scaled;

        // Validate price change (prevent extreme changes)
        const priceChangePercent = Math.abs((newPrice - oldPrice) / oldPrice) * 100;
        if (priceChangePercent > 20) { // 20% change limit
          results.push({
            market_id: update.market_id,
            success: false,
            error: `Price change too large: ${priceChangePercent.toFixed(2)}%`
          });
          continue;
        }

        // Start transaction for this update
        await query('BEGIN');

        try {
          // Update market price
          await query(`
            UPDATE markets 
            SET price_per_token_scaled = $2, updated_at = NOW()
            WHERE id = $1
          `, [update.market_id, newPrice]);

          // Log oracle update
          await query(`
            INSERT INTO oracle_updates (
              market_id, old_price_scaled, new_price_scaled, 
              source, tx_signature
            ) VALUES ($1, $2, $3, $4, $5)
          `, [
            update.market_id,
            oldPrice,
            newPrice,
            update.source || 'oracle',
            null // TX signature will be added later by blockchain service
          ]);

          // Add to price history
          await query(`
            INSERT INTO price_history (
              market_id, price_scaled, source
            ) VALUES ($1, $2, $3)
          `, [update.market_id, newPrice, update.source || 'oracle']);

          // Log system event
          await query(`
            INSERT INTO system_events (
              event_type, entity_id, data
            ) VALUES ('price_update', $1, $2)
          `, [
            update.market_id.toString(),
            JSON.stringify({
              old_price: oldPrice,
              new_price: newPrice,
              source: update.source || 'oracle',
              change_percent: ((newPrice - oldPrice) / oldPrice) * 100
            })
          ]);

          await query('COMMIT');

          // Clear relevant caches
          await setCache(`market:${update.market_id}:details`, null, 0);
          await setCache(`bond:*:details`, null, 0);

          results.push({
            market_id: update.market_id,
            success: true,
            old_price: oldPrice,
            new_price: newPrice,
            change_percent: ((newPrice - oldPrice) / oldPrice) * 100
          });

        } catch (error) {
          await query('ROLLBACK');
          throw error;
        }

      } catch (error) {
        console.error(`Error updating price for market ${update.market_id}:`, error);
        results.push({
          market_id: update.market_id,
          success: false,
          error: 'Internal server error'
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;

    return NextResponse.json({
      success: successCount > 0,
      data: {
        results,
        summary: {
          total_updates: totalCount,
          successful_updates: successCount,
          failed_updates: totalCount - successCount
        }
      },
      message: `${successCount}/${totalCount} price updates successful`
    } as ApiResponse);

  } catch (error) {
    console.error('Error processing oracle updates:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process oracle updates' } as ApiResponse,
      { status: 500 }
    );
  }
}
