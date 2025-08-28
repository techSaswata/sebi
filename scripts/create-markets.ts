#!/usr/bin/env tsx

/**
 * Create Markets Script
 * Creates market entries for existing bonds
 */

// Load environment variables
import { config } from 'dotenv';
config({ path: '.env.local' });

import { getSupabase } from '../lib/database';

async function main() {
  console.log('🚀 Market Creation Script Started');
  console.log('=================================');

  try {
    const supabase = getSupabase();
    
    // Get all bonds without markets
    const { data: bonds, error: bondsError } = await supabase
      .from('bonds')
      .select('id, name, bond_mint')
      .order('id');

    if (bondsError) {
      throw bondsError;
    }

    console.log(`📊 Found ${bonds?.length || 0} bonds`);

    if (!bonds || bonds.length === 0) {
      console.log('⚠️ No bonds found');
      return;
    }

    // Check existing markets
    const { data: existingMarkets, error: marketsError } = await supabase
      .from('markets')
      .select('bond_id');

    if (marketsError) {
      throw marketsError;
    }

    const existingBondIds = new Set(existingMarkets?.map(m => (m as any).bond_id) || []);
    const bondsNeedingMarkets = bonds.filter(bond => !existingBondIds.has(bond.id));

    console.log(`📈 ${bondsNeedingMarkets.length} bonds need markets`);

    let created = 0;

    for (const bond of bondsNeedingMarkets) {
      try {
        // Generate market PDA (placeholder)
        const marketPda = generateMarketPDA(bond.bond_mint);
        
        // Generate vault accounts (placeholders)
        const vaultBond = generateVaultAccount(bond.bond_mint, 'bond');
        const vaultUsdc = generateVaultAccount(bond.bond_mint, 'usdc');
        
        // Create market
        const { data: market, error: createError } = await supabase
          .from('markets')
          .insert({
            bond_id: bond.id,
            market_pda: marketPda,
            usdc_mint: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU', // USDC devnet
            price_per_token_scaled: 1000000, // 1.0 USDC scaled
            vault_bond_account: vaultBond,
            vault_usdc_account: vaultUsdc,
            admin_pubkey: 'Admin123456789ABCDEFGHJ', // Placeholder
            paused: false,
            liquidity_bond: 1000000, // 1M tokens
            liquidity_usdc: 1000000  // 1M USDC
          })
          .select()
          .single();

        if (createError) {
          console.error(`❌ Error creating market for bond ${bond.id}:`, createError);
          continue;
        }

        console.log(`✅ Created market for: ${bond.name}`);
        created++;

      } catch (error) {
        console.error(`❌ Error processing bond ${bond.id}:`, error);
      }
    }

    console.log('');
    console.log(`✅ Market creation completed:`);
    console.log(`   📈 Created: ${created} markets`);
    console.log(`   💼 Total bonds: ${bonds.length}`);

  } catch (error) {
    console.error('❌ Market creation failed:', error);
    process.exit(1);
  }
}

function generateMarketPDA(bondMint: string): string {
  // Generate deterministic market PDA from bond mint
  const base58chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let hash = 0;
  for (let i = 0; i < bondMint.length; i++) {
    hash = ((hash << 7) - hash + bondMint.charCodeAt(i)) & 0xffffffff;
  }
  
  let result = 'MKT';
  for (let i = 0; i < 41; i++) {
    result += base58chars[Math.abs(hash + i * 7) % base58chars.length];
  }
  
  return result;
}

function generateVaultAccount(bondMint: string, type: 'bond' | 'usdc'): string {
  // Generate deterministic vault account
  const prefix = type === 'bond' ? 'VLT' : 'USD';
  const base58chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let hash = 0;
  for (let i = 0; i < bondMint.length; i++) {
    hash = ((hash << 5) - hash + bondMint.charCodeAt(i) + (type === 'usdc' ? 1000 : 0)) & 0xffffffff;
  }
  
  let result = prefix;
  for (let i = 0; i < 41; i++) {
    result += base58chars[Math.abs(hash + i * 3) % base58chars.length];
  }
  
  return result;
}

// Run the script
main().catch(console.error);
