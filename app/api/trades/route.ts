import { NextRequest, NextResponse } from 'next/server';
import { query, getCache, setCache } from '@/lib/database';
import { ApiResponse, Trade, TradeRequest } from '@/types/api';

// GET /api/trades - List trades with filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const wallet = searchParams.get('wallet');
    const marketId = searchParams.get('market_id');
    const side = searchParams.get('side');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build where clause
    const whereConditions: string[] = [];
    const params: any[] = [limit, offset];
    let paramIndex = 3;

    if (wallet) {
      whereConditions.push(`t.user_wallet = $${paramIndex}`);
      params.push(wallet);
      paramIndex++;
    }

    if (marketId) {
      whereConditions.push(`t.market_id = $${paramIndex}`);
      params.push(marketId);
      paramIndex++;
    }

    if (side) {
      whereConditions.push(`t.side = $${paramIndex}`);
      params.push(side);
      paramIndex++;
    }

    if (status) {
      whereConditions.push(`t.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    // Check cache (only for specific wallet queries)
    let cacheKey = null;
    if (wallet) {
      cacheKey = `trades:${wallet}:${marketId || 'all'}:${limit}:${offset}`;
      const cached = await getCache(cacheKey);
      if (cached) {
        return NextResponse.json({ success: true, data: cached } as ApiResponse<Trade[]>);
      }
    }

    const result = await query(`
      SELECT 
        t.*,
        b.name as bond_name,
        b.issuer,
        b.bond_mint,
        m.market_pda
      FROM trades t
      JOIN markets m ON t.market_id = m.id
      JOIN bonds b ON m.bond_id = b.id
      ${whereClause}
      ORDER BY t.created_at DESC
      LIMIT $1 OFFSET $2
    `, params);

    const trades = result.rows;

    // Cache for 1 minute if wallet-specific
    if (cacheKey) {
      await setCache(cacheKey, trades, 60);
    }

    return NextResponse.json({ 
      success: true, 
      data: trades 
    } as ApiResponse<Trade[]>);
  } catch (error) {
    console.error('Error fetching trades:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch trades' } as ApiResponse,
      { status: 500 }
    );
  }
}

// POST /api/trades - Create new trade order
export async function POST(request: NextRequest) {
  try {
    const body: TradeRequest & { user_wallet: string; tx_signature: string } = await request.json();

    // Validate required fields
    const requiredFields = ['market_id', 'user_wallet', 'side', 'amount', 'tx_signature'];
    for (const field of requiredFields) {
      if (!body[field as keyof typeof body]) {
        return NextResponse.json(
          { success: false, error: `Missing required field: ${field}` } as ApiResponse,
          { status: 400 }
        );
      }
    }

    // Check if market exists and is not paused
    const marketCheck = await query(`
      SELECT 
        m.id,
        m.paused,
        m.price_per_token_scaled,
        b.status as bond_status
      FROM markets m
      JOIN bonds b ON m.bond_id = b.id
      WHERE m.id = $1
    `, [body.market_id]);

    if (marketCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Market not found' } as ApiResponse,
        { status: 404 }
      );
    }

    const market = marketCheck.rows[0];

    if (market.paused) {
      return NextResponse.json(
        { success: false, error: 'Market is paused' } as ApiResponse,
        { status: 409 }
      );
    }

    if (market.bond_status !== 'active') {
      return NextResponse.json(
        { success: false, error: 'Bond is not active' } as ApiResponse,
        { status: 409 }
      );
    }

    // Check for duplicate transaction signature
    const existingTrade = await query('SELECT id FROM trades WHERE tx_signature = $1', [body.tx_signature]);
    if (existingTrade.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Trade with this transaction signature already exists' } as ApiResponse,
        { status: 409 }
      );
    }

    // Calculate price and total value
    const currentPrice = market.price_per_token_scaled;
    const finalPrice = currentPrice;
    
    // Apply price limits if specified
    if (body.side === 'buy' && body.max_price_scaled && currentPrice > body.max_price_scaled) {
      return NextResponse.json(
        { success: false, error: 'Current price exceeds maximum price limit' } as ApiResponse,
        { status: 409 }
      );
    }

    if (body.side === 'sell' && body.min_price_scaled && currentPrice < body.min_price_scaled) {
      return NextResponse.json(
        { success: false, error: 'Current price below minimum price limit' } as ApiResponse,
        { status: 409 }
      );
    }

    const totalValue = Math.floor((body.amount * finalPrice) / 1000000); // Convert from scaled

    // Create trade record
    const result = await query(`
      INSERT INTO trades (
        tx_signature, market_id, user_wallet, side, amount, 
        price_scaled, total_value, status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, 'pending'
      ) RETURNING *
    `, [
      body.tx_signature,
      body.market_id,
      body.user_wallet,
      body.side,
      body.amount,
      finalPrice,
      totalValue
    ]);

    const newTrade = result.rows[0];

    // Create or update user record
    await query(`
      INSERT INTO users (wallet_address) 
      VALUES ($1) 
      ON CONFLICT (wallet_address) DO NOTHING
    `, [body.user_wallet]);

    // Log system event
    await query(`
      INSERT INTO system_events (event_type, entity_id, tx_signature, data) 
      VALUES ('trade', $1, $2, $3)
    `, [newTrade.id.toString(), body.tx_signature, JSON.stringify(newTrade)]);

    // Clear cache for this wallet
    await setCache(`trades:${body.user_wallet}:*`, null, 0);

    return NextResponse.json({
      success: true,
      data: newTrade,
      message: 'Trade order created successfully'
    } as ApiResponse<Trade>);
  } catch (error) {
    console.error('Error creating trade:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create trade order' } as ApiResponse,
      { status: 500 }
    );
  }
}