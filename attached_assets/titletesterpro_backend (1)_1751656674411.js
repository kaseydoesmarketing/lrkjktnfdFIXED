// Enhanced TitleTesterPro Backend Server
// Production-ready Express.js server with OAuth, Database, and API endpoints

import express from 'express';
import cors from 'cors';
import session from 'express-session';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { createClient } from '@supabase/supabase-js';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { google } from 'googleapis';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Supabase client
const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "https://api.anthropic.com", "https://*.supabase.co"]
    }
  }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// CORS configuration - CRITICAL FOR REACT FRONTEND
app.use(cors({
  origin: [
    'https://ttro3.replit.app',
    'https://titletesterpro.com',
    'http://localhost:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Session configuration - CRITICAL FOR OAUTH
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());

// Passport Google OAuth Strategy - FIXED CONFIGURATION
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "/api/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Store user in database
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('google_id', profile.id)
      .single();

    if (existingUser) {
      // Update existing user
      const { data: updatedUser } = await supabase
        .from('users')
        .update({
          access_token: accessToken,
          refresh_token: refreshToken,
          last_login: new Date().toISOString()
        })
        .eq('google_id', profile.id)
        .select()
        .single();
      
      return done(null, updatedUser);
    } else {
      // Create new user
      const { data: newUser } = await supabase
        .from('users')
        .insert({
          google_id: profile.id,
          email: profile.emails[0].value,
          name: profile.displayName,
          access_token: accessToken,
          refresh_token: refreshToken,
          created_at: new Date().toISOString(),
          last_login: new Date().toISOString()
        })
        .select()
        .single();
      
      return done(null, newUser);
    }
  } catch (error) {
    console.error('OAuth error:', error);
    return done(error, null);
  }
}));

// Passport serialization
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Authentication middleware
const requireAuth = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Authentication required' });
};

// OAuth Routes - FIXED IMPLEMENTATION
app.get('/api/auth/google', passport.authenticate('google', {
  scope: [
    'profile',
    'email',
    'https://www.googleapis.com/auth/youtube.readonly',
    'https://www.googleapis.com/auth/youtube'
  ]
}));

app.get('/api/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    res.redirect(`${process.env.FRONTEND_URL || 'https://ttro3.replit.app'}/dashboard`);
  }
);

app.get('/api/auth/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ message: 'Logged out successfully' });
  });
});

app.get('/api/auth/user', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// YouTube API Integration
const getYouTubeClient = (accessToken) => {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });
  return google.youtube({ version: 'v3', auth: oauth2Client });
};

// API Routes for TitleTesterPro

// Get user's YouTube videos with pagination
app.get('/api/youtube/videos', requireAuth, async (req, res) => {
  try {
    const { page = 1, limit = 10, maxResults = 50 } = req.query;
    const youtube = getYouTubeClient(req.user.access_token);
    
    const response = await youtube.search.list({
      part: 'snippet',
      forMine: true,
      type: 'video',
      maxResults: parseInt(maxResults),
      order: 'date'
    });

    // Get detailed video statistics
    const videoIds = response.data.items.map(item => item.id.videoId).join(',');
    const statsResponse = await youtube.videos.list({
      part: 'statistics,snippet',
      id: videoIds
    });

    const videos = statsResponse.data.items.map(video => ({
      id: video.id,
      title: video.snippet.title,
      description: video.snippet.description,
      thumbnails: video.snippet.thumbnails,
      publishedAt: video.snippet.publishedAt,
      viewCount: parseInt(video.statistics.viewCount || 0),
      likeCount: parseInt(video.statistics.likeCount || 0),
      commentCount: parseInt(video.statistics.commentCount || 0)
    }));

    // Implement pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedVideos = videos.slice(startIndex, endIndex);

    res.json({
      videos: paginatedVideos,
      totalVideos: videos.length,
      currentPage: parseInt(page),
      totalPages: Math.ceil(videos.length / limit),
      hasNextPage: endIndex < videos.length,
      hasPrevPage: page > 1
    });

  } catch (error) {
    console.error('YouTube API error:', error);
    res.status(500).json({ error: 'Failed to fetch YouTube videos' });
  }
});

// AI-Powered Title Suggestions using Claude
app.post('/api/ai/suggest-titles', requireAuth, async (req, res) => {
  try {
    const { currentTitle, videoDescription, niche, targetAudience } = req.body;
    
    // This would integrate with Claude API for title suggestions
    // For now, providing a mock implementation
    const suggestions = [
      `${currentTitle} - You Won't Believe What Happens Next!`,
      `The Secret Behind ${currentTitle} (REVEALED)`,
      `How ${currentTitle} Changed Everything`,
      `Why ${currentTitle} is Taking Over in 2025`,
      `${currentTitle}: The Ultimate Guide`
    ];

    res.json({ suggestions });
  } catch (error) {
    console.error('AI suggestion error:', error);
    res.status(500).json({ error: 'Failed to generate title suggestions' });
  }
});

// A/B Test Management
app.post('/api/tests/create', requireAuth, async (req, res) => {
  try {
    const { videoId, titleVariants, testDuration, rotationInterval } = req.body;
    
    const { data: test } = await supabase
      .from('ab_tests')
      .insert({
        user_id: req.user.id,
        video_id: videoId,
        title_variants: titleVariants,
        test_duration: testDuration,
        rotation_interval: rotationInterval,
        status: 'active',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    res.json({ test });
  } catch (error) {
    console.error('Test creation error:', error);
    res.status(500).json({ error: 'Failed to create A/B test' });
  }
});

app.get('/api/tests', requireAuth, async (req, res) => {
  try {
    const { data: tests } = await supabase
      .from('ab_tests')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    res.json({ tests });
  } catch (error) {
    console.error('Tests fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch tests' });
  }
});

// Test analytics and results
app.get('/api/tests/:testId/results', requireAuth, async (req, res) => {
  try {
    const { testId } = req.params;
    
    const { data: results } = await supabase
      .from('test_results')
      .select('*')
      .eq('test_id', testId)
      .order('recorded_at', { ascending: false });

    res.json({ results });
  } catch (error) {
    console.error('Results fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch test results' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Database initialization function
async function initializeDatabase() {
  try {
    console.log('Initializing database schema...');
    
    // Create tables if they don't exist
    const tables = [
      {
        name: 'users',
        sql: `
          CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            google_id VARCHAR(255) UNIQUE NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            name VARCHAR(255) NOT NULL,
            access_token TEXT,
            refresh_token TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            last_login TIMESTAMP DEFAULT NOW()
          );
        `
      },
      {
        name: 'ab_tests',
        sql: `
          CREATE TABLE IF NOT EXISTS ab_tests (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id),
            video_id VARCHAR(255) NOT NULL,
            title_variants JSONB NOT NULL,
            test_duration INTEGER DEFAULT 7,
            rotation_interval INTEGER DEFAULT 1440,
            status VARCHAR(50) DEFAULT 'active',
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          );
        `
      },
      {
        name: 'test_results',
        sql: `
          CREATE TABLE IF NOT EXISTS test_results (
            id SERIAL PRIMARY KEY,
            test_id INTEGER REFERENCES ab_tests(id),
            title_variant VARCHAR(255) NOT NULL,
            views INTEGER DEFAULT 0,
            clicks INTEGER DEFAULT 0,
            ctr DECIMAL(5,4) DEFAULT 0,
            recorded_at TIMESTAMP DEFAULT NOW()
          );
        `
      }
    ];

    for (const table of tables) {
      try {
        const { error } = await supabase.rpc('exec_sql', { query: table.sql });
        if (error) {
          console.error(`Error creating table ${table.name}:`, error);
        } else {
          console.log(`✅ Table ${table.name} ready`);
        }
      } catch (err) {
        console.log(`⚠️  Table ${table.name} might already exist`);
      }
    }
    
    console.log('✅ Database initialization complete');
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// Start server
async function startServer() {
  try {
    await initializeDatabase();
    
    app.listen(PORT, () => {
      console.log(`🚀 TitleTesterPro Backend Server running on port ${PORT}`);
      console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'https://ttro3.replit.app'}`);
      console.log(`📊 Dashboard: ${process.env.FRONTEND_URL || 'https://ttro3.replit.app'}/dashboard`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;