import { NextRequest } from 'next/server';
import { getRedis } from '@/lib/database';

// GET /api/events/stream - Server-Sent Events for real-time updates
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const wallet = searchParams.get('wallet');
  const marketId = searchParams.get('market_id');

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      const data = `data: ${JSON.stringify({
        type: 'connection',
        message: 'Connected to NyayChain events stream',
        timestamp: new Date().toISOString()
      })}\n\n`;
      controller.enqueue(new TextEncoder().encode(data));

      // Set up Redis subscriber for real-time events
      const redis = getRedis();
      const subscriber = redis.duplicate();

      // Subscribe to relevant channels
      const channels = ['price_updates', 'trades', 'market_status'];
      if (wallet) {
        channels.push(`portfolio:${wallet}`);
      }
      if (marketId) {
        channels.push(`market:${marketId}`);
      }

      subscriber.subscribe(...channels);

      subscriber.on('message', (channel, message) => {
        try {
          const eventData = JSON.parse(message);
          
          // Filter events based on client interests
          if (shouldSendEvent(eventData, wallet, marketId)) {
            const sseData = `data: ${JSON.stringify({
              type: channel,
              data: eventData,
              timestamp: new Date().toISOString()
            })}\n\n`;
            controller.enqueue(new TextEncoder().encode(sseData));
          }
        } catch (error) {
          console.error('Error processing SSE message:', error);
        }
      });

      // Send periodic heartbeat
      const heartbeat = setInterval(() => {
        const heartbeatData = `data: ${JSON.stringify({
          type: 'heartbeat',
          timestamp: new Date().toISOString()
        })}\n\n`;
        controller.enqueue(new TextEncoder().encode(heartbeatData));
      }, 30000); // Every 30 seconds

      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        subscriber.unsubscribe();
        subscriber.disconnect();
        controller.close();
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    }
  });
}

function shouldSendEvent(eventData: any, wallet?: string | null, marketId?: string | null): boolean {
  // Always send price updates and market status changes
  if (eventData.type === 'price_update' || eventData.type === 'market_status') {
    if (marketId && eventData.market_id && eventData.market_id.toString() !== marketId) {
      return false;
    }
    return true;
  }

  // Send trade events
  if (eventData.type === 'trade') {
    // Send to wallet owner
    if (wallet && eventData.user_wallet === wallet) {
      return true;
    }
    // Send to market watchers
    if (marketId && eventData.market_id && eventData.market_id.toString() === marketId) {
      return true;
    }
    // Send public trade events (without wallet info)
    return true;
  }

  // Send portfolio updates only to the wallet owner
  if (eventData.type === 'portfolio_update') {
    return wallet && eventData.wallet_address === wallet;
  }

  return false;
}