#!/bin/bash

# NyayChain Complete Deployment Script
# This script automates the entire deployment process for the marketplace program

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

echo "🚀 NyayChain Complete Deployment Script"
echo "========================================"

# Check prerequisites
print_status "Checking prerequisites..."

if ! command_exists solana; then
    print_error "Solana CLI not found. Please install: https://docs.solana.com/cli/install-solana-cli-tools"
    exit 1
fi

if ! command_exists anchor; then
    print_error "Anchor CLI not found. Please install: cargo install --git https://github.com/coral-xyz/anchor anchor-cli --locked"
    exit 1
fi

if ! command_exists node; then
    print_error "Node.js not found. Please install Node.js 18+"
    exit 1
fi

print_success "All prerequisites found"

# Get target network (default: devnet)
NETWORK=${1:-devnet}
if [[ "$NETWORK" != "devnet" && "$NETWORK" != "mainnet" && "$NETWORK" != "localnet" ]]; then
    print_error "Invalid network. Use: devnet, mainnet, or localnet"
    exit 1
fi

print_status "Target network: $NETWORK"

# Configure Solana for target network
print_status "Configuring Solana CLI..."
if [[ "$NETWORK" == "devnet" ]]; then
    solana config set --url https://api.devnet.solana.com
elif [[ "$NETWORK" == "mainnet" ]]; then
    solana config set --url https://api.mainnet-beta.solana.com
    print_warning "Deploying to MAINNET! This will cost real SOL."
    read -p "Are you sure you want to continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_status "Deployment cancelled"
        exit 0
    fi
fi

# Check wallet balance
print_status "Checking wallet balance..."
BALANCE=$(solana balance | cut -d' ' -f1)
MIN_BALANCE=0.1

if (( $(echo "$BALANCE < $MIN_BALANCE" | bc -l) )); then
    print_warning "Low balance: $BALANCE SOL. Minimum recommended: $MIN_BALANCE SOL"
    if [[ "$NETWORK" == "devnet" ]]; then
        print_status "Requesting airdrop..."
        solana airdrop 2 || print_warning "Airdrop failed, continuing with existing balance"
    else
        print_error "Insufficient balance for $NETWORK deployment"
        exit 1
    fi
fi

NEW_BALANCE=$(solana balance | cut -d' ' -f1)
print_success "Wallet balance: $NEW_BALANCE SOL"

# Install dependencies
print_status "Installing dependencies..."
npm install

# Clean previous builds
print_status "Cleaning previous builds..."
anchor clean

# Build the program
print_status "Building Anchor program..."
anchor build

if [ ! -f "target/deploy/sebi.so" ]; then
    print_error "Build failed - sebi.so not found"
    exit 1
fi

PROGRAM_SIZE=$(du -h target/deploy/sebi.so | cut -f1)
print_success "Program built successfully (Size: $PROGRAM_SIZE)"

# Deploy the program
print_status "Deploying to $NETWORK..."
if [[ "$NETWORK" == "localnet" ]]; then
    anchor deploy --provider.cluster localnet
else
    anchor deploy --provider.cluster $NETWORK
fi

# Extract the program ID from the deployment
PROGRAM_ID=$(solana address -k target/deploy/sebi-keypair.json)
print_success "Program deployed with ID: $PROGRAM_ID"

# Update Anchor.toml with the new program ID
print_status "Updating Anchor.toml..."
if [[ "$NETWORK" == "devnet" ]]; then
    sed -i.bak "s/^sebi = \".*\" # Will be updated after deployment$/sebi = \"$PROGRAM_ID\"/" Anchor.toml
elif [[ "$NETWORK" == "mainnet" ]]; then
    # For mainnet, update the mainnet section
    sed -i.bak "/\[programs\.mainnet\]/,/^$/ s/^sebi = \".*\"$/sebi = \"$PROGRAM_ID\"/" Anchor.toml
fi

print_success "Anchor.toml updated"

# Update the main project's environment file
print_status "Updating main project environment..."
MAIN_ENV="../.env.local"
if [ -f "$MAIN_ENV" ]; then
    # Update or add the program ID
    if grep -q "ANCHOR_PROGRAM_ID=" "$MAIN_ENV"; then
        sed -i.bak "s/ANCHOR_PROGRAM_ID=.*/ANCHOR_PROGRAM_ID=$PROGRAM_ID/" "$MAIN_ENV"
    else
        echo "ANCHOR_PROGRAM_ID=$PROGRAM_ID" >> "$MAIN_ENV"
    fi
    
    if grep -q "MARKETPLACE_PROGRAM_ID=" "$MAIN_ENV"; then
        sed -i.bak "s/MARKETPLACE_PROGRAM_ID=.*/MARKETPLACE_PROGRAM_ID=$PROGRAM_ID/" "$MAIN_ENV"
    else
        echo "MARKETPLACE_PROGRAM_ID=$PROGRAM_ID" >> "$MAIN_ENV"
    fi
    
    print_success "Environment file updated"
else
    print_warning "Main project .env.local not found. You'll need to manually update:"
    echo "ANCHOR_PROGRAM_ID=$PROGRAM_ID"
    echo "MARKETPLACE_PROGRAM_ID=$PROGRAM_ID"
fi

# Verify deployment
print_status "Verifying deployment..."
npm run verify:deployment

print_success "Deployment verification completed"

# Run tests
print_status "Running tests..."
if anchor test --skip-local-validator; then
    print_success "All tests passed"
else
    print_warning "Some tests failed, but deployment is complete"
fi

# Final instructions
echo ""
echo "🎉 DEPLOYMENT COMPLETE!"
echo "======================="
echo "Program ID: $PROGRAM_ID"
echo "Network: $NETWORK"
echo ""
echo "📋 Next steps:"
echo "1. From main project directory, run: npm run blockchain:setup"
echo "2. Test the integration: npm run dev"
echo "3. Visit: http://localhost:3000/bonds to test trading"
echo ""
echo "📚 View deployment details:"
if [[ "$NETWORK" == "devnet" ]]; then
    echo "Solana Explorer: https://explorer.solana.com/address/$PROGRAM_ID?cluster=devnet"
elif [[ "$NETWORK" == "mainnet" ]]; then
    echo "Solana Explorer: https://explorer.solana.com/address/$PROGRAM_ID"
fi
echo ""
echo "🔧 For troubleshooting, see: blockchain/DEPLOYMENT.md"
