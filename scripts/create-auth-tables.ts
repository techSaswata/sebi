import { config } from 'dotenv';
import { getSupabase } from '../lib/database';

// Load environment variables
config({ path: '.env.local' });

async function createAuthTables() {
  console.log('🔄 Creating auth tables...');

  const supabase = getSupabase();

  // Create the essential tables one by one
  const tables = [
    {
      name: 'users',
      sql: `
        CREATE TABLE IF NOT EXISTS users (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          name VARCHAR(255),
          email VARCHAR(255) UNIQUE,
          email_verified TIMESTAMP WITH TIME ZONE,
          image TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `
    },
    {
      name: 'accounts',
      sql: `
        CREATE TABLE IF NOT EXISTS accounts (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          type VARCHAR(255) NOT NULL,
          provider VARCHAR(255) NOT NULL,
          provider_account_id VARCHAR(255) NOT NULL,
          refresh_token TEXT,
          access_token TEXT,
          expires_at BIGINT,
          token_type VARCHAR(255),
          scope VARCHAR(255),
          id_token TEXT,
          session_state VARCHAR(255),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `
    },
    {
      name: 'sessions',
      sql: `
        CREATE TABLE IF NOT EXISTS sessions (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          session_token VARCHAR(255) UNIQUE NOT NULL,
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          expires TIMESTAMP WITH TIME ZONE NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `
    },
    {
      name: 'verification_tokens',
      sql: `
        CREATE TABLE IF NOT EXISTS verification_tokens (
          identifier VARCHAR(255) NOT NULL,
          token VARCHAR(255) UNIQUE NOT NULL,
          expires TIMESTAMP WITH TIME ZONE NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `
    },
    {
      name: 'user_profiles',
      sql: `
        CREATE TABLE IF NOT EXISTS user_profiles (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          display_name VARCHAR(255),
          bio TEXT,
          location VARCHAR(255),
          website VARCHAR(500),
          investment_experience VARCHAR(50),
          risk_tolerance VARCHAR(50),
          preferred_investment_amount DECIMAL(15, 2),
          kyc_status VARCHAR(50) DEFAULT 'not_started',
          kyc_documents JSONB,
          settings JSONB DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `
    },
    {
      name: 'user_wallets',
      sql: `
        CREATE TABLE IF NOT EXISTS user_wallets (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          wallet_address VARCHAR(100) NOT NULL,
          wallet_type VARCHAR(50) NOT NULL,
          nickname VARCHAR(100),
          is_primary BOOLEAN DEFAULT FALSE,
          last_used_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(user_id, wallet_address)
        )
      `
    }
  ];

  for (const table of tables) {
    try {
      console.log(`📝 Creating table: ${table.name}...`);
      
      // Use a simple INSERT to test table access, then create if needed
      try {
        await supabase.from(table.name).select('id').limit(1);
        console.log(`   ✅ Table '${table.name}' already exists`);
      } catch (error) {
        console.log(`   🔄 Creating table '${table.name}'...`);
        // Table doesn't exist, let's create it
        // Note: This is a simplified approach, in production you'd want proper migrations
        console.log(`   ⚠️  Table creation needs to be done via Supabase SQL editor`);
        console.log(`   SQL for ${table.name}:`);
        console.log(table.sql);
        console.log('');
      }
    } catch (error) {
      console.error(`❌ Error with table ${table.name}:`, error);
    }
  }

  console.log('✅ Auth tables setup completed!');
  console.log('\n📋 Next steps:');
  console.log('1. Copy the SQL above into Supabase SQL Editor');
  console.log('2. Run each CREATE TABLE statement');
  console.log('3. Verify tables are created');
}

createAuthTables().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
