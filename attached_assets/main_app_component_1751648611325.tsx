import React, { useState, useEffect, createContext, useContext } from 'react';
import { 
  Youtube, TrendingUp, Zap, Shield, Users, BarChart3,
  Play, Pause, RotateCcw, Eye, MousePointer, Clock,
  Settings, Filter, Download, Plus, ChevronLeft, ChevronRight,
  Sparkles, Target, Video
} from 'lucide-react';

// Enhanced Dashboard Component (imported inline for demo)
const EnhancedDashboard = ({ onNavigate }) => {
  // State management
  const [videos, setVideos] = useState([]);
  const [selectedVideos, setSelectedVideos] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [videosPerPage, setVideosPerPage] = useState(10);
  const [activeTests, setActiveTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAISuggestions, setShowAISuggestions] = useState(false);
  const [titleSuggestions, setTitleSuggestions] = useState([]);

  // Mock data for demonstration
  const mockVideos = [
    {
      id: 'dQw4w9WgXcQ',
      title: 'Never Gonna Give You Up',
      views: 1234567,
      ctr: 4.2,
      publishedAt: '2024-01-15',
      thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg'
    },
    {
      id: 'abc123def456',
      title: 'How to Build Amazing React Apps in 2025',
      views: 89456,
      ctr: 6.8,
      publishedAt: '2024-01-10',
      thumbnail: 'https://i.ytimg.com/vi/abc123def456/mqdefault.jpg'
    },
    // Add more mock videos...
  ];

  const mockActiveTests = [
    {
      id: 1,
      videoId: 'dQw4w9WgXcQ',
      videoTitle: 'Never Gonna Give You Up',
      variants: ['Original Title', 'SHOCKING Truth About...', 'You Won\'t Believe...'],
      status: 'active',
      progress: 65,
      winner: 'SHOCKING Truth About...',
      improvement: '+23%'
    }
  ];

  const mockAnalytics = {
    totalTests: 47,
    avgImprovement: 34.2,
    activeTests: 8,
    completedTests: 39
  };

  // Return the dashboard JSX (simplified for demo)
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">TitleTesterPro</h1>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full font-medium">
                Dashboard
              </span>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-6 text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <BarChart3 className="w-4 h-4 text-blue-600" />
                  <span>{mockAnalytics.totalTests} Tests</span>
                </div>
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <span>+{mockAnalytics.avgImprovement}% Avg CTR</span>
                </div>
              </div>
              <button 
                onClick={() => onNavigate && onNavigate('landing')}
                className="text-gray-600 hover:text-gray-900 px-3 py-1 rounded border border-gray-300 hover:bg-gray-50 transition-colors text-sm"
              >
                ← Home
              </button>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                New Test
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Dashboard Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <h3 className="text-lg font-semibold mb-2">Active A/B Tests</h3>
            <p className="text-3xl font-bold text-blue-600">8</p>
            <p className="text-sm text-gray-600">Currently running</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <h3 className="text-lg font-semibold mb-2">Avg CTR Improvement</h3>
            <p className="text-3xl font-bold text-green-600">+34.2%</p>
            <p className="text-sm text-gray-600">From title optimization</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <h3 className="text-lg font-semibold mb-2">Total Tests</h3>
            <p className="text-3xl font-bold text-purple-600">47</p>
            <p className="text-sm text-gray-600">Completed successfully</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-xl font-semibold mb-4">Recent Videos</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mockVideos.map(video => (
              <div key={video.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="aspect-video bg-gray-200 rounded mb-3 flex items-center justify-center">
                  <Video className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="font-medium text-sm mb-2 line-clamp-2">{video.title}</h3>
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span>{video.views.toLocaleString()} views</span>
                  <span>{video.ctr}% CTR</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Auth Context
const AuthContext = createContext(null);

// API Base URL - Fixed for browser environment
const API_BASE_URL = window.location.hostname.includes('replit') || window.location.hostname.includes('titletesterpro')
  ? 'https://ttro3.replit.app/api' 
  : 'http://localhost:5000/api';

// Auth Provider Component
const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check authentication status
  const checkAuth = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/user`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error('Auth check failed:', err);
      setError('Failed to check authentication status');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = () => {
    window.location.href = `${API_BASE_URL}/auth/google`;
  };

  const logout = async () => {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'GET',
        credentials: 'include'
      });
      setUser(null);
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const value = {
    user,
    loading,
    error,
    login,
    logout,
    checkAuth
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook to use auth context
const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Landing Page Component
const LandingPage = () => {
  const { login } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Youtube className="w-8 h-8 text-red-600" />
              <span className="text-2xl font-bold text-gray-900">TitleTesterPro</span>
              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">Enhanced</span>
            </div>
            <div className="flex items-center space-x-4">
              <a href="#features" className="text-gray-600 hover:text-gray-900">Features</a>
              <a href="#pricing" className="text-gray-600 hover:text-gray-900">Pricing</a>
              <button
                onClick={login}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Made for Creators.{' '}
            <span className="text-blue-600">Developed by Marketers</span>{' '}
            to Grow YouTube Channels.
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            The only AI-powered A/B testing platform specifically designed to optimize YouTube titles.
            Increase your click-through rates with scientific precision.
          </p>
          
          <div className="flex items-center justify-center space-x-8 mb-8 text-sm text-gray-600">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4" />
              <span>Trusted by 15,000+ creators</span>
            </div>
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4" />
              <span>2.3M+ titles tested</span>
            </div>
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4" />
              <span>47% average CTR improvement</span>
            </div>
          </div>

          <div className="flex items-center justify-center space-x-4">
            <button
              onClick={login}
              className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <Youtube className="w-5 h-5" />
              <span>Start Testing Your Titles Free</span>
            </button>
            <button className="border border-gray-300 text-gray-700 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-50 transition-colors">
              Watch 2-Min Demo
            </button>
          </div>
        </div>

        {/* Features Preview */}
        <div className="mt-20 grid md:grid-cols-3 gap-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">AI-Powered Title Suggestions</h3>
            <p className="text-gray-600">Get 10+ scientifically-optimized title variants instantly based on your niche and video content.</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <BarChart3 className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Real-Time A/B Testing</h3>
            <p className="text-gray-600">Test multiple titles simultaneously with automatic traffic splitting and statistical significance tracking.</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">YouTube Integration</h3>
            <p className="text-gray-600">Seamlessly integrate with your YouTube Studio. Update titles directly from our dashboard.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Login Page Component
const LoginPage = ({ onNavigate }) => {
  const { login, error } = useAuth();

  const handleBackToHome = () => {
    onNavigate('landing');
  };

  const handleLoginSuccess = () => {
    onNavigate('dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <Youtube className="w-8 h-8 text-red-600" />
              <span className="text-2xl font-bold text-gray-900">TitleTesterPro</span>
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Connect Your YouTube Account</h2>
            <p className="text-gray-600 mt-2">Start optimizing your video titles today</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center text-red-800">
                <span className="text-sm">⚠️ Authentication Error</span>
              </div>
              <p className="text-red-700 text-sm mt-1">{error}</p>
            </div>
          )}

          <button
            onClick={handleLoginSuccess}
            className="w-full bg-red-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-red-700 transition-colors flex items-center justify-center space-x-2 mb-4"
          >
            <Youtube className="w-5 h-5" />
            <span>Connect with Google</span>
          </button>

          <button
            onClick={handleBackToHome}
            className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors"
          >
            ← Back to Home
          </button>

          <div className="mt-6 text-center text-sm text-gray-600">
            By using TitleTesterPro, you agree to our{' '}
            <a href="/terms" className="text-blue-600 hover:underline">Terms of Service</a>{' '}
            and{' '}
            <a href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</a>
          </div>
        </div>
      </div>
    </div>
  );
};

// Loading Component
const LoadingSpinner = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p className="text-gray-600">Loading TitleTesterPro...</p>
    </div>
  </div>
);

// Main App Component with Navigation
const App = () => {
  const [currentView, setCurrentView] = useState('landing');
  
  return (
    <AuthProvider>
      <div className="App">
        {/* Navigation Logic */}
        {currentView === 'landing' && <LandingPage onNavigate={setCurrentView} />}
        {currentView === 'login' && <LoginPage onNavigate={setCurrentView} />}
        {currentView === 'dashboard' && <EnhancedDashboard onNavigate={setCurrentView} />}
      </div>
    </AuthProvider>
  );
};

export default App;

export default App;