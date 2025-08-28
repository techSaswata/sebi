# 🏗️ NyayChain Blockchain

This directory contains the Solana/Anchor smart contracts for the NyayChain tokenized bond marketplace.

## 📁 Directory Structure

```
blockchain/
├── programs/sebi/          # Main marketplace program (Rust)
│   ├── src/
│   │   ├── lib.rs          # Program entry point
│   │   ├── state.rs        # Market state definitions
│   │   ├── errors.rs       # Custom error types
│   │   └── instructions/   # Program instructions
│   │       ├── initialize.rs   # Initialize market
│   │       ├── buy.rs          # Buy bonds
│   │       ├── sell.rs         # Sell bonds
│   │       ├── update_price.rs # Update market price
│   │       ├── pause.rs        # Pause/resume market
│   │       └── withdraw.rs     # Withdraw treasury
├── scripts/                # Utility scripts (TypeScript)
├── tests/                  # Integration tests
├── Anchor.toml            # Anchor configuration
├── DEPLOYMENT.md          # Detailed deployment guide
└── README.md              # This file
```

## 🚀 Quick Start

### Prerequisites

Ensure you have the following installed:
- [Rust](https://rustup.rs/)
- [Solana CLI](https://docs.solana.com/cli/install-solana-cli-tools) (v1.18+)
- [Anchor CLI](https://www.anchor-lang.com/docs/installation) (v0.30.1+)
- [Node.js](https://nodejs.org/) (v18+)

### One-Command Deployment (Recommended)

```bash
# Deploy to devnet (recommended for testing)
./scripts/deploy-complete.sh devnet

# Deploy to mainnet (requires audit and real SOL)
./scripts/deploy-complete.sh mainnet
```

### Manual Deployment

```bash
# 1. Install dependencies
npm install

# 2. Configure for devnet
npm run setup:devnet

# 3. Build the program
npm run build

# 4. Deploy to devnet
npm run deploy:devnet

# 5. Verify deployment
npm run verify:deployment

# 6. Run tests
npm test
```

## 🧪 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run build` | Build the Anchor program |
| `npm run clean` | Clean build artifacts |
| `npm test` | Run integration tests |
| `npm run deploy:devnet` | Deploy to devnet |
| `npm run deploy:mainnet` | Deploy to mainnet |
| `npm run verify:deployment` | Verify deployment status |
| `npm run setup:devnet` | Configure CLI for devnet |
| `npm run airdrop` | Request SOL airdrop (devnet) |
| `npm run balance` | Check wallet balance |
| `npm run config` | Show Solana configuration |

## 🏛️ Program Architecture

### Market State

Each bond has an associated market account that stores:
- Bond mint address
- USDC mint address  
- Current price per token
- Vault accounts (bond & USDC)
- Admin public key
- Paused status

### Instructions

1. **initialize_market**: Create a new bond market
2. **buy**: Purchase bond tokens with USDC
3. **sell**: Sell bond tokens for USDC  
4. **update_price**: Update market price (admin/oracle only)
5. **pause**: Pause/resume trading (admin only)
6. **withdraw**: Withdraw treasury funds (admin only)

### Events

- **TradeEvent**: Emitted on successful buy/sell operations

## 🔧 Configuration

### Anchor.toml

The configuration supports multiple environments:

```toml
[programs.localnet]
sebi = "LOCAL_PROGRAM_ID"

[programs.devnet]  
sebi = "DEVNET_PROGRAM_ID"

[programs.mainnet]
sebi = "MAINNET_PROGRAM_ID"
```

### Environment Variables

After deployment, update your main project's `.env.local`:

```bash
ANCHOR_PROGRAM_ID=YOUR_DEPLOYED_PROGRAM_ID
MARKETPLACE_PROGRAM_ID=YOUR_DEPLOYED_PROGRAM_ID
```

## 🧪 Testing

### Run All Tests

```bash
npm test
```

### Run Individual Test Scripts

```bash
npm run create:mint     # Test mint creation
npm run init:market     # Test market initialization  
npm run test:buy        # Test buy functionality
npm run test:sell       # Test sell functionality
```

## 🚨 Security Considerations

⚠️ **Important Security Notes:**

1. **Audit Required**: Get professional security audit before mainnet
2. **Private Keys**: Never commit private keys to version control
3. **Admin Keys**: Use hardware wallets for admin operations
4. **Testing**: Thoroughly test on devnet before mainnet
5. **Monitoring**: Set up monitoring for deployed programs

## 📊 Monitoring

### Check Program Status

```bash
# Verify program is deployed
solana program show YOUR_PROGRAM_ID

# Check program account
solana account YOUR_PROGRAM_ID

# View recent transactions
solana transaction-history YOUR_PROGRAM_ID --limit 10
```

### Solana Explorer

- **Devnet**: https://explorer.solana.com/?cluster=devnet
- **Mainnet**: https://explorer.solana.com/

## 🆘 Troubleshooting

### Common Issues

1. **"Insufficient funds"**: Request airdrop with `npm run airdrop`
2. **"Program failed to deploy"**: Check `npm run balance` and network status
3. **"IDL not found"**: Run `npm run build` first
4. **Test failures**: Ensure devnet is accessible and account has SOL

### Get Help

- 📖 **Detailed Guide**: See [DEPLOYMENT.md](./DEPLOYMENT.md)
- 🐛 **Issues**: Create issue in main repository
- 💬 **Community**: Join Solana Discord

## 🔗 Integration

This blockchain component integrates with the main NyayChain project:

1. **Backend Services**: TypeScript services call the deployed program
2. **API Endpoints**: REST API exposes blockchain functionality  
3. **Frontend**: React components execute real blockchain transactions
4. **Database**: Supabase syncs with on-chain state

### Post-Deployment Steps

After deploying the blockchain:

```bash
# Go to main project directory
cd ..

# Run blockchain setup script
npm run blockchain:setup

# Start the full application
npm run dev
```

## 📚 Resources

- [Anchor Book](https://book.anchor-lang.com/)
- [Solana Documentation](https://docs.solana.com/)
- [SPL Token Program](https://spl.solana.com/token)
- [Solana Program Library](https://github.com/solana-labs/solana-program-library)

---

**Ready to deploy? Start with:** `./scripts/deploy-complete.sh devnet` 🚀
