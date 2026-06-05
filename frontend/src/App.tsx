import { Routes, Route, NavLink } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import TaskDetail from './pages/TaskDetail';
import Calendar from './pages/Calendar';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import { clsx } from 'clsx';

const navItems = [
  { to: '/', label: 'Today', icon: '◷' },
  { to: '/tasks', label: 'Tasks', icon: '☰' },
  { to: '/calendar', label: 'Calendar', icon: '📅' },
  { to: '/analytics', label: 'Analytics', icon: '📊' },
  { to: '/settings', label: 'Settings', icon: '⚙' },
];

export default function App() {
  return (
    <div className="min-h-screen bg-red-50 flex">
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-red-100 md:static md:w-20 md:h-screen md:border-t-0 md:border-r md:flex md:flex-col md:items-center md:py-8 md:gap-6">
        <div className="hidden md:flex md:items-center md:justify-center md:mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center text-white text-lg font-bold">
            T
          </div>
        </div>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              clsx(
                'flex-1 flex flex-col items-center gap-0.5 py-2 text-xs transition-colors md:flex-none md:w-16 md:py-3 md:rounded-2xl md:text-sm',
                isActive
                  ? 'text-red-600 md:bg-red-100'
                  : 'text-gray-400 hover:text-red-500'
              )
            }
          >
            <span className="text-xl">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <main className="flex-1 pb-20 md:pb-0">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/tasks/:id" element={<TaskDetail />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
