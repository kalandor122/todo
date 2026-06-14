import { useState } from 'react';
import { cn, formatDateShort, isToday, isOverdue, priorityColors, priorityLabels } from '../utils';
import type { Task } from '../services/api';

interface TaskCardProps {
  task: Task;
  onToggle: (id: string) => void;
  onClick: (id: string) => void;
}

export default function TaskCard({ task, onToggle, onClick }: TaskCardProps) {
  const [expanded, setExpanded] = useState(false);
  const isCompleted = task.status === 'completed';
  const hasSubtasks = task.subtasks && task.subtasks.length > 0;

  return (
    <div className="rounded-2xl border bg-white shadow-sm transition-all hover:shadow-md">
      <div
        className={cn(
          'flex items-start gap-3 p-4 cursor-pointer',
          isCompleted ? 'border-green-200 opacity-70' : 'border-red-100',
          hasSubtasks && 'rounded-t-2xl',
          !hasSubtasks && 'rounded-2xl'
        )}
        onClick={() => onClick(task.id)}
      >
        <button
          onClick={(e) => { e.stopPropagation(); onToggle(task.id); }}
          className={cn(
            'mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 transition-colors',
            isCompleted
              ? 'bg-green-500 border-green-500'
              : 'border-red-300 hover:border-red-600'
          )}
        >
          {isCompleted && (
            <svg className="w-full h-full text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
            </svg>
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className={cn('font-medium truncate', isCompleted && 'line-through text-gray-400')}>
              {task.title}
            </h3>
            {task.is_ai_generated && (
              <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-md">AI</span>
            )}
            {hasSubtasks && (
              <span className="text-xs text-gray-400 ml-auto shrink-0">
                {task.subtasks!.filter((s) => s.status === 'completed').length}/{task.subtasks!.length}
              </span>
            )}
          </div>

          {task.description && (
            <p className="text-sm text-gray-500 mt-1 line-clamp-1">{task.description}</p>
          )}

          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className={cn('text-xs px-2 py-0.5 rounded-full', priorityColors[task.priority])}>
              {priorityLabels[task.priority]}
            </span>

            {task.due_date && !isToday(task.due_date) && (
              <span className={cn(
                'text-xs px-2 py-0.5 rounded-full',
                isOverdue(task.due_date)
                  ? 'bg-red-100 text-red-700'
                  : 'bg-gray-100 text-gray-500'
              )}>
                {formatDateShort(task.due_date)}
              </span>
            )}

            {task.category_name && (
              <span
                className="text-xs px-2 py-0.5 rounded-full text-white"
                style={{ backgroundColor: task.category_color || '#DC2626' }}
              >
                {task.category_name}
              </span>
            )}
          </div>

          {task.tags && task.tags.length > 0 && (
            <div className="flex items-center gap-1 mt-1.5 flex-wrap">
              {task.tags.map((tag) => (
                <span key={tag.id} className="text-xs bg-red-50 text-red-700 px-1.5 py-0.5 rounded-md">
                  {tag.name}
                </span>
              ))}
            </div>
          )}
        </div>

        {hasSubtasks && (
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            className="shrink-0 mt-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg
              className={cn('w-4 h-4 transition-transform', expanded && 'rotate-180')}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
        )}
      </div>

      {hasSubtasks && expanded && (
        <div className="border-t border-red-50 px-4 py-3 space-y-2 bg-red-50/50 rounded-b-2xl">
          {task.subtasks!.map((sub) => (
            <SubtaskRow key={sub.id} subtask={sub} onToggle={onToggle} onClick={onClick} />
          ))}
        </div>
      )}
    </div>
  );
}

function SubtaskRow({ subtask, onToggle, onClick }: { subtask: Task; onToggle: (id: string) => void; onClick: (id: string) => void }) {
  const done = subtask.status === 'completed';

  return (
    <div
      className={cn(
        'flex items-center gap-2.5 py-1.5 px-3 rounded-xl cursor-pointer hover:bg-white transition-colors',
        done && 'opacity-60'
      )}
      onClick={() => onClick(subtask.id)}
    >
      <button
        onClick={(e) => { e.stopPropagation(); onToggle(subtask.id); }}
        className={cn(
          'w-4 h-4 rounded-full border-2 flex-shrink-0 transition-colors',
          done ? 'bg-green-500 border-green-500' : 'border-red-300 hover:border-red-500'
        )}
      >
        {done && (
          <svg className="w-full h-full text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
          </svg>
        )}
      </button>
      <span className={cn('text-sm flex-1', done && 'line-through text-gray-400')}>{subtask.title}</span>
      {subtask.is_ai_generated && (
        <span className="text-[10px] bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded">AI</span>
      )}
      <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full', priorityColors[subtask.priority])}>
        {priorityLabels[subtask.priority]}
      </span>
    </div>
  );
}
