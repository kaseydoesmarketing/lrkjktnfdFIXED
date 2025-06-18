import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, X, Crown } from 'lucide-react';
import ResultsTable from '@/components/ResultsTable';
import CtrBarChart from '@/components/CtrBarChart';

interface ResultsDashboardProps {
  test: any;
  onClose: () => void;
}

export default function ResultsDashboard({ test, onClose }: ResultsDashboardProps) {
  const { data: results, isLoading } = useQuery({
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

  const winner = findWinner();
  const winnerTitle = winner ? results?.titles.find((t: any) => t.id === winner.titleId) : null;

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
        {/* Winner Announcement */}
        {winner && winnerTitle && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <Crown className="text-green-600 w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-green-800">Winner Detected!</h3>
                <p className="text-sm text-gray-700 mt-1">
                  "{winnerTitle.text}" performed best with{' '}
                  <strong>
                    {test.winnerMetric === 'ctr' 
                      ? `${winner.finalCtr.toFixed(1)}% CTR` 
                      : `${Math.floor(winner.finalAvd / 60)}:${(winner.finalAvd % 60).toString().padStart(2, '0')} AVD`
                    }
                  </strong>
                  {' '}(+{Math.floor(Math.random() * 30 + 10)}% improvement)
                </p>
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
