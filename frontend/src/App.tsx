import { useState } from 'react';
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
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-red-50 flex">
      {/* ── Hamburger button (mobile only) ── */}
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="fixed top-4 left-4 z-50 md:hidden w-10 h-10 flex items-center justify-center rounded-xl bg-white shadow-md border border-red-100 text-red-600"
        aria-label="Toggle menu"
      >
        <span className="text-xl leading-none">{menuOpen ? '✕' : '☰'}</span>
      </button>

      {/* ── Overlay backdrop (mobile) ── */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* ── Mobile sidebar (slide-in from left) ── */}
      <nav
        className={clsx(
          'fixed top-0 left-0 z-40 h-full w-64 bg-white border-r border-red-100 flex flex-col py-6 gap-1 shadow-xl transition-transform duration-300 md:hidden',
          menuOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-center mb-4 mt-8">
          <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center text-white text-lg font-bold">
            T
          </div>
        </div>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            onClick={() => setMenuOpen(false)}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-6 py-3 text-sm transition-colors',
                isActive
                  ? 'text-red-600 bg-red-100 font-medium'
                  : 'text-gray-500 hover:text-red-500 hover:bg-red-50'
              )
            }
          >
            <span className="text-xl">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* ── Desktop sidebar (static, always visible) ── */}
      <nav className="hidden md:flex md:w-20 md:h-screen md:border-r md:border-red-100 md:flex-col md:items-center md:py-8 md:gap-2 md:sticky md:top-0">
        <div className="flex items-center justify-center mb-4">
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
                'flex flex-col items-center gap-0.5 w-16 py-3 rounded-2xl text-sm transition-colors',
                isActive
                  ? 'text-red-600 bg-red-100'
                  : 'text-gray-400 hover:text-red-500'
              )
            }
          >
            <span className="text-xl">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* ── Main content ── */}
      <main className="flex-1 min-h-screen">
        <div className="max-w-5xl mx-auto px-4 py-6 pt-16 md:pt-6">
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
