import { NextRequest, NextResponse } from 'next/server';
import { getCache, setCache, getSupabase } from '@/lib/database';
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

    const supabase = getSupabase();
    
    // Get trades with market and bond data
    let tradesQuery = supabase
      .from('trades')
      .select(`
        *,
        markets!inner(
          market_pda,
          bonds!inner(
            name,
            issuer,
            bond_mint
          )
        )
      `);
    
    // Apply filters
    if (wallet) {
      tradesQuery = tradesQuery.eq('user_wallet', wallet);
    }
    
    if (marketId) {
      tradesQuery = tradesQuery.eq('market_id', marketId);
    }
    
    if (side) {
      tradesQuery = tradesQuery.eq('side', side);
    }
    
    if (status) {
      tradesQuery = tradesQuery.eq('status', status);
    }
    
    // Apply ordering and pagination
    tradesQuery = tradesQuery
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    const { data: tradesData, error } = await tradesQuery;
    
    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }
    
    // Transform the data to match the expected format
    const trades = tradesData?.map((trade: any) => ({
      ...trade,
      bond_name: trade.markets?.bonds?.name,
      issuer: trade.markets?.bonds?.issuer,
      bond_mint: trade.markets?.bonds?.bond_mint,
      market_pda: trade.markets?.market_pda
    })) || [];

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

    const supabase = getSupabase();
    
    // Check if market exists and is not paused
    const { data: marketData, error: marketError } = await supabase
      .from('markets')
      .select(`
        id,
        paused,
        price_per_token_scaled,
        bonds!inner(
          status
        )
      `)
      .eq('id', body.market_id)
      .single();

    if (marketError || !marketData) {
      return NextResponse.json(
        { success: false, error: 'Market not found' } as ApiResponse,
        { status: 404 }
      );
    }

    const market = {
      ...(marketData as any),
      bond_status: (marketData as any).bonds?.status
    };

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
    const { data: existingTrades, error: existingError } = await supabase
      .from('trades')
      .select('id')
      .eq('tx_signature', body.tx_signature);
    
    if (existingError) {
      console.error('Error checking existing trade:', existingError);
      throw existingError;
    }
    
    if (existingTrades && existingTrades.length > 0) {
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
    const { data: newTrades, error: insertError } = await supabase
      .from('trades')
      .insert({
        tx_signature: body.tx_signature,
        market_id: body.market_id,
        user_wallet: body.user_wallet,
        side: body.side,
        amount: body.amount,
        price_scaled: finalPrice,
        total_value: totalValue,
        status: 'pending'
      } as any)
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting trade:', insertError);
      throw insertError;
    }

    const newTrade = newTrades;

    // Create or update user record
    await supabase
      .from('users')
      .upsert({ wallet_address: body.user_wallet } as any, { onConflict: 'wallet_address' });

    // Log system event
    await supabase
      .from('system_events')
      .insert({
        event_type: 'trade',
        entity_id: (newTrade as any).id.toString(),
        tx_signature: body.tx_signature,
        data: JSON.stringify(newTrade)
      } as any);

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