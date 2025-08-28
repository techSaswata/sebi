import { NextRequest, NextResponse } from 'next/server';
import { query, getCache, setCache } from '@/lib/database';
import { ApiResponse, SystemEvent } from '@/types/api';

// GET /api/events/recent - Get recent system events
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventType = searchParams.get('event_type');
    const processed = searchParams.get('processed');
    const entityId = searchParams.get('entity_id');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build where clause
    const whereConditions: string[] = [];
    const params: any[] = [limit, offset];
    let paramIndex = 3;

    if (eventType) {
      whereConditions.push(`event_type = $${paramIndex}`);
      params.push(eventType);
      paramIndex++;
    }

    if (processed !== null) {
      whereConditions.push(`processed = $${paramIndex}`);
      params.push(processed === 'true');
      paramIndex++;
    }

    if (entityId) {
      whereConditions.push(`entity_id = $${paramIndex}`);
      params.push(entityId);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    // Check cache for general queries (not entity-specific)
    let cacheKey = null;
    if (!entityId) {
      cacheKey = `events:${eventType || 'all'}:${processed || 'all'}:${limit}:${offset}`;
      const cached = await getCache(cacheKey);
      if (cached) {
        return NextResponse.json({ success: true, data: cached } as ApiResponse<SystemEvent[]>);
      }
    }

    const result = await query(`
      SELECT 
        se.*,
        CASE 
          WHEN se.event_type = 'trade' THEN (
            SELECT jsonb_build_object(
              'bond_name', b.name,
              'issuer', b.issuer,
              'user_wallet', t.user_wallet,
              'side', t.side,
              'amount', t.amount
            )
            FROM trades t 
            JOIN markets m ON t.market_id = m.id
            JOIN bonds b ON m.bond_id = b.id
            WHERE t.id::text = se.entity_id
            LIMIT 1
          )
          WHEN se.event_type IN ('market_init', 'price_update', 'pause', 'resume') THEN (
            SELECT jsonb_build_object(
              'bond_name', b.name,
              'issuer', b.issuer,
              'market_pda', m.market_pda
            )
            FROM markets m 
            JOIN bonds b ON m.bond_id = b.id
            WHERE m.id::text = se.entity_id
            LIMIT 1
          )
          WHEN se.event_type = 'bond_mint' THEN (
            SELECT jsonb_build_object(
              'bond_name', b.name,
              'issuer', b.issuer,
              'bond_mint', b.bond_mint
            )
            FROM bonds b 
            WHERE b.id::text = se.entity_id
            LIMIT 1
          )
          ELSE '{}'::jsonb
        END as context_data
      FROM system_events se
      ${whereClause}
      ORDER BY se.created_at DESC
      LIMIT $1 OFFSET $2
    `, params);

    const events = result.rows;

    // Cache for 1 minute if not entity-specific
    if (cacheKey) {
      await setCache(cacheKey, events, 60);
    }

    return NextResponse.json({ 
      success: true, 
      data: events 
    } as ApiResponse<SystemEvent[]>);
  } catch (error) {
    console.error('Error fetching recent events:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch recent events' } as ApiResponse,
      { status: 500 }
    );
  }
}

// POST /api/events/recent - Create system event (Internal use)
export async function POST(request: NextRequest) {
  try {
    // Internal API authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.includes(process.env.ADMIN_API_KEY || '')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' } as ApiResponse,
        { status: 401 }
      );
    }

    const { event_type, entity_id, tx_signature, data } = await request.json();

    // Validate required fields
    if (!event_type) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: event_type' } as ApiResponse,
        { status: 400 }
      );
    }

    // Insert new system event
    const result = await query(`
      INSERT INTO system_events (
        event_type, entity_id, tx_signature, data
      ) VALUES (
        $1, $2, $3, $4
      ) RETURNING *
    `, [event_type, entity_id, tx_signature, JSON.stringify(data)]);

    const newEvent = result.rows[0];

    // Clear cache
    await setCache('events:*', null, 0);

    // Publish to Redis for real-time updates
    try {
      const redis = await import('@/lib/database').then(m => m.getRedis());
      await redis.publish('system_events', JSON.stringify({
        type: event_type,
        data: newEvent,
        timestamp: new Date().toISOString()
      }));
    } catch (redisError) {
      console.error('Error publishing to Redis:', redisError);
      // Don't fail the request if Redis publish fails
    }

    return NextResponse.json({
      success: true,
      data: newEvent,
      message: 'System event created successfully'
    } as ApiResponse<SystemEvent>);
  } catch (error) {
    console.error('Error creating system event:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create system event' } as ApiResponse,
      { status: 500 }
    );
  }
}

// PUT /api/events/recent - Mark events as processed (for reconciliation)
export async function PUT(request: NextRequest) {
  try {
    // Internal API authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.includes(process.env.ADMIN_API_KEY || '')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' } as ApiResponse,
        { status: 401 }
      );
    }

    const { event_ids } = await request.json();

    if (!Array.isArray(event_ids) || event_ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'event_ids must be a non-empty array' } as ApiResponse,
        { status: 400 }
      );
    }

    // Update events as processed
    const placeholders = event_ids.map((_, index) => `$${index + 1}`).join(',');
    const result = await query(`
      UPDATE system_events 
      SET processed = true, processed_at = NOW()
      WHERE id IN (${placeholders}) AND processed = false
      RETURNING id
    `, event_ids);

    const updatedCount = result.rows.length;

    return NextResponse.json({
      success: true,
      data: {
        updated_count: updatedCount,
        updated_ids: result.rows.map(row => row.id)
      },
      message: `${updatedCount} events marked as processed`
    } as ApiResponse);
  } catch (error) {
    console.error('Error updating system events:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update system events' } as ApiResponse,
      { status: 500 }
    );
  }
}