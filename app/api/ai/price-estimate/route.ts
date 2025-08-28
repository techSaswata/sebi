import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types/api';

// POST /api/ai/price-estimate - Get AI price estimation for a bond
export async function POST(request: NextRequest) {
  try {
    const { bond_id, market_id, features } = await request.json();

    if (!bond_id && !market_id) {
      return NextResponse.json(
        { success: false, error: 'Either bond_id or market_id is required' } as ApiResponse,
        { status: 400 }
      );
    }

    // Get bond and market data
    let bondData;
    if (bond_id) {
      const result = await query(`
        SELECT 
          b.*,
          m.price_per_token_scaled as current_price,
          m.id as market_id
        FROM bonds b
        LEFT JOIN markets m ON b.id = m.bond_id
        WHERE b.id = $1
      `, [bond_id]);
      
      if (result.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Bond not found' } as ApiResponse,
          { status: 404 }
        );
      }
      bondData = result.rows[0];
    } else {
      const result = await query(`
        SELECT 
          b.*,
          m.price_per_token_scaled as current_price,
          m.id as market_id
        FROM markets m
        JOIN bonds b ON m.bond_id = b.id
        WHERE m.id = $1
      `, [market_id]);
      
      if (result.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Market not found' } as ApiResponse,
          { status: 404 }
        );
      }
      bondData = result.rows[0];
    }

    // Create AI job record
    const jobResult = await query(`
      INSERT INTO ai_jobs (
        job_type, input_ref, input_data, status
      ) VALUES (
        'price_estimate', $1, $2, 'processing'
      ) RETURNING *
    `, [bondData.id.toString(), JSON.stringify({ bond_data: bondData, features })]);

    const job = jobResult.rows[0];

    try {
      // Calculate price estimate using ML model or heuristics
      const estimate = await calculatePriceEstimate(bondData, features);

      // Update job with results
      await query(`
        UPDATE ai_jobs 
        SET 
          output_json = $2,
          status = 'completed',
          confidence = $3,
          completed_at = NOW()
        WHERE id = $1
      `, [job.id, JSON.stringify(estimate), estimate.confidence]);

      return NextResponse.json({
        success: true,
        data: {
          job_id: job.id,
          estimate: estimate,
          bond_info: {
            id: bondData.id,
            name: bondData.name,
            issuer: bondData.issuer,
            current_price: bondData.current_price
          }
        },
        message: 'Price estimate completed'
      } as ApiResponse);

    } catch (estimateError) {
      // Update job with error
      await query(`
        UPDATE ai_jobs 
        SET 
          status = 'failed',
          error_message = $2,
          completed_at = NOW()
        WHERE id = $1
      `, [job.id, estimateError instanceof Error ? estimateError.message : 'Unknown error']);

      throw estimateError;
    }

  } catch (error) {
    console.error('Error in price estimation:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate price estimate' } as ApiResponse,
      { status: 500 }
    );
  }
}

// AI Price Estimation Logic
async function calculatePriceEstimate(bondData: { 
  maturity_date: string; 
  coupon_rate: number; 
  face_value: number; 
  credit_rating?: string; 
  listed_yield?: number; 
}, _features?: Record<string, unknown>) {
  const currentDate = new Date();
  const maturityDate = new Date(bondData.maturity_date);
  const timeToMaturity = (maturityDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25); // Years

  // Base features for estimation (for future ML model integration)
  // const bondFeatures = {
  //   coupon_rate: bondData.coupon_rate || 0,
  //   time_to_maturity: timeToMaturity,
  //   face_value: bondData.face_value || 1000000,
  //   credit_rating: getCreditRatingScore(bondData.credit_rating),
  //   current_yield: bondData.listed_yield || bondData.coupon_rate,
  //   ...features
  // };

  // Simple heuristic model (replace with actual ML model in production)
  const riskFreeRate = 7.0; // Assumed G-Sec rate
  const creditSpread = getCreditSpread(bondData.credit_rating);
  const liquidityPremium = 0.5; // Assumed liquidity premium
  
  const requiredYield = riskFreeRate + creditSpread + liquidityPremium;
  
  // Present value calculation
  const periodsPerYear = getPaymentFrequency(bondData.interest_payment_frequency);
  const totalPeriods = timeToMaturity * periodsPerYear;
  const periodRate = requiredYield / (100 * periodsPerYear);
  const couponPayment = (bondData.coupon_rate / 100) * bondData.face_value / periodsPerYear;

  let presentValue = 0;
  
  // Present value of coupon payments
  for (let i = 1; i <= totalPeriods; i++) {
    presentValue += couponPayment / Math.pow(1 + periodRate, i);
  }
  
  // Present value of principal
  presentValue += bondData.face_value / Math.pow(1 + periodRate, totalPeriods);

  // Convert to scaled price (per token)
  const pricePerToken = Math.floor(presentValue * 1000000 / bondData.face_value);

  // Calculate confidence based on data quality
  let confidence = 0.75; // Base confidence
  
  if (bondData.credit_rating) confidence += 0.1;
  if (bondData.listed_yield) confidence += 0.1;
  if (timeToMaturity > 0.1 && timeToMaturity < 10) confidence += 0.05;
  
  confidence = Math.min(confidence, 0.95);

  // Price range estimation
  const volatility = getVolatilityEstimate(bondData.credit_rating);
  const priceRange = {
    low: Math.floor(pricePerToken * (1 - volatility)),
    high: Math.floor(pricePerToken * (1 + volatility)),
    mid: pricePerToken
  };

  return {
    estimated_price_scaled: pricePerToken,
    price_range: priceRange,
    required_yield: requiredYield,
    time_to_maturity: timeToMaturity,
    credit_spread: creditSpread,
    confidence: confidence,
    factors: {
      risk_free_rate: riskFreeRate,
      credit_spread: creditSpread,
      liquidity_premium: liquidityPremium,
      coupon_rate: bondData.coupon_rate,
      payment_frequency: periodsPerYear
    },
    methodology: 'discounted_cash_flow',
    timestamp: new Date().toISOString()
  };
}

function _getCreditRatingScore(rating?: string): number {
  if (!rating) return 5;
  
  const ratingMap: { [key: string]: number } = {
    'AAA': 1, 'AA+': 2, 'AA': 3, 'AA-': 4,
    'A+': 5, 'A': 6, 'A-': 7,
    'BBB+': 8, 'BBB': 9, 'BBB-': 10,
    'BB+': 11, 'BB': 12, 'BB-': 13,
    'B+': 14, 'B': 15, 'B-': 16
  };
  
  return ratingMap[rating.toUpperCase()] || 10;
}

function getCreditSpread(rating?: string): number {
  if (!rating) return 2.0;
  
  const spreadMap: { [key: string]: number } = {
    'AAA': 0.5, 'AA+': 0.7, 'AA': 0.9, 'AA-': 1.1,
    'A+': 1.3, 'A': 1.5, 'A-': 1.8,
    'BBB+': 2.2, 'BBB': 2.5, 'BBB-': 3.0,
    'BB+': 4.0, 'BB': 5.0, 'BB-': 6.0,
    'B+': 7.0, 'B': 8.0, 'B-': 9.0
  };
  
  return spreadMap[rating.toUpperCase()] || 3.0;
}

function getPaymentFrequency(frequency?: string): number {
  if (!frequency) return 12;
  
  const freqMap: { [key: string]: number } = {
    'monthly': 12,
    'quarterly': 4,
    'half yearly': 2,
    'yearly': 1,
    'annual': 1
  };
  
  return freqMap[frequency.toLowerCase()] || 12;
}

function getVolatilityEstimate(rating?: string): number {
  if (!rating) return 0.15;
  
  const volMap: { [key: string]: number } = {
    'AAA': 0.05, 'AA+': 0.06, 'AA': 0.07, 'AA-': 0.08,
    'A+': 0.09, 'A': 0.10, 'A-': 0.12,
    'BBB+': 0.14, 'BBB': 0.16, 'BBB-': 0.18,
    'BB+': 0.20, 'BB': 0.25, 'BB-': 0.30,
    'B+': 0.35, 'B': 0.40, 'B-': 0.45
  };
  
  return volMap[rating.toUpperCase()] || 0.20;
}
