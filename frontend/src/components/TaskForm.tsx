import { useState, useEffect } from 'react';
import { cn } from '../utils';

interface TaskFormProps {
  onSubmit: (data: {
    title: string;
    description?: string;
    priority: number;
    category_id?: string;
    tags?: string[];
    parent_task_id?: string | null;
  }) => void;
  initial?: {
    title: string;
    description?: string;
    priority: number;
    category_id?: string;
  };
  categories?: { id: string; name: string; color: string }[];
  tags?: { id: string; name: string }[];
  parent_task_id?: string | null;
  buttonLabel?: string;
}

export default function TaskForm({ onSubmit, initial, categories, tags, parent_task_id, buttonLabel = 'Add Task' }: TaskFormProps) {
  const [title, setTitle] = useState(initial?.title || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [priority, setPriority] = useState(initial?.priority || 2);
  const [categoryId, setCategoryId] = useState(initial?.category_id || '');

  useEffect(() => {
    if (initial) {
      setTitle(initial.title);
      setDescription(initial.description || '');
      setPriority(initial.priority);
      setCategoryId(initial.category_id || '');
    }
  }, [initial]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      category_id: categoryId || undefined,
      parent_task_id,
    });
    if (!initial) {
      setTitle('');
      setDescription('');
      setPriority(2);
      setCategoryId('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        type="text"
        placeholder="What needs to be done?"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-colors"
        autoFocus
      />
      <textarea
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={2}
        className="w-full rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-colors resize-none"
      />
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={priority}
          onChange={(e) => setPriority(Number(e.target.value))}
          className="rounded-xl border border-red-200 bg-white px-3 py-2 text-sm outline-none focus:border-red-600"
        >
          <option value={1}>Urgent</option>
          <option value={2}>High</option>
          <option value={3}>Medium</option>
          <option value={4}>Low</option>
        </select>
        {categories && categories.length > 0 && (
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="rounded-xl border border-red-200 bg-white px-3 py-2 text-sm outline-none focus:border-red-600"
          >
            <option value="">No category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        )}
      </div>
      <button
        type="submit"
        disabled={!title.trim()}
        className={cn(
          'w-full rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition-colors',
          'hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed'
        )}
      >
        {initial ? 'Save Changes' : buttonLabel}
      </button>
    </form>
  );
}
