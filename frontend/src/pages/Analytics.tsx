import { useState, useEffect, useMemo } from 'react';
import { analyticsApi, type DailyLog } from '../services/api';
import { cn } from '../utils';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function Analytics() {
  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>([]);
  const [heatmap, setHeatmap] = useState<{ date: string; tasks_completed: number }[]>([]);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [dailyRes, heatmapRes] = await Promise.all([
          analyticsApi.daily(days),
          analyticsApi.heatmap(),
        ]);
        setDailyLogs(dailyRes.data);
        setHeatmap(heatmapRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [days]);

  const chartData = useMemo(() => {
    return dailyLogs.map((d) => ({
      date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      completed: d.tasks_completed,
      pending: d.tasks_pending,
      rolled: d.tasks_rolled,
    }));
  }, [dailyLogs]);

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 rounded-full border-2 border-red-600 border-t-transparent animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Analytics</h1>

      <div className="rounded-2xl border border-red-100 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Completion Trend</h2>
          <div className="flex items-center gap-1">
            {[7, 30, 90].map((n) => (
              <button
                key={n}
                onClick={() => setDays(n)}
                className={cn(
                  'px-3 py-1 text-xs rounded-lg transition-colors',
                  days === n ? 'bg-red-600 text-white' : 'bg-red-50 text-gray-600 hover:bg-red-100'
                )}
              >
                {n}d
              </button>
            ))}
          </div>
        </div>

        {chartData.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No data yet</div>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  borderRadius: '12px',
                  border: '1px solid #FECACA',
                  background: 'white',
                  fontSize: '13px',
                }}
              />
              <Line
                type="monotone"
                dataKey="completed"
                stroke="#DC2626"
                strokeWidth={2}
                dot={{ r: 3, fill: '#DC2626' }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="rounded-2xl border border-red-100 bg-white p-4 shadow-sm">
        <h2 className="font-semibold mb-4">Activity Heatmap</h2>
        {heatmap.length === 0 ? (
          <div className="h-32 flex items-center justify-center text-gray-400 text-sm">No activity yet</div>
        ) : (
          <div className="flex flex-wrap gap-[3px]">
            {heatmap.map((d) => {
              const count = d.tasks_completed;
              let bg = 'bg-gray-100';
              if (count > 0) bg = 'bg-red-200';
              if (count >= 3) bg = 'bg-red-400';
              if (count >= 5) bg = 'bg-red-600';
              if (count >= 10) bg = 'bg-red-800';
              return (
                <div
                  key={d.date}
                  className={cn('w-3 h-3 rounded-[3px]', bg)}
                  title={`${d.date}: ${count} completed`}
                />
              );
            })}
          </div>
        )}
        <div className="flex items-center gap-2 mt-3 text-xs text-gray-500">
          <span>Less</span>
          <div className="w-3 h-3 rounded-[3px] bg-gray-100" />
          <div className="w-3 h-3 rounded-[3px] bg-red-200" />
          <div className="w-3 h-3 rounded-[3px] bg-red-400" />
          <div className="w-3 h-3 rounded-[3px] bg-red-600" />
          <div className="w-3 h-3 rounded-[3px] bg-red-800" />
          <span>More</span>
        </div>
      </div>

    </div>
  );
}
