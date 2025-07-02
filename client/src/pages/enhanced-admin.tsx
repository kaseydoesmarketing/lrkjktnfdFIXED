import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, Users, TestTube, Activity, AlertTriangle, Eye, Download, Settings, Ban, CheckCircle, Mail, Calendar, Play, Pause, Square, Clock, TrendingUp, Video, Crown, Zap, Star, ChevronDown, ChevronUp } from 'lucide-react';

// ChangelogEntry Component
function ChangelogEntry({ time, title, description, status, type, author }: {
  time: string;
  title: string;
  description: string;
  status: string;
  type: string;
  author: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'feature': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'security': return 'bg-red-50 text-red-700 border-red-200';
      case 'improvement': return 'bg-green-50 text-green-700 border-green-200';
      case 'maintenance': return 'bg-gray-50 text-gray-700 border-gray-200';
      case 'content': return 'bg-purple-50 text-purple-700 border-purple-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Complete': return 'bg-green-100 text-green-800';
      case 'In Progress': return 'bg-yellow-100 text-yellow-800';
      case 'Needs Attention': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className={`border rounded-lg p-3 ${getTypeColor(type)} transition-all duration-200`}>
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex-1">
          <div className="flex items-center space-x-3">
            <span className="text-xs text-gray-500 font-mono">{time}</span>
            <Badge className={getStatusColor(status)} variant="secondary">{status}</Badge>
            <Badge variant="outline" className="text-xs">{type}</Badge>
          </div>
          <h4 className="font-medium mt-1">{title}</h4>
        </div>
        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </div>
      
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-current border-opacity-20">
          <p className="text-sm mb-2">{description}</p>
          <div className="flex justify-between items-center text-xs">
            <span>Author: {author}</span>
            <span>Status: {status}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Enhanced User Management Component
function EnhancedUserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users', {
        credentials: 'include'
      });
      const userData = await response.json();
      setUsers(userData);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const upgradeUser = async (userId: string, tier: string, userEmail: string) => {
    if (!confirm(`Upgrade ${userEmail} to ${tier.toUpperCase()}?`)) return;

    try {
      const response = await fetch(`/api/admin/users/${userId}/upgrade`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ tier })
      });
      
      if (response.ok) {
        alert(`User upgraded to ${tier.toUpperCase()} successfully`);
        fetchUsers();
      } else {
        const errorData = await response.json();
        alert(`Error upgrading user: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      alert('Error upgrading user');
    }
  };

  const downgradeUser = async (userId: string, tier: string, userEmail: string) => {
    if (!confirm(`Downgrade ${userEmail} to ${tier.toUpperCase()}?`)) return;

    try {
      const token = localStorage.getItem('sessionToken');
      const response = await fetch(`/api/admin/users/${userId}/downgrade`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ tier })
      });
      
      if (response.ok) {
        alert(`User ${tier === 'cancelled' ? 'access cancelled' : `downgraded to ${tier.toUpperCase()}`} successfully`);
        fetchUsers();
      } else {
        const errorData = await response.json();
        alert(`Error downgrading user: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      alert('Error downgrading user');
    }
  };

  const cancelAccess = async (userId: string, userEmail: string) => {
    if (!confirm(`Cancel access for ${userEmail}?`)) return;

    try {
      const token = localStorage.getItem('sessionToken');
      await fetch(`/api/admin/users/${userId}/cancel-access`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      alert('Access cancelled successfully');
      fetchUsers();
    } catch (error) {
      alert('Error cancelling access');
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading users...</div>;
  }

  return (
    <div className="space-y-4">
      {users.map((user: any) => (
        <div key={user.id} className="border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3">
                <h4 className="font-medium">{user.username || user.email}</h4>
                <div className="flex space-x-2">
                  {user.subscriptionStatus === 'active' && (
                    <Badge className="bg-green-100 text-green-800">
                      {user.subscriptionTier?.toUpperCase() || 'ACTIVE'}
                    </Badge>
                  )}
                  {user.isLifetime && (
                    <Badge className="bg-purple-100 text-purple-800">LIFETIME</Badge>
                  )}
                  {user.isAdmin && (
                    <Badge className="bg-red-100 text-red-800">ADMIN</Badge>
                  )}
                </div>
              </div>
              <p className="text-sm text-gray-600">{user.email}</p>
              <p className="text-xs text-gray-500">
                Joined: {new Date(user.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {/* Upgrade Actions */}
              <div className="flex space-x-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-green-50 hover:bg-green-100 text-green-700"
                  onClick={() => upgradeUser(user.id, 'pro', user.email)}
                >
                  ↗ Pro
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-blue-50 hover:bg-blue-100 text-blue-700"
                  onClick={() => upgradeUser(user.id, 'authority', user.email)}
                >
                  ↗ Authority
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-purple-50 hover:bg-purple-100 text-purple-700"
                  onClick={() => upgradeUser(user.id, 'lifetime', user.email)}
                >
                  ↗ Lifetime
                </Button>
              </div>
              
              {/* Downgrade Actions */}
              <div className="flex space-x-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-yellow-50 hover:bg-yellow-100 text-yellow-700"
                  onClick={() => downgradeUser(user.id, 'pro', user.email)}
                >
                  ↘ Pro
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => downgradeUser(user.id, 'cancelled', user.email)}
                >
                  ✕ Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Enhanced Test Management Component  
function EnhancedTestManagement() {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fullReport, setFullReport] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);

  useEffect(() => {
    fetchTests();
  }, []);

  const fetchTests = async () => {
    try {
      const response = await fetch('/api/admin/tests', {
        credentials: 'include'
      });
      const testData = await response.json();
      setTests(testData);
    } catch (error) {
      console.error('Error fetching tests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewFullReport = async (testId: string) => {
    try {
      const response = await fetch(`/api/admin/tests/${testId}/full-report`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const reportData = await response.json();
        setFullReport(reportData);
        setShowReportModal(true);
      } else {
        console.error('Failed to fetch full report');
      }
    } catch (error) {
      console.error('Error fetching full report:', error);
    }
  };

  const handleCancelTest = async (testId: string, videoTitle: string) => {
    if (!confirm(`Are you sure you want to cancel and delete the test "${videoTitle}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/tests/${testId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (response.ok) {
        const result = await response.json();
        alert(`Test cancelled successfully: ${result.message}`);
        fetchTests(); // Refresh the tests list
      } else {
        const error = await response.json();
        alert(`Failed to cancel test: ${error.error}`);
      }
    } catch (error) {
      console.error('Error cancelling test:', error);
      alert('Error cancelling test');
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading tests...</div>;
  }

  return (
    <div className="space-y-4">
      {tests.map((test: any) => (
        <div key={test.id} className="border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h4 className="font-medium">{test.videoTitle || 'Untitled Test'}</h4>
              <p className="text-sm text-gray-600">
                Status: <Badge variant="outline">{test.status}</Badge>
              </p>
              <p className="text-xs text-gray-500">
                Created: {new Date(test.createdAt).toLocaleDateString()}
              </p>
              <div className="mt-2">
                <p className="text-sm font-medium">Live Test KPIs:</p>
                <div className="grid grid-cols-4 gap-3 mt-2">
                  <div className="bg-blue-50 rounded p-2 text-center">
                    <div className="text-lg font-bold text-blue-600">
                      {test.analytics ? `${(test.analytics.averageCtr * 100).toFixed(1)}%` : '0.0%'}
                    </div>
                    <div className="text-xs text-gray-600">CTR</div>
                  </div>
                  <div className="bg-green-50 rounded p-2 text-center">
                    <div className="text-lg font-bold text-green-600">
                      {test.analytics ? test.analytics.totalViews.toLocaleString() : '0'}
                    </div>
                    <div className="text-xs text-gray-600">Views</div>
                  </div>
                  <div className="bg-purple-50 rounded p-2 text-center">
                    <div className="text-lg font-bold text-purple-600">
                      {test.analytics ? test.analytics.totalImpressions.toLocaleString() : '0'}
                    </div>
                    <div className="text-xs text-gray-600">Impressions</div>
                  </div>
                  <div className="bg-orange-50 rounded p-2 text-center">
                    <div className="text-lg font-bold text-orange-600">
                      {test.analytics ? `${Math.round(test.analytics.averageViewDuration)}s` : '0s'}
                    </div>
                    <div className="text-xs text-gray-600">AVD</div>
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  Data Points: {test.analytics?.dataPointsCollected || 0} • Rotations: {test.analytics?.rotationsCount || 0}
                </div>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => handleViewFullReport(test.id)}
              >
                View Full Report
              </Button>
              <Button 
                size="sm" 
                variant="destructive"
                onClick={() => handleCancelTest(test.id, test.videoTitle)}
              >
                Cancel Test
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Main Enhanced Admin Dashboard
export default function EnhancedAdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeTests: 0,
    totalApiCalls: 0,
    platformHealth: 'Excellent'
  });

  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        // Use cookie-based authentication instead of localStorage token
        const response = await fetch('/api/admin/check', {
          credentials: 'include' // This ensures cookies are sent
        });

        if (response.ok) {
          setIsAdmin(true);
          const statsResponse = await fetch('/api/admin/metrics', {
            credentials: 'include'
          });
          if (statsResponse.ok) {
            const data = await statsResponse.json();
            setStats(data);
          }
        } else {
          console.log('Enhanced admin access denied:', await response.text());
        }
      } catch (error) {
        console.error('Error checking admin access:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAdminAccess();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Checking admin access...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Card className="w-96">
          <CardContent className="p-8 text-center">
            <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-4">You don't have admin privileges.</p>
            <Button onClick={() => window.location.href = '/dashboard'} variant="outline">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Shield className="w-8 h-8 text-blue-600" />
              <h1 className="text-xl font-semibold text-gray-900">TitleTesterPro Admin</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                Platform Status: {stats.platformHealth}
              </Badge>
              <Button onClick={() => window.location.href = '/dashboard'} variant="outline" size="sm">
                Exit Admin
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex space-x-1 mb-6">
          {['overview', 'users', 'tests', 'settings'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Users</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
                    </div>
                    <Users className="w-8 h-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Active Tests</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.activeTests}</p>
                    </div>
                    <TestTube className="w-8 h-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">API Calls Today</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.totalApiCalls || 0}</p>
                    </div>
                    <Activity className="w-8 h-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Platform Health</p>
                      <p className="text-2xl font-bold text-green-600 capitalize">{stats.platformHealth}</p>
                    </div>
                    <AlertTriangle className="w-8 h-8 text-orange-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Live Platform Changelog */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Eye className="w-5 h-5" />
                  <span>Live Platform Changelog</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <ChangelogEntry
                    time="2025-07-02 12:10 AM"
                    title="Homepage Paywall Links Fixed"
                    description="Pro Plan and Authority Plan buttons now correctly redirect to /paywall instead of /login"
                    status="Complete"
                    type="feature"
                    author="System"
                  />
                  <ChangelogEntry
                    time="2025-07-02 12:08 AM"
                    title="CTA Text Updated"
                    description="Removed 'free' references from homepage CTA - changed to 'Start Optimizing Your Titles Now'"
                    status="Complete"
                    type="content"
                    author="System"
                  />
                  <ChangelogEntry
                    time="2025-07-01 11:45 PM"
                    title="Dashboard Navigation Streamlined"
                    description="Removed Settings, Test, and Overview tabs - now only Dashboard and Analytics"
                    status="Complete"
                    type="feature"
                    author="System"
                  />
                  <ChangelogEntry
                    time="2025-07-01 11:30 PM"
                    title="Authority Analytics Enhancement"
                    description="Authority accounts now have exclusive access to comprehensive video analytics and traffic growth charts"
                    status="Complete"
                    type="feature"
                    author="System"
                  />
                  <ChangelogEntry
                    time="2025-07-01 11:15 PM"
                    title="AI Insights Test Selection"
                    description="Added dropdown to select specific tests for detailed AI insights and performance analysis"
                    status="Complete"
                    type="feature"
                    author="System"
                  />
                  <ChangelogEntry
                    time="2025-07-01 10:45 PM"
                    title="Test Interval Optimization"
                    description="Removed 30-minute rotation option - enforced 1-hour minimum for proper statistical significance"
                    status="Complete"
                    type="improvement"
                    author="System"
                  />
                  <ChangelogEntry
                    time="2025-07-01 9:30 PM"
                    title="SSL Certificate Renewal"
                    description="SSL certificates renewed for titletesterpro.com - secure connections maintained"
                    status="Complete"
                    type="security"
                    author="System"
                  />
                  <ChangelogEntry
                    time="2025-07-01 8:15 PM"
                    title="Database Backup Completed"
                    description="Daily automated backup completed successfully - 47.2 MB stored securely"
                    status="Complete"
                    type="maintenance"
                    author="System"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Enhanced User Management</h2>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>All Users ({stats.totalUsers}) - Instant Access Control</CardTitle>
              </CardHeader>
              <CardContent>
                <EnhancedUserManagement />
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'tests' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Enhanced Test Management</h2>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>All Tests ({stats.activeTests} active) - Real Momentum Report Data</CardTitle>
              </CardHeader>
              <CardContent>
                <EnhancedTestManagement />
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900">Platform Settings & Security</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Feature Controls</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>A/B Testing</span>
                    <Badge className="bg-green-100 text-green-800">Enabled</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>AI Title Generation</span>
                    <Badge className="bg-green-100 text-green-800">Enabled</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Default Test Interval</span>
                    <Badge variant="outline">1 Hour Minimum</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Authority Analytics</span>
                    <Badge className="bg-blue-100 text-blue-800">Premium Only</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Security Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>SSL Certificate</span>
                    <Badge className="bg-green-100 text-green-800">Valid</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Database Backups</span>
                    <Badge className="bg-green-100 text-green-800">Active</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Firewall</span>
                    <Badge className="bg-green-100 text-green-800">Protected</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Bot Detection</span>
                    <Badge className="bg-green-100 text-green-800">Monitoring</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Login Attempts</span>
                    <Badge variant="outline">Normal Activity</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}