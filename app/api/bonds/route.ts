import { NextRequest, NextResponse } from 'next/server';
import { query, getCache, setCache } from '@/lib/database';
import { ApiResponse, Bond, BondMarketView, CreateBondRequest } from '@/types/api';

// GET /api/bonds - List all bonds with market data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Check cache first
    const cacheKey = `bonds:${status || 'all'}:${limit}:${offset}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      return NextResponse.json({ success: true, data: cached } as ApiResponse<BondMarketView[]>);
    }

    let whereClause = '';
    const params: any[] = [limit, offset];
    
    if (status) {
      whereClause = 'WHERE b.status = $3';
      params.push(status);
    }

    // Use Supabase to get bond_market_view data
    const { getSupabase } = await import('@/lib/database');
    const supabase = getSupabase();
    
    let query = supabase.from('bond_market_view').select('*');
    
    if (status) {
      query = query.eq('bond_status', status);
    }
    
    query = query.order('bond_id', { ascending: false }).range(offset, offset + limit - 1);
    
    const { data: bonds, error } = await query;
    
    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    // Cache for 5 minutes
    await setCache(cacheKey, bonds, 300);

    return NextResponse.json({ 
      success: true, 
      data: bonds 
    } as ApiResponse<BondMarketView[]>);
  } catch (error) {
    console.error('Error fetching bonds:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch bonds' } as ApiResponse,
      { status: 500 }
    );
  }
}

// POST /api/bonds - Create new bond (Admin only)
export async function POST(request: NextRequest) {
  try {
    // TODO: Add admin authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.includes(process.env.ADMIN_API_KEY || '')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' } as ApiResponse,
        { status: 401 }
      );
    }

    const body: CreateBondRequest = await request.json();

    // Validate required fields
    const requiredFields = ['bond_mint', 'issuer', 'name', 'coupon_rate', 'maturity_date', 'face_value', 'total_supply'];
    for (const field of requiredFields) {
      if (!body[field as keyof CreateBondRequest]) {
        return NextResponse.json(
          { success: false, error: `Missing required field: ${field}` } as ApiResponse,
          { status: 400 }
        );
      }
    }

    // Check if bond_mint already exists
    const { data: existingBonds, error: existingError } = await supabase
      .from('bonds')
      .select('id')
      .eq('bond_mint', body.bond_mint);
    
    if (existingError) {
      console.error('Error checking existing bond:', existingError);
      throw existingError;
    }
    
    if (existingBonds && existingBonds.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Bond with this mint address already exists' } as ApiResponse,
        { status: 409 }
      );
    }

    // Insert new bond
    const { data: newBonds, error: insertError } = await supabase
      .from('bonds')
      .insert({
        bond_mint: body.bond_mint,
        isin: body.isin,
        issuer: body.issuer,
        name: body.name,
        coupon_rate: body.coupon_rate,
        maturity_date: body.maturity_date,
        face_value: body.face_value,
        decimals: body.decimals || 6,
        total_supply: body.total_supply,
        credit_rating: body.credit_rating,
        credit_rating_agency: body.credit_rating_agency,
        sector: body.sector,
        interest_payment_frequency: body.interest_payment_frequency || 'monthly',
        listed_yield: body.listed_yield,
        min_investment: body.min_investment,
        logo_url: body.logo_url
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting bond:', insertError);
      throw insertError;
    }

    const newBond = newBonds;

    // Clear cache
    await setCache('bonds:all:*', null, 0);

    // Log system event
    await supabase
      .from('system_events')
      .insert({
        event_type: 'bond_mint',
        entity_id: newBond.id.toString(),
        data: JSON.stringify(newBond)
      });

    return NextResponse.json({
      success: true,
      data: newBond,
      message: 'Bond created successfully'
    } as ApiResponse<Bond>);
  } catch (error) {
    console.error('Error creating bond:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create bond' } as ApiResponse,
      { status: 500 }
    );
  }
}