# NyayChain - Tokenized Bond Trading Platform

A full-stack decentralized application (DApp) for tokenized corporate bond trading on Solana, featuring AI-powered insights, real-time price feeds, and comprehensive portfolio management.

## 🏗️ Architecture

### Frontend
- **Framework**: Next.js 14 with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components
- **Wallet Integration**: Solana Wallet Adapter (Phantom, Solflare)
- **State Management**: SWR for data fetching and caching
- **Real-time Updates**: Server-Sent Events (SSE)

### Backend
- **API**: Next.js API Routes with RESTful endpoints
- **Database**: PostgreSQL with Redis caching
- **Authentication**: JWT-based admin authentication
- **Real-time**: Redis pub/sub for WebSocket/SSE events

### Blockchain
- **Network**: Solana Devnet
- **Programs**: Anchor-based smart contracts (setup required)
- **Tokens**: SPL tokens for bond representation
- **Payments**: USDC for trading

### AI Services
- **Price Estimation**: ML-based bond pricing models
- **Document Parsing**: LLM-powered prospectus analysis
- **Anomaly Detection**: Rule-based trade monitoring

### Services
- **Oracle Publisher**: Fetches external price feeds (Aspero API)
- **Event Reconciler**: Blockchain-database synchronization

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm/pnpm
- PostgreSQL 14+
- Redis 6+
- Solana CLI (for blockchain development)

### 1. Environment Setup

Copy and configure environment variables:
```bash
cp .env .env.local
```

Edit `.env.local` with your configuration:
```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/nyaychain_db"
REDIS_URL="redis://localhost:6379"

# Supabase (already configured)
NEXT_PUBLIC_SUPABASE_URL=https://jztfredqcnobfqlbodof.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Aspero API (configured)
ASPERO_API_BASE_URL=https://retail-api.aspero.in
ASPERO_JWT_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Solana (configure when ready)
SOLANA_CLUSTER=devnet
SOLANA_RPC_URL=https://api.devnet.solana.com
ANCHOR_WALLET_PATH=/path/to/your/wallet.json
MARKETPLACE_PROGRAM_ID=<your-program-id>

# Security
JWT_SECRET=your-super-secure-jwt-secret
ADMIN_API_KEY=admin-secure-key-12345
```

### 2. Install Dependencies

```bash
npm install
# or
pnpm install
```

### 3. Database Setup

Create database and run migrations:
```bash
# Create PostgreSQL database
createdb nyaychain_db

# Run migrations and seed demo data
npm run db:migrate
```

### 4. Start Development

#### Option A: Frontend Only
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

#### Option B: Full Stack with Services
```bash
npm run start:full
```
This starts:
- Next.js frontend (port 3000)
- Oracle Publisher service
- Event Reconciler service

#### Option C: Services Only
```bash
npm run dev:services
```

## 📚 API Documentation

### Core Endpoints

#### Bonds
- `GET /api/bonds` - List all bonds with market data
- `GET /api/bonds/:id` - Get bond details with price history
- `POST /api/bonds` - Create new bond (admin only)

#### Markets
- `GET /api/markets` - List trading markets
- `GET /api/markets/:id` - Get market details and order book
- `POST /api/markets` - Create new market (admin only)

#### Trading
- `GET /api/trades` - List trades with filtering
- `POST /api/trades` - Submit trade order
- `GET /api/portfolio/:wallet` - Get user portfolio

#### Oracle & Pricing
- `GET /api/oracle` - Oracle status and recent updates
- `POST /api/oracle` - Publish price updates (oracle only)
- `POST /api/ai/price-estimate` - Get AI price estimation

#### Admin
- `POST /api/admin/mint` - Mint new bond and create market
- `GET /api/health` - System health check

#### Real-time
- `GET /api/events/stream` - Server-Sent Events stream
- `GET /api/events/recent` - Recent system events

### Authentication

Admin endpoints require API key in header:
```bash
Authorization: Bearer your-admin-api-key
```

## 🏛️ Database Schema

### Main Tables
- **bonds**: Tokenized bond information
- **markets**: Trading venues for bonds
- **users**: User accounts and KYC status
- **trades**: Trade transactions and history
- **positions**: User portfolio positions
- **price_history**: Historical price data
- **ai_jobs**: AI/ML task tracking
- **system_events**: Event reconciliation

### Views
- **bond_market_view**: Combined bond and market data
- **portfolio_view**: User portfolio with P&L

## 🤖 AI Features

### Price Estimation
Uses discounted cash flow models with:
- Credit rating analysis
- Yield curve fitting
- Market volatility assessment
- Confidence scoring

### Document Parsing
Extracts structured data from bond prospectuses:
- Issuer information
- Financial terms
- Covenants and restrictions
- Risk factors

## 🔗 Blockchain Integration

### Smart Contracts (Anchor)
- **Bond Token**: SPL token representing bond units
- **Marketplace**: Trading and settlement program
- **Oracle**: Price feed management

### Transaction Flow
1. User connects wallet (Phantom/Solflare)
2. Select bond and trade amount
3. Approve USDC/bond token transfer
4. Execute trade through Anchor program
5. Real-time event reconciliation

## 🔧 Services

### Oracle Publisher
- Fetches bond prices from Aspero API
- Publishes price updates to blockchain
- Caches data in Redis for performance
- Configurable update intervals

### Event Reconciler
- Monitors Solana transactions
- Synchronizes on-chain/off-chain state
- Updates user positions
- Handles failed transactions

## 🧪 Testing

### Unit Tests
```bash
npm run test
```

### Integration Tests
```bash
npm run test:integration
```

### E2E Tests
```bash
npm run test:e2e
```

## 🚀 Deployment

### Production Setup

1. **Database**: Use managed PostgreSQL (AWS RDS, Supabase, etc.)
2. **Redis**: Use Redis Cloud or AWS ElastiCache
3. **Frontend**: Deploy to Vercel/Netlify
4. **Services**: Deploy to AWS/GCP with PM2 or Docker

### Environment Variables for Production
```bash
NODE_ENV=production
DATABASE_URL=postgresql://prod-connection-string
REDIS_URL=redis://prod-redis-url
SOLANA_CLUSTER=mainnet-beta
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
```

### Docker Deployment
```bash
docker build -t nyaychain .
docker run -p 3000:3000 --env-file .env nyaychain
```

## 📊 Monitoring

### Health Checks
- `GET /api/health` - System status
- Database connectivity
- Redis connectivity
- External service status
- Data integrity checks

### Metrics
- Trade volume and counts
- Active users
- System performance
- Error rates

## 🔒 Security

### Best Practices
- Environment variable encryption
- Admin API key rotation
- Rate limiting on endpoints
- Input validation and sanitization
- SQL injection prevention

### Compliance Considerations
- KYC/AML integration points
- Regulatory reporting hooks
- Audit trail maintenance
- Data privacy compliance

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

### Development Guidelines
- Use TypeScript for type safety
- Follow ESLint and Prettier configurations
- Write unit tests for new features
- Update documentation for API changes

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Aspero**: Bond data API integration
- **Solana**: Blockchain infrastructure
- **Anchor**: Smart contract framework
- **Next.js**: Full-stack React framework

---

## 🆘 Support

For questions and support:
- Create an issue in this repository
- Check the [documentation](./docs/)
- Review the [API examples](./api_example.txt)

**Note**: This is a prototype for demonstration purposes. Consult legal and financial advisors before any production deployment involving real financial instruments.
