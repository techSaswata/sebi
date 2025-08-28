# 🚀 NyayChain Blockchain Deployment Guide

This guide covers the complete deployment process for the NyayChain tokenized bond marketplace on Solana.

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Build & Deployment](#build--deployment)
- [Post-Deployment Setup](#post-deployment-setup)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Mainnet Deployment](#mainnet-deployment)

## 🛠️ Prerequisites

### Required Software

1. **Rust** (Latest stable version)
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   source ~/.cargo/env
   ```

2. **Solana CLI** (v1.18.0 or later)
   ```bash
   # Install Solana CLI
   sh -c "$(curl -sSfL https://release.solana.com/v1.18.0/install)"
   
   # Add to PATH
   export PATH="/home/$(whoami)/.local/share/solana/install/active_release/bin:$PATH"
   ```

3. **Anchor CLI** (v0.30.1 or later)
   ```bash
   # Install Anchor using cargo
   cargo install --git https://github.com/coral-xyz/anchor anchor-cli --locked
   
   # Or using npm
   npm install -g @coral-xyz/anchor-cli
   ```

4. **Node.js & npm** (v18+ recommended)
   ```bash
   # Check versions
   node --version  # Should be 18+
   npm --version
   ```

### Required Accounts & Funding

1. **Solana Keypair**
   ```bash
   # Generate new keypair (if you don't have one)
   solana-keygen new --outfile ~/.config/solana/id.json
   
   # Or recover from seed phrase
   solana-keygen recover --outfile ~/.config/solana/id.json
   ```

2. **Fund Your Wallet** (Devnet)
   ```bash
   # Switch to devnet
   solana config set --url https://api.devnet.solana.com
   
   # Request airdrop (may need to run multiple times)
   solana airdrop 2
   
   # Check balance
   solana balance
   ```

3. **Verify Configuration**
   ```bash
   solana config get
   # Should show:
   # - RPC URL: https://api.devnet.solana.com
   # - WebSocket URL: wss://api.devnet.solana.com/
   # - Keypair Path: ~/.config/solana/id.json
   # - Commitment: confirmed
   ```

## ⚙️ Environment Setup

### 1. Clone and Navigate to Blockchain Directory

```bash
cd /path/to/nyaychain/blockchain
```

### 2. Install Dependencies

```bash
# Install Node.js dependencies
npm install

# Or using yarn
yarn install
```

### 3. Verify Program Structure

```bash
# Check that all required files exist
ls -la programs/sebi/src/
# Should contain: lib.rs, state.rs, errors.rs, instructions/

# Verify Anchor.toml configuration
cat Anchor.toml
```

## 🏗️ Build & Deployment

### 1. Build the Program

```bash
# Clean previous builds
anchor clean

# Build the program
anchor build

# Verify build
ls -la target/deploy/
# Should contain: sebi.so, sebi-keypair.json
```

### 2. Deploy to Devnet

```bash
# Ensure you're on devnet
solana config set --url https://api.devnet.solana.com

# Deploy the program
anchor deploy

# Expected output:
# Program Id: [NEW_PROGRAM_ID]
```

### 3. Update Configuration

After successful deployment, update the program ID in multiple places:

**a) Update Anchor.toml:**
```toml
[programs.devnet]
sebi = "YOUR_NEW_PROGRAM_ID"
```

**b) Update the main project's .env.local:**
```bash
# In the main project root (../env.local)
ANCHOR_PROGRAM_ID=YOUR_NEW_PROGRAM_ID
MARKETPLACE_PROGRAM_ID=YOUR_NEW_PROGRAM_ID
```

**c) Update the program's lib.rs:**
```rust
// In programs/sebi/src/lib.rs
declare_id!("YOUR_NEW_PROGRAM_ID");
```

### 4. Rebuild with New Program ID

```bash
# Rebuild with updated program ID
anchor build

# Deploy again to confirm
anchor deploy
```

## 🔧 Post-Deployment Setup

### 1. Run Integration Tests

```bash
# Run Anchor tests
anchor test

# Expected output should show all tests passing
```

### 2. Initialize Markets

From the main project directory:

```bash
# Navigate back to main project
cd ..

# Run blockchain setup script
npm run blockchain:setup
```

This script will:
- ✅ Create SPL token mints for bonds
- ✅ Initialize trading markets
- ✅ Fund markets with initial liquidity
- ✅ Update environment variables

### 3. Verify Deployment

Check that everything is working:

```bash
# Test blockchain status API
curl http://localhost:3000/api/blockchain/setup

# Expected response:
# {
#   "success": true,
#   "data": {
#     "setup_complete": true,
#     "program_id": "YOUR_PROGRAM_ID",
#     "usdc_mint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
#     "bond_mint_1": "...",
#     "bond_mint_2": "..."
#   }
# }
```

## 🧪 Testing

### 1. Unit Tests

```bash
cd blockchain
anchor test --skip-local-validator
```

### 2. Integration Tests

```bash
# Test individual scripts
npm run ts-node scripts/create_mint.ts
npm run ts-node scripts/init_market.ts
npm run ts-node scripts/buy.ts
npm run ts-node scripts/sell.ts
```

### 3. End-to-End Tests

From main project:

```bash
# Start the development server
npm run dev

# Test the full trading flow
# 1. Visit http://localhost:3000/bonds
# 2. Connect wallet (use the same keypair you used for deployment)
# 3. Try to buy bonds - should execute real blockchain transactions
```

## 🐛 Troubleshooting

### Common Issues

#### 1. "Insufficient funds" during deployment

```bash
# Check balance
solana balance

# Request more SOL (devnet)
solana airdrop 2

# For mainnet, you need to buy SOL
```

#### 2. "Program failed to deploy"

```bash
# Clean and rebuild
anchor clean
anchor build

# Check program size
ls -lh target/deploy/sebi.so
# If > 1MB, you may need to optimize

# Try deploying with more compute
anchor deploy --provider.cluster devnet
```

#### 3. "Account not found" errors

```bash
# Verify program ID is correct
solana program show YOUR_PROGRAM_ID

# Check if program is deployed
solana account YOUR_PROGRAM_ID
```

#### 4. "Transaction failed" during market initialization

```bash
# Check devnet status
curl https://api.devnet.solana.com -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}'

# Try with different RPC endpoint
solana config set --url https://devnet.helius-rpc.com

# Increase transaction timeout
export ANCHOR_PROVIDER_URL=https://api.devnet.solana.com
export ANCHOR_WALLET=~/.config/solana/id.json
```

#### 5. "IDL not found" errors

```bash
# Regenerate IDL
anchor idl init YOUR_PROGRAM_ID --filepath target/idl/sebi.json

# Or update existing IDL
anchor idl upgrade YOUR_PROGRAM_ID --filepath target/idl/sebi.json
```

### Getting Help

1. **Check Anchor logs:**
   ```bash
   anchor logs --provider.cluster devnet
   ```

2. **Solana Explorer:**
   - Visit: https://explorer.solana.com/?cluster=devnet
   - Search for your program ID and transactions

3. **Discord Communities:**
   - Solana Discord: https://discord.gg/solana
   - Anchor Discord: https://discord.gg/anchor

## 🌐 Mainnet Deployment

⚠️ **Warning:** Mainnet deployment requires real SOL and careful security considerations.

### Prerequisites for Mainnet

1. **Audit**: Get your program audited by a reputable security firm
2. **Testing**: Extensive testing on devnet
3. **SOL**: ~10-50 SOL for deployment and operations
4. **Security**: Hardware wallet or secure key management

### Mainnet Steps

1. **Update Configuration:**
   ```toml
   # Anchor.toml
   [provider]
   cluster = "mainnet"
   
   [programs.mainnet]
   sebi = "YOUR_MAINNET_PROGRAM_ID"
   ```

2. **Deploy:**
   ```bash
   solana config set --url https://api.mainnet-beta.solana.com
   anchor deploy --provider.cluster mainnet
   ```

3. **Update Environment:**
   ```bash
   # .env.local
   SOLANA_CLUSTER=mainnet-beta
   SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
   USDC_MINT=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
   ```

## 📊 Monitoring & Maintenance

### 1. Program Monitoring

- **Solana Explorer**: Monitor program activity
- **RPC Health**: Check `solana ping` regularly
- **Account Balances**: Monitor treasury and vault balances

### 2. Upgrades

```bash
# Build new version
anchor build

# Deploy upgrade (only if you're the upgrade authority)
anchor upgrade YOUR_PROGRAM_ID --program-filepath target/deploy/sebi.so
```

### 3. Emergency Procedures

- **Pause Markets**: Use the `pause` instruction
- **Withdraw Funds**: Use the `withdraw` instruction
- **Update Prices**: Ensure oracle is functioning

## 📚 Additional Resources

- **Anchor Book**: https://book.anchor-lang.com/
- **Solana Docs**: https://docs.solana.com/
- **SPL Token Program**: https://spl.solana.com/token
- **Solana Program Library**: https://github.com/solana-labs/solana-program-library

## 🔐 Security Best Practices

1. **Private Keys**: Never commit private keys to git
2. **Upgrade Authority**: Use a multisig for upgrade authority
3. **Admin Controls**: Implement proper access controls
4. **Testing**: Test all edge cases on devnet first
5. **Monitoring**: Set up alerts for unusual activity

---

## 📞 Support

For deployment support:
- Create an issue in the project repository
- Check the troubleshooting section above
- Contact the development team

**Happy Deploying! 🚀**
