import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { tasksApi, analyticsApi, categoriesApi, tagsApi, type Task, type Category, type Tag, type Stats } from '../services/api';
import TaskCard from '../components/TaskCard';
import TaskForm from '../components/TaskForm';

export default function Dashboard() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [rolledTasks, setRolledTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [showForm, setShowForm] = useState(false);
  const todayStr = new Date().toISOString().split('T')[0];
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [tasksRes, rolledRes, statsRes, catsRes, tagsRes] = await Promise.all([
        tasksApi.list({ status: 'pending' }),
        tasksApi.list({ status: 'rolled_over' }),
        analyticsApi.stats(),
        categoriesApi.list(),
        tagsApi.list(),
      ]);
      setTasks(tasksRes.data);
      setRolledTasks(rolledRes.data);
      setStats(statsRes.data);
      setCategories(catsRes.data);
      setTags(tagsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleToggle = async (id: string) => {
    try {
      const all = tasks.flatMap((t) => [t, ...(t.subtasks || [])]);
      const task = all.find((t) => t.id === id);
      if (!task) return;
      const newStatus = task.status === 'completed' ? 'pending' : 'completed';
      await tasksApi.update(id, { status: newStatus });
      fetchData();
    } catch (err) {
      console.error('Failed to toggle task:', err);
    }
  };

  const handleCreate = async (data: any) => {
    try {
      await tasksApi.create(data);
      setShowForm(false);
      fetchData();
    } catch (err) {
      console.error('Failed to create task:', err);
    }
  };

  const todayTasks = tasks.filter(t => !t.due_date || t.due_date === todayStr);

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 rounded-full border-2 border-red-600 border-t-transparent animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Today</h1>
          <p className="text-sm text-gray-500">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
        >
          + Add Task
        </button>
      </div>

      {rolledTasks.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-800 font-medium">
            ⏰ {rolledTasks.length} task{rolledTasks.length > 1 ? 's' : ''} rolled over from yesterday
          </p>
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Pending', value: stats.pending, color: 'text-red-600' },
            { label: 'Completed', value: stats.completed, color: 'text-green-600' },
            { label: 'Total', value: stats.total, color: 'text-gray-900' },
            { label: 'Streak', value: stats.streak, color: 'text-red-600', icon: '🔥' },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-red-100 bg-white p-4 shadow-sm">
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.icon}{s.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3">
        <h2 className="font-semibold text-gray-700">Tasks</h2>
        {todayTasks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-red-200 bg-white p-8 text-center">
            <p className="text-gray-400">No tasks for today. Add one above!</p>
          </div>
        ) : (
          todayTasks.map((task) => (
            <TaskCard key={task.id} task={task} onToggle={handleToggle} onClick={(id) => navigate(`/tasks/${id}`)} />
          ))
        )}
      </div>

      {showForm && (
        <div className="rounded-2xl border border-red-100 bg-white p-4 shadow-sm">
          <h3 className="font-semibold mb-3">New Task</h3>
          <TaskForm onSubmit={handleCreate} categories={categories} tags={tags} />
        </div>
      )}
    </div>
  );
}
