import { NextRequest, NextResponse } from 'next/server';
import { query, getCache, setCache } from '@/lib/database';
import { ApiResponse, Market, CreateMarketRequest } from '@/types/api';

// GET /api/markets - List all markets
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bondId = searchParams.get('bond_id');
    const paused = searchParams.get('paused');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build where clause
    const whereConditions: string[] = [];
    const params: any[] = [limit, offset];
    let paramIndex = 3;

    if (bondId) {
      whereConditions.push(`m.bond_id = $${paramIndex}`);
      params.push(bondId);
      paramIndex++;
    }

    if (paused !== null) {
      whereConditions.push(`m.paused = $${paramIndex}`);
      params.push(paused === 'true');
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    // Check cache
    const cacheKey = `markets:${bondId || 'all'}:${paused || 'all'}:${limit}:${offset}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      return NextResponse.json({ success: true, data: cached } as ApiResponse<Market[]>);
    }

    const result = await query(`
      SELECT 
        m.*,
        b.name as bond_name,
        b.issuer,
        b.bond_mint,
        b.coupon_rate,
        b.maturity_date,
        b.status as bond_status
      FROM markets m
      JOIN bonds b ON m.bond_id = b.id
      ${whereClause}
      ORDER BY m.created_at DESC
      LIMIT $1 OFFSET $2
    `, params);

    const markets = result.rows;

    // Cache for 3 minutes
    await setCache(cacheKey, markets, 180);

    return NextResponse.json({ 
      success: true, 
      data: markets 
    } as ApiResponse<Market[]>);
  } catch (error) {
    console.error('Error fetching markets:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch markets' } as ApiResponse,
      { status: 500 }
    );
  }
}

// POST /api/markets - Create new market (Admin only)
export async function POST(request: NextRequest) {
  try {
    // Admin authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.includes(process.env.ADMIN_API_KEY || '')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' } as ApiResponse,
        { status: 401 }
      );
    }

    const body: CreateMarketRequest = await request.json();

    // Validate required fields
    const requiredFields = ['bond_id', 'market_pda', 'initial_price_scaled', 'vault_bond_account', 'vault_usdc_account', 'admin_pubkey'];
    for (const field of requiredFields) {
      if (!body[field as keyof CreateMarketRequest]) {
        return NextResponse.json(
          { success: false, error: `Missing required field: ${field}` } as ApiResponse,
          { status: 400 }
        );
      }
    }

    // Check if bond exists
    const bondCheck = await query('SELECT id FROM bonds WHERE id = $1', [body.bond_id]);
    if (bondCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Bond not found' } as ApiResponse,
        { status: 404 }
      );
    }

    // Check if market already exists for this bond
    const existingMarket = await query('SELECT id FROM markets WHERE bond_id = $1', [body.bond_id]);
    if (existingMarket.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Market already exists for this bond' } as ApiResponse,
        { status: 409 }
      );
    }

    // Insert new market
    const result = await query(`
      INSERT INTO markets (
        bond_id, market_pda, price_per_token_scaled, 
        vault_bond_account, vault_usdc_account, admin_pubkey,
        usdc_mint
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7
      ) RETURNING *
    `, [
      body.bond_id,
      body.market_pda,
      body.initial_price_scaled,
      body.vault_bond_account,
      body.vault_usdc_account,
      body.admin_pubkey,
      process.env.USDC_MINT_ADDRESS || '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'
    ]);

    const newMarket = result.rows[0];

    // Clear cache
    await setCache('markets:*', null, 0);

    // Log system event
    await query(`
      INSERT INTO system_events (event_type, entity_id, data) 
      VALUES ('market_init', $1, $2)
    `, [newMarket.id.toString(), JSON.stringify(newMarket)]);

    // Create initial price history entry
    await query(`
      INSERT INTO price_history (market_id, price_scaled, source, volume_24h)
      VALUES ($1, $2, 'manual', 0)
    `, [newMarket.id, body.initial_price_scaled]);

    return NextResponse.json({
      success: true,
      data: newMarket,
      message: 'Market created successfully'
    } as ApiResponse<Market>);
  } catch (error) {
    console.error('Error creating market:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create market' } as ApiResponse,
      { status: 500 }
    );
  }
}
