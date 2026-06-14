# Todo App

A full-stack todo application with AI-powered task breakdown, designed with ADHD-friendly workflows in mind.

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19, Vite, Tailwind CSS 4, Recharts |
| Backend | Express.js, TypeScript, PostgreSQL |
| MCP Server | Python 3.10+, MCP SDK, asyncpg |
| Infra | Docker, Docker Compose |

## Features

- **Task Management** — create, update, delete tasks with priorities (1-4), due dates, categories, and tags
- **Subtasks** — parent-child task hierarchy for breaking down complex work
- **AI Task Breakdown** — uses MiniMax via OpenRouter to split overwhelming tasks into small, actionable subtasks (ADHD-focused)
- **Daily Rollover** — incomplete tasks automatically roll over to the next day
- **Streak Tracking** — consecutive days with at least one completed task
- **Analytics** — completion trend charts (7/30/90 day) and a 365-day activity heatmap
- **Google Calendar Sync** — bidirectional sync via OAuth2
- **Home Assistant Integration** — MQTT bridge exposing tasks as a HA todo entity
- **MCP Server** — Python MCP server lets AI agents manage your tasks via tool calls
- **Responsive UI** — mobile bottom nav + desktop sidebar

## Getting Started

### Docker (recommended)

```bash
cp .env.example .env
# edit .env with your keys
docker compose up --build
```

App runs at `http://localhost:3000`.

### Local Development

**Backend:**

```bash
cd server
npm install
npm run migrate
npm run dev
```

**Frontend:**

```bash
cd frontend
npm install
npm run dev
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Server port (default: 3000) |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `MINIMAX_API_KEY` | No | API key for AI task breakdown |
| `AI_BASE_URL` | No | AI provider base URL (default: OpenRouter) |
| `MINIMAX_MODEL` | No | Model ID for AI breakdown |
| `GOOGLE_CLIENT_ID` | No | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth client secret |
| `GOOGLE_REDIRECT_URI` | No | OAuth callback URL |
| `MQTT_HOST` | No | MQTT broker host for Home Assistant |
| `MQTT_PORT` | No | MQTT broker port (default: 1883) |
| `MQTT_USERNAME` | No | MQTT username |
| `MQTT_PASSWORD` | No | MQTT password |
| `HA_TODO_DEVICE_ID` | No | Home Assistant device ID (default: todo_app) |

## MCP Server

The Python MCP server exposes task management tools for AI agents.

### Install

```bash
cd mcp
pip install -e .
```

### Run

```bash
todo-mcp
```

### Available Tools

- `list_tasks` — list/filter tasks by status, priority, category, search, due date
- `get_task` — get a single task with subtasks and tags
- `create_task` — create a task with optional priority, due date, category, tags
- `update_task` — update any task field
- `delete_task` — delete a task and its subtasks
- `list_categories` / `create_category`
- `list_tags` / `create_tag`
- `get_stats` — total, completed, pending, rolled-over counts + streak
- `get_heatmap` — 365-day completion activity data

## API Routes

| Route | Description |
|-------|-------------|
| `GET /api/health` | Health check |
| `/api/tasks` | CRUD for tasks and subtasks |
| `/api/categories` | CRUD for categories |
| `GET /api/tags` | List tags |
| `POST /api/tags` | Create tag |
| `/api/analytics` | Stats, daily logs, heatmap |
| `/api/settings` | App settings |
| `/api/ai` | AI task breakdown |
| `/api/calendar` | Google Calendar OAuth + sync |

## Database

PostgreSQL with the following tables: `tasks`, `categories`, `tags`, `task_tags`, `daily_logs`, `settings`. Schema is auto-applied on startup via `schema.sql`.
