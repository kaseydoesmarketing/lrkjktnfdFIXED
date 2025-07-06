# TitleTesterPro

A premium YouTube optimization platform that enables content creators to maximize their video performance through automated A/B title testing.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- PostgreSQL database (Supabase recommended)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd lrkjktnfdFIXED
   ```

2. **Run the setup script**
   ```bash
   chmod +x setup.sh
   ./setup.sh
   ```

3. **Configure environment variables**
   ```bash
   cp env.template .env
   # Edit .env with your API keys
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Visit the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

## 🔧 Configuration

### Required Environment Variables

Copy `env.template` to `.env` and fill in your values:

```bash
# Database Configuration
DATABASE_URL=your_postgresql_connection_string

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# YouTube API Configuration
YOUTUBE_API_KEY=your_youtube_api_key

# Stripe Payment Configuration
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key

# AI Configuration
ANTHROPIC_API_KEY=your_anthropic_api_key

# Security Configuration
ENCRYPTION_KEY=your_32_character_encryption_key
SESSION_SECRET=your_session_secret
```

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable YouTube Data API v3
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `http://localhost:5000/api/auth/callback/google` (development)
   - `https://yourdomain.com/api/auth/callback/google` (production)

### Stripe Setup

1. Create a Stripe account
2. Get your API keys from the dashboard
3. Create products and price IDs for your subscription tiers
4. Configure webhook endpoints

## 🏗️ Architecture

### Frontend
- **React 18** with TypeScript
- **Vite** for build tooling
- **Wouter** for routing
- **TanStack Query** for data fetching
- **Tailwind CSS** for styling
- **Radix UI** for components

### Backend
- **Node.js** with Express
- **TypeScript** for type safety
- **Drizzle ORM** for database operations
- **Passport.js** for authentication
- **YouTube Data API** for video management
- **Stripe** for payments

### Database
- **PostgreSQL** (Supabase recommended)
- **Drizzle ORM** for type-safe queries
- **Migrations** for schema management

## 📊 Features

### Core Functionality
- ✅ Automated A/B title testing
- ✅ Real-time analytics collection
- ✅ YouTube API integration
- ✅ OAuth authentication
- ✅ Subscription management
- ✅ Dashboard with charts

### Advanced Features
- ✅ AI-powered title generation
- ✅ Performance optimization
- ✅ Winner determination algorithms
- ✅ Background job scheduling
- ✅ Error handling and monitoring

## 🐛 Troubleshooting

### Common Issues

#### 1. OAuth Authentication Errors
```bash
# Check Google Cloud Console configuration
# Verify redirect URIs match your domain
# Ensure YouTube API is enabled
```

#### 2. Database Connection Issues
```bash
# Verify DATABASE_URL is correct
# Check network connectivity
# Ensure database is running
```

#### 3. YouTube API Quota Exceeded
```bash
# Check API quota usage
# Implement rate limiting
# Use API key rotation
```

#### 4. Build Errors
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Run TypeScript checks
npm run check

# Run database migrations
npm run db:push

# Start production server
npm start
```

## 🔒 Security

### Authentication
- OAuth 2.0 with Google
- Session-based authentication
- Encrypted token storage
- CSRF protection

### Data Protection
- HTTPS enforcement in production
- Input validation and sanitization
- Rate limiting
- SQL injection prevention

### Environment Variables
- Never commit `.env` files
- Use strong encryption keys
- Rotate secrets regularly

## 📈 Performance

### Optimization
- Database query optimization
- API response caching
- Frontend code splitting
- Image optimization

### Monitoring
- Error tracking and logging
- Performance metrics
- User analytics
- System health checks

## 🚀 Deployment

### Production Checklist
- [ ] Set `NODE_ENV=production`
- [ ] Configure SSL certificates
- [ ] Set up proper domain
- [ ] Configure OAuth redirect URIs
- [ ] Set up monitoring and logging
- [ ] Configure backup strategy
- [ ] Set up CI/CD pipeline

### Deployment Options
- **Vercel** (recommended for frontend)
- **Railway** (full-stack)
- **Heroku** (full-stack)
- **AWS** (enterprise)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Check the troubleshooting section
- Review the documentation

## 🔄 Recent Fixes

### Critical Issues Resolved
- ✅ Database schema inconsistencies
- ✅ OAuth authentication flow
- ✅ Environment variable handling
- ✅ Error boundary implementation
- ✅ Session management
- ✅ TypeScript compilation errors

### Performance Improvements
- ✅ Query optimization
- ✅ Caching strategies
- ✅ Error handling
- ✅ Loading states

---

**TitleTesterPro** - Optimize your YouTube titles with data-driven A/B testing

## Features

- **Automated Title Testing**: Set up A/B tests with multiple title variants
- **Smart Rotation**: Automatic title rotation based on configurable intervals
- **Real-time Analytics**: Track CTR, views, impressions, and average view duration
- **Performance Visualization**: Charts and graphs to compare title performance
- **Test Management**: Pause, resume, and monitor active tests
- **Winner Detection**: Automatic identification of best-performing titles
- **Data Export**: Export test results to CSV for further analysis

## Tech Stack

### Frontend
- React with TypeScript
- Tailwind CSS for styling
- Shadcn/ui component library
- Recharts for data visualization
- TanStack Query for state management

### Backend
- Express.js with TypeScript
- PostgreSQL with Drizzle ORM
- Google OAuth for YouTube API access
- Node.js scheduler for automated tasks

## Setup Instructions

### Prerequisites
- Node.js 18+ 
- PostgreSQL database
- Google Cloud Console project with YouTube Data API enabled

### 1. Clone and Install
```bash
git clone <repository-url>
cd titletesterpro
npm install
