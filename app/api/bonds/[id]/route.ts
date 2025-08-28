import { NextRequest, NextResponse } from 'next/server';
import { getCache, setCache, getSupabase } from '@/lib/database';
import { ApiResponse, PriceHistory } from '@/types/api';

// GET /api/bonds/[id] - Get bond details with price history
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const bondId = params.id;

    // Check cache first
    const cacheKey = `bond:${bondId}:details`;
    const cached = await getCache(cacheKey);
    if (cached) {
      return NextResponse.json({ success: true, data: cached } as ApiResponse);
    }

    const supabase = getSupabase();

    // Get bond with market data using Supabase
    const { data: bondData, error: bondError } = await supabase
      .from('bond_market_view')
      .select('*')
      .eq('bond_id', parseInt(bondId));

    if (bondError) {
      console.error('Supabase error:', bondError);
      return NextResponse.json(
        { success: false, error: 'Database error' } as ApiResponse,
        { status: 500 }
      );
    }

    if (!bondData || bondData.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Bond not found' } as ApiResponse,
        { status: 404 }
      );
    }

    const bond: any = bondData[0];

    // Get price history (last 30 days)
    let priceHistory: PriceHistory[] = [];
    if (bond.market_id) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: priceData } = await supabase
        .from('price_history')
        .select('*')
        .eq('market_id', bond.market_id)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: true });
      
      priceHistory = priceData || [];
    }

    // Get recent trades (last 10)
    let recentTrades: any[] = [];
    if (bond.market_id) {
      const { data: tradesData } = await supabase
        .from('trades')
        .select('*')
        .eq('market_id', bond.market_id)
        .eq('status', 'confirmed')
        .order('created_at', { ascending: false })
        .limit(10);
      
      recentTrades = tradesData || [];
    }

    // Calculate 24h statistics
    let stats24h = null;
    if (bond.market_id) {
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      
      const { data: statsData } = await supabase
        .from('trades')
        .select('total_value, price_scaled')
        .eq('market_id', bond.market_id)
        .eq('status', 'confirmed')
        .gte('created_at', oneDayAgo.toISOString());
      
      if (statsData && statsData.length > 0) {
        const tradeCount = statsData.length;
        const volume = statsData.reduce((sum: number, trade: any) => sum + (Number(trade.total_value) || 0), 0);
        const prices = statsData.map((trade: any) => Number(trade.price_scaled) || 0).filter(p => p > 0);
        
        stats24h = {
          trade_count: tradeCount,
          volume: volume,
          min_price: prices.length > 0 ? Math.min(...prices) : 0,
          max_price: prices.length > 0 ? Math.max(...prices) : 0,
          avg_price: prices.length > 0 ? prices.reduce((sum, p) => sum + p, 0) / prices.length : 0
        };
      }
    }

    const bondDetails = {
      bond,
      price_history: priceHistory,
      recent_trades: recentTrades,
      stats_24h: stats24h
    };

    // Cache for 2 minutes
    await setCache(cacheKey, bondDetails, 120);

    return NextResponse.json({ 
      success: true, 
      data: bondDetails 
    } as ApiResponse);
  } catch (error) {
    console.error('Error fetching bond details:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch bond details' } as ApiResponse,
      { status: 500 }
    );
  }
}

// PUT /api/bonds/[id] - Update bond (Admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // TODO: Add admin authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.includes(process.env.ADMIN_API_KEY || '')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' } as ApiResponse,
        { status: 401 }
      );
    }

    const bondId = params.id;
    const updateData = await request.json();

    // Build dynamic update object
    const allowedFields = [
      'status', 'listed_yield', 'min_investment', 'logo_url', 
      'credit_rating', 'credit_rating_agency'
    ];
    
    const updateObject: any = {};
    for (const [key, value] of Object.entries(updateData)) {
      if (allowedFields.includes(key) && value !== undefined) {
        updateObject[key] = value;
      }
    }

    if (Object.keys(updateObject).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid fields to update' } as ApiResponse,
        { status: 400 }
      );
    }

    // Add updated_at timestamp
    updateObject.updated_at = new Date().toISOString();

    const supabase = getSupabase();
    
    // Update the bond using Supabase
    const { data: updatedBond, error } = await (supabase
      .from('bonds') as any)
      .update(updateObject)
      .eq('id', parseInt(bondId))
      .select()
      .single();

    if (error || !updatedBond) {
      return NextResponse.json(
        { success: false, error: 'Bond not found or update failed' } as ApiResponse,
        { status: 404 }
      );
    }

    // Clear cache
    await setCache(`bond:${bondId}:details`, null, 0);

    // Log system event using Supabase
    await supabase
      .from('system_events')
      .insert({
        event_type: 'bond_update',
        entity_id: bondId,
        data: JSON.stringify({ old: updateData, new: updatedBond })
      } as any);

    return NextResponse.json({
      success: true,
      data: updatedBond,
      message: 'Bond updated successfully'
    } as ApiResponse);
  } catch (error) {
    console.error('Error updating bond:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update bond' } as ApiResponse,
      { status: 500 }
    );
  }
}