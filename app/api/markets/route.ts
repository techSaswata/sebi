import { NextRequest, NextResponse } from 'next/server';
import { getCache, setCache, getSupabase } from '@/lib/database';
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

    const supabase = getSupabase();
    
    // Get markets with bond data
    let marketsQuery = supabase
      .from('markets')
      .select(`
        *,
        bonds!inner(
          name,
          issuer,
          bond_mint,
          coupon_rate,
          maturity_date,
          status
        )
      `);
    
    // Apply filters
    if (bondId) {
      marketsQuery = marketsQuery.eq('bond_id', bondId);
    }
    
    if (paused !== null) {
      marketsQuery = marketsQuery.eq('paused', paused === 'true');
    }
    
    // Apply ordering and pagination
    marketsQuery = marketsQuery
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    const { data: marketsData, error } = await marketsQuery;
    
    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }
    
    // Transform the data to match the expected format
    const markets = marketsData?.map(market => ({
      ...market,
      bond_name: market.bonds?.name,
      issuer: market.bonds?.issuer,
      bond_mint: market.bonds?.bond_mint,
      coupon_rate: market.bonds?.coupon_rate,
      maturity_date: market.bonds?.maturity_date,
      bond_status: market.bonds?.status
    })) || [];

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

    const supabase = getSupabase();
    
    // Check if bond exists
    const { data: bondData, error: bondError } = await supabase
      .from('bonds')
      .select('id')
      .eq('id', body.bond_id)
      .single();
    
    if (bondError || !bondData) {
      return NextResponse.json(
        { success: false, error: 'Bond not found' } as ApiResponse,
        { status: 404 }
      );
    }

    // Check if market already exists for this bond
    const { data: existingMarkets, error: existingError } = await supabase
      .from('markets')
      .select('id')
      .eq('bond_id', body.bond_id);
    
    if (existingError) {
      console.error('Error checking existing market:', existingError);
      throw existingError;
    }
    
    if (existingMarkets && existingMarkets.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Market already exists for this bond' } as ApiResponse,
        { status: 409 }
      );
    }

    // Insert new market
    const { data: newMarkets, error: insertError } = await supabase
      .from('markets')
      .insert({
        bond_id: body.bond_id,
        market_pda: body.market_pda,
        price_per_token_scaled: body.initial_price_scaled,
        vault_bond_account: body.vault_bond_account,
        vault_usdc_account: body.vault_usdc_account,
        admin_pubkey: body.admin_pubkey,
        usdc_mint: process.env.USDC_MINT_ADDRESS || '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting market:', insertError);
      throw insertError;
    }

    const newMarket = newMarkets;

    // Clear cache
    await setCache('markets:*', null, 0);

    // Log system event
    await supabase
      .from('system_events')
      .insert({
        event_type: 'market_init',
        entity_id: newMarket.id.toString(),
        data: JSON.stringify(newMarket)
      });

    // Create initial price history entry
    await supabase
      .from('price_history')
      .insert({
        market_id: newMarket.id,
        price_scaled: body.initial_price_scaled,
        source: 'manual',
        volume_24h: 0
      });

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
