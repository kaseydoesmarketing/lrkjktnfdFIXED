import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, Users, TestTube, Activity, AlertTriangle, Eye, Download, Settings, Ban, CheckCircle, Mail, Calendar, Play, Pause, Square, Clock, TrendingUp, Video } from 'lucide-react';

// UserManagement Component
function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('sessionToken');
      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const userData = await response.json();
      setUsers(userData);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const cancelUserAccess = async (userId: string, userEmail: string) => {
    if (!confirm(`Are you sure you want to cancel access for ${userEmail}?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('sessionToken');
      const response = await fetch(`/api/admin/users/${userId}/cancel-access`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        alert(`Access cancelled successfully for ${userEmail}`);
        fetchUsers(); // Refresh the users list
      } else {
        alert('Failed to cancel user access');
      }
    } catch (error) {
      console.error('Error cancelling user access:', error);
      alert('Error cancelling user access');
    }
  };

  const restoreUserAccess = async (userId: string, userEmail: string, tier = 'pro') => {
    if (!confirm(`Are you sure you want to restore ${tier} access for ${userEmail}?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('sessionToken');
      const response = await fetch(`/api/admin/users/${userId}/restore-access`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ tier })
      });
      
      if (response.ok) {
        const result = await response.json();
        alert(`Access restored successfully for ${userEmail}`);
        fetchUsers(); // Refresh the users list
      } else {
        alert('Failed to restore user access');
      }
    } catch (error) {
      console.error('Error restoring user access:', error);
      alert('Error restoring user access');
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading users...</div>;
  }

  return (
    <div className="space-y-4">
      {users.map((user: any) => (
        <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg bg-white hover:bg-gray-50">
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Mail className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <div>
              <p className="font-medium text-gray-900">{user.name || 'Unknown'}</p>
              <p className="text-sm text-gray-600">{user.email}</p>
              <div className="flex items-center space-x-2 mt-1">
                <Badge 
                  variant={user.subscriptionStatus === 'active' ? 'default' : 'secondary'}
                  className={user.subscriptionStatus === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
                >
                  {user.subscriptionStatus || 'none'}
                </Badge>
                {user.subscriptionTier && (
                  <Badge variant="outline" className="text-purple-700 border-purple-300">
                    {user.subscriptionTier}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="text-right text-sm text-gray-500 mr-4">
              <div className="flex items-center">
                <Calendar className="w-4 h-4 mr-1" />
                {new Date(user.createdAt).toLocaleDateString()}
              </div>
            </div>
            
            {user.subscriptionStatus === 'active' ? (
              <Button
                onClick={() => cancelUserAccess(user.id, user.email)}
                variant="destructive"
                size="sm"
                className="bg-red-600 hover:bg-red-700"
              >
                <Ban className="w-4 h-4 mr-1" />
                Cancel Access
              </Button>
            ) : (
              <div className="space-x-2">
                <Button
                  onClick={() => restoreUserAccess(user.id, user.email, 'pro')}
                  variant="outline"
                  size="sm"
                  className="text-green-600 border-green-300 hover:bg-green-50"
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Restore Pro
                </Button>
                <Button
                  onClick={() => restoreUserAccess(user.id, user.email, 'authority')}
                  variant="outline"
                  size="sm"
                  className="text-purple-600 border-purple-300 hover:bg-purple-50"
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Restore Authority
                </Button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// TestManagement Component
function TestManagement() {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTests();
  }, []);

  const fetchTests = async () => {
    try {
      const token = localStorage.getItem('sessionToken');
      const response = await fetch('/api/admin/tests', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const testData = await response.json();
      setTests(testData);
    } catch (error) {
      console.error('Error fetching tests:', error);
    } finally {
      setLoading(false);
    }
  };

  const moderateTest = async (testId: string, action: string, testTitle: string) => {
    const actionText = action === 'pause' ? 'pause' : 'cancel';
    if (!confirm(`Are you sure you want to ${actionText} the test "${testTitle}"?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('sessionToken');
      const response = await fetch(`/api/admin/tests/${testId}/${action}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        alert(`Test ${actionText}ed successfully`);
        fetchTests(); // Refresh the tests list
      } else {
        alert(`Failed to ${actionText} test`);
      }
    } catch (error) {
      console.error(`Error ${actionText}ing test:`, error);
      alert(`Error ${actionText}ing test`);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; icon: any }> = {
      'active': { color: 'bg-green-100 text-green-800', icon: Play },
      'paused': { color: 'bg-yellow-100 text-yellow-800', icon: Pause },
      'completed': { color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
      'cancelled': { color: 'bg-red-100 text-red-800', icon: Square }
    };
    
    const config = statusConfig[status] || { color: 'bg-gray-100 text-gray-800', icon: Clock };
    const IconComponent = config.icon;
    
    return (
      <Badge className={`${config.color} flex items-center space-x-1`}>
        <IconComponent className="w-3 h-3" />
        <span>{status}</span>
      </Badge>
    );
  };

  if (loading) {
    return <div className="text-center py-8">Loading tests...</div>;
  }

  return (
    <div className="space-y-4">
      {tests.length === 0 ? (
        <div className="text-center py-8">
          <TestTube className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Tests Found</h3>
          <p className="text-gray-600">No A/B tests are currently running on the platform.</p>
        </div>
      ) : (
        tests.map((test: any) => (
          <div key={test.id} className="flex items-center justify-between p-4 border rounded-lg bg-white hover:bg-gray-50">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <Video className="w-5 h-5 text-purple-600" />
                </div>
              </div>
              <div>
                <p className="font-medium text-gray-900">{test.videoTitle || 'Unknown Video'}</p>
                <p className="text-sm text-gray-600">by {test.userEmail}</p>
                <div className="flex items-center space-x-3 mt-1">
                  {getStatusBadge(test.status)}
                  <div className="flex items-center text-sm text-gray-500">
                    <TestTube className="w-4 h-4 mr-1" />
                    {test.titlesCount} titles
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <Clock className="w-4 h-4 mr-1" />
                    {test.rotationIntervalMinutes}min intervals
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className="text-right text-sm text-gray-500 mr-4">
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  {new Date(test.createdAt).toLocaleDateString()}
                </div>
                <div className="text-xs text-gray-400">
                  ID: {test.id.substring(0, 8)}...
                </div>
              </div>
              
              {test.status === 'active' && (
                <div className="space-x-2">
                  <Button
                    onClick={() => moderateTest(test.id, 'pause', test.videoTitle)}
                    variant="outline"
                    size="sm"
                    className="text-yellow-600 border-yellow-300 hover:bg-yellow-50"
                  >
                    <Pause className="w-4 h-4 mr-1" />
                    Pause
                  </Button>
                  <Button
                    onClick={() => moderateTest(test.id, 'cancel', test.videoTitle)}
                    variant="destructive"
                    size="sm"
                    className="bg-red-600 hover:bg-red-700"
                  >
                    <Square className="w-4 h-4 mr-1" />
                    Cancel
                  </Button>
                </div>
              )}
              
              {test.status === 'paused' && (
                <Button
                  onClick={() => moderateTest(test.id, 'cancel', test.videoTitle)}
                  variant="destructive"
                  size="sm"
                  className="bg-red-600 hover:bg-red-700"
                >
                  <Square className="w-4 h-4 mr-1" />
                  Cancel
                </Button>
              )}
              
              {(test.status === 'completed' || test.status === 'cancelled') && (
                <Badge variant="outline" className="text-gray-500">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  View Results
                </Badge>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default function SimpleAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeTests: 0,
    totalApiCalls: 0,
    platformHealth: 'good'
  });

  // Check admin access
  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        const token = localStorage.getItem('sessionToken');
        if (!token) {
          setLoading(false);
          return;
        }

        const response = await fetch('/api/admin/check', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          setIsAdmin(true);
          // Load basic stats
          const statsResponse = await fetch('/api/admin/metrics', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (statsResponse.ok) {
            const data = await statsResponse.json();
            setStats(data);
          }
        }
      } catch (error) {
        console.error('Error checking admin access:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAdminAccess();
  }, []);

  const exportData = async (type: 'users' | 'tests') => {
    try {
      const token = localStorage.getItem('sessionToken');
      const response = await fetch(`/api/admin/export/${type}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `titletesterpro-${type}-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error exporting data:', error);
    }
  };

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
            <p className="text-gray-600 mb-4">You don't have admin privileges to access this dashboard.</p>
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
                      <p className="text-2xl font-bold text-gray-900">{stats.dailyApiCalls || 0}</p>
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

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Eye className="w-5 h-5" />
                  <span>Platform Overview</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                    <div>
                      <h3 className="font-medium text-blue-900">Admin Dashboard Active</h3>
                      <p className="text-sm text-blue-700">You are now monitoring the TitleTesterPro platform</p>
                    </div>
                    <Badge className="bg-blue-100 text-blue-800">Live</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                    <div>
                      <h3 className="font-medium text-green-900">Cancel Test Fix Applied</h3>
                      <p className="text-sm text-green-700">Users can now properly cancel their active tests</p>
                    </div>
                    <Badge className="bg-green-100 text-green-800">Fixed</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">User Management</h2>
              <Button onClick={() => exportData('users')} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export Users
              </Button>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>All Users ({stats.totalUsers})</CardTitle>
              </CardHeader>
              <CardContent>
                <UserManagement />
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'tests' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Test Management</h2>
              <Button onClick={() => exportData('tests')} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export Tests
              </Button>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>All Tests ({stats.activeTests} active)</CardTitle>
              </CardHeader>
              <CardContent>
                <TestManagement />
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900">Platform Settings</h2>
            
            <Card>
              <CardContent className="p-6">
                <div className="text-center py-8">
                  <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Platform Configuration</h3>
                  <p className="text-gray-600 mb-4">Advanced platform settings and configuration options.</p>
                  <div className="space-y-2 text-sm text-gray-500">
                    <p>Admin Email: KaseyDoesMarketing@gmail.com</p>
                    <p>Platform Version: 1.0.0</p>
                    <p>Last Updated: {new Date().toLocaleDateString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}