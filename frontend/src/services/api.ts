import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'completed' | 'rolled_over';
  priority: number;
  due_date: string | null;
  completed_at: string | null;
  parent_task_id: string | null;
  category_id: string | null;
  is_ai_generated: boolean;
  created_at: string;
  updated_at: string;
  category_name?: string;
  category_color?: string;
  tags?: { id: string; name: string }[];
  subtasks?: Task[];
}

export interface Category {
  id: string;
  name: string;
  color: string;
  sort_order: number;
}

export interface Tag {
  id: string;
  name: string;
}

export interface DailyLog {
  date: string;
  tasks_completed: number;
  tasks_pending: number;
  tasks_rolled: number;
}

export interface Stats {
  total: number;
  completed: number;
  pending: number;
  rolled_over: number;
  streak: number;
}

export const tasksApi = {
  list: (params?: any) => api.get<Task[]>('/tasks', { params }),
  calendar: (start: string, end: string) => api.get<Task[]>('/tasks/calendar', { params: { start, end } }),
  get: (id: string) => api.get<Task>(`/tasks/${id}`),
  create: (data: Partial<Task>) => api.post<Task>('/tasks', data),
  update: (id: string, data: Partial<Task>) => api.put<Task>(`/tasks/${id}`, data),
  delete: (id: string) => api.delete(`/tasks/${id}`),
  breakDown: (id: string) => api.post(`/ai/${id}/break-down`),
};

export const categoriesApi = {
  list: () => api.get<Category[]>('/categories'),
  create: (data: Partial<Category>) => api.post<Category>('/categories', data),
  update: (id: string, data: Partial<Category>) => api.put<Category>(`/categories/${id}`, data),
  delete: (id: string) => api.delete(`/categories/${id}`),
};

export const tagsApi = {
  list: () => api.get<Tag[]>('/tags'),
  create: (name: string) => api.post<Tag>('/tags', { name }),
  delete: (id: string) => api.delete(`/tags/${id}`),
};

export const analyticsApi = {
  daily: (days?: number) => api.get<DailyLog[]>('/analytics/daily', { params: { days } }),
  heatmap: () => api.get<{ date: string; tasks_completed: number }[]>('/analytics/heatmap'),
  stats: () => api.get<Stats>('/analytics/stats'),
};

export const settingsApi = {
  get: () => api.get<Record<string, any>>('/settings'),
  update: (data: Record<string, any>) => api.put('/settings', data),
};
