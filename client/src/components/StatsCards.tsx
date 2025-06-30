import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { FlaskRound, Eye, MousePointer, Trophy, TrendingUp, TrendingDown, Target } from 'lucide-react';

interface StatsCardsProps {
  stats?: {
    activeTests: number;
    totalViews: number;
    avgCtr: string;
    testsWon: number;
    trends?: {
      activeTestsTrend: number;
      viewsTrend: number;
      ctrTrend: number;
      winRateTrend: number;
    };
    goals?: {
      monthlyTestsGoal: number;
      ctrGoal: number;
    };
  };
}

export default function StatsCards({ stats }: StatsCardsProps) {
  if (!stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-20 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <TrendingUp className="w-4 h-4 text-green-400" />;
    if (trend < 0) return <TrendingDown className="w-4 h-4 text-red-400" />;
    return null;
  };

  const getTrendColor = (trend: number) => {
    if (trend > 0) return 'text-green-400';
    if (trend < 0) return 'text-red-400';
    return 'text-gray-400';
  };

  // Mock some default trends and goals if not provided
  const defaultTrends = {
    activeTestsTrend: 12,
    viewsTrend: 8,
    ctrTrend: -2,
    winRateTrend: 15
  };

  const defaultGoals = {
    monthlyTestsGoal: 10,
    ctrGoal: 5.0
  };

  const trends = stats?.trends || defaultTrends;
  const goals = stats?.goals || defaultGoals;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8">
      {/* Active Tests Card */}
      <Card className="bg-gray-800 border-gray-700 hover:border-gray-600 transition-colors">
        <CardContent className="p-4 lg:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <FlaskRound className="text-blue-400 w-6 h-6" />
            </div>
            <div className="flex items-center space-x-1">
              {getTrendIcon(trends.activeTestsTrend)}
              <span className={`text-sm font-medium ${getTrendColor(trends.activeTestsTrend)}`}>
                {trends.activeTestsTrend > 0 ? '+' : ''}{trends.activeTestsTrend}%
              </span>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-400 mb-1">Active Tests</p>
            <p className="text-2xl lg:text-3xl font-bold text-white mb-2">{stats.activeTests}</p>
            <Progress 
              value={(stats.activeTests / goals.monthlyTestsGoal) * 100} 
              className="h-2"
            />
            <p className="text-xs text-gray-500 mt-1">
              {stats.activeTests}/{goals.monthlyTestsGoal} monthly goal
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Total Views Card */}
      <Card className="bg-gray-800 border-gray-700 hover:border-gray-600 transition-colors">
        <CardContent className="p-4 lg:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
              <Eye className="text-green-400 w-6 h-6" />
            </div>
            <div className="flex items-center space-x-1">
              {getTrendIcon(trends.viewsTrend)}
              <span className={`text-sm font-medium ${getTrendColor(trends.viewsTrend)}`}>
                {trends.viewsTrend > 0 ? '+' : ''}{trends.viewsTrend}%
              </span>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-400 mb-1">Total Views</p>
            <p className="text-2xl lg:text-3xl font-bold text-white mb-2">{formatNumber(stats.totalViews)}</p>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <p className="text-xs text-gray-500">Live tracking</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Average CTR Card */}
      <Card className="bg-gray-800 border-gray-700 hover:border-gray-600 transition-colors">
        <CardContent className="p-4 lg:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <MousePointer className="text-purple-400 w-6 h-6" />
            </div>
            <div className="flex items-center space-x-1">
              {getTrendIcon(trends.ctrTrend)}
              <span className={`text-sm font-medium ${getTrendColor(trends.ctrTrend)}`}>
                {trends.ctrTrend > 0 ? '+' : ''}{trends.ctrTrend}%
              </span>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-400 mb-1">Average CTR</p>
            <p className="text-2xl lg:text-3xl font-bold text-white mb-2">{stats.avgCtr}%</p>
            <Progress 
              value={(parseFloat(stats.avgCtr) / goals.ctrGoal) * 100} 
              className="h-2"
            />
            <p className="text-xs text-gray-500 mt-1">
              Target: {goals.ctrGoal}% CTR
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Completed Tests Card */}
      <Card className="bg-gray-800 border-gray-700 hover:border-gray-600 transition-colors">
        <CardContent className="p-4 lg:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center">
              <Trophy className="text-orange-400 w-6 h-6" />
            </div>
            <div className="flex items-center space-x-1">
              {getTrendIcon(trends.winRateTrend)}
              <span className={`text-sm font-medium ${getTrendColor(trends.winRateTrend)}`}>
                {trends.winRateTrend > 0 ? '+' : ''}{trends.winRateTrend}%
              </span>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-400 mb-1">Completed Tests</p>
            <p className="text-2xl lg:text-3xl font-bold text-white mb-2">{stats.testsWon}</p>
            <div className="flex items-center space-x-2">
              <Target className="w-3 h-3 text-orange-400" />
              <p className="text-xs text-gray-500">
                {stats.testsWon > 0 ? `${((stats.testsWon / (stats.activeTests + stats.testsWon)) * 100).toFixed(0)}% success rate` : 'No data yet'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
