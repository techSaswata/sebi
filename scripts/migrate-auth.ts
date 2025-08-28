import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';
import { getSupabase } from '../lib/database';

// Load environment variables
config({ path: '.env.local' });

async function runAuthMigration() {
  console.log('🔄 Running auth schema migration...');

  try {
    const supabase = getSupabase();
    
    // Read the SQL file
    const sqlFile = join(process.cwd(), 'scripts', 'sql', '004_auth_schema.sql');
    const sql = readFileSync(sqlFile, 'utf-8');

    // Split SQL into individual statements (simple approach)
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📝 Found ${statements.length} SQL statements to execute...`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.length === 0) continue;

      console.log(`   ${i + 1}/${statements.length}: Executing statement...`);
      
      try {
        const { error } = await supabase.rpc('exec_sql', { sql_query: statement });
        
        if (error) {
          console.error(`❌ Error in statement ${i + 1}:`, error);
          // Continue with other statements
        } else {
          console.log(`   ✅ Statement ${i + 1} executed successfully`);
        }
      } catch (err) {
        console.error(`❌ Exception in statement ${i + 1}:`, err);
        // Continue with other statements
      }
    }

    console.log('✅ Auth schema migration completed!');
    
    // Verify the tables were created
    console.log('\n🔍 Verifying table creation...');
    const tables = ['users', 'accounts', 'sessions', 'user_profiles', 'user_wallets'];
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase.from(table).select('*').limit(1);
        if (error) {
          console.log(`   ❌ Table '${table}' not accessible: ${error.message}`);
        } else {
          console.log(`   ✅ Table '${table}' is ready`);
        }
      } catch (err) {
        console.log(`   ❌ Table '${table}' verification failed`);
      }
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
runAuthMigration().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
