#!/usr/bin/env tsx

/**
 * Bond Seeding Script
 * Usage: npm run seed:bonds
 */

// Load environment variables
import { config } from 'dotenv';
config({ path: '.env.local' });

import { bondSeeder } from '../services/bond-seeder';

async function main() {
  console.log('🚀 Bond Seeding Script Started');
  console.log('================================');

  try {
    // Show current stats
    console.log('📊 Current database stats:');
    const currentStats = await bondSeeder.getBondStats();
    console.log(JSON.stringify(currentStats, null, 2));
    console.log('');

    // Seed bonds from Aspero API
    await bondSeeder.seedBonds();
    console.log('');

    // Show updated stats
    console.log('📊 Updated database stats:');
    const updatedStats = await bondSeeder.getBondStats();
    console.log(JSON.stringify(updatedStats, null, 2));

    console.log('');
    console.log('✅ Bond seeding completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Bond seeding failed:', error);
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  console.error('💥 Unhandled Rejection:', error);
  process.exit(1);
});

// Run the script
main();
