import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface CtrBarChartProps {
  data: Array<{
    titleId: string;
    finalCtr: number;
    finalAvd: number;
  }>;
  titles: Array<{
    id: string;
    text: string;
  }>;
  metric: string;
}

export default function CtrBarChart({ data, titles, metric }: CtrBarChartProps) {
  const chartData = data.map(item => {
    const title = titles.find(t => t.id === item.titleId);
    return {
      title: title?.text || 'Unknown',
      value: metric === 'ctr' ? item.finalCtr : item.finalAvd / 60, // Convert seconds to minutes for AVD
      fullTitle: title?.text || 'Unknown',
    };
  });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 mb-1">{payload[0].payload.fullTitle}</p>
          <p className="text-blue-600">
            {metric === 'ctr' 
              ? `CTR: ${payload[0].value.toFixed(1)}%`
              : `AVD: ${Math.floor(payload[0].value)}:${((payload[0].value % 1) * 60).toFixed(0).padStart(2, '0')}`
            }
          </p>
        </div>
      );
    }
    return null;
  };

  const truncateText = (text: string, maxLength: number = 30) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <div className="bg-gray-50 rounded-lg p-6">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="title"
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={100}
            tickFormatter={(value) => truncateText(value, 25)}
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => 
              metric === 'ctr' ? `${value}%` : `${value.toFixed(1)}m`
            }
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar 
            dataKey="value" 
            fill="hsl(240, 81%, 62%)"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
