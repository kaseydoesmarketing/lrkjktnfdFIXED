import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Crown } from 'lucide-react';

interface ResultsTableProps {
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
  winnerMetric: string;
  winnerId?: string;
}

export default function ResultsTable({ summaries, titles, winnerMetric, winnerId }: ResultsTableProps) {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const sortedSummaries = [...summaries].sort((a, b) => {
    if (winnerMetric === 'ctr') {
      return b.finalCtr - a.finalCtr;
    } else {
      return b.finalAvd - a.finalAvd;
    }
  });

  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Detailed Results</h3>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Views</TableHead>
              <TableHead>Impressions</TableHead>
              <TableHead>CTR</TableHead>
              <TableHead>Avg. View Duration</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedSummaries.map((summary) => {
              const title = titles.find(t => t.id === summary.titleId);
              const isWinner = summary.titleId === winnerId;
              
              return (
                <TableRow 
                  key={summary.id} 
                  className={isWinner ? 'bg-green-50' : ''}
                >
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {isWinner && <Crown className="text-green-600 w-4 h-4" />}
                      <span className={`font-medium ${isWinner ? 'text-green-900' : 'text-gray-900'}`}>
                        {title?.text || 'Unknown Title'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    {summary.totalViews.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    {summary.totalImpressions.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <span className={`font-semibold ${isWinner ? 'text-green-600' : ''}`}>
                      {summary.finalCtr.toFixed(1)}%
                    </span>
                  </TableCell>
                  <TableCell>
                    {formatDuration(summary.finalAvd)}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      className={isWinner 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-600'
                      }
                    >
                      {isWinner ? 'Winner' : 'Tested'}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
