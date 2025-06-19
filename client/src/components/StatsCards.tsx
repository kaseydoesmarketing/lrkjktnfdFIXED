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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Active Tests</p>
              <p className="text-4xl font-bold text-white">{stats.activeTests}</p>
            </div>
            <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center">
              <FlaskRound className="text-red-500 w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-green-400">↗ 12%</span>
            <span className="text-gray-500 ml-2">vs last month</span>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Total Views</p>
              <p className="text-4xl font-bold text-white">134K</p>
            </div>
            <div className="w-12 h-12 bg-teal-500/20 rounded-lg flex items-center justify-center">
              <Eye className="text-teal-500 w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-green-400">↗ 2.1%</span>
            <span className="text-gray-500 ml-2">imprvmnt week</span>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Title Performance</p>
              <div className="flex items-center mt-2">
                <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center mr-2">
                  <span className="text-white text-xs font-bold">✓</span>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex space-x-2">
              <div className="flex-1 h-12 bg-red-500 rounded opacity-60"></div>
              <div className="flex-1 h-16 bg-red-500 rounded opacity-70"></div>
              <div className="flex-1 h-20 bg-purple-500 rounded opacity-80"></div>
              <div className="flex-1 h-24 bg-blue-500 rounded"></div>
              <div className="flex-1 h-28 bg-orange-500 rounded"></div>
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-2">
              <span>A</span>
              <span>B</span>
              <span>C</span>
              <span>D</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
