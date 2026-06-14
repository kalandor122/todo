import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { tasksApi, type Task } from '../services/api';
import { cn } from '../utils';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function Calendar() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPad = firstDay.getDay();
  const daysInMonth = lastDay.getDate();
  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    tasksApi.list({}).then((res) => setTasks(res.data));
  }, []);

  const tasksByDate = useMemo(() => {
    const map: Record<string, { completed: number; pending: number }> = {};
    for (const task of tasks) {
      if (task.status === 'completed') {
        if (!task.completed_at) continue;
        const dateKey = new Date(task.completed_at!).toISOString().split('T')[0];
        if (!map[dateKey]) map[dateKey] = { completed: 0, pending: 0 };
        map[dateKey].completed++;
      } else {
        // pending or rolled — group by due_date
        if (!task.due_date) continue;
        if (!map[task.due_date]) map[task.due_date] = { completed: 0, pending: 0 };
        map[task.due_date].pending++;
      }
    }
    return map;
  }, [tasks]);

  const selectedDayData = selectedDate ? tasksByDate[selectedDate] || { completed: 0, pending: 0 } : null;

  const handlePrev = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNext = () => setCurrentDate(new Date(year, month + 1, 1));

  const daysWithActivity = new Set(Object.keys(tasksByDate));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Activity Calendar</h1>

      <div className="rounded-2xl border border-red-100 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <button onClick={handlePrev} className="text-gray-500 hover:text-red-600 text-lg">&larr;</button>
          <h2 className="text-lg font-semibold">{MONTHS[month]} {year}</h2>
          <button onClick={handleNext} className="text-gray-500 hover:text-red-600 text-lg">&rarr;</button>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {DAYS.map((d) => (
            <div key={d} className="text-center text-xs font-medium text-gray-500 py-1">{d}</div>
          ))}

          {Array.from({ length: startPad }).map((_, i) => (
            <div key={`pad-${i}`} />
          ))}

          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const data = tasksByDate[dateStr];
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === selectedDate;
            const completed = data?.completed || 0;
            const pending = data?.pending || 0;

            return (
              <button
                key={day}
                onClick={() => setSelectedDate(dateStr)}
                className={cn(
                  'rounded-xl p-1.5 text-sm transition-colors relative min-h-[44px]',
                  isSelected && 'bg-red-100',
                  isToday && 'ring-2 ring-red-600',
                  !isSelected && !isToday && 'hover:bg-red-50'
                )}
              >
                <span className={cn('text-xs', isToday && 'font-bold text-red-600')}>{day}</span>
                {(completed > 0 || pending > 0) && (
                  <div className="flex items-center justify-center gap-0.5 mt-0.5">
                    {completed > 0 && <span className="text-xs text-green-600">{completed}✓</span>}
                    {pending > 0 && <span className="text-xs text-red-400">{pending}</span>}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {selectedDate && (
        <div className="rounded-2xl border border-red-100 bg-white p-4 shadow-sm">
          <h3 className="font-semibold mb-3">
            {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            {selectedDate === todayStr && <span className="text-red-600 ml-2 text-sm">Today</span>}
          </h3>

          {selectedDayData && selectedDayData.completed > 0 && (
            <p className="text-sm text-green-600 mb-1">{selectedDayData.completed} task{selectedDayData.completed > 1 ? 's' : ''} completed</p>
          )}
          {selectedDayData && selectedDayData.pending > 0 && (
            <p className="text-sm text-red-500 mb-2">{selectedDayData.pending} task{selectedDayData.pending > 1 ? 's' : ''} pending this day</p>
          )}
          {(!selectedDayData || (selectedDayData.completed === 0 && selectedDayData.pending === 0)) && (
            <p className="text-sm text-gray-400">No activity on this day</p>
          )}

          <div className="mt-3 space-y-1.5">
            {tasks
              .filter((t) => {
                const dateKey = t.status === 'completed' ? t.completed_at : t.due_date;
                return dateKey && dateKey.startsWith(selectedDate!);
              })
              .slice(0, 10)
              .map((t) => (
                <div
                  key={t.id}
                  className="flex items-center gap-2 py-1 cursor-pointer hover:bg-red-50 rounded-lg px-2"
                  onClick={() => navigate(`/tasks/${t.id}`)}
                >
                  <span className={cn(
                    'w-4 h-4 rounded-full border-2 flex-shrink-0',
                    t.status === 'completed' ? 'bg-green-500 border-green-500' : 'border-red-300'
                  )}>
                    {t.status === 'completed' && (
                      <svg className="w-full h-full text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                      </svg>
                    )}
                  </span>
                  <span className={cn('text-sm flex-1 truncate', t.status === 'completed' && 'line-through text-gray-400')}>
                    {t.title}
                  </span>
                  {t.is_ai_generated && <span className="text-[10px] bg-purple-100 text-purple-600 px-1 py-0.5 rounded">AI</span>}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
