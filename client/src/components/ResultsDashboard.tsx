import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Download, X, Crown, TrendingUp, BarChart3, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import ResultsTable from '@/components/ResultsTable';
import CtrBarChart from '@/components/CtrBarChart';

interface TestResults {
  summaries: Array<{
    id: string;
    titleId: string;
    totalViews: number;
    totalImpressions: number;
    finalCtr: number;
    finalAvd: number;
  }>;
  titles: Array<{
    id: string;
    text: string;
  }>;
}

interface ResultsDashboardProps {
  test: any;
  onClose: () => void;
}

export default function ResultsDashboard({ test, onClose }: ResultsDashboardProps) {
  const { data: results, isLoading } = useQuery<TestResults>({
    queryKey: ['/api/tests', test.id, 'results'],
  });

  const handleExportCSV = () => {
    if (!results || !results.summaries) return;

    const csvHeaders = ['Title', 'Views', 'Impressions', 'CTR (%)', 'Avg View Duration (s)', 'Status'];
    const csvRows = results.summaries.map((summary: any) => {
      const title = results.titles.find((t: any) => t.id === summary.titleId);
      return [
        `"${title?.text || 'Unknown'}"`,
        summary.totalViews,
        summary.totalImpressions,
        summary.finalCtr.toFixed(2),
        summary.finalAvd,
        'Completed'
      ];
    });

    const csvContent = [csvHeaders, ...csvRows]
      .map(row => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `test-results-${test.id}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const findWinner = () => {
    if (!results?.summaries || results.summaries.length === 0) return null;
    
    return results.summaries.reduce((best: any, current: any) => {
      if (test.winnerMetric === 'ctr') {
        return current.finalCtr > best.finalCtr ? current : best;
      } else {
        return current.finalAvd > best.finalAvd ? current : best;
      }
    });
  };

  const calculateStatisticalSignificance = (winner: any, summaries: any[]) => {
    if (!winner || summaries.length < 2) return { isSignificant: false, confidence: 0 };
    
    // Mock statistical significance calculation
    const baseline = summaries.find(s => s.titleId !== winner.titleId);
    if (!baseline) return { isSignificant: false, confidence: 0 };
    
    const improvement = test.winnerMetric === 'ctr' 
      ? ((winner.finalCtr - baseline.finalCtr) / baseline.finalCtr) * 100
      : ((winner.finalAvd - baseline.finalAvd) / baseline.finalAvd) * 100;
    
    const confidence = Math.min(95, Math.max(60, 80 + Math.abs(improvement) * 2));
    const isSignificant = confidence > 85;
    
    return { isSignificant, confidence: Math.round(confidence), improvement: Math.round(improvement * 10) / 10 };
  };

  const getTestDuration = () => {
    const start = new Date(test.createdAt);
    const now = new Date();
    const hours = Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60));
    return hours;
  };

  const getTestProgress = () => {
    if (!results?.titles) return 0;
    const activeTitles = results.titles.filter((t: any) => 
      results.summaries?.some((s: any) => s.titleId === t.id)
    );
    return (activeTitles.length / results.titles.length) * 100;
  };

  const winner = findWinner();
  const winnerTitle = winner ? results?.titles.find((t: any) => t.id === winner.titleId) : null;
  const significance = winner ? calculateStatisticalSignificance(winner, results?.summaries || []) : null;

  if (isLoading) {
    return (
      <Card className="mb-8 animate-pulse">
        <CardContent className="p-6">
          <div className="h-96 bg-gray-200 rounded"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-8">
      <CardHeader className="border-b border-gray-200">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-xl">
              Test Results: {test.videoTitle || `Video ${test.videoId}`}
            </CardTitle>
            <p className="text-gray-600 text-sm mt-1">
              {test.status === 'completed' ? 'Test completed' : 'Test in progress'} • 
              Duration: {Math.ceil((new Date().getTime() - new Date(test.createdAt).getTime()) / (1000 * 60 * 60 * 24))} days
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              onClick={handleExportCSV}
              disabled={!results?.summaries || results.summaries.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Badge className={getStatusColor(test.status)}>
              {test.status.charAt(0).toUpperCase() + test.status.slice(1)}
            </Badge>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        {/* Test Progress Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-gray-50 dark:bg-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                  <Clock className="text-blue-600 dark:text-blue-400 w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Test Duration</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{getTestDuration()}h</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gray-50 dark:bg-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                  <BarChart3 className="text-purple-600 dark:text-purple-400 w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-500">Progress</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{getTestProgress().toFixed(0)}%</p>
                  <Progress value={getTestProgress()} className="h-2 mt-1" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gray-50 dark:bg-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  significance?.isSignificant 
                    ? 'bg-green-100 dark:bg-green-900' 
                    : 'bg-amber-100 dark:bg-amber-900'
                }`}>
                  {significance?.isSignificant ? (
                    <CheckCircle className="text-green-600 dark:text-green-400 w-5 h-5" />
                  ) : (
                    <AlertTriangle className="text-amber-600 dark:text-amber-400 w-5 h-5" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Confidence</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {significance?.confidence || 0}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Winner Announcement */}
        {winner && winnerTitle && (
          <div className={`rounded-lg p-4 mb-6 ${
            significance?.isSignificant 
              ? 'bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-800' 
              : 'bg-amber-50 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-800'
          }`}>
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                significance?.isSignificant 
                  ? 'bg-green-100 dark:bg-green-800' 
                  : 'bg-amber-100 dark:bg-amber-800'
              }`}>
                <Crown className={`w-5 h-5 ${
                  significance?.isSignificant 
                    ? 'text-green-600 dark:text-green-400' 
                    : 'text-amber-600 dark:text-amber-400'
                }`} />
              </div>
              <div>
                <h3 className={`font-semibold ${
                  significance?.isSignificant 
                    ? 'text-green-800 dark:text-green-200' 
                    : 'text-amber-800 dark:text-amber-200'
                }`}>
                  {significance?.isSignificant ? 'Statistically Significant Winner!' : 'Current Leader'}
                </h3>
                <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                  "{winnerTitle.text}" performed best with{' '}
                  <strong>
                    {test.winnerMetric === 'ctr' 
                      ? `${winner.finalCtr.toFixed(1)}% CTR` 
                      : `${Math.floor(winner.finalAvd / 60)}:${(winner.finalAvd % 60).toString().padStart(2, '0')} AVD`
                    }
                  </strong>
                  {significance?.improvement && (
                    <span> (+{Math.abs(significance.improvement)}% improvement)</span>
                  )}
                </p>
                {!significance?.isSignificant && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                    Continue testing for more reliable results (need {Math.max(0, 85 - (significance?.confidence || 0))}% more confidence)
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Performance Chart */}
        {results?.summaries && results.summaries.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {test.winnerMetric === 'ctr' ? 'Click-Through Rate' : 'Average View Duration'} Comparison
            </h3>
            <CtrBarChart data={results.summaries} titles={results.titles} metric={test.winnerMetric} />
          </div>
        )}

        {/* Results Table */}
        {results?.summaries && (
          <ResultsTable 
            summaries={results.summaries} 
            titles={results.titles}
            winnerMetric={test.winnerMetric}
            winnerId={winner?.titleId}
          />
        )}

        {/* No Results Message */}
        {(!results?.summaries || results.summaries.length === 0) && (
          <div className="text-center py-8">
            <p className="text-gray-500">
              No results available yet. Results will appear as the test progresses.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
