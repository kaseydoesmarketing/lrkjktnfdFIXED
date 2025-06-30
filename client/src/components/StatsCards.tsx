import { Card, CardContent } from '@/components/ui/card';
import { FlaskRound, Eye, MousePointer, Trophy } from 'lucide-react';

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
  };
}

export default function StatsCards({ stats }: StatsCardsProps) {
  if (!stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse bg-gray-100">
            <CardContent className="p-4">
              <div className="h-20 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const formatTrend = (trend: number) => {
    return trend > 0 ? `+${trend}%` : `${trend}%`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
      {/* Active Tests Card */}
      <Card className="bg-green-50 border-green-200 hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-green-500 rounded-lg">
              <FlaskRound className="w-4 h-4 text-white" />
            </div>
            {stats.trends && (
              <span className="text-sm font-semibold text-green-600">
                {formatTrend(stats.trends.activeTestsTrend)}
              </span>
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-green-700 mb-1">Active Tests</p>
            <p className="text-3xl font-bold text-gray-900">{stats.activeTests}</p>
          </div>
        </CardContent>
      </Card>

      {/* Total Views Card */}
      <Card className="bg-blue-50 border-blue-200 hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-blue-500 rounded-lg">
              <Eye className="w-4 h-4 text-white" />
            </div>
            {stats.trends && (
              <span className="text-sm font-semibold text-blue-600">
                {formatTrend(stats.trends.viewsTrend)}
              </span>
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-blue-700 mb-1">Total Views</p>
            <p className="text-3xl font-bold text-gray-900">
              {stats.totalViews >= 1000 
                ? `${(stats.totalViews / 1000).toFixed(0)}k` 
                : stats.totalViews}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Average CTR Card */}
      <Card className="bg-purple-50 border-purple-200 hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-purple-500 rounded-lg">
              <MousePointer className="w-4 h-4 text-white" />
            </div>
            {stats.trends && (
              <span className="text-sm font-semibold text-purple-600">
                {formatTrend(stats.trends.ctrTrend)}
              </span>
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-purple-700 mb-1">Average CTR</p>
            <p className="text-3xl font-bold text-gray-900">{stats.avgCtr}%</p>
          </div>
        </CardContent>
      </Card>

      {/* Tests Won Card */}
      <Card className="bg-orange-50 border-orange-200 hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-orange-500 rounded-lg">
              <Trophy className="w-4 h-4 text-white" />
            </div>
            {stats.trends && (
              <span className="text-sm font-semibold text-orange-600">
                {formatTrend(stats.trends.winRateTrend)}
              </span>
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-orange-700 mb-1">Tests Won</p>
            <p className="text-3xl font-bold text-gray-900">{stats.testsWon}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}