#!/usr/bin/env tsx

/**
 * Service Startup Script
 * Starts the Oracle Publisher and Event Reconciler services
 */

import { oraclePublisher } from '../services/oracle-publisher';
import { eventReconciler } from '../services/event-reconciler';

async function startServices() {
  console.log('🚀 Starting NyayChain Backend Services...\n');

  try {
    // Load environment variables
    if (!process.env.NODE_ENV) {
      process.env.NODE_ENV = 'development';
    }

    console.log('📊 Environment:', process.env.NODE_ENV);
    console.log('🔑 Database URL:', process.env.DATABASE_URL ? '✅ Configured' : '❌ Missing');
    console.log('📮 Redis URL:', process.env.REDIS_URL ? '✅ Configured' : '❌ Missing');
    console.log('🔗 Aspero API:', process.env.ASPERO_API_BASE_URL ? '✅ Configured' : '❌ Missing');
    console.log('⛓️  Solana RPC:', process.env.SOLANA_RPC_URL ? '✅ Configured' : '❌ Missing');
    console.log('');

    // Start Oracle Publisher Service
    console.log('🔮 Starting Oracle Publisher Service...');
    await oraclePublisher.start();
    console.log('✅ Oracle Publisher Service started');

    // Start Event Reconciler Service
    console.log('🔄 Starting Event Reconciler Service...');
    await eventReconciler.start();
    console.log('✅ Event Reconciler Service started');

    console.log('\n🎉 All services started successfully!');
    console.log('📊 Service Status:');
    console.log('   - Oracle Publisher: Running');
    console.log('   - Event Reconciler: Running');
    console.log('');
    console.log('Press Ctrl+C to stop all services');

    // Set up graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down services...');
      
      try {
        oraclePublisher.stop();
        eventReconciler.stop();
        console.log('✅ All services stopped gracefully');
        process.exit(0);
      } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
      }
    });

    // Keep the process alive
    process.stdin.resume();

  } catch (error) {
    console.error('❌ Failed to start services:', error);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start services
startServices().catch(console.error);
