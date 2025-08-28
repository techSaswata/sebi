#!/bin/bash

# NyayChain Setup Script
# Automates the initial setup process

set -e

echo "🚀 NyayChain Setup Script"
echo "========================="
echo ""

# Check prerequisites
echo "🔍 Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ and try again."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version $NODE_VERSION is too old. Please install Node.js 18+ and try again."
    exit 1
fi
echo "✅ Node.js $(node -v)"

# Check PostgreSQL
if ! command -v psql &> /dev/null; then
    echo "⚠️  PostgreSQL not found. You'll need to install PostgreSQL 14+ for the database."
else
    echo "✅ PostgreSQL $(psql --version | awk '{print $3}')"
fi

# Check Redis
if ! command -v redis-cli &> /dev/null; then
    echo "⚠️  Redis not found. You'll need to install Redis 6+ for caching."
else
    echo "✅ Redis $(redis-cli --version | awk '{print $2}')"
fi

echo ""

# Install dependencies
echo "📦 Installing dependencies..."
if command -v pnpm &> /dev/null; then
    pnpm install
elif command -v yarn &> /dev/null; then
    yarn install
else
    npm install
fi
echo "✅ Dependencies installed"

# Copy environment file if it doesn't exist
if [ ! -f .env.local ]; then
    echo "📝 Creating environment file..."
    cp .env .env.local
    echo "✅ Created .env.local from template"
    echo "⚠️  Please edit .env.local with your configuration"
else
    echo "ℹ️  .env.local already exists"
fi

echo ""
echo "🎉 Setup completed!"
echo ""
echo "Next steps:"
echo "1. Edit .env.local with your database and service configurations"
echo "2. Create PostgreSQL database: createdb nyaychain_db"
echo "3. Run database migrations: npm run db:migrate"
echo "4. Start development server: npm run dev"
echo ""
echo "For full-stack development with services:"
echo "npm run start:full"
echo ""
echo "📚 See README.md for detailed setup instructions"
