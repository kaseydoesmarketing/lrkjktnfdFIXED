#!/bin/bash

echo "🚀 TitleTesterPro Node.js Installation Script"
echo "=============================================="
echo ""

# Check if Node.js is already installed
if command -v node &> /dev/null; then
    echo "✅ Node.js is already installed!"
    echo "Version: $(node --version)"
    echo "npm Version: $(npm --version)"
    echo ""
    echo "🎉 You're ready to run TitleTesterPro!"
    echo ""
    echo "Next steps:"
    echo "1. npm install"
    echo "2. cp env.template .env"
    echo "3. npm run db:push"
    echo "4. npm run dev"
    exit 0
fi

echo "❌ Node.js is not installed on your system."
echo ""
echo "📋 Installation Options:"
echo "1. Install via Homebrew (recommended)"
echo "2. Install via official installer"
echo "3. Exit and install manually"
echo ""

read -p "Choose an option (1-3): " choice

case $choice in
    1)
        echo ""
        echo "🍺 Installing Homebrew..."
        echo "This will take a few minutes and may ask for your password."
        echo ""
        
        # Install Homebrew
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        
        # Add Homebrew to PATH
        echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zshrc
        eval "$(/opt/homebrew/bin/brew shellenv)"
        
        echo ""
        echo "📦 Installing Node.js via Homebrew..."
        brew install node
        
        echo ""
        echo "✅ Installation complete!"
        echo "Node.js version: $(node --version)"
        echo "npm version: $(npm --version)"
        ;;
    2)
        echo ""
        echo "🌐 Please visit https://nodejs.org"
        echo "Download the LTS version and run the installer."
        echo "After installation, restart your terminal and run this script again."
        exit 0
        ;;
    3)
        echo ""
        echo "📖 Manual installation instructions:"
        echo "1. Visit https://nodejs.org"
        echo "2. Download the LTS version"
        echo "3. Run the installer"
        echo "4. Restart your terminal"
        echo "5. Run this script again"
        exit 0
        ;;
    *)
        echo "❌ Invalid option. Please run the script again."
        exit 1
        ;;
esac

echo ""
echo "🎯 Setting up TitleTesterPro..."
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the TitleTesterPro directory."
    exit 1
fi

echo "📦 Installing dependencies..."
npm install

echo ""
echo "🔧 Setting up environment..."
if [ ! -f ".env" ]; then
    cp env.template .env
    echo "✅ Created .env file from template"
    echo "⚠️  Please edit .env with your API keys before running the app"
else
    echo "✅ .env file already exists"
fi

echo ""
echo "🗄️  Running database migration..."
npm run db:push

echo ""
echo "🎉 Setup complete!"
echo ""
echo "🚀 To start the application:"
echo "npm run dev"
echo ""
echo "🌐 Then visit: http://localhost:5000"
echo ""
echo "📋 Don't forget to:"
echo "1. Edit .env with your API keys"
echo "2. Configure Google OAuth in Google Cloud Console"
echo "3. Set up your Stripe account for payments" 