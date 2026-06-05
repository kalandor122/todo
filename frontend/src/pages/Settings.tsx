import { useState, useEffect } from 'react';
import { settingsApi, categoriesApi, tagsApi, type Category, type Tag } from '../services/api';
import TaskForm from '../components/TaskForm';

export default function Settings() {
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState({
    MINIMAX_API_KEY: '',
    GOOGLE_CLIENT_ID: '',
    GOOGLE_CLIENT_SECRET: '',
    MQTT_HOST: '',
    MQTT_PORT: '1883',
    MQTT_USERNAME: '',
    MQTT_PASSWORD: '',
    HA_TODO_DEVICE_ID: 'todo_app',
  });

  const [newCategory, setNewCategory] = useState({ name: '', color: '#DC2626' });
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    const fetch = async () => {
      try {
        const [settingsRes, catsRes, tagsRes] = await Promise.all([
          settingsApi.get(),
          categoriesApi.list(),
          tagsApi.list(),
        ]);
        setSettings(settingsRes.data);
        setCategories(catsRes.data);
        setTags(tagsRes.data);
        setForm((f) => ({
          ...f,
          MINIMAX_API_KEY: settingsRes.data.MINIMAX_API_KEY || '',
          GOOGLE_CLIENT_ID: settingsRes.data.GOOGLE_CLIENT_ID || '',
          GOOGLE_CLIENT_SECRET: settingsRes.data.GOOGLE_CLIENT_SECRET || '',
          MQTT_HOST: settingsRes.data.MQTT_HOST || '',
          MQTT_PORT: settingsRes.data.MQTT_PORT || '1883',
          MQTT_USERNAME: settingsRes.data.MQTT_USERNAME || '',
          MQTT_PASSWORD: settingsRes.data.MQTT_PASSWORD || '',
          HA_TODO_DEVICE_ID: settingsRes.data.HA_TODO_DEVICE_ID || 'todo_app',
        }));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const handleSave = async () => {
    await settingsApi.update(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleConnectGoogle = () => {
    window.open('/api/calendar/auth', '_blank');
  };

  const handleAddCategory = async () => {
    if (!newCategory.name.trim()) return;
    await categoriesApi.create(newCategory);
    setNewCategory({ name: '', color: '#DC2626' });
    const res = await categoriesApi.list();
    setCategories(res.data);
  };

  const handleAddTag = async () => {
    if (!newTag.trim()) return;
    await tagsApi.create(newTag);
    setNewTag('');
    const res = await tagsApi.list();
    setTags(res.data);
  };

  const handleDeleteCategory = async (id: string) => {
    await categoriesApi.delete(id);
    const res = await categoriesApi.list();
    setCategories(res.data);
  };

  const handleDeleteTag = async (id: string) => {
    await tagsApi.delete(id);
    const res = await tagsApi.list();
    setTags(res.data);
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 rounded-full border-2 border-red-600 border-t-transparent animate-spin" /></div>;

  return (
    <div className="space-y-6 max-w-xl">
      <h1 className="text-2xl font-bold">Settings</h1>

      <div className="rounded-2xl border border-red-100 bg-white p-4 shadow-sm space-y-3">
        <h2 className="font-semibold">AI Provider</h2>
        <div>
          <label className="block text-xs text-gray-500 mb-1">MiniMax API Key</label>
          <input
            type="password"
            value={form.MINIMAX_API_KEY}
            onChange={(e) => setForm((f) => ({ ...f, MINIMAX_API_KEY: e.target.value }))}
            className="w-full rounded-xl border border-red-200 bg-white px-3 py-2 text-sm outline-none focus:border-red-600"
            placeholder="sk-..."
          />
        </div>
      </div>

      <div className="rounded-2xl border border-red-100 bg-white p-4 shadow-sm space-y-3">
        <h2 className="font-semibold">Google Calendar</h2>
        <p className="text-xs text-gray-500">Sync tasks with due dates to Google Calendar (one-way).</p>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Client ID</label>
          <input
            type="text"
            value={form.GOOGLE_CLIENT_ID}
            onChange={(e) => setForm((f) => ({ ...f, GOOGLE_CLIENT_ID: e.target.value }))}
            className="w-full rounded-xl border border-red-200 bg-white px-3 py-2 text-sm outline-none focus:border-red-600"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Client Secret</label>
          <input
            type="password"
            value={form.GOOGLE_CLIENT_SECRET}
            onChange={(e) => setForm((f) => ({ ...f, GOOGLE_CLIENT_SECRET: e.target.value }))}
            className="w-full rounded-xl border border-red-200 bg-white px-3 py-2 text-sm outline-none focus:border-red-600"
          />
        </div>
        <button
          onClick={handleConnectGoogle}
          className="rounded-xl bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
        >
          Connect Google Calendar
        </button>
      </div>

      <div className="rounded-2xl border border-red-100 bg-white p-4 shadow-sm space-y-3">
        <h2 className="font-semibold">MQTT / Home Assistant</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Host</label>
            <input
              type="text"
              value={form.MQTT_HOST}
              onChange={(e) => setForm((f) => ({ ...f, MQTT_HOST: e.target.value }))}
              className="w-full rounded-xl border border-red-200 bg-white px-3 py-2 text-sm outline-none focus:border-red-600"
              placeholder="192.168.1.100"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Port</label>
            <input
              type="text"
              value={form.MQTT_PORT}
              onChange={(e) => setForm((f) => ({ ...f, MQTT_PORT: e.target.value }))}
              className="w-full rounded-xl border border-red-200 bg-white px-3 py-2 text-sm outline-none focus:border-red-600"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Username</label>
            <input
              type="text"
              value={form.MQTT_USERNAME}
              onChange={(e) => setForm((f) => ({ ...f, MQTT_USERNAME: e.target.value }))}
              className="w-full rounded-xl border border-red-200 bg-white px-3 py-2 text-sm outline-none focus:border-red-600"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Password</label>
            <input
              type="password"
              value={form.MQTT_PASSWORD}
              onChange={(e) => setForm((f) => ({ ...f, MQTT_PASSWORD: e.target.value }))}
              className="w-full rounded-xl border border-red-200 bg-white px-3 py-2 text-sm outline-none focus:border-red-600"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">HA Todo Device ID</label>
          <input
            type="text"
            value={form.HA_TODO_DEVICE_ID}
            onChange={(e) => setForm((f) => ({ ...f, HA_TODO_DEVICE_ID: e.target.value }))}
            className="w-full rounded-xl border border-red-200 bg-white px-3 py-2 text-sm outline-none focus:border-red-600"
          />
        </div>
      </div>

      <button
        onClick={handleSave}
        className="w-full rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 transition-colors"
      >
        {saved ? '✓ Saved!' : 'Save Settings'}
      </button>

      <div className="rounded-2xl border border-red-100 bg-white p-4 shadow-sm space-y-3">
        <h2 className="font-semibold">Categories</h2>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Category name"
            value={newCategory.name}
            onChange={(e) => setNewCategory((c) => ({ ...c, name: e.target.value }))}
            className="flex-1 rounded-xl border border-red-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-red-600"
          />
          <input
            type="color"
            value={newCategory.color}
            onChange={(e) => setNewCategory((c) => ({ ...c, color: e.target.value }))}
            className="w-8 h-8 rounded-lg border border-red-200 cursor-pointer"
          />
          <button onClick={handleAddCategory} className="rounded-xl bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700">
            Add
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <div key={c.id} className="flex items-center gap-1 rounded-full px-3 py-1 text-xs text-white" style={{ backgroundColor: c.color }}>
              {c.name}
              <button onClick={() => handleDeleteCategory(c.id)} className="ml-1 opacity-70 hover:opacity-100">&times;</button>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-red-100 bg-white p-4 shadow-sm space-y-3">
        <h2 className="font-semibold">Tags</h2>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Tag name"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
            className="flex-1 rounded-xl border border-red-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-red-600"
          />
          <button onClick={handleAddTag} className="rounded-xl bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700">
            Add
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {tags.map((t) => (
            <span key={t.id} className="inline-flex items-center gap-1 rounded-full bg-red-50 px-3 py-1 text-xs text-red-700">
              {t.name}
              <button onClick={() => handleDeleteTag(t.id)} className="ml-1 opacity-70 hover:opacity-100">&times;</button>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
