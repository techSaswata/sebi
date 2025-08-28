import { NextRequest, NextResponse } from 'next/server';
import { BlockchainSetup } from '@/scripts/blockchain-setup';
import { ApiResponse } from '@/types/api';

/**
 * POST /api/blockchain/setup - Initialize blockchain infrastructure
 */
export async function POST(request: NextRequest) {
  try {
    // Check for admin authorization
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.includes(process.env.ADMIN_API_KEY || '')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' } as ApiResponse,
        { status: 401 }
      );
    }

    console.log('🚀 Starting blockchain setup via API...');

    const setup = new BlockchainSetup();
    await setup.run();

    return NextResponse.json({
      success: true,
      message: 'Blockchain setup completed successfully',
      data: {
        timestamp: new Date().toISOString(),
        program_id: process.env.ANCHOR_PROGRAM_ID,
        usdc_mint: process.env.USDC_MINT,
        bond_mint_1: process.env.BOND_MINT_1,
        bond_mint_2: process.env.BOND_MINT_2
      }
    } as ApiResponse);

  } catch (error) {
    console.error('❌ Blockchain setup failed:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Blockchain setup failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      } as ApiResponse,
      { status: 500 }
    );
  }
}

/**
 * GET /api/blockchain/setup - Get blockchain setup status
 */
export async function GET() {
  try {
    const status = {
      program_id: process.env.ANCHOR_PROGRAM_ID || null,
      usdc_mint: process.env.USDC_MINT || null,
      bond_mint_1: process.env.BOND_MINT_1 || null,
      bond_mint_2: process.env.BOND_MINT_2 || null,
      market_pda_1: process.env.MARKET_PDA_1 || null,
      market_pda_2: process.env.MARKET_PDA_2 || null,
      setup_complete: !!(
        process.env.ANCHOR_PROGRAM_ID && 
        process.env.USDC_MINT && 
        process.env.BOND_MINT_1
      )
    };

    return NextResponse.json({
      success: true,
      data: status
    } as ApiResponse);

  } catch (error) {
    console.error('❌ Failed to get blockchain status:', error);
    
    return NextResponse.json(
      { success: false, error: 'Failed to get blockchain status' } as ApiResponse,
      { status: 500 }
    );
  }
}
