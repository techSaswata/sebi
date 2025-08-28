import { NextRequest, NextResponse } from 'next/server';
import { marketplaceService } from '@/services/marketplace-service';
import { PublicKey, Keypair } from '@solana/web3.js';
import { ApiResponse } from '@/types/api';

interface TradeRequest {
  bondMint: string;
  amount: number;
  side: 'buy' | 'sell';
  userWallet: string;
  // For demo purposes - in production, user would sign with their wallet
  userPrivateKey?: number[]; 
}

/**
 * POST /api/blockchain/trade - Execute a trade on the blockchain
 */
export async function POST(request: NextRequest) {
  try {
    const body: TradeRequest = await request.json();
    
    // Validate required fields
    if (!body.bondMint || !body.amount || !body.side || !body.userWallet) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: bondMint, amount, side, userWallet' } as ApiResponse,
        { status: 400 }
      );
    }

    if (body.side !== 'buy' && body.side !== 'sell') {
      return NextResponse.json(
        { success: false, error: 'Invalid side. Must be "buy" or "sell"' } as ApiResponse,
        { status: 400 }
      );
    }

    if (body.amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Amount must be greater than 0' } as ApiResponse,
        { status: 400 }
      );
    }

    // For demo purposes, create a keypair from provided private key
    // In production, the user would sign the transaction with their wallet
    let userKeypair: Keypair;
    if (body.userPrivateKey) {
      userKeypair = Keypair.fromSecretKey(new Uint8Array(body.userPrivateKey));
    } else {
      // Generate a demo keypair
      userKeypair = Keypair.generate();
      console.log('⚠️ Generated demo keypair for trade. Public key:', userKeypair.publicKey.toBase58());
    }

    const bondMint = new PublicKey(body.bondMint);

    let result;
    if (body.side === 'buy') {
      result = await marketplaceService.buyBonds(bondMint, userKeypair, body.amount);
    } else {
      result = await marketplaceService.sellBonds(bondMint, userKeypair, body.amount);
    }

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: {
          signature: result.signature,
          market_pda: result.marketPda.toBase58(),
          side: body.side,
          amount: result.amount,
          price: result.price,
          total_cost: result.totalCost,
          trader: userKeypair.publicKey.toBase58()
        },
        message: `${body.side} order executed successfully`
      } as ApiResponse);
    } else {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error || `${body.side} order failed`,
          data: {
            market_pda: result.marketPda.toBase58(),
            amount: body.amount
          }
        } as ApiResponse,
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('❌ Trade execution failed:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Trade execution failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      } as ApiResponse,
      { status: 500 }
    );
  }
}

/**
 * GET /api/blockchain/trade - Get trade history and market status
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bondMint = searchParams.get('bondMint');
    const userWallet = searchParams.get('userWallet');

    if (!bondMint) {
      return NextResponse.json(
        { success: false, error: 'bondMint parameter required' } as ApiResponse,
        { status: 400 }
      );
    }

    const bondMintPubkey = new PublicKey(bondMint);
    
    // Get market data
    const marketData = await marketplaceService.getMarketData(bondMintPubkey);
    
    if (!marketData) {
      return NextResponse.json(
        { success: false, error: 'Market not found for bond mint' } as ApiResponse,
        { status: 404 }
      );
    }

    // Convert market data to a serializable format
    const serializableMarketData = {
      bondMint: marketData.bondMint.toBase58(),
      usdcMint: marketData.usdcMint.toBase58(),
      pricePerToken: marketData.pricePerToken.toString(),
      vaultBond: marketData.vaultBond.toBase58(),
      vaultUsdc: marketData.vaultUsdc.toBase58(),
      admin: marketData.admin.toBase58(),
      paused: marketData.paused,
      bump: marketData.bump
    };

    return NextResponse.json({
      success: true,
      data: {
        market: serializableMarketData,
        userWallet,
        canTrade: !marketData.paused
      }
    } as ApiResponse);

  } catch (error) {
    console.error('❌ Failed to get trade data:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get trade data',
        details: error instanceof Error ? error.message : 'Unknown error'
      } as ApiResponse,
      { status: 500 }
    );
  }
}
