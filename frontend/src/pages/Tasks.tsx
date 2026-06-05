import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { tasksApi, categoriesApi, tagsApi, type Task, type Category, type Tag } from '../services/api';
import TaskCard from '../components/TaskCard';
import TaskForm from '../components/TaskForm';

export default function Tasks() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [filters, setFilters] = useState({
    status: '',
    category_id: '',
    tag_id: '',
    priority: '',
    search: '',
  });

  const fetchTasks = async () => {
    try {
      const params: any = {};
      if (filters.status) params.status = filters.status;
      if (filters.category_id) params.category_id = filters.category_id;
      if (filters.tag_id) params.tag_id = filters.tag_id;
      if (filters.priority) params.priority = filters.priority;
      if (filters.search) params.search = filters.search;

      const [tasksRes, catsRes, tagsRes] = await Promise.all([
        tasksApi.list(params),
        categoriesApi.list(),
        tagsApi.list(),
      ]);
      setTasks(tasksRes.data);
      setCategories(catsRes.data);
      setTags(tagsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTasks(); }, [filters]);

  const handleToggle = async (id: string) => {
    const all = tasks.flatMap((t) => [t, ...(t.subtasks || [])]);
    const task = all.find((t) => t.id === id);
    if (!task) return;
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    await tasksApi.update(id, { status: newStatus });
    fetchTasks();
  };

  const handleCreate = async (data: any) => {
    await tasksApi.create(data);
    setShowForm(false);
    fetchTasks();
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 rounded-full border-2 border-red-600 border-t-transparent animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tasks</h1>
        <button
          onClick={() => setShowForm(true)}
          className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
        >
          + Add Task
        </button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <input
          type="text"
          placeholder="Search..."
          value={filters.search}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          className="rounded-xl border border-red-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-red-600 w-40"
        />
        <select
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
          className="rounded-xl border border-red-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-red-600"
        >
          <option value="">All status</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="rolled_over">Rolled Over</option>
        </select>
        <select
          value={filters.priority}
          onChange={(e) => setFilters((f) => ({ ...f, priority: e.target.value }))}
          className="rounded-xl border border-red-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-red-600"
        >
          <option value="">All priority</option>
          <option value={1}>Urgent</option>
          <option value={2}>High</option>
          <option value={3}>Medium</option>
          <option value={4}>Low</option>
        </select>
        <select
          value={filters.category_id}
          onChange={(e) => setFilters((f) => ({ ...f, category_id: e.target.value }))}
          className="rounded-xl border border-red-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-red-600"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {showForm && (
        <div className="rounded-2xl border border-red-100 bg-white p-4 shadow-sm">
          <h3 className="font-semibold mb-3">New Task</h3>
          <TaskForm onSubmit={handleCreate} categories={categories} tags={tags} />
        </div>
      )}

      <div className="space-y-3">
        {tasks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-red-200 bg-white p-8 text-center">
            <p className="text-gray-400">No tasks found</p>
          </div>
        ) : (
          tasks.map((task) => (
            <TaskCard key={task.id} task={task} onToggle={handleToggle} onClick={(id) => navigate(`/tasks/${id}`)} />
          ))
        )}
      </div>
    </div>
  );
}
