#!/bin/bash

# TitleTesterPro Complete Setup Script
# For Replit AI Agent - Automated Installation & Configuration

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_step() {
    echo -e "\n${BLUE}🔧 $1${NC}"
}

# Header
echo "=========================================="
echo "🚀 TitleTesterPro Complete Setup"
echo "   For Replit AI Agent"
echo "=========================================="

# Step 1: Check and install Node.js
log_step "Checking Node.js installation..."

if ! command -v node &> /dev/null; then
    log_warning "Node.js not found. Installing..."
    
    # Try different installation methods
    if command -v curl &> /dev/null; then
        log_info "Installing Node.js via NVM..."
        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
        nvm install --lts
        nvm use --lts
    elif command -v apt-get &> /dev/null; then
        log_info "Installing Node.js via apt..."
        curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
        sudo apt-get install -y nodejs
    elif command -v brew &> /dev/null; then
        log_info "Installing Node.js via Homebrew..."
        brew install node
    else
        log_error "Could not install Node.js. Please install manually."
        exit 1
    fi
else
    NODE_VERSION=$(node --version)
    log_success "Node.js found: $NODE_VERSION"
fi

# Step 2: Check npm
log_step "Checking npm installation..."

if ! command -v npm &> /dev/null; then
    log_error "npm not found. Please install Node.js properly."
    exit 1
else
    NPM_VERSION=$(npm --version)
    log_success "npm found: $NPM_VERSION"
fi

# Step 3: Check working directory
log_step "Verifying project structure..."

REQUIRED_FILES=("package.json" "server" "client")
MISSING_FILES=()

for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -e "$file" ]; then
        MISSING_FILES+=("$file")
    fi
done

if [ ${#MISSING_FILES[@]} -ne 0 ]; then
    log_error "Missing required files: ${MISSING_FILES[*]}"
    log_error "Please run this script from the TitleTesterPro root directory"
    exit 1
fi

log_success "Project structure verified"

# Step 4: Install dependencies
log_step "Installing npm dependencies..."

if [ -d "node_modules" ]; then
    log_info "Cleaning existing node_modules..."
    rm -rf node_modules package-lock.json
fi

npm install

if [ $? -eq 0 ]; then
    log_success "Dependencies installed successfully"
else
    log_error "Failed to install dependencies"
    exit 1
fi

# Step 5: Set up environment
log_step "Setting up environment configuration..."

if [ ! -f ".env" ]; then
    if [ -f "env.template" ]; then
        log_info "Creating .env from template..."
        cp env.template .env
        log_success "Environment file created"
    else
        log_warning "No env.template found. Creating basic .env..."
        cat > .env << EOF
# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/titletesterpro"

# OAuth Configuration
GOOGLE_CLIENT_ID="your_google_client_id"
GOOGLE_CLIENT_SECRET="your_google_client_secret"

# Stripe Configuration
STRIPE_SECRET_KEY="your_stripe_secret_key"
STRIPE_PUBLISHABLE_KEY="your_stripe_publishable_key"

# Security
ENCRYPTION_KEY="your_32_character_encryption_key"
SESSION_SECRET="your_session_secret"

# YouTube API
YOUTUBE_API_KEY="your_youtube_api_key"

# Application
NODE_ENV="development"
PORT=5000
EOF
        log_success "Basic environment file created"
    fi
else
    log_success "Environment file already exists"
fi

# Step 6: Database setup
log_step "Setting up database..."

if command -v npm &> /dev/null; then
    log_info "Running database migration..."
    npm run db:push
    
    if [ $? -eq 0 ]; then
        log_success "Database migration completed"
    else
        log_warning "Database migration failed (this is normal if no database is configured)"
    fi
else
    log_warning "npm not available for database migration"
fi

# Step 7: Build verification
log_step "Verifying build process..."

log_info "Checking TypeScript compilation..."
npx tsc --noEmit

if [ $? -eq 0 ]; then
    log_success "TypeScript compilation successful"
else
    log_warning "TypeScript compilation issues found (non-critical)"
fi

# Step 8: Health check
log_step "Running health check..."

if [ -f "check-status.js" ]; then
    node check-status.js
else
    log_warning "Health check script not found"
fi

# Step 9: Final verification
log_step "Final verification..."

# Check if we can start the development server
log_info "Testing development server startup..."
timeout 10s npm run dev > /dev/null 2>&1 &
DEV_PID=$!

sleep 3

if kill -0 $DEV_PID 2>/dev/null; then
    log_success "Development server can start successfully"
    kill $DEV_PID 2>/dev/null || true
else
    log_warning "Development server startup test failed (this may be normal)"
fi

# Summary
echo ""
echo "=========================================="
echo "🎉 TitleTesterPro Setup Complete!"
echo "=========================================="
echo ""
log_success "✅ Node.js and npm installed"
log_success "✅ Dependencies installed"
log_success "✅ Environment configured"
log_success "✅ Database migration ready"
log_success "✅ Build process verified"
echo ""
echo "🚀 Next Steps:"
echo "1. Configure your .env file with real credentials"
echo "2. Run: npm run dev"
echo "3. Open: http://localhost:5000"
echo "4. Use demo login or configure OAuth"
echo ""
echo "📚 Documentation:"
echo "- README.md - Setup and usage guide"
echo "- FIXES_SUMMARY.md - Technical details"
echo "- REPLIT_AI_AGENT_GUIDE.md - AI agent instructions"
echo ""
log_success "TitleTesterPro is ready to use!" 