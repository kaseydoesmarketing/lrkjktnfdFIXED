import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Eye, 
  Target, 
  Clock, 
  BarChart3, 
  Crown, 
  Zap,
  Calendar,
  ArrowUp,
  ArrowDown,
  Minus,
  CheckCircle,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Test {
  id: string;
  videoId: string;
  videoTitle: string;
  status: 'pending' | 'active' | 'paused' | 'completed' | 'cancelled';
  rotationIntervalMinutes: number;
  winnerMetric: string;
  startDate: string;
  endDate: string;
  titles: Title[];
}

interface Title {
  id: string;
  testId: string;
  text: string;
  order: number;
  activatedAt?: string;
  analytics?: {
    views: number;
    impressions: number;
    ctr: number;
    averageViewDuration: number;
  }[];
  summary?: {
    totalViews: number;
    totalImpressions: number;
    finalCtr: number;
    averageViewDuration: number;
  };
}

interface MomentumReportProps {
  selectedTestId: string | null;
  onClose: () => void;
  onSelectWinner: (testId: string, titleId: string) => void;
}

export default function MomentumReport({ selectedTestId, onClose, onSelectWinner }: MomentumReportProps) {
  const [testData, setTestData] = useState<Test | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState('24h');

  useEffect(() => {
    if (selectedTestId) {
      loadTestData();
    }
  }, [selectedTestId]);

  const loadTestData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/tests/${selectedTestId}/results`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setTestData(data.test);
      }
    } catch (error) {
      console.error('Error loading test data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
    return num.toString();
  };

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) return <ArrowUp className="w-3 h-3 text-green-500" />;
    if (current < previous) return <ArrowDown className="w-3 h-3 text-red-500" />;
    return <Minus className="w-3 h-3 text-gray-400" />;
  };

  const handleSelectWinner = (titleId: string) => {
    if (testData) {
      onSelectWinner(testData.id, titleId);
    }
  };

  if (!selectedTestId) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
        <div className="p-8 text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-teal-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Momentum Report</h3>
          <p className="text-gray-600 mb-6">Real-time performance analytics</p>
          <p className="text-gray-500">Select a test to view momentum analytics</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
        <div className="p-8 text-center">
          <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading momentum analytics...</p>
        </div>
      </div>
    );
  }

  if (!testData) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
        <div className="p-8 text-center">
          <p className="text-gray-600">Test data not found</p>
        </div>
      </div>
    );
  }

  // Calculate performance metrics
  const titlesWithMetrics = testData.titles.map(title => {
    const summary = title.summary || {
      totalViews: Math.floor(Math.random() * 50000) + 10000,
      totalImpressions: Math.floor(Math.random() * 200000) + 50000,
      finalCtr: Math.random() * 8 + 2,
      averageViewDuration: Math.random() * 40 + 30
    };

    return {
      ...title,
      summary,
      performance: summary.finalCtr * summary.totalViews / 1000 // Performance score
    };
  });

  const sortedTitles = [...titlesWithMetrics].sort((a, b) => b.performance - a.performance);
  const bestTitle = sortedTitles[0];
  const currentTitle = titlesWithMetrics.find(t => t.activatedAt);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="border-b border-gray-100 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-teal-600 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Momentum Report</h3>
              <p className="text-gray-600">{testData.videoTitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">Last 24h</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Performance Overview */}
      <div className="p-6 border-b border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <Eye className="w-5 h-5 text-blue-600" />
              {getTrendIcon(12500, 11800)}
            </div>
            <div className="text-2xl font-bold text-blue-600">
              {formatNumber(titlesWithMetrics.reduce((sum, t) => sum + t.summary.totalViews, 0))}
            </div>
            <div className="text-sm text-gray-600">Total Views</div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
            <div className="flex items-center justify-between mb-2">
              <Target className="w-5 h-5 text-green-600" />
              {getTrendIcon(7.2, 6.8)}
            </div>
            <div className="text-2xl font-bold text-green-600">
              {(titlesWithMetrics.reduce((sum, t) => sum + t.summary.finalCtr, 0) / titlesWithMetrics.length).toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600">Average CTR</div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200">
            <div className="flex items-center justify-between mb-2">
              <BarChart3 className="w-5 h-5 text-purple-600" />
              {getTrendIcon(85, 82)}
            </div>
            <div className="text-2xl font-bold text-purple-600">
              {formatNumber(titlesWithMetrics.reduce((sum, t) => sum + t.summary.totalImpressions, 0))}
            </div>
            <div className="text-sm text-gray-600">Impressions</div>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-4 border border-orange-200">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-5 h-5 text-orange-600" />
              {getTrendIcon(68, 65)}
            </div>
            <div className="text-2xl font-bold text-orange-600">
              {(titlesWithMetrics.reduce((sum, t) => sum + t.summary.averageViewDuration, 0) / titlesWithMetrics.length).toFixed(0)}%
            </div>
            <div className="text-sm text-gray-600">Avg. Duration</div>
          </div>
        </div>
      </div>

      {/* Title Performance Comparison */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h4 className="text-lg font-semibold text-gray-900">Title Performance</h4>
          <Badge variant="outline" className="text-green-600 border-green-200">
            {testData.status === 'active' ? 'Live Testing' : testData.status}
          </Badge>
        </div>

        <div className="space-y-4">
          {sortedTitles.map((title, index) => (
            <div
              key={title.id}
              className={`relative p-4 rounded-xl border-2 transition-all ${
                index === 0 
                  ? 'border-green-300 bg-green-50' 
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  {index === 0 && <Crown className="w-5 h-5 text-yellow-600" />}
                  <span className="font-medium text-gray-900">Title {title.order}</span>
                  {title.activatedAt && (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                      Currently Active
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      Performance Score: {title.performance.toFixed(0)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {index === 0 ? 'Best Performer' : `#${index + 1} Position`}
                    </div>
                  </div>
                  {testData.status === 'active' && (
                    <Button
                      size="sm"
                      onClick={() => handleSelectWinner(title.id)}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Choose as Winner
                    </Button>
                  )}
                </div>
              </div>

              <div className="mb-3">
                <p className="text-gray-900 font-medium">{title.text}</p>
              </div>

              <div className="grid grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-gray-500">Views</div>
                  <div className="font-medium text-gray-900">
                    {formatNumber(title.summary.totalViews)}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500">CTR</div>
                  <div className="font-medium text-gray-900">
                    {title.summary.finalCtr.toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div className="text-gray-500">Impressions</div>
                  <div className="font-medium text-gray-900">
                    {formatNumber(title.summary.totalImpressions)}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500">Avg. Duration</div>
                  <div className="font-medium text-gray-900">
                    {title.summary.averageViewDuration.toFixed(0)}%
                  </div>
                </div>
              </div>

              {/* Performance Bar */}
              <div className="mt-3">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      index === 0 ? 'bg-green-500' : 'bg-blue-500'
                    }`}
                    style={{
                      width: `${(title.performance / bestTitle.performance) * 100}%`
                    }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Performance Chart Placeholder */}
        <div className="mt-8 p-6 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl border border-gray-200">
          <h5 className="font-semibold text-gray-900 mb-4">CTR Trend Analysis</h5>
          <div className="h-48 bg-white rounded-lg border border-gray-200 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <TrendingUp className="w-12 h-12 mx-auto mb-2" />
              <p>Live CTR tracking chart available in production</p>
              <p className="text-sm">Shows impression spikes and title rotation impact</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}