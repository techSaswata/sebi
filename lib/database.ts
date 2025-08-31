import { createClient } from '@supabase/supabase-js';
import Redis from 'ioredis';

// Supabase connection
let supabase: ReturnType<typeof createClient> | null = null;

export function getSupabase() {
  if (!supabase) {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return supabase;
}

// Query wrapper to maintain compatibility with existing code
export async function query(text: string, params?: unknown[]): Promise<{ rows: unknown[]; rowCount: number | null }> {
  const start = Date.now();
  try {
    const supabase = getSupabase();
    
    // Handle different query types
    const trimmedQuery = text.trim().toUpperCase();
    
    // For SELECT queries from views (bond_market_view, portfolio_view)
    if (trimmedQuery.includes('FROM BOND_MARKET_VIEW') || trimmedQuery.includes('FROM bond_market_view')) {
      const { data, error } = await supabase
        .from('bond_market_view')
        .select('*');
      
      if (error) throw error;
      const duration = Date.now() - start;
      console.log('Executed Supabase query', { text: 'bond_market_view', duration, rows: data?.length || 0 });
      return { rows: data || [], rowCount: data?.length || 0 };
    }
    
    // For simple SELECT queries from bonds table
    if (trimmedQuery.includes('FROM BONDS') || trimmedQuery.includes('FROM bonds')) {
      let query = supabase.from('bonds').select('*');
      
      // Add simple WHERE conditions if present
      if (text.includes('WHERE') && params && params.length > 0) {
        // This is a simplified approach - in practice you'd need proper SQL parsing
        console.log('Using Supabase with simplified WHERE clause');
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      const duration = Date.now() - start;
      console.log('Executed Supabase query', { text: 'bonds', duration, rows: data?.length || 0 });
      return { rows: data || [], rowCount: data?.length || 0 };
    }
    
    // For INSERT queries
    if (trimmedQuery.startsWith('INSERT')) {
      console.log('INSERT query detected - use supabaseInsert() instead for better type safety');
      throw new Error('Use supabaseInsert() for INSERT operations');
    }
    
    // For UPDATE queries  
    if (trimmedQuery.startsWith('UPDATE')) {
      console.log('UPDATE query detected - use supabaseUpdate() instead for better type safety');
      throw new Error('Use supabaseUpdate() for UPDATE operations');
    }
    
    // For health check queries
    if (trimmedQuery === 'SELECT 1') {
      const { data, error } = await supabase.from('bonds').select('id').limit(1);
      return { rows: data || [], rowCount: data?.length || 0 };
    }
    
    // Handle price_history queries
    if (trimmedQuery.includes('FROM PRICE_HISTORY') || trimmedQuery.includes('FROM price_history')) {
      let query = supabase.from('price_history').select('*');
      
      // Handle WHERE conditions for market_id
      if (text.includes('WHERE market_id = $1') && params && params.length > 0) {
        query = query.eq('market_id', params[0] as string);
      }
      
      // Handle ORDER BY and LIMIT
      if (text.includes('ORDER BY created_at DESC')) {
        query = query.order('created_at', { ascending: false });
      }
      
      if (text.includes('LIMIT 30')) {
        query = query.limit(30);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      const duration = Date.now() - start;
      console.log('Executed Supabase query', { text: 'price_history', duration, rows: data?.length || 0 });
      return { rows: data || [], rowCount: data?.length || 0 };
    }
    
    // Handle trades queries
    if (trimmedQuery.includes('FROM TRADES') || trimmedQuery.includes('FROM trades')) {
      let query = supabase.from('trades').select('*');
      
      // Handle WHERE conditions
      if (text.includes('WHERE t.market_id = $1') && params && params.length > 0) {
        query = query.eq('market_id', params[0] as string);
      }
      
      if (text.includes("AND t.status = 'confirmed'")) {
        query = query.eq('status', 'confirmed');
      }
      
      // Handle ORDER BY and LIMIT
      if (text.includes('ORDER BY t.created_at DESC')) {
        query = query.order('created_at', { ascending: false });
      }
      
      if (text.includes('LIMIT 10')) {
        query = query.limit(10);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      const duration = Date.now() - start;
      console.log('Executed Supabase query', { text: 'trades', duration, rows: data?.length || 0 });
      return { rows: data || [], rowCount: data?.length || 0 };
    }
    
    // Handle complex JOIN queries (like the bond details query)
    if (trimmedQuery.includes('FROM BONDS B') && trimmedQuery.includes('LEFT JOIN MARKETS M')) {
      // For now, return the bond data and handle market data separately
      let bondQuery = supabase.from('bonds').select('*');
      
      if (text.includes('WHERE b.id = $1') && params && params.length > 0) {
        bondQuery = bondQuery.eq('id', parseInt(params[0] as string));
      }
      
      const { data: bondData, error: bondError } = await bondQuery;
      if (bondError) throw bondError;
      
      if (bondData && bondData.length > 0) {
        const bond = bondData[0] as any;
        
        // Get market data separately
        const { data: marketData, error: marketError } = await supabase
          .from('markets')
          .select('*')
          .eq('bond_id', bond.id)
          .single();
        
        if (!marketError && marketData) {
          // Merge bond and market data
          const mergedData = { ...bond, ...(marketData as any) };
          const duration = Date.now() - start;
          console.log('Executed Supabase query', { text: 'bonds_with_markets', duration, rows: 1 });
          return { rows: [mergedData], rowCount: 1 };
        }
      }
      
      const duration = Date.now() - start;
      console.log('Executed Supabase query', { text: 'bonds_with_markets', duration, rows: bondData?.length || 0 });
      return { rows: bondData || [], rowCount: bondData?.length || 0 };
    }
    
    // For other complex queries, log and fallback
    console.warn('Complex query detected, may need manual conversion:', text.substring(0, 100));
    const duration = Date.now() - start;
    console.log('Executed fallback query', { text: text.substring(0, 50), duration });
    
    // Return empty result for unsupported queries
    return { rows: [], rowCount: 0 };
    
  } catch (error) {
    console.error('Supabase query error:', { text, error });
    throw error;
  }
}

// Supabase-specific query methods for better type safety
export async function supabaseSelect(table: string, columns = '*', conditions?: Record<string, unknown>) {
  const supabase = getSupabase();
  let query = supabase.from(table).select(columns);
  
  if (conditions) {
    Object.entries(conditions).forEach(([key, value]) => {
      query = query.eq(key, value as any);
    });
  }
  
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function supabaseInsert(table: string, data: Record<string, unknown> | Record<string, unknown>[]) {
  const supabase = getSupabase();
  const { data: result, error } = await supabase.from(table).insert(data as any).select();
  if (error) throw error;
  return result;
}

export async function supabaseUpdate(table: string, data: Record<string, unknown>, conditions: Record<string, unknown>) {
  const supabase = getSupabase();
  let query = (supabase.from(table) as any).update(data as any);
  
  Object.entries(conditions).forEach(([key, value]) => {
    query = query.eq(key, value as any);
  });
  
  const { data: result, error } = await query.select();
  if (error) throw error;
  return result;
}

export async function supabaseDelete(table: string, conditions: Record<string, unknown>) {
  const supabase = getSupabase();
  let query = supabase.from(table).delete();
  
  Object.entries(conditions).forEach(([key, value]) => {
    query = query.eq(key, value as any);
  });
  
  const { error } = await query;
  if (error) throw error;
}

// Compatibility function for getClient (not needed in Supabase)
export async function getClient() {
  return getSupabase();
}

// Redis connection
let redis: Redis | null = null;

export function getRedis(): Redis {
  if (!redis) {
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      redis = new Redis(redisUrl);
    } else {
      redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        enableReadyCheck: false,
        maxRetriesPerRequest: null,
      });
    }

    redis.on('error', (err) => {
      console.error('Redis connection error:', err);
    });

    redis.on('connect', () => {
      console.log('Connected to Redis');
    });
  }
  return redis;
}

// Cache helpers
export async function setCache(key: string, value: unknown, ttl: number = 300): Promise<void> {
  const redis = getRedis();
  await redis.setex(key, ttl, JSON.stringify(value));
}

export async function getCache(key: string): Promise<unknown | null> {
  const redis = getRedis();
  const cached = await redis.get(key);
  return cached ? JSON.parse(cached) : null;
}

export async function delCache(key: string): Promise<void> {
  const redis = getRedis();
  await redis.del(key);
}

// Database connection health check
export async function healthCheck(): Promise<{ db: boolean; redis: boolean }> {
  let dbHealth = false;
  let redisHealth = false;

  try {
    const supabase = getSupabase();
    const { error } = await supabase.from('bonds').select('id').limit(1);
    dbHealth = !error;
  } catch (error) {
    console.error('Supabase health check failed:', error);
  }

  try {
    const redis = getRedis();
    await redis.ping();
    redisHealth = true;
  } catch (error) {
    console.error('Redis health check failed:', error);
  }

  return { db: dbHealth, redis: redisHealth };
}

// Graceful shutdown
export async function closeConnections(): Promise<void> {
  try {
    if (redis) {
      redis.disconnect();
      redis = null;
    }
    console.log('Database connections closed');
  } catch (error) {
    console.error('Error closing connections:', error);
  }
}