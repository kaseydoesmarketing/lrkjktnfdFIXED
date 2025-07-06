#!/bin/bash

# TitleTesterPro Setup Script
echo "🚀 Setting up TitleTesterPro..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ Node.js and npm are installed"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Run database migration
echo "🗄️  Running database migration..."
npm run db:push

# Check TypeScript compilation
echo "🔍 Checking TypeScript compilation..."
npm run check

# Build the application
echo "🏗️  Building the application..."
npm run build

echo "✅ Setup complete!"
echo ""
echo "🎯 Next steps:"
echo "1. Copy env.template to .env and fill in your API keys"
echo "2. Run 'npm run dev' to start the development server"
echo "3. Visit http://localhost:5000 to access the application"
echo ""
echo "📋 Required environment variables:"
echo "- GOOGLE_CLIENT_SECRET: Your Google OAuth client secret"
echo "- STRIPE_SECRET_KEY: Your Stripe secret key"
echo "- ANTHROPIC_API_KEY: Your Anthropic API key"
echo ""
echo "🔧 For production deployment:"
echo "- Update OAuth redirect URIs in Google Cloud Console"
echo "- Set NODE_ENV=production"
echo "- Configure proper SSL certificates" 