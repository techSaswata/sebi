#!/usr/bin/env tsx

/**
 * Database Migration Script
 * Runs database migrations and seeds demo data
 */

import fs from 'fs';
import path from 'path';
import { query, healthCheck, closeConnections } from '../lib/database';

async function runMigrations() {
  console.log('🗄️  Starting Database Migration...\n');

  try {
    // Check database connectivity
    console.log('🔍 Checking database connectivity...');
    const health = await healthCheck();
    
    if (!health.db) {
      throw new Error('❌ Cannot connect to database. Please check your DATABASE_URL.');
    }
    console.log('✅ Database connection successful');

    if (!health.redis) {
      console.log('⚠️  Redis connection failed - some features may not work');
    } else {
      console.log('✅ Redis connection successful');
    }

    // Get all SQL files in migration order
    const sqlDir = path.join(process.cwd(), 'scripts', 'sql');
    const sqlFiles = fs.readdirSync(sqlDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Files are named with prefixes for order

    console.log(`\n📁 Found ${sqlFiles.length} migration files:`);
    sqlFiles.forEach(file => console.log(`   - ${file}`));

    // Run each migration
    for (const file of sqlFiles) {
      console.log(`\n📝 Running migration: ${file}`);
      const filePath = path.join(sqlDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      
      try {
        await query(sql);
        console.log(`✅ Migration ${file} completed successfully`);
      } catch (error) {
        console.error(`❌ Migration ${file} failed:`, error);
        throw error;
      }
    }

    // Seed demo data if in development
    if (process.env.NODE_ENV === 'development') {
      console.log('\n🌱 Seeding demo data...');
      await seedDemoData();
      console.log('✅ Demo data seeded successfully');
    }

    console.log('\n🎉 Database migration completed successfully!');
    console.log('\n📊 Database Schema Summary:');
    
    // Show table counts
    const tables = ['bonds', 'markets', 'users', 'trades', 'positions', 'price_history', 'ai_jobs', 'system_events'];
    for (const table of tables) {
      try {
        const result = await query(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`   - ${table}: ${result.rows[0].count} records`);
      } catch (error) {
        console.log(`   - ${table}: Error counting records`);
      }
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await closeConnections();
  }
}

async function seedDemoData() {
  // Create demo bonds
  const demoBonds = [
    {
      bond_mint: 'DemoMint1ABC123456789XYZ',
      isin: 'INE0NES07261',
      issuer: 'KEERTANA FINSERV PRIVATE LIMITED',
      name: 'Keertana Finserv NCD Series A',
      coupon_rate: 11.1,
      maturity_date: '2027-08-19',
      face_value: 10000,
      total_supply: 10000000,
      credit_rating: 'BBB+',
      credit_rating_agency: 'INDIA RATING AND RESEARCH PVT. LTD',
      listed_yield: 13.7,
      min_investment: 9762.86
    },
    {
      bond_mint: 'DemoMint2DEF123456789XYZ',
      isin: 'INE01YL07383',
      issuer: 'EARLYSALARY SERVICES PRIVATE LIMITED',
      name: 'EarlySalary NCD Series B',
      coupon_rate: 10.7,
      maturity_date: '2027-03-05',
      face_value: 100000,
      total_supply: 5000000,
      credit_rating: 'A-',
      credit_rating_agency: 'CARE',
      listed_yield: 11.6,
      min_investment: 99444.04
    }
  ];

  for (const bond of demoBonds) {
    // Check if bond already exists
    const existing = await query('SELECT id FROM bonds WHERE bond_mint = $1', [bond.bond_mint]);
    
    if (existing.rows.length === 0) {
      // Create bond
      const bondResult = await query(`
        INSERT INTO bonds (
          bond_mint, isin, issuer, name, coupon_rate, maturity_date,
          face_value, total_supply, credit_rating, credit_rating_agency,
          listed_yield, min_investment
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id
      `, [
        bond.bond_mint, bond.isin, bond.issuer, bond.name,
        bond.coupon_rate, bond.maturity_date, bond.face_value,
        bond.total_supply, bond.credit_rating, bond.credit_rating_agency,
        bond.listed_yield, bond.min_investment
      ]);

      const bondId = bondResult.rows[0].id;

      // Create market for this bond
      const marketPda = `Market${bond.bond_mint.slice(-10)}`;
      const vaultBond = `VaultB${bond.bond_mint.slice(-10)}`;
      const vaultUsdc = `VaultU${bond.bond_mint.slice(-10)}`;
      
      await query(`
        INSERT INTO markets (
          bond_id, market_pda, price_per_token_scaled,
          vault_bond_account, vault_usdc_account, admin_pubkey,
          liquidity_bond, liquidity_usdc
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        bondId, marketPda, Math.floor(bond.min_investment * 1000000),
        vaultBond, vaultUsdc, 'AdminPubKey123456789',
        1000000, 0 // 1M bond tokens, 0 USDC initially
      ]);

      console.log(`   ✅ Created demo bond: ${bond.name}`);
    } else {
      console.log(`   ⏭️  Bond already exists: ${bond.name}`);
    }
  }

  // Create demo user
  const demoWallet = 'DemoWallet123456789ABCDEFGHIJKLMNOPQR';
  const userExists = await query('SELECT id FROM users WHERE wallet_address = $1', [demoWallet]);
  
  if (userExists.rows.length === 0) {
    await query(`
      INSERT INTO users (wallet_address, kyc_status)
      VALUES ($1, 'verified')
    `, [demoWallet]);
    console.log('   ✅ Created demo user');
  }
}

// Handle command line arguments
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
📚 Database Migration Script

Usage: npm run db:migrate [options]

Options:
  --help, -h     Show this help message
  --seed-only    Only run data seeding (skip migrations)
  --no-seed      Skip data seeding

Environment Variables:
  DATABASE_URL   PostgreSQL connection string (required)
  REDIS_URL      Redis connection string (optional)
  NODE_ENV       Environment (development/production)

Examples:
  npm run db:migrate              # Run migrations and seed data (if dev)
  npm run db:migrate --seed-only  # Only seed demo data
  npm run db:migrate --no-seed    # Skip seeding
`);
  process.exit(0);
}

// Run migrations
runMigrations().catch(console.error);
