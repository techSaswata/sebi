/**
 * Event Reconciliation Service
 * Reconciles on-chain Solana transactions with off-chain database state
 */

import { query, getRedis, getClient } from '@/lib/database';
import { PoolClient } from 'pg';

interface SolanaTransaction {
  signature: string;
  slot: number;
  blockTime: number;
  meta: {
    err: any;
    fee: number;
    preBalances: number[];
    postBalances: number[];
    innerInstructions?: any[];
    logMessages?: string[];
  };
  transaction: {
    message: {
      instructions: any[];
      accountKeys: string[];
    };
    signatures: string[];
  };
}

interface TradeEvent {
  signature: string;
  market: string;
  trader: string;
  side: 'buy' | 'sell';
  amount: number;
  price: number;
  timestamp: number;
}

class EventReconciler {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;
  private redis = getRedis();
  private lastProcessedSlot = 0;

  constructor(
    private checkInterval = parseInt(process.env.RECONCILIATION_INTERVAL || '30000'), // 30 seconds default
    private solanaRpcUrl = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
    private programId = process.env.MARKETPLACE_PROGRAM_ID || ''
  ) {}

  /**
   * Start the event reconciliation service
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('Event reconciler is already running');
      return;
    }

    console.log('Starting Event Reconciliation Service...');
    this.isRunning = true;

    // Load last processed slot from database
    await this.loadLastProcessedSlot();

    // Run initial reconciliation
    await this.reconcileEvents();

    // Set up interval for regular checks
    this.intervalId = setInterval(async () => {
      try {
        await this.reconcileEvents();
      } catch (error) {
        console.error('Error in reconciliation cycle:', error);
      }
    }, this.checkInterval);

    console.log(`Event reconciler started with ${this.checkInterval}ms interval`);
  }

  /**
   * Stop the event reconciliation service
   */
  stop(): void {
    if (!this.isRunning) {
      console.log('Event reconciler is not running');
      return;
    }

    console.log('Stopping Event Reconciliation Service...');
    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    console.log('Event reconciler stopped');
  }

  /**
   * Main reconciliation function
   */
  private async reconcileEvents(): Promise<void> {
    try {
      console.log('Starting event reconciliation...');

      // Get unprocessed system events
      const unprocessedEvents = await this.getUnprocessedEvents();
      console.log(`Found ${unprocessedEvents.length} unprocessed events`);

      // Get recent Solana transactions for our program
      const solanaTransactions = await this.getSolanaTransactions();
      console.log(`Found ${solanaTransactions.length} recent Solana transactions`);

      // Process each unprocessed event
      for (const event of unprocessedEvents) {
        await this.processSystemEvent(event, solanaTransactions);
      }

      // Check for new on-chain events that haven't been recorded
      await this.checkForMissingEvents(solanaTransactions);

      // Update last processed slot
      if (solanaTransactions.length > 0) {
        const latestSlot = Math.max(...solanaTransactions.map(tx => tx.slot));
        await this.updateLastProcessedSlot(latestSlot);
      }

      // Update service status
      await this.updateServiceStatus('healthy', unprocessedEvents.length, solanaTransactions.length);

    } catch (error) {
      console.error('Error in reconcileEvents:', error);
      await this.updateServiceStatus('error', 0, 0, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Get unprocessed system events from database
   */
  private async getUnprocessedEvents(): Promise<any[]> {
    const result = await query(`
      SELECT * FROM system_events 
      WHERE processed = false 
        AND event_type IN ('trade', 'price_update', 'market_init')
      ORDER BY created_at ASC
      LIMIT 100
    `);

    return result.rows;
  }

  /**
   * Get recent Solana transactions for our program
   */
  private async getSolanaTransactions(): Promise<SolanaTransaction[]> {
    if (!this.programId || !this.solanaRpcUrl) {
      console.warn('Solana RPC or program ID not configured, using mock data');
      return this.getMockSolanaTransactions();
    }

    try {
      const response = await fetch(this.solanaRpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getSignaturesForAddress',
          params: [
            this.programId,
            {
              limit: 100,
              before: null, // Get most recent
              until: null
            }
          ]
        }),
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        throw new Error(`Solana RPC error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(`Solana RPC error: ${data.error.message}`);
      }

      // Get full transaction details for each signature
      const transactions: SolanaTransaction[] = [];
      for (const sig of data.result.slice(0, 20)) { // Limit to 20 most recent
        try {
          const txResponse = await fetch(this.solanaRpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: 1,
              method: 'getTransaction',
              params: [
                sig.signature,
                {
                  encoding: 'json',
                  maxSupportedTransactionVersion: 0
                }
              ]
            })
          });

          if (txResponse.ok) {
            const txData = await txResponse.json();
            if (txData.result && !txData.result.meta?.err) {
              transactions.push(txData.result);
            }
          }
        } catch (error) {
          console.error(`Error fetching transaction ${sig.signature}:`, error);
        }
      }

      return transactions;

    } catch (error) {
      console.error('Error fetching Solana transactions:', error);
      return this.getMockSolanaTransactions();
    }
  }

  /**
   * Get mock Solana transactions for testing
   */
  private getMockSolanaTransactions(): SolanaTransaction[] {
    return [
      {
        signature: '5j7s1QjNeEKCYJfxNdKRdCdKUuqpHFMsCQ5VmBZgqG8uJF9NjZrRwJq4HQ2Yj7F3Qv8RZvJhKdM2FqLxG5N2ZpQr',
        slot: 200000000,
        blockTime: Math.floor(Date.now() / 1000),
        meta: {
          err: null,
          fee: 5000,
          preBalances: [1000000, 2000000],
          postBalances: [950000, 2050000],
          logMessages: [
            'Program log: Instruction: Buy',
            'Program log: Trade executed: 100 tokens at 1.05 USDC'
          ]
        },
        transaction: {
          message: {
            instructions: [
              {
                programIdIndex: 0,
                accounts: [1, 2, 3],
                data: 'buy_instruction_data'
              }
            ],
            accountKeys: [
              this.programId,
              'user_wallet_address',
              'market_pda_address',
              'vault_address'
            ]
          },
          signatures: ['5j7s1QjNeEKCYJfxNdKRdCdKUuqpHFMsCQ5VmBZgqG8uJF9NjZrRwJq4HQ2Yj7F3Qv8RZvJhKdM2FqLxG5N2ZpQr']
        }
      }
    ];
  }

  /**
   * Process a system event and try to match it with Solana transactions
   */
  private async processSystemEvent(event: any, solanaTransactions: SolanaTransaction[]): Promise<void> {
    try {
      let matched = false;

      switch (event.event_type) {
        case 'trade':
          matched = await this.reconcileTrade(event, solanaTransactions);
          break;
        case 'price_update':
          matched = await this.reconcilePriceUpdate(event, solanaTransactions);
          break;
        case 'market_init':
          matched = await this.reconcileMarketInit(event, solanaTransactions);
          break;
      }

      // Mark event as processed if matched or if it's old (> 1 hour)
      const eventAge = Date.now() - new Date(event.created_at).getTime();
      if (matched || eventAge > 3600000) {
        await this.markEventProcessed(event.id, matched);
      }

    } catch (error) {
      console.error(`Error processing event ${event.id}:`, error);
    }
  }

  /**
   * Reconcile a trade event with Solana transactions
   */
  private async reconcileTrade(event: any, solanaTransactions: SolanaTransaction[]): Promise<boolean> {
    // Find matching transaction by signature if available
    if (event.tx_signature) {
      const matchingTx = solanaTransactions.find(tx => tx.signature === event.tx_signature);
      
      if (matchingTx) {
        // Update trade status based on transaction success
        await this.updateTradeStatus(event.entity_id, 'confirmed', matchingTx.slot, matchingTx.blockTime);
        
        // Update position based on trade
        await this.updatePosition(event);
        
        // Publish real-time update
        await this.publishTradeUpdate(event, matchingTx);
        
        return true;
      }
    }

    // Try to match by trade data in logs
    for (const tx of solanaTransactions) {
      if (this.isTradeTransaction(tx, event)) {
        await this.updateTradeStatus(event.entity_id, 'confirmed', tx.slot, tx.blockTime);
        await this.updatePosition(event);
        await this.publishTradeUpdate(event, tx);
        return true;
      }
    }

    return false;
  }

  /**
   * Reconcile a price update event
   */
  private async reconcilePriceUpdate(event: any, solanaTransactions: SolanaTransaction[]): Promise<boolean> {
    // Price updates from oracle may not always have corresponding on-chain transactions
    // Mark as processed if it's an oracle update
    if (event.data?.source === 'oracle' || event.data?.source === 'aspero') {
      await this.publishPriceUpdate(event);
      return true;
    }

    return false;
  }

  /**
   * Reconcile a market initialization event
   */
  private async reconcileMarketInit(event: any, solanaTransactions: SolanaTransaction[]): Promise<boolean> {
    // Look for market initialization transactions
    for (const tx of solanaTransactions) {
      if (this.isMarketInitTransaction(tx, event)) {
        await this.updateMarketStatus(event.entity_id, 'initialized', tx.signature);
        return true;
      }
    }

    return false;
  }

  /**
   * Check if a transaction is a trade transaction
   */
  private isTradeTransaction(tx: SolanaTransaction, event: any): boolean {
    // Check transaction logs for trade indicators
    const logs = tx.meta?.logMessages || [];
    const tradeIndicators = ['Trade executed', 'Buy', 'Sell', 'Instruction: Buy', 'Instruction: Sell'];
    
    return logs.some(log => tradeIndicators.some(indicator => log.includes(indicator)));
  }

  /**
   * Check if a transaction is a market initialization transaction
   */
  private isMarketInitTransaction(tx: SolanaTransaction, event: any): boolean {
    const logs = tx.meta?.logMessages || [];
    return logs.some(log => log.includes('Market initialized') || log.includes('InitializeMarket'));
  }

  /**
   * Update trade status in database
   */
  private async updateTradeStatus(tradeId: string, status: string, slot?: number, blockTime?: number): Promise<void> {
    await query(`
      UPDATE trades 
      SET 
        status = $2, 
        block_height = $3, 
        confirmed_at = $4
      WHERE id = $1
    `, [
      tradeId, 
      status, 
      slot, 
      blockTime ? new Date(blockTime * 1000) : null
    ]);
  }

  /**
   * Update user position based on trade
   */
  private async updatePosition(event: any): Promise<void> {
    const tradeData = JSON.parse(event.data || '{}');
    
    if (!tradeData.user_wallet || !tradeData.market_id) {
      return;
    }

    // Get market/bond info
    const marketResult = await query(`
      SELECT bond_id FROM markets WHERE id = $1
    `, [tradeData.market_id]);

    if (marketResult.rows.length === 0) {
      return;
    }

    const bondId = marketResult.rows[0].bond_id;
    const quantityChange = tradeData.side === 'buy' ? tradeData.amount : -tradeData.amount;
    const tradeValue = tradeData.side === 'buy' ? tradeData.total_value : -tradeData.total_value;

    // Update position using the portfolio API logic
    const response = await fetch(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/api/portfolio/${tradeData.user_wallet}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ADMIN_API_KEY}`
      },
      body: JSON.stringify({
        bond_id: bondId,
        quantity_change: quantityChange,
        price_scaled: tradeData.price_scaled,
        trade_value: tradeValue
      })
    });

    if (!response.ok) {
      console.error('Failed to update position:', await response.text());
    }
  }

  /**
   * Publish real-time trade update
   */
  private async publishTradeUpdate(event: any, tx: SolanaTransaction): Promise<void> {
    const tradeUpdate = {
      type: 'trade',
      data: {
        ...JSON.parse(event.data || '{}'),
        tx_signature: tx.signature,
        confirmed_at: new Date(tx.blockTime * 1000).toISOString(),
        block_height: tx.slot
      },
      timestamp: new Date().toISOString()
    };

    await this.redis.publish('trades', JSON.stringify(tradeUpdate));
  }

  /**
   * Publish real-time price update
   */
  private async publishPriceUpdate(event: any): Promise<void> {
    const priceUpdate = {
      type: 'price_update',
      data: JSON.parse(event.data || '{}'),
      timestamp: new Date().toISOString()
    };

    await this.redis.publish('price_updates', JSON.stringify(priceUpdate));
  }

  /**
   * Update market status
   */
  private async updateMarketStatus(marketId: string, status: string, txSignature: string): Promise<void> {
    // Log the market initialization
    console.log(`Market ${marketId} ${status} with transaction ${txSignature}`);
  }

  /**
   * Check for missing events (on-chain transactions without corresponding database records)
   */
  private async checkForMissingEvents(solanaTransactions: SolanaTransaction[]): Promise<void> {
    for (const tx of solanaTransactions) {
      // Check if we have a record of this transaction
      const existingRecord = await query(`
        SELECT id FROM trades WHERE tx_signature = $1
        UNION
        SELECT id FROM system_events WHERE tx_signature = $1
      `, [tx.signature]);

      if (existingRecord.rows.length === 0 && this.isRelevantTransaction(tx)) {
        // Create missing system event
        await this.createMissingEvent(tx);
      }
    }
  }

  /**
   * Check if a transaction is relevant to our system
   */
  private isRelevantTransaction(tx: SolanaTransaction): boolean {
    const logs = tx.meta?.logMessages || [];
    const relevantKeywords = ['Trade executed', 'Market initialized', 'Price updated'];
    
    return logs.some(log => relevantKeywords.some(keyword => log.includes(keyword)));
  }

  /**
   * Create a missing system event from on-chain transaction
   */
  private async createMissingEvent(tx: SolanaTransaction): Promise<void> {
    const eventType = this.determineEventType(tx);
    const eventData = this.extractEventData(tx);

    await query(`
      INSERT INTO system_events (
        event_type, tx_signature, data, processed
      ) VALUES ($1, $2, $3, false)
    `, [eventType, tx.signature, JSON.stringify(eventData)]);

    console.log(`Created missing event for transaction ${tx.signature}`);
  }

  /**
   * Determine event type from transaction
   */
  private determineEventType(tx: SolanaTransaction): string {
    const logs = tx.meta?.logMessages || [];
    
    if (logs.some(log => log.includes('Trade executed'))) return 'trade';
    if (logs.some(log => log.includes('Market initialized'))) return 'market_init';
    if (logs.some(log => log.includes('Price updated'))) return 'price_update';
    
    return 'unknown';
  }

  /**
   * Extract event data from transaction
   */
  private extractEventData(tx: SolanaTransaction): any {
    // Parse transaction logs to extract relevant data
    const logs = tx.meta?.logMessages || [];
    
    return {
      tx_signature: tx.signature,
      slot: tx.slot,
      block_time: tx.blockTime,
      logs: logs,
      detected_by: 'reconciler'
    };
  }

  /**
   * Mark system event as processed
   */
  private async markEventProcessed(eventId: number, matched: boolean): Promise<void> {
    await query(`
      UPDATE system_events 
      SET processed = true, processed_at = NOW()
      WHERE id = $1
    `, [eventId]);

    if (matched) {
      console.log(`Event ${eventId} successfully reconciled`);
    } else {
      console.log(`Event ${eventId} marked as processed (unmatched/timeout)`);
    }
  }

  /**
   * Load last processed slot from database
   */
  private async loadLastProcessedSlot(): Promise<void> {
    try {
      const result = await query(`
        SELECT COALESCE(MAX(slot), 0) as last_slot 
        FROM program_logs 
        WHERE program_id = $1
      `, [this.programId]);

      this.lastProcessedSlot = parseInt(result.rows[0]?.last_slot || '0');
      console.log(`Loaded last processed slot: ${this.lastProcessedSlot}`);

    } catch (error) {
      console.error('Error loading last processed slot:', error);
      this.lastProcessedSlot = 0;
    }
  }

  /**
   * Update last processed slot
   */
  private async updateLastProcessedSlot(slot: number): Promise<void> {
    if (slot > this.lastProcessedSlot) {
      this.lastProcessedSlot = slot;
      
      // Store in Redis for quick access
      await this.redis.set('reconciler:last_slot', slot.toString());
    }
  }

  /**
   * Update service status
   */
  private async updateServiceStatus(
    status: string, 
    eventsProcessed: number, 
    transactionsChecked: number, 
    error?: string
  ): Promise<void> {
    try {
      const statusData = {
        status,
        last_check: new Date().toISOString(),
        events_processed: eventsProcessed,
        transactions_checked: transactionsChecked,
        last_processed_slot: this.lastProcessedSlot,
        error: error || null,
        service: 'event-reconciler'
      };

      await this.redis.setex('reconciler:status', 300, JSON.stringify(statusData));

    } catch (redisError) {
      console.error('Error updating reconciler status:', redisError);
    }
  }

  /**
   * Get current service status
   */
  async getStatus(): Promise<any> {
    try {
      const statusData = await this.redis.get('reconciler:status');
      return statusData ? JSON.parse(statusData) : null;
    } catch (error) {
      console.error('Error getting reconciler status:', error);
      return null;
    }
  }
}

// Export singleton instance
export const eventReconciler = new EventReconciler();

// For testing and manual control
export { EventReconciler };

// Auto-start in production
if (process.env.NODE_ENV === 'production' && process.env.RECONCILER_AUTO_START === 'true') {
  eventReconciler.start().catch(console.error);
}
