import { Card, CardContent } from '@/components/ui/card';
import { FlaskRound, Eye, MousePointer, Trophy } from 'lucide-react';

interface StatsCardsProps {
  stats?: {
    activeTests: number;
    totalViews: number;
    avgCtr: string;
    testsWon: number;
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
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Active Tests</p>
              <p className="text-3xl font-bold text-white">{stats.activeTests}</p>
            </div>
            <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <FlaskRound className="text-blue-400 w-6 h-6" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Total Views</p>
              <p className="text-3xl font-bold text-white">{formatNumber(stats.totalViews)}</p>
            </div>
            <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
              <Eye className="text-green-400 w-6 h-6" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Average CTR</p>
              <p className="text-3xl font-bold text-white">{stats.avgCtr}%</p>
            </div>
            <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <MousePointer className="text-purple-400 w-6 h-6" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Completed Tests</p>
              <p className="text-3xl font-bold text-white">{stats.testsWon}</p>
            </div>
            <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center">
              <Trophy className="text-orange-400 w-6 h-6" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
