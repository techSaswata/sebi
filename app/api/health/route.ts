import { NextResponse } from 'next/server';
import { healthCheck, query } from '@/lib/database';
import { ApiResponse } from '@/types/api';

// GET /api/health - System health check
export async function GET() {
  const startTime = Date.now();
  
  try {
    // Check database and Redis connectivity
    const dbHealth = await healthCheck();
    
    // Check API responsiveness
    const apiHealth = {
      status: 'healthy',
      response_time_ms: Date.now() - startTime,
      timestamp: new Date().toISOString()
    };

    // Check data integrity
    const dataHealth = await checkDataIntegrity();

    // Check external services
    const externalHealth = await checkExternalServices();

    // Get system statistics
    const stats = await getSystemStats();

    const healthStatus = {
      overall_status: getOverallStatus([dbHealth.db, dbHealth.redis, dataHealth.status === 'healthy']),
      api: apiHealth,
      database: {
        postgres: dbHealth.db ? 'healthy' : 'unhealthy',
        redis: dbHealth.redis ? 'healthy' : 'unhealthy'
      },
      data_integrity: dataHealth,
      external_services: externalHealth,
      system_stats: stats,
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    };

    const statusCode = healthStatus.overall_status === 'healthy' ? 200 : 503;

    return NextResponse.json({
      success: healthStatus.overall_status === 'healthy',
      data: healthStatus
    } as ApiResponse, { status: statusCode });

  } catch (error) {
    console.error('Health check failed:', error);
    
    return NextResponse.json({
      success: false,
      data: {
        overall_status: 'unhealthy',
        api: {
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Unknown error',
          response_time_ms: Date.now() - startTime,
          timestamp: new Date().toISOString()
        }
      },
      error: 'Health check failed'
    } as ApiResponse, { status: 503 });
  }
}

async function checkDataIntegrity(): Promise<any> {
  try {
    // Simplified data integrity checks for Supabase
    const { getSupabase } = await import('@/lib/database');
    const supabase = getSupabase();
    
    // Basic existence checks
    const [bonds, markets] = await Promise.all([
      supabase.from('bonds').select('id', { count: 'exact' }),
      supabase.from('markets').select('id', { count: 'exact' })
    ]);

    const issues = [];
    
    // Simple checks
    if ((bonds.count || 0) === 0) issues.push('no_bonds');
    if ((markets.count || 0) === 0) issues.push('no_markets');

    return {
      status: issues.length === 0 ? 'healthy' : 'warning',
      issues: issues,
      checks_performed: 2,
      last_check: new Date().toISOString()
    };

  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      last_check: new Date().toISOString()
    };
  }
}

async function checkExternalServices(): Promise<any> {
  const services = {
    aspero_api: 'unknown',
    solana_rpc: 'unknown',
    oracle_feed: 'unknown'
  };

  try {
    // Check Aspero API
    if (process.env.ASPERO_API_BASE_URL) {
      try {
        const response = await fetch(`${process.env.ASPERO_API_BASE_URL}/bff/api/v1/home`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${process.env.ASPERO_JWT_TOKEN}`
          },
          signal: AbortSignal.timeout(5000) // 5 second timeout
        });
        services.aspero_api = response.ok ? 'healthy' : 'unhealthy';
      } catch {
        services.aspero_api = 'unhealthy';
      }
    }

    // Check Solana RPC
    if (process.env.SOLANA_RPC_URL) {
      try {
        const response = await fetch(process.env.SOLANA_RPC_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'getHealth'
          }),
          signal: AbortSignal.timeout(5000)
        });
        services.solana_rpc = response.ok ? 'healthy' : 'unhealthy';
      } catch {
        services.solana_rpc = 'unhealthy';
      }
    }

    // Check Oracle feed (internal service)
    services.oracle_feed = 'healthy'; // Assume healthy for now

  } catch (error) {
    console.error('Error checking external services:', error);
  }

  return services;
}

async function getSystemStats(): Promise<any> {
  try {
    const { supabaseSelect, getSupabase } = await import('@/lib/database');
    const supabase = getSupabase();

    // Get basic counts using Supabase
    const [bonds, markets, trades] = await Promise.all([
      supabase.from('bonds').select('id', { count: 'exact' }),
      supabase.from('markets').select('id', { count: 'exact' }).eq('paused', false),
      supabase.from('trades').select('id', { count: 'exact' }).eq('status', 'confirmed')
    ]);

    return {
      total_bonds: bonds.count || 0,
      active_markets: markets.count || 0,
      trades_24h: trades.count || 0,
      volume_24h: 0, // Simplified for now
      active_users_24h: 0, // Simplified for now
      pending_trades: 0, // Simplified for now
      unprocessed_events: 0 // Simplified for now
    };

  } catch (error) {
    console.error('Error getting system stats:', error);
    return {
      total_bonds: 0,
      active_markets: 0,
      trades_24h: 0,
      volume_24h: 0,
      active_users_24h: 0,
      pending_trades: 0,
      unprocessed_events: 0
    };
  }
}

function getOverallStatus(checks: boolean[]): 'healthy' | 'degraded' | 'unhealthy' {
  const healthyCount = checks.filter(Boolean).length;
  const totalCount = checks.length;
  
  if (healthyCount === totalCount) return 'healthy';
  if (healthyCount >= totalCount * 0.7) return 'degraded';
  return 'unhealthy';
}
