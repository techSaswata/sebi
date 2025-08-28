/**
 * Bond Seeder Service
 * Populates the database with bond data from Aspero API using Supabase
 */

import { supabaseInsert, supabaseSelect, getSupabase } from '@/lib/database';
import { fetchAsperoHome, flattenAsperoBonds, AsperoBond } from '@/lib/aspero';

class BondSeeder {
  /**
   * Seed bonds from Aspero API into the database
   */
  async seedBonds(): Promise<void> {
    try {
      console.log('🌱 Starting bond seeding from Aspero API...');

      // Fetch data from Aspero
      const asperoResponse = await fetchAsperoHome();
      const bonds = flattenAsperoBonds(asperoResponse);
      
      console.log(`📊 Found ${bonds.length} bonds from Aspero API`);

      if (bonds.length === 0) {
        console.log('⚠️ No bonds found from Aspero API');
        return;
      }

      let inserted = 0;
      let updated = 0;
      let skipped = 0;

      for (const bond of bonds) {
        try {
          const result = await this.upsertBond(bond);
          
          if (result.isNew) {
            inserted++;
          } else {
            updated++;
          }
        } catch (error) {
          console.error(`❌ Error processing bond ${bond.isin}:`, error);
          skipped++;
        }
      }

      console.log(`✅ Bond seeding completed:`);
      console.log(`   📈 Inserted: ${inserted}`);
      console.log(`   🔄 Updated: ${updated}`);
      console.log(`   ⏭️ Skipped: ${skipped}`);

    } catch (error) {
      console.error('❌ Error in bond seeding:', error);
      throw error;
    }
  }

  /**
   * Insert or update a single bond in the database using Supabase
   */
  private async upsertBond(bond: AsperoBond): Promise<{ isNew: boolean }> {
    // Generate a bond_mint address (placeholder for now)
    const bondMint = this.generateBondMintAddress(bond.isin);
    
    // Convert string values to numbers
    const minInvestment = typeof bond.min_investment === 'string' 
      ? parseFloat(bond.min_investment) 
      : bond.min_investment || 0;

    const minInvestmentPerUnit = typeof bond.min_investment_per_unit === 'string'
      ? parseFloat(bond.min_investment_per_unit)
      : bond.min_investment_per_unit || minInvestment;

    // Check if bond already exists
    const supabase = getSupabase();
    const { data: existingBonds } = await supabase
      .from('bonds')
      .select('id, created_at, updated_at')
      .eq('isin', bond.isin);

    const bondData = {
      bond_mint: bondMint,
      isin: bond.isin,
      issuer: bond.name, // using name as issuer for now
      name: bond.name,
      coupon_rate: bond.coupon_rate || 0,
      maturity_date: bond.maturity_date || '2030-12-31',
      face_value: minInvestmentPerUnit || 100000,
      decimals: 6,
      total_supply: (bond.units_to_sell || 1000) * 1000000,
      credit_rating: bond.credit_rating,
      credit_rating_agency: bond.credit_rating_agency,
      sector: bond.sector || 'Finance',
      interest_payment_frequency: bond.interest_payment_frequency || 'Monthly',
      listed_yield: bond.listed_yield || bond.coupon_rate || 0,
      min_investment: minInvestment,
      logo_url: bond.logo_url,
      status: 'active'
    };

    if (existingBonds && existingBonds.length > 0) {
      // Update existing bond
      const { data, error } = await (supabase
        .from('bonds') as any)
        .update({
          issuer: bondData.issuer,
          name: bondData.name,
          coupon_rate: bondData.coupon_rate,
          maturity_date: bondData.maturity_date,
          credit_rating: bondData.credit_rating,
          credit_rating_agency: bondData.credit_rating_agency,
          sector: bondData.sector,
          interest_payment_frequency: bondData.interest_payment_frequency,
          listed_yield: bondData.listed_yield,
          min_investment: bondData.min_investment,
          logo_url: bondData.logo_url,
          updated_at: new Date().toISOString()
        } as any)
        .eq('isin', bond.isin)
        .select();

      if (error) throw error;
      return { isNew: false };
    } else {
      // Insert new bond
      const { data, error } = await supabase
        .from('bonds')
        .insert(bondData as any)
        .select();

      if (error) throw error;
      return { isNew: true };
    }
  }

  /**
   * Generate a deterministic bond mint address from ISIN
   */
  private generateBondMintAddress(isin: string): string {
    // In a real implementation, this would create actual Solana mint addresses
    // For now, generate a deterministic placeholder
    const base58chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    let hash = 0;
    for (let i = 0; i < isin.length; i++) {
      hash = ((hash << 5) - hash + isin.charCodeAt(i)) & 0xffffffff;
    }
    
    let result = '';
    for (let i = 0; i < 44; i++) {
      result += base58chars[Math.abs(hash + i) % base58chars.length];
    }
    
    return result;
  }

  /**
   * Clear all bonds from database (useful for testing)
   */
  async clearBonds(): Promise<void> {
    console.log('🗑️ Clearing all bonds from database...');
    const supabase = getSupabase();
    const { error } = await supabase.from('bonds').delete().neq('id', 0); // Delete all
    if (error) throw error;
    console.log('✅ All bonds cleared');
  }

  /**
   * Get bond statistics using Supabase
   */
  async getBondStats(): Promise<any> {
    const supabase = getSupabase();
    
    // Get basic stats
    const { data: bonds, error } = await supabase
      .from('bonds')
      .select('status, coupon_rate, listed_yield, credit_rating');

    if (error) throw error;

    if (!bonds || bonds.length === 0) {
      return {
        total_bonds: 0,
        active_bonds: 0,
        avg_coupon_rate: 0,
        avg_yield: 0,
        unique_ratings: 0
      };
    }

    const totalBonds = bonds.length;
    const activeBonds = bonds.filter((b: any) => b.status === 'active').length;
    const avgCouponRate = bonds.reduce((sum: number, b: any) => sum + (Number(b.coupon_rate) || 0), 0) / totalBonds;
    const avgYield = bonds.reduce((sum: number, b: any) => sum + (Number(b.listed_yield) || 0), 0) / totalBonds;
    const uniqueRatings = new Set(bonds.map((b: any) => b.credit_rating).filter(Boolean)).size;

    return {
      total_bonds: totalBonds,
      active_bonds: activeBonds,
      avg_coupon_rate: Number(avgCouponRate.toFixed(2)),
      avg_yield: Number(avgYield.toFixed(2)),
      unique_ratings: uniqueRatings
    };
  }
}

// Export singleton instance
export const bondSeeder = new BondSeeder();

// Export class for testing
export { BondSeeder };