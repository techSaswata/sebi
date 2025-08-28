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
    const existingBond = await query('SELECT id FROM bonds WHERE bond_mint = $1', [body.bond_mint]);
    if (existingBond.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Bond with this mint address already exists' } as ApiResponse,
        { status: 409 }
      );
    }

    // Insert new bond
    const result = await query(`
      INSERT INTO bonds (
        bond_mint, isin, issuer, name, coupon_rate, maturity_date, 
        face_value, decimals, total_supply, credit_rating, 
        credit_rating_agency, sector, interest_payment_frequency, 
        listed_yield, min_investment, logo_url
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
      ) RETURNING *
    `, [
      body.bond_mint,
      body.isin,
      body.issuer,
      body.name,
      body.coupon_rate,
      body.maturity_date,
      body.face_value,
      body.decimals || 6,
      body.total_supply,
      body.credit_rating,
      body.credit_rating_agency,
      body.sector,
      body.interest_payment_frequency || 'monthly',
      body.listed_yield,
      body.min_investment,
      body.logo_url
    ]);

    const newBond = result.rows[0];

    // Clear cache
    await setCache('bonds:all:*', null, 0);

    // Log system event
    await query(`
      INSERT INTO system_events (event_type, entity_id, data) 
      VALUES ('bond_mint', $1, $2)
    `, [newBond.id.toString(), JSON.stringify(newBond)]);

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