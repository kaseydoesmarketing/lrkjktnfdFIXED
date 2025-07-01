import React, { useState, useEffect } from 'react';
import { Shield, Users, TestTube, AlertTriangle, TrendingUp, Activity, Search, Filter, Download, Eye, Ban, CheckCircle, XCircle, Clock, BarChart3, Database, Server, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface AdminUser {
  id: string;
  email: string;
  name: string;
  subscriptionTier: 'pro' | 'authority' | 'none';
  subscriptionStatus: 'active' | 'cancelled' | 'expired';
  createdAt: string;
  lastActive: string;
  testsCount: number;
  totalApiCalls: number;
  flagged: boolean;
}

interface AdminTest {
  id: string;
  userId: string;
  userEmail: string;
  videoId: string;
  videoTitle: string;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  titlesCount: number;
  rotationIntervalMinutes: number;
  totalRotations: number;
  apiCallsCount: number;
  createdAt: string;
  lastRotation: string;
  avgCtr: number;
  totalViews: number;
  flagged: boolean;
  suspiciousActivity: string[];
}

interface PlatformMetrics {
  totalUsers: number;
  activeUsers: number;
  totalTests: number;
  activeTests: number;
  totalApiCalls: number;
  dailyApiCalls: number;
  avgTestsPerUser: number;
  platformHealth: 'excellent' | 'good' | 'warning' | 'critical';
  flaggedUsers: number;
  flaggedTests: number;
}

interface ApiQuotaStatus {
  current: number;
  limit: number;
  percentage: number;
  resetTime: string;
  projectsUsed: number;
  totalProjects: number;
}

export default function AdminDashboard() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [tests, setTests] = useState<AdminTest[]>([]);
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [quotaStatus, setQuotaStatus] = useState<ApiQuotaStatus | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    setIsLoading(true);
    try {
      const [metricsRes, usersRes, testsRes, quotaRes] = await Promise.all([
        fetch('/api/admin/metrics', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('sessionToken')}` }
        }),
        fetch('/api/admin/users', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('sessionToken')}` }
        }),
        fetch('/api/admin/tests', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('sessionToken')}` }
        }),
        fetch('/api/admin/quota-status', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('sessionToken')}` }
        })
      ]);

      if (metricsRes.ok) setMetrics(await metricsRes.json());
      if (usersRes.ok) setUsers(await usersRes.json());
      if (testsRes.ok) setTests(await testsRes.json());
      if (quotaRes.ok) setQuotaStatus(await quotaRes.json());
    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserAction = async (userId: string, action: 'flag' | 'unflag' | 'suspend' | 'unsuspend') => {
    try {
      await fetch(`/api/admin/users/${userId}/${action}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('sessionToken')}` }
      });
      loadAdminData();
    } catch (error) {
      console.error(`Error ${action}ing user:`, error);
    }
  };

  const handleTestAction = async (testId: string, action: 'flag' | 'unflag' | 'pause' | 'cancel') => {
    try {
      await fetch(`/api/admin/tests/${testId}/${action}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('sessionToken')}` }
      });
      loadAdminData();
    } catch (error) {
      console.error(`Error ${action}ing test:`, error);
    }
  };

  const exportData = async (type: 'users' | 'tests' | 'metrics') => {
    try {
      const response = await fetch(`/api/admin/export/${type}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('sessionToken')}` }
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `titletesterpro-${type}-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    } catch (error) {
      console.error(`Error exporting ${type}:`, error);
    }
  };

  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.name.toLowerCase().includes(searchTerm.toLowerCase())
  ).filter(user => 
    filterStatus === 'all' || 
    (filterStatus === 'flagged' && user.flagged) ||
    (filterStatus === 'active' && user.subscriptionStatus === 'active')
  );

  const filteredTests = tests.filter(test => 
    test.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
    test.videoTitle.toLowerCase().includes(searchTerm.toLowerCase())
  ).filter(test => 
    filterStatus === 'all' || 
    (filterStatus === 'flagged' && test.flagged) ||
    (filterStatus === 'active' && test.status === 'active')
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Shield className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">TitleTesterPro Admin</h1>
              <p className="text-sm text-gray-600">Platform monitoring and management</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Badge variant={metrics?.platformHealth === 'excellent' ? 'default' : 'destructive'}>
              {metrics?.platformHealth || 'Unknown'} Health
            </Badge>
            <Button onClick={() => loadAdminData()} variant="outline" size="sm">
              <Activity className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200 px-6">
        <nav className="flex space-x-8">
          {['overview', 'users', 'tests', 'quotas'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      <div className="p-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Platform Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics?.totalUsers || 0}</div>
                  <p className="text-xs text-gray-600">
                    {metrics?.activeUsers || 0} active today
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Tests</CardTitle>
                  <TestTube className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics?.activeTests || 0}</div>
                  <p className="text-xs text-gray-600">
                    {metrics?.totalTests || 0} total tests
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">API Calls Today</CardTitle>
                  <Database className="h-4 w-4 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics?.dailyApiCalls || 0}</div>
                  <p className="text-xs text-gray-600">
                    {metrics?.totalApiCalls || 0} total
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Flagged Items</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    {(metrics?.flaggedUsers || 0) + (metrics?.flaggedTests || 0)}
                  </div>
                  <p className="text-xs text-gray-600">
                    {metrics?.flaggedUsers || 0} users, {metrics?.flaggedTests || 0} tests
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Suspicious Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {tests.filter(test => test.flagged).slice(0, 5).map(test => (
                    <div key={test.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                      <div>
                        <p className="font-medium text-red-900">{test.userEmail}</p>
                        <p className="text-sm text-red-700">
                          {test.suspiciousActivity.join(', ')}
                        </p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => setActiveTab('tests')}>
                        <Eye className="h-4 w-4 mr-2" />
                        Review
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            {/* Search and Filters */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="all">All Users</option>
                  <option value="active">Active Subscriptions</option>
                  <option value="flagged">Flagged Users</option>
                </select>
              </div>
              <Button onClick={() => exportData('users')} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export Users
              </Button>
            </div>

            {/* Users Table */}
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subscription</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tests</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">API Calls</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Active</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredUsers.map(user => (
                        <tr key={user.id} className={user.flagged ? 'bg-red-50' : ''}>
                          <td className="px-6 py-4">
                            <div>
                              <p className="font-medium text-gray-900">{user.name}</p>
                              <p className="text-sm text-gray-600">{user.email}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <Badge variant={user.subscriptionStatus === 'active' ? 'default' : 'secondary'}>
                              {user.subscriptionTier} - {user.subscriptionStatus}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">{user.testsCount}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{user.totalApiCalls}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {new Date(user.lastActive).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4">
                            {user.flagged ? (
                              <Badge variant="destructive">Flagged</Badge>
                            ) : (
                              <Badge variant="secondary">Normal</Badge>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleUserAction(user.id, user.flagged ? 'unflag' : 'flag')}
                              >
                                {user.flagged ? 'Unflag' : 'Flag'}
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleUserAction(user.id, 'suspend')}
                              >
                                <Ban className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tests Tab */}
        {activeTab === 'tests' && (
          <div className="space-y-6">
            {/* Search and Filters */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search tests..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="all">All Tests</option>
                  <option value="active">Active Tests</option>
                  <option value="flagged">Flagged Tests</option>
                </select>
              </div>
              <Button onClick={() => exportData('tests')} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export Tests
              </Button>
            </div>

            {/* Tests Table */}
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Test</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Performance</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">API Usage</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Flags</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredTests.map(test => (
                        <tr key={test.id} className={test.flagged ? 'bg-red-50' : ''}>
                          <td className="px-6 py-4">
                            <div>
                              <p className="font-medium text-gray-900 truncate max-w-xs">
                                {test.videoTitle}
                              </p>
                              <p className="text-sm text-gray-600">{test.titlesCount} variants</p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm text-gray-900">{test.userEmail}</p>
                          </td>
                          <td className="px-6 py-4">
                            <Badge variant={test.status === 'active' ? 'default' : 'secondary'}>
                              {test.status}
                            </Badge>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm">
                              <p>CTR: {test.avgCtr.toFixed(2)}%</p>
                              <p>Views: {test.totalViews.toLocaleString()}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm">
                              <p>{test.apiCallsCount} calls</p>
                              <p>{test.totalRotations} rotations</p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {test.suspiciousActivity.length > 0 ? (
                              <div className="text-sm text-red-600">
                                {test.suspiciousActivity.slice(0, 2).map(flag => (
                                  <Badge key={flag} variant="destructive" className="mr-1 mb-1">
                                    {flag}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <Badge variant="secondary">Clean</Badge>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleTestAction(test.id, test.flagged ? 'unflag' : 'flag')}
                              >
                                {test.flagged ? 'Unflag' : 'Flag'}
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleTestAction(test.id, 'pause')}
                              >
                                Pause
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Quotas Tab */}
        {activeTab === 'quotas' && quotaStatus && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>YouTube API Quota Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Current Usage</p>
                    <p className="text-2xl font-bold">{quotaStatus.current.toLocaleString()}</p>
                    <p className="text-sm text-gray-600">of {quotaStatus.limit.toLocaleString()} units</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Usage Percentage</p>
                    <p className={`text-2xl font-bold ${quotaStatus.percentage > 80 ? 'text-red-600' : 'text-green-600'}`}>
                      {quotaStatus.percentage.toFixed(1)}%
                    </p>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div 
                        className={`h-2 rounded-full ${quotaStatus.percentage > 80 ? 'bg-red-600' : 'bg-green-600'}`}
                        style={{ width: `${quotaStatus.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Projects Used</p>
                    <p className="text-2xl font-bold">{quotaStatus.projectsUsed}</p>
                    <p className="text-sm text-gray-600">of {quotaStatus.totalProjects} projects</p>
                  </div>
                </div>
                <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Quota resets:</strong> {new Date(quotaStatus.resetTime).toLocaleString()}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}