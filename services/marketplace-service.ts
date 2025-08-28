/**
 * Marketplace Service
 * Handles bond trading operations on the Solana blockchain
 */

import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Keypair } from "@solana/web3.js";
import { getOrCreateAssociatedTokenAccount, mintTo, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { blockchainClient } from './blockchain-client';
import { getSupabase } from '@/lib/database';

export interface MarketConfig {
  bondMint: PublicKey;
  usdcMint: PublicKey;
  pricePerToken: number; // Price in USDC (scaled by 1e6)
  initialLiquidity: number; // Number of bond tokens to mint to vault
}

export interface TradeResult {
  success: boolean;
  signature?: string;
  error?: string;
  marketPda: PublicKey;
  amount: number;
  price: number;
  totalCost: number;
}

export class MarketplaceService {
  private initialized = false;

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    if (!this.initialized) {
      await blockchainClient.initialize();
      this.initialized = true;
    }
  }

  /**
   * Create and initialize a new bond market
   */
  async createMarket(config: MarketConfig): Promise<{ marketPda: PublicKey; success: boolean }> {
    await this.initialize();

    try {
      const program = blockchainClient.getProgram();
      const admin = blockchainClient.getAdminKeypair();
      const connection = blockchainClient.getConnection();

      // Derive market PDA
      const [marketPda, bump] = await blockchainClient.deriveMarketPDA(config.bondMint);

      // Check if market already exists
      if (await blockchainClient.marketExists(config.bondMint)) {
        console.log(`Market already exists for bond: ${config.bondMint.toBase58()}`);
        return { marketPda, success: true };
      }

      // Create vault token accounts
      const vaultBond = await getOrCreateAssociatedTokenAccount(
        connection,
        admin,
        config.bondMint,
        marketPda,
        true // allowOwnerOffCurve
      );

      const vaultUsdc = await getOrCreateAssociatedTokenAccount(
        connection,
        admin,
        config.usdcMint,
        marketPda,
        true
      );

      // Mint initial bond token supply to vault for liquidity
      if (config.initialLiquidity > 0) {
        await mintTo(
          connection,
          admin,
          config.bondMint,
          vaultBond.address,
          admin,
          config.initialLiquidity
        );
        console.log(`✅ Minted ${config.initialLiquidity} bond tokens to vault`);
      }

      // Convert price to u128 (scaled by 1e6 for USDC)
      const priceScaled = new anchor.BN(config.pricePerToken * 1_000_000);

      // Initialize market
      const signature = await program.methods
        .initializeMarket(priceScaled)
        .accounts({
          market: marketPda,
          bondMint: config.bondMint,
          usdcMint: config.usdcMint,
          vaultBond: vaultBond.address,
          vaultUsdc: vaultUsdc.address,
          admin: admin.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        } as any)
        .rpc();

      console.log('✅ Market initialized:', marketPda.toBase58());
      console.log('   Transaction:', signature);

      // Update database with market information
      await this.updateDatabaseMarket(config.bondMint, marketPda, vaultBond.address, vaultUsdc.address, false);

      return { marketPda, success: true };

    } catch (error) {
      console.error('❌ Failed to create market:', error);
      return { marketPda: PublicKey.default, success: false };
    }
  }

  /**
   * Execute a buy order
   */
  async buyBonds(
    bondMint: PublicKey,
    buyerKeypair: Keypair,
    amount: number
  ): Promise<TradeResult> {
    await this.initialize();

    try {
      const program = blockchainClient.getProgram();
      const connection = blockchainClient.getConnection();

      // Get market PDA
      const [marketPda] = await blockchainClient.deriveMarketPDA(bondMint);
      const marketAccount = await blockchainClient.getMarketAccount(marketPda);
      
      if (!marketAccount) {
        return {
          success: false,
          error: 'Market not found',
          marketPda,
          amount,
          price: 0,
          totalCost: 0
        };
      }

      if (marketAccount.paused) {
        return {
          success: false,
          error: 'Market is paused',
          marketPda,
          amount,
          price: 0,
          totalCost: 0
        };
      }

      // Get or create buyer token accounts
      const buyerUsdc = await getOrCreateAssociatedTokenAccount(
        connection,
        buyerKeypair,
        marketAccount.usdcMint,
        buyerKeypair.publicKey
      );

      const buyerBond = await getOrCreateAssociatedTokenAccount(
        connection,
        buyerKeypair,
        marketAccount.bondMint,
        buyerKeypair.publicKey
      );

      // Calculate price
      const pricePerToken = marketAccount.pricePerToken.toNumber() / 1_000_000;
      const totalCost = amount * pricePerToken;

      // Execute buy transaction
      const signature = await program.methods
        .buy(new anchor.BN(amount))
        .accounts({
          market: marketPda,
          buyer: buyerKeypair.publicKey,
          buyerUsdc: buyerUsdc.address,
          buyerBond: buyerBond.address,
          vaultUsdc: marketAccount.vaultUsdc,
          vaultBond: marketAccount.vaultBond,
          tokenProgram: TOKEN_PROGRAM_ID,
        } as any)
        .signers([buyerKeypair])
        .rpc();

      console.log('✅ Buy order executed:', signature);

      // Record trade in database
      await this.recordTrade({
        signature,
        marketPda,
        trader: buyerKeypair.publicKey,
        side: 'buy',
        amount,
        price: pricePerToken,
        totalValue: totalCost
      });

      return {
        success: true,
        signature,
        marketPda,
        amount,
        price: pricePerToken,
        totalCost
      };

    } catch (error) {
      console.error('❌ Buy order failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        marketPda: PublicKey.default,
        amount,
        price: 0,
        totalCost: 0
      };
    }
  }

  /**
   * Execute a sell order
   */
  async sellBonds(
    bondMint: PublicKey,
    sellerKeypair: Keypair,
    amount: number
  ): Promise<TradeResult> {
    await this.initialize();

    try {
      const program = blockchainClient.getProgram();
      const connection = blockchainClient.getConnection();

      // Get market PDA
      const [marketPda] = await blockchainClient.deriveMarketPDA(bondMint);
      const marketAccount = await blockchainClient.getMarketAccount(marketPda);
      
      if (!marketAccount || marketAccount.paused) {
        return {
          success: false,
          error: marketAccount ? 'Market is paused' : 'Market not found',
          marketPda,
          amount,
          price: 0,
          totalCost: 0
        };
      }

      // Get seller token accounts
      const sellerUsdc = await getOrCreateAssociatedTokenAccount(
        connection,
        sellerKeypair,
        marketAccount.usdcMint,
        sellerKeypair.publicKey
      );

      const sellerBond = await getOrCreateAssociatedTokenAccount(
        connection,
        sellerKeypair,
        marketAccount.bondMint,
        sellerKeypair.publicKey
      );

      // Calculate price
      const pricePerToken = marketAccount.pricePerToken.toNumber() / 1_000_000;
      const totalValue = amount * pricePerToken;

      // Execute sell transaction
      const signature = await program.methods
        .sell(new anchor.BN(amount))
        .accounts({
          market: marketPda,
          seller: sellerKeypair.publicKey,
          sellerUsdc: sellerUsdc.address,
          sellerBond: sellerBond.address,
          vaultUsdc: marketAccount.vaultUsdc,
          vaultBond: marketAccount.vaultBond,
          tokenProgram: TOKEN_PROGRAM_ID,
        } as any)
        .signers([sellerKeypair])
        .rpc();

      console.log('✅ Sell order executed:', signature);

      // Record trade in database
      await this.recordTrade({
        signature,
        marketPda,
        trader: sellerKeypair.publicKey,
        side: 'sell',
        amount,
        price: pricePerToken,
        totalValue
      });

      return {
        success: true,
        signature,
        marketPda,
        amount,
        price: pricePerToken,
        totalCost: totalValue
      };

    } catch (error) {
      console.error('❌ Sell order failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        marketPda: PublicKey.default,
        amount,
        price: 0,
        totalCost: 0
      };
    }
  }

  /**
   * Update market price (admin only)
   */
  async updatePrice(bondMint: PublicKey, newPrice: number): Promise<boolean> {
    await this.initialize();

    try {
      const program = blockchainClient.getProgram();
      const admin = blockchainClient.getAdminKeypair();

      const [marketPda] = await blockchainClient.deriveMarketPDA(bondMint);
      const priceScaled = new anchor.BN(newPrice * 1_000_000);

      const signature = await program.methods
        .updatePrice(priceScaled)
        .accounts({
          market: marketPda,
          admin: admin.publicKey,
        } as any)
        .signers([admin])
        .rpc();

      console.log('✅ Price updated:', signature);

      // Update database
      const supabase = getSupabase();
      await (supabase
        .from('markets') as any)
        .update({ 
          price_per_token_scaled: newPrice * 1_000_000,
          updated_at: new Date().toISOString()
        })
        .eq('market_pda', marketPda.toBase58());

      return true;

    } catch (error) {
      console.error('❌ Failed to update price:', error);
      return false;
    }
  }

  /**
   * Pause/resume market (admin only)
   */
  async pauseMarket(bondMint: PublicKey): Promise<boolean> {
    await this.initialize();

    try {
      const program = blockchainClient.getProgram();
      const admin = blockchainClient.getAdminKeypair();

      const [marketPda] = await blockchainClient.deriveMarketPDA(bondMint);

      const signature = await program.methods
        .pause()
        .accounts({
          market: marketPda,
          admin: admin.publicKey,
        } as any)
        .signers([admin])
        .rpc();

      console.log('✅ Market paused:', signature);

      // Update database
      const supabase = getSupabase();
      await (supabase
        .from('markets') as any)
        .update({ 
          paused: true,
          updated_at: new Date().toISOString()
        })
        .eq('market_pda', marketPda.toBase58());

      return true;

    } catch (error) {
      console.error('❌ Failed to pause market:', error);
      return false;
    }
  }

  /**
   * Record trade in database
   */
  private async recordTrade(trade: {
    signature: string;
    marketPda: PublicKey;
    trader: PublicKey;
    side: 'buy' | 'sell';
    amount: number;
    price: number;
    totalValue: number;
  }): Promise<void> {
    try {
      const supabase = getSupabase();
      
      // Get market ID from database
      const { data: market } = await supabase
        .from('markets')
        .select('id')
        .eq('market_pda', trade.marketPda.toBase58())
        .single();

      if (market) {
        await (supabase
          .from('trades') as any)
          .insert({
            tx_signature: trade.signature,
            market_id: (market as any).id,
            user_wallet: trade.trader.toBase58(),
            side: trade.side,
            amount: trade.amount,
            price_scaled: Math.round(trade.price * 1_000_000),
            total_value: trade.totalValue,
            status: 'confirmed',
            confirmed_at: new Date().toISOString()
          } as any);

        console.log('✅ Trade recorded in database');
      }
    } catch (error) {
      console.error('❌ Failed to record trade:', error);
    }
  }

  /**
   * Update database with market information
   */
  private async updateDatabaseMarket(
    bondMint: PublicKey,
    marketPda: PublicKey,
    vaultBond: PublicKey,
    vaultUsdc: PublicKey,
    paused: boolean
  ): Promise<void> {
    try {
      const supabase = getSupabase();
      
      // Find bond by mint address
      const { data: bond } = await supabase
        .from('bonds')
        .select('id')
        .eq('bond_mint', bondMint.toBase58())
        .single();

      if (bond) {
        // Check if market already exists
        const { data: existingMarket } = await supabase
          .from('markets')
          .select('id')
          .eq('bond_id', (bond as any).id)
          .single();

        if (!existingMarket) {
          await (supabase
            .from('markets') as any)
            .insert({
              bond_id: (bond as any).id,
              market_pda: marketPda.toBase58(),
              usdc_mint: process.env.USDC_MINT,
              price_per_token_scaled: 1_000_000, // Default 1 USDC
              vault_bond_acct: vaultBond.toBase58(),
              vault_usdc_acct: vaultUsdc.toBase58(),
              admin_pubkey: blockchainClient.getAdminKeypair().publicKey.toBase58(),
              paused,
              liquidity_bond: 0,
              liquidity_usdc: 0
            } as any);

          console.log('✅ Market data saved to database');
        }
      }
    } catch (error) {
      console.error('❌ Failed to update database:', error);
    }
  }

  /**
   * Get market data for a bond
   */
  async getMarketData(bondMint: PublicKey): Promise<any> {
    await this.initialize();

    const [marketPda] = await blockchainClient.deriveMarketPDA(bondMint);
    return await blockchainClient.getMarketAccount(marketPda);
  }
}

// Export singleton instance
export const marketplaceService = new MarketplaceService();
