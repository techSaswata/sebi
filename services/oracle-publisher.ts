/**
 * Oracle Publisher Service
 * Fetches bond prices from external sources (Aspero API) and publishes updates
 */

import { query, getRedis, getSupabase } from '@/lib/database';
import { AsperoBond, AsperoApiResponse } from '@/types/api';
import { marketplaceService } from './marketplace-service';
import { PublicKey } from '@solana/web3.js';

interface PriceUpdate {
  market_id: number;
  bond_mint: string;
  old_price_scaled: number;
  new_price_scaled: number;
  source: string;
  change_percent: number;
}

class OraclePublisher {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;
  private redis = getRedis();

  constructor(
    private updateInterval = parseInt(process.env.ORACLE_UPDATE_INTERVAL || '60000'), // 1 minute default
    private apiBaseUrl = process.env.ASPERO_API_BASE_URL || '',
    private apiToken = process.env.ASPERO_JWT_TOKEN || ''
  ) {}

  /**
   * Start the oracle publisher service
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('Oracle publisher is already running');
      return;
    }

    console.log('Starting Oracle Publisher Service...');
    this.isRunning = true;

    // Run initial price fetch
    await this.fetchAndPublishPrices();

    // Set up interval for regular updates
    this.intervalId = setInterval(async () => {
      try {
        await this.fetchAndPublishPrices();
      } catch (error) {
        console.error('Error in oracle update cycle:', error);
      }
    }, this.updateInterval);

    console.log(`Oracle publisher started with ${this.updateInterval}ms interval`);
  }

  /**
   * Stop the oracle publisher service
   */
  stop(): void {
    if (!this.isRunning) {
      console.log('Oracle publisher is not running');
      return;
    }

    console.log('Stopping Oracle Publisher Service...');
    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    console.log('Oracle publisher stopped');
  }

  /**
   * Main function to fetch prices and publish updates
   */
  private async fetchAndPublishPrices(): Promise<void> {
    try {
      console.log('Fetching latest bond prices...');

      // Get Aspero bond data
      const asperoBonds = await this.fetchAsperoData();
      console.log(`Fetched ${asperoBonds.length} bonds from Aspero`);

      // Get our current market data
      const markets = await this.getCurrentMarkets();
      console.log(`Found ${markets.length} active markets`);

      // Match and calculate price updates
      const priceUpdates = await this.calculatePriceUpdates(asperoBonds, markets);
      console.log(`Generated ${priceUpdates.length} price updates`);

      // Publish updates to our API
      if (priceUpdates.length > 0) {
        await this.publishPriceUpdates(priceUpdates);
        console.log('Price updates published successfully');
      }

      // Update service status
      await this.updateServiceStatus('healthy', priceUpdates.length);

    } catch (error) {
      console.error('Error in fetchAndPublishPrices:', error);
      await this.updateServiceStatus('error', 0, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Fetch bond data from Aspero API
   */
  private async fetchAsperoData(): Promise<AsperoBond[]> {
    if (!this.apiBaseUrl || !this.apiToken) {
      console.warn('Aspero API not configured, using demo data');
      return this.getDemoBondData();
    }

    try {
      const response = await fetch(`${this.apiBaseUrl}/bff/api/v1/home`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      if (!response.ok) {
        throw new Error(`Aspero API error: ${response.status} ${response.statusText}`);
      }

      const data: AsperoApiResponse = await response.json();
      
      // Extract bonds from widgets
      const bonds: AsperoBond[] = [];
      for (const widget of data.widgets) {
        if (widget.config.widget_type === 'BOND_TILES' && Array.isArray(widget.data)) {
          bonds.push(...widget.data);
        }
      }

      return bonds;

    } catch (error) {
      console.error('Error fetching Aspero data:', error);
      // Fallback to demo data on error
      return this.getDemoBondData();
    }
  }

  /**
   * Get demo bond data for testing
   */
  private getDemoBondData(): AsperoBond[] {
    return [
      {
        id: "1351",
        isin: "INE0NES07261",
        name: "KEERTANA FINSERV PRIVATE LIMITED",

        credit_rating: "BBB+",
        credit_rating_agency: "INDIA RATING AND RESEARCH PVT. LTD",
        maturity_date: "2027-08-19",
        listed_yield: 13.7,
        coupon_rate: 11.1,
        min_investment: 9762.86,
        min_investment_per_unit: 9762.86,
        min_units_to_sell: 1,
        units_to_sell: 448,
        category: "NCD",
        sector: "",
        interest_payment_frequency: "Monthly",
        tag: ["NCD"],
        pref_buckets: [],
        logo_url: undefined
      },
      {
        id: "1322",
        isin: "INE01YL07383",
        name: "EARLYSALARY SERVICES PRIVATE LIMITED",

        credit_rating: "A-",
        credit_rating_agency: "CARE",
        maturity_date: "2027-03-05",
        listed_yield: 11.6,
        coupon_rate: 10.7,
        min_investment: 99444.04,
        min_investment_per_unit: 99444.04,
        min_units_to_sell: 1,
        units_to_sell: 25,
        category: "NCD",
        sector: "",
        interest_payment_frequency: "Monthly",
        tag: ["NCD"],
        pref_buckets: [],
        logo_url: undefined
      }
    ];
  }

  /**
   * Get current market data from database
   */
  private async getCurrentMarkets(): Promise<any[]> {
    const result = await query(`
      SELECT 
        m.id as market_id,
        m.price_per_token_scaled as current_price,
        m.paused,
        b.isin,
        b.name,
        b.issuer,
        b.bond_mint,
        b.status as bond_status
      FROM markets m
      JOIN bonds b ON m.bond_id = b.id
      WHERE m.paused = false AND b.status = 'active'
    `);

    return result.rows;
  }

  /**
   * Calculate price updates by matching Aspero data with our markets
   */
  private async calculatePriceUpdates(asperoBonds: AsperoBond[], markets: any[]): Promise<PriceUpdate[]> {
    const updates: PriceUpdate[] = [];

    for (const market of markets) {
      // Try to match by ISIN first, then by name
      let asperoBond = asperoBonds.find(bond => bond.isin === market.isin);
      
      if (!asperoBond) {
        asperoBond = asperoBonds.find(bond => 
          bond.name.toLowerCase().includes(market.name.toLowerCase()) ||
          market.name.toLowerCase().includes(bond.name.toLowerCase())
        );
      }

      if (!asperoBond) {
        continue; // No matching bond found
      }

      // Calculate new price from yield
      const newPriceScaled = this.calculatePriceFromYield(
        asperoBond.listed_yield,
        asperoBond.coupon_rate,
        asperoBond.maturity_date,
        asperoBond.min_investment_per_unit
      );

      const oldPriceScaled = market.current_price;
      const changePercent = ((newPriceScaled - oldPriceScaled) / oldPriceScaled) * 100;

      // Only update if price change is significant (> 0.1%) and reasonable (< 10%)
      if (Math.abs(changePercent) > 0.1 && Math.abs(changePercent) < 10) {
        updates.push({
          market_id: market.market_id,
          bond_mint: market.bond_mint,
          old_price_scaled: oldPriceScaled,
          new_price_scaled: newPriceScaled,
          source: 'aspero',
          change_percent: changePercent
        });
      }
    }

    return updates;
  }

  /**
   * Calculate bond price from yield (simplified bond pricing model)
   */
  private calculatePriceFromYield(
    yieldToMaturity: number,
    couponRate: number,
    maturityDate: string,
    faceValue: number
  ): number {
    try {
      const maturity = new Date(maturityDate);
      const now = new Date();
      const yearsToMaturity = (maturity.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 365.25);

      if (yearsToMaturity <= 0) {
        return Math.floor(faceValue * 1000000); // Return scaled face value for matured bonds
      }

      // Simple bond pricing: PV = C * [1 - (1 + r)^-n] / r + FV / (1 + r)^n
      const r = yieldToMaturity / 100;
      const c = (couponRate / 100) * faceValue;
      const n = yearsToMaturity;

      // Present value of coupon payments
      const pvCoupons = c * (1 - Math.pow(1 + r, -n)) / r;
      
      // Present value of face value
      const pvFaceValue = faceValue / Math.pow(1 + r, n);
      
      const price = pvCoupons + pvFaceValue;
      
      // Return scaled price (multiply by 1,000,000 for precision)
      return Math.floor(price * 1000000);

    } catch (error) {
      console.error('Error calculating price from yield:', error);
      return Math.floor(faceValue * 1000000); // Fallback to face value
    }
  }

  /**
   * Publish price updates to our API
   */
  private async publishPriceUpdates(updates: PriceUpdate[]): Promise<void> {
    try {
      const response = await fetch(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/api/oracle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.ADMIN_API_KEY}`,
          'X-Oracle-Service': 'true'
        },
        body: JSON.stringify(updates.map(update => ({
          market_id: update.market_id,
          new_price_scaled: update.new_price_scaled,
          source: update.source
        })))
      });

      if (!response.ok) {
        throw new Error(`Failed to publish price updates: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Price update result:', result);

      // Publish to Redis for real-time updates
      for (const update of updates) {
        await this.redis.publish('price_updates', JSON.stringify({
          type: 'price_update',
          data: update,
          timestamp: new Date().toISOString()
        }));
      }

    } catch (error) {
      console.error('Error publishing price updates:', error);
      throw error;
    }
  }

  /**
   * Update service status in Redis
   */
  private async updateServiceStatus(status: string, updatesCount: number, error?: string): Promise<void> {
    try {
      const statusData = {
        status,
        last_update: new Date().toISOString(),
        updates_published: updatesCount,
        error: error || null,
        service: 'oracle-publisher'
      };

      await this.redis.setex('oracle:status', 300, JSON.stringify(statusData)); // 5 minute TTL

    } catch (redisError) {
      console.error('Error updating service status:', redisError);
    }
  }

  /**
   * Get current service status
   */
  async getStatus(): Promise<any> {
    try {
      const statusData = await this.redis.get('oracle:status');
      return statusData ? JSON.parse(statusData) : null;
    } catch (error) {
      console.error('Error getting service status:', error);
      return null;
    }
  }

  /**
   * Update on-chain price for a market (blockchain integration)
   */
  private async updateOnChainPrice(bondMint: string, priceScaled: number): Promise<void> {
    try {
      // Skip if blockchain program not configured
      if (!process.env.ANCHOR_PROGRAM_ID || !bondMint) {
        return;
      }

      const priceInUsdc = priceScaled / 1_000_000;
      const bondMintPubkey = new PublicKey(bondMint);
      
      const success = await marketplaceService.updatePrice(bondMintPubkey, priceInUsdc);
      
      if (success) {
        console.log(`🔗 On-chain price updated for ${bondMint}: ${priceInUsdc.toFixed(6)} USDC`);
      } else {
        console.log(`⚠️ On-chain price update failed for ${bondMint}, database updated only`);
      }
      
    } catch (error) {
      console.error(`❌ Blockchain price update error for ${bondMint}:`, error);
      // Don't fail the entire process if blockchain update fails
    }
  }

  /**
   * Enhanced price update with blockchain integration
   */
  async updateMarketPriceWithBlockchain(marketId: number, newPriceScaled: number): Promise<boolean> {
    try {
      // Get market data including bond_mint
      const supabase = getSupabase();
      const { data: market } = await supabase
        .from('bond_market_view')
        .select('bond_mint, name')
        .eq('market_id', marketId)
        .single();

      if (!market) {
        console.error('❌ Market not found for ID:', marketId);
        return false;
      }

      // Update database price
      const { error } = await (supabase
        .from('markets') as any)
        .update({
          price_per_token_scaled: newPriceScaled,
          updated_at: new Date().toISOString()
        })
        .eq('id', marketId);

      if (error) {
        console.error('❌ Database price update failed:', error);
        return false;
      }

      // Update blockchain price
      await this.updateOnChainPrice((market as any).bond_mint, newPriceScaled);

      console.log(`✅ Price updated for ${(market as any).name}: ${(newPriceScaled / 1_000_000).toFixed(6)} USDC`);
      return true;

    } catch (error) {
      console.error('❌ Enhanced price update failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const oraclePublisher = new OraclePublisher();

// For testing and manual control
export { OraclePublisher };

// Auto-start in production
if (process.env.NODE_ENV === 'production' && process.env.ORACLE_AUTO_START === 'true') {
  oraclePublisher.start().catch(console.error);
}
