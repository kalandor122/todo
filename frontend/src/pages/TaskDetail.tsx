import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { tasksApi, categoriesApi, type Task, type Category } from '../services/api';
import TaskForm from '../components/TaskForm';
import TaskCard from '../components/TaskCard';
import { priorityLabels, priorityColors, cn } from '../utils';

export default function TaskDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [task, setTask] = useState<Task | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [breaking, setBreaking] = useState(false);

  const fetchTask = async () => {
    if (!id) return;
    try {
      const [taskRes, catsRes] = await Promise.all([
        tasksApi.get(id),
        categoriesApi.list(),
      ]);
      setTask(taskRes.data);
      setCategories(catsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTask(); }, [id]);

  const handleToggle = async (subtaskId: string) => {
    try {
      const subtask = task?.subtasks?.find((t) => t.id === subtaskId);
      if (!subtask) return;
      const newStatus = subtask.status === 'completed' ? 'pending' : 'completed';
      await tasksApi.update(subtaskId, { status: newStatus });
      fetchTask();
    } catch (err) {
      console.error('Failed to toggle subtask:', err);
    }
  };

  const handleUpdate = async (data: any) => {
    try {
      if (!id) return;
      await tasksApi.update(id, data);
      setEditing(false);
      fetchTask();
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    if (!window.confirm('Are you sure you want to delete this task? This cannot be undone.')) return;
    try {
      await tasksApi.delete(id);
      navigate('/tasks');
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  const handleBreakDown = async () => {
    if (!id) return;
    setBreaking(true);
    try {
      await tasksApi.breakDown(id);
      fetchTask();
    } catch (err) {
      console.error(err);
    } finally {
      setBreaking(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 rounded-full border-2 border-red-600 border-t-transparent animate-spin" /></div>;
  if (!task) return <div className="py-20 text-center text-gray-500">Task not found</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <button onClick={() => navigate('/tasks')} className="text-sm text-gray-500 hover:text-red-600 transition-colors">
        &larr; Back to tasks
      </button>

      {!editing ? (
        <div className="rounded-2xl border border-red-100 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleUpdate({ status: task.status === 'completed' ? 'pending' : 'completed' })}
                  className={cn(
                    'w-5 h-5 rounded-full border-2 flex-shrink-0 transition-colors',
                    task.status === 'completed'
                      ? 'bg-green-500 border-green-500'
                      : 'border-red-300 hover:border-red-600'
                  )}
                >
                  {task.status === 'completed' && (
                    <svg className="w-full h-full text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                    </svg>
                  )}
                </button>
                <h1 className={cn('text-xl font-bold', task.status === 'completed' && 'line-through text-gray-400')}>
                  {task.title}
                </h1>
              </div>

              {task.description && (
                <p className="text-gray-600 mt-3 ml-7">{task.description}</p>
              )}

              <div className="flex items-center gap-2 mt-4 ml-7 flex-wrap">
                <span className={cn('text-xs px-2 py-0.5 rounded-full', priorityColors[task.priority])}>
                  {priorityLabels[task.priority]}
                </span>
                {task.category_name && (
                  <span className="text-xs px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: task.category_color || '#DC2626' }}>
                    {task.category_name}
                  </span>
                )}
                {task.is_ai_generated && <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-md">AI</span>}
              </div>
            </div>

            <div className="flex items-center gap-2">
            </div>
          </div>

          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-red-50">
            <button onClick={() => setEditing(true)} className="text-sm text-red-600 hover:text-red-800 transition-colors">
              Edit
            </button>
            <button onClick={handleDelete} className="text-sm text-red-500 hover:text-red-700 transition-colors">
              Delete
            </button>
            <button
              onClick={handleBreakDown}
              disabled={breaking}
              className="ml-auto rounded-xl bg-purple-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              {breaking ? 'Breaking down...' : '🤯 Break Down'}
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-red-100 bg-white p-6 shadow-sm">
          <h2 className="font-semibold mb-3">Edit Task</h2>
          <TaskForm
            onSubmit={handleUpdate}
            initial={{
              title: task.title,
              description: task.description,
              priority: task.priority,
              due_date: task.due_date || undefined,
              category_id: task.category_id || '',
            }}
            categories={categories}
            buttonLabel="Save Changes"
          />
          <button onClick={() => setEditing(false)} className="mt-2 text-sm text-gray-500 hover:text-gray-700">
            Cancel
          </button>
        </div>
      )}

      {task.subtasks && task.subtasks.length > 0 && (
        <div>
          <h2 className="font-semibold text-gray-700 mb-3">Subtasks</h2>
          <div className="space-y-2">
            {task.subtasks.map((st) => (
              <TaskCard key={st.id} task={st} onToggle={handleToggle} onClick={() => {}} />
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-dashed border-red-200 bg-white p-4">
        <h3 className="text-sm font-medium text-gray-600 mb-2">Add Subtask</h3>
        <TaskForm
          onSubmit={async (data: any) => {
            try {
              await tasksApi.create(data);
              fetchTask();
            } catch (err) {
              console.error('Failed to add subtask:', err);
            }
          }}
          categories={categories}
          parent_task_id={id}
          buttonLabel="Add Subtask"
        />
      </div>
    </div>
  );
}
