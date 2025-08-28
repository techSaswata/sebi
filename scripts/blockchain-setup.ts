/**
 * Blockchain Setup Script
 * Sets up bond mints, USDC mint, and initializes markets for NyayChain
 */

import { PublicKey } from "@solana/web3.js";
import { blockchainClient } from '../services/blockchain-client';
import { marketplaceService } from '../services/marketplace-service';
import { getSupabase } from '@/lib/database';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

interface BondData {
  id: number;
  name: string;
  isin: string;
  issuer: string;
  face_value: number;
  listed_yield: number;
  bond_mint?: string;
}

class BlockchainSetup {
  
  /**
   * Main setup function
   */
  async run(): Promise<void> {
    console.log('🚀 Starting NyayChain blockchain setup...\n');

    try {
      // Step 1: Initialize blockchain client
      await this.initializeClient();

      // Step 2: Setup USDC mint (or use devnet USDC)
      const usdcMint = await this.setupUSDCMint();

      // Step 3: Get bonds from database
      const bonds = await this.getBondsFromDatabase();

      // Step 4: Create bond mints for top 2 bonds
      const bondMints = await this.createBondMints(bonds.slice(0, 2));

      // Step 5: Initialize markets
      await this.initializeMarkets(bondMints, usdcMint);

      // Step 6: Update environment variables
      await this.updateEnvironmentFile(bondMints, usdcMint);

      console.log('\n✅ Blockchain setup completed successfully!');
      console.log('\n📝 Next steps:');
      console.log('   1. Build the Anchor program: npm run blockchain:build');
      console.log('   2. Deploy to devnet: npm run blockchain:deploy');
      console.log('   3. Update ANCHOR_PROGRAM_ID in .env.local with deployed program ID');
      console.log('   4. Re-run this setup script after deployment');

    } catch (error) {
      console.error('❌ Setup failed:', error);
      process.exit(1);
    }
  }

  /**
   * Initialize blockchain client
   */
  private async initializeClient(): Promise<void> {
    console.log('1️⃣ Initializing blockchain client...');
    
    try {
      await blockchainClient.initialize();
      
      // Request airdrop for admin if needed (devnet only)
      const admin = blockchainClient.getAdminKeypair();
      const balance = await blockchainClient.getBalance(admin.publicKey);
      
      if (balance < 1) {
        console.log('   💰 Requesting SOL airdrop for admin...');
        await blockchainClient.requestAirdrop(admin.publicKey, 2);
      }
      
      console.log(`   ✅ Admin balance: ${balance.toFixed(4)} SOL`);
      console.log(`   ✅ Admin pubkey: ${admin.publicKey.toBase58()}\n`);
      
    } catch (error) {
      console.error('   ❌ Failed to initialize client:', error);
      throw error;
    }
  }

  /**
   * Setup USDC mint (use devnet USDC or create new one)
   */
  private async setupUSDCMint(): Promise<PublicKey> {
    console.log('2️⃣ Setting up USDC mint...');
    
    // Use devnet USDC mint
    const devnetUSDC = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
    
    try {
      // Verify the mint exists
      const connection = blockchainClient.getConnection();
      const mintInfo = await connection.getAccountInfo(devnetUSDC);
      
      if (mintInfo) {
        console.log(`   ✅ Using devnet USDC: ${devnetUSDC.toBase58()}\n`);
        return devnetUSDC;
      } else {
        throw new Error('Devnet USDC mint not found');
      }
    } catch (error) {
      console.log('   ⚠️ Devnet USDC not available, creating test USDC mint...');
      
      // Create a test USDC mint with 6 decimals
      const testUSDC = await blockchainClient.createTokenMint(6);
      console.log(`   ✅ Created test USDC: ${testUSDC.toBase58()}\n`);
      return testUSDC;
    }
  }

  /**
   * Get bonds from database
   */
  private async getBondsFromDatabase(): Promise<BondData[]> {
    console.log('3️⃣ Fetching bonds from database...');
    
    try {
      const supabase = getSupabase();
      const { data: bonds, error } = await supabase
        .from('bonds')
        .select('id, name, isin, issuer, face_value, listed_yield, bond_mint')
        .eq('status', 'active')
        .order('listed_yield', { ascending: false })
        .limit(5);

      if (error) throw error;

      if (!bonds || bonds.length === 0) {
        throw new Error('No active bonds found in database. Run seed:bonds first.');
      }

      console.log(`   ✅ Found ${bonds.length} active bonds`);
      bonds.forEach((bond, index) => {
        console.log(`   ${index + 1}. ${bond.name} (${bond.isin}) - Yield: ${bond.listed_yield}%`);
      });
      console.log('');

      return bonds as BondData[];
      
    } catch (error) {
      console.error('   ❌ Failed to fetch bonds:', error);
      throw error;
    }
  }

  /**
   * Create bond mints for selected bonds
   */
  private async createBondMints(bonds: BondData[]): Promise<{ bondId: number; mint: PublicKey; data: BondData }[]> {
    console.log('4️⃣ Creating bond token mints...');
    
    const bondMints: { bondId: number; mint: PublicKey; data: BondData }[] = [];
    
    for (const bond of bonds) {
      try {
        // Check if bond already has a mint
        if (bond.bond_mint && bond.bond_mint !== '') {
          try {
            const existingMint = new PublicKey(bond.bond_mint);
            console.log(`   ✅ Using existing mint for ${bond.name}: ${existingMint.toBase58()}`);
            bondMints.push({ bondId: bond.id, mint: existingMint, data: bond });
            continue;
          } catch (e) {
            console.log(`   ⚠️ Invalid mint address for ${bond.name}, creating new one...`);
          }
        }

        // Create new bond mint (0 decimals for bonds)
        const mint = await blockchainClient.createTokenMint(0);
        
        // Update database with mint address
        const supabase = getSupabase();
        await supabase
          .from('bonds')
          .update({ 
            bond_mint: mint.toBase58(),
            updated_at: new Date().toISOString()
          } as any)
          .eq('id', bond.id);

        console.log(`   ✅ Created mint for ${bond.name}: ${mint.toBase58()}`);
        bondMints.push({ bondId: bond.id, mint, data: bond });
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`   ❌ Failed to create mint for ${bond.name}:`, error);
      }
    }
    
    console.log('');
    return bondMints;
  }

  /**
   * Initialize markets for bond mints
   */
  private async initializeMarkets(
    bondMints: { bondId: number; mint: PublicKey; data: BondData }[],
    usdcMint: PublicKey
  ): Promise<void> {
    console.log('5️⃣ Initializing bond markets...');
    
    for (const { bondId, mint, data } of bondMints) {
      try {
        // Calculate initial price (face value converted to USDC with yield adjustment)
        const basePrice = data.face_value / 100000; // Convert from face_value scale
        const yieldAdjustment = (100 - data.listed_yield) / 100; // Simple yield discount
        const pricePerToken = Math.max(basePrice * yieldAdjustment, 1); // Minimum 1 USDC
        
        const marketConfig = {
          bondMint: mint,
          usdcMint,
          pricePerToken,
          initialLiquidity: 1000 // Mint 1000 bond tokens for initial liquidity
        };

        const result = await marketplaceService.createMarket(marketConfig);
        
        if (result.success) {
          console.log(`   ✅ Market initialized for ${data.name}`);
          console.log(`      Market PDA: ${result.marketPda.toBase58()}`);
          console.log(`      Price: ${pricePerToken.toFixed(2)} USDC per token`);
        } else {
          console.log(`   ⚠️ Market initialization skipped for ${data.name} (may already exist)`);
        }
        
        // Small delay between market initializations
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.error(`   ❌ Failed to initialize market for ${data.name}:`, error);
      }
    }
    
    console.log('');
  }

  /**
   * Update environment file with generated addresses
   */
  private async updateEnvironmentFile(
    bondMints: { bondId: number; mint: PublicKey; data: BondData }[],
    usdcMint: PublicKey
  ): Promise<void> {
    console.log('6️⃣ Updating environment variables...');
    
    try {
      const fs = await import('fs');
      let envContent = fs.readFileSync('.env.local', 'utf-8');
      
      // Update USDC mint
      envContent = envContent.replace(
        /USDC_MINT=.*/,
        `USDC_MINT=${usdcMint.toBase58()}`
      );
      
      // Update bond mints
      if (bondMints.length >= 1) {
        envContent = envContent.replace(
          /BOND_MINT_1=.*/,
          `BOND_MINT_1=${bondMints[0].mint.toBase58()}`
        );
      }
      
      if (bondMints.length >= 2) {
        envContent = envContent.replace(
          /BOND_MINT_2=.*/,
          `BOND_MINT_2=${bondMints[1].mint.toBase58()}`
        );
      }
      
      // Update market PDAs
      for (let i = 0; i < Math.min(bondMints.length, 2); i++) {
        const [marketPda] = await blockchainClient.deriveMarketPDA(bondMints[i].mint);
        envContent = envContent.replace(
          new RegExp(`MARKET_PDA_${i + 1}=.*`),
          `MARKET_PDA_${i + 1}=${marketPda.toBase58()}`
        );
      }
      
      // Update admin keypair info (public key only for security)
      const admin = blockchainClient.getAdminKeypair();
      envContent = envContent.replace(
        /BLOCKCHAIN_ADMIN_KEYPAIR=.*/,
        `BLOCKCHAIN_ADMIN_KEYPAIR=${admin.publicKey.toBase58()}`
      );
      
      fs.writeFileSync('.env.local', envContent);
      
      console.log('   ✅ Environment variables updated');
      console.log(`   📝 USDC_MINT=${usdcMint.toBase58()}`);
      bondMints.forEach((bond, index) => {
        console.log(`   📝 BOND_MINT_${index + 1}=${bond.mint.toBase58()}`);
      });
      console.log('');
      
    } catch (error) {
      console.error('   ❌ Failed to update environment file:', error);
    }
  }
}

// Run setup if called directly
if (require.main === module) {
  const setup = new BlockchainSetup();
  setup.run().catch(console.error);
}

export { BlockchainSetup };
