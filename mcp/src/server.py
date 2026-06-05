import asyncio
import json
import uuid
from datetime import date, datetime, timedelta

from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent

from src.db import get_pool

server = Server("todo-app")


# ── Tool definitions ──────────────────────────────────────────────

@server.list_tools()
async def list_tools() -> list[Tool]:
    return [
        Tool(
            name="list_tasks",
            description="List all top-level tasks. Optionally filter by status, priority, category, search text, or due date. Returns tasks with their subtasks, tags, and category info.",
            inputSchema={
                "type": "object",
                "properties": {
                    "status": {"type": "string", "enum": ["pending", "completed", "rolled_over"]},
                    "priority": {"type": "integer", "minimum": 1, "maximum": 4},
                    "category_id": {"type": "string", "description": "UUID of the category to filter by"},
                    "search": {"type": "string", "description": "Case-insensitive search in task title"},
                    "due_date": {"type": "string", "description": "Filter by exact due date (YYYY-MM-DD)"},
                },
            },
        ),
        Tool(
            name="get_task",
            description="Get a single task by ID, including its subtasks, tags, and category info.",
            inputSchema={
                "type": "object",
                "properties": {
                    "task_id": {"type": "string", "description": "UUID of the task"},
                },
                "required": ["task_id"],
            },
        ),
        Tool(
            name="create_task",
            description="Create a new task. Priority is 1 (highest) to 4 (lowest). Defaults to priority 2.",
            inputSchema={
                "type": "object",
                "properties": {
                    "title": {"type": "string", "description": "Title of the task"},
                    "description": {"type": "string", "description": "Optional longer description"},
                    "priority": {"type": "integer", "minimum": 1, "maximum": 4, "description": "1=highest, 4=lowest. Default 2."},
                    "due_date": {"type": "string", "description": "Due date (YYYY-MM-DD)"},
                    "category_id": {"type": "string", "description": "UUID of the category"},
                    "tag_ids": {"type": "array", "items": {"type": "string"}, "description": "List of tag UUIDs to attach"},
                },
                "required": ["title"],
            },
        ),
        Tool(
            name="update_task",
            description="Update any fields of a task. Only provide the fields you want to change. Setting status to 'completed' records the completion timestamp.",
            inputSchema={
                "type": "object",
                "properties": {
                    "task_id": {"type": "string", "description": "UUID of the task to update"},
                    "title": {"type": "string"},
                    "description": {"type": "string"},
                    "status": {"type": "string", "enum": ["pending", "completed", "rolled_over"]},
                    "priority": {"type": "integer", "minimum": 1, "maximum": 4},
                    "due_date": {"type": "string", "description": "Due date (YYYY-MM-DD)"},
                    "category_id": {"type": "string", "description": "UUID of the category"},
                },
                "required": ["task_id"],
            },
        ),
        Tool(
            name="delete_task",
            description="Delete a task permanently. Also deletes its subtasks (cascade).",
            inputSchema={
                "type": "object",
                "properties": {
                    "task_id": {"type": "string", "description": "UUID of the task to delete"},
                },
                "required": ["task_id"],
            },
        ),
        Tool(
            name="list_categories",
            description="List all task categories with their names and colors.",
            inputSchema={"type": "object", "properties": {}},
        ),
        Tool(
            name="create_category",
            description="Create a new category for organizing tasks.",
            inputSchema={
                "type": "object",
                "properties": {
                    "name": {"type": "string", "description": "Category name (unique)"},
                    "color": {"type": "string", "description": "Hex color code, e.g. #DC2626"},
                },
                "required": ["name"],
            },
        ),
        Tool(
            name="list_tags",
            description="List all tags.",
            inputSchema={"type": "object", "properties": {}},
        ),
        Tool(
            name="create_tag",
            description="Create a new tag that can be attached to tasks.",
            inputSchema={
                "type": "object",
                "properties": {
                    "name": {"type": "string", "description": "Tag name (unique)"},
                },
                "required": ["name"],
            },
        ),
        Tool(
            name="get_stats",
            description="Get overall task statistics: total, completed, pending, rolled-over counts, and current streak (consecutive days with at least one completed task).",
            inputSchema={"type": "object", "properties": {}},
        ),
        Tool(
            name="get_heatmap",
            description="Get a 365-day activity heatmap showing how many tasks were completed each day.",
            inputSchema={"type": "object", "properties": {}},
        ),
    ]


# ── Helpers ───────────────────────────────────────────────────────

def _row_to_dict(record: asyncpg.Record) -> dict:
    result = {}
    for key in record.keys():
        val = record[key]
        if isinstance(val, (datetime, date)):
            val = val.isoformat()
        elif isinstance(val, uuid.UUID):
            val = str(val)
        result[key] = val
    return result


async def _get_task_tags(pool, task_id: str) -> list[dict]:
    rows = await pool.fetch(
        """SELECT tg.id, tg.name
           FROM tags tg
           JOIN task_tags tt ON tg.id = tt.tag_id
           WHERE tt.task_id = $1""",
        task_id,
    )
    return [{"id": str(r["id"]), "name": r["name"]} for r in rows]


async def _get_task_subtasks(pool, task_id: str) -> list[dict]:
    rows = await pool.fetch(
        "SELECT * FROM tasks WHERE parent_task_id = $1 ORDER BY created_at ASC",
        task_id,
    )
    return [_row_to_dict(r) for r in rows]


async def _enrich_task(pool, task: asyncpg.Record) -> dict:
    task_dict = _row_to_dict(task)
    task_id = str(task["id"])
    task_dict["tags"] = await _get_task_tags(pool, task_id)
    task_dict["subtasks"] = await _get_task_subtasks(pool, task_id)
    return task_dict


async def _compute_streak(pool) -> int:
    rows = await pool.fetch(
        "SELECT date, tasks_completed FROM daily_logs ORDER BY date DESC"
    )
    streak = 0
    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)

    for i, row in enumerate(rows):
        if row["tasks_completed"] == 0:
            break

        row_date = row["date"]
        if isinstance(row_date, datetime):
            row_date = row_date.date()
        row_dt = datetime.combine(row_date, datetime.min.time())

        if streak == 0:
            diff = (today - row_dt).days
            if diff > 1:
                break
            streak = 1
        else:
            prev_row = rows[i - 1]
            prev_date = prev_row["date"]
            if isinstance(prev_date, datetime):
                prev_date = prev_date.date()
            prev_dt = datetime.combine(prev_date, datetime.min.time())
            diff = (prev_dt - row_dt).days
            if diff == 1:
                streak += 1
            else:
                break

    return streak


async def _record_daily_log(pool) -> None:
    today = date.today().isoformat()

    row = await pool.fetchrow(
        """SELECT
             COUNT(*) FILTER (WHERE status = 'completed' AND completed_at::date = $1 AND parent_task_id IS NULL)::int as completed,
             COUNT(*) FILTER (WHERE status = 'pending' AND parent_task_id IS NULL)::int as pending,
             COUNT(*) FILTER (WHERE status = 'rolled_over' AND parent_task_id IS NULL)::int as rolled
           FROM tasks""",
        today,
    )

    await pool.execute(
        """INSERT INTO daily_logs (date, tasks_completed, tasks_pending, tasks_rolled)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (date) DO UPDATE SET
             tasks_completed = EXCLUDED.tasks_completed,
             tasks_pending = EXCLUDED.tasks_pending,
             tasks_rolled = EXCLUDED.tasks_rolled""",
        today,
        row["completed"],
        row["pending"],
        row["rolled"],
    )


# ── Tool handler ──────────────────────────────────────────────────

@server.call_tool()
async def call_tool(name: str, arguments: dict) -> list[TextContent]:
    pool = await get_pool()

    try:
        if name == "list_tasks":
            return await _list_tasks(pool, arguments)
        elif name == "get_task":
            return await _get_task(pool, arguments)
        elif name == "create_task":
            return await _create_task(pool, arguments)
        elif name == "update_task":
            return await _update_task(pool, arguments)
        elif name == "delete_task":
            return await _delete_task(pool, arguments)
        elif name == "list_categories":
            return await _list_categories(pool)
        elif name == "create_category":
            return await _create_category(pool, arguments)
        elif name == "list_tags":
            return await _list_tags(pool)
        elif name == "create_tag":
            return await _create_tag(pool, arguments)
        elif name == "get_stats":
            return await _get_stats(pool)
        elif name == "get_heatmap":
            return await _get_heatmap(pool)
        else:
            return [TextContent(type="text", text=f"Unknown tool: {name}")]
    except Exception as e:
        return [TextContent(type="text", text=f"Error: {str(e)}")]


# ── Tool implementations ──────────────────────────────────────────

async def _list_tasks(pool, args: dict) -> list[TextContent]:
    conditions = ["t.parent_task_id IS NULL"]
    params: list = []
    i = 0

    for field in ["status", "priority", "category_id", "due_date"]:
        val = args.get(field)
        if val is not None:
            i += 1
            params.append(val)
            conditions.append(f"t.{field} = ${i}")

    search = args.get("search")
    if search:
        i += 1
        params.append(f"%{search}%")
        conditions.append(f"t.title ILIKE ${i}")

    where = " WHERE " + " AND ".join(conditions)
    query = f"""SELECT t.*, c.name AS category_name, c.color AS category_color
                FROM tasks t
                LEFT JOIN categories c ON t.category_id = c.id
                {where}
                ORDER BY t.due_date ASC NULLS LAST, t.priority ASC, t.created_at DESC"""

    rows = await pool.fetch(query, *params)
    tasks = []
    for row in rows:
        tasks.append(await _enrich_task(pool, row))

    return [TextContent(type="text", text=json.dumps(tasks, indent=2, ensure_ascii=False))]


async def _get_task(pool, args: dict) -> list[TextContent]:
    task_id = args["task_id"]

    row = await pool.fetchrow(
        """SELECT t.*, c.name AS category_name, c.color AS category_color
           FROM tasks t
           LEFT JOIN categories c ON t.category_id = c.id
           WHERE t.id = $1""",
        task_id,
    )
    if not row:
        return [TextContent(type="text", text=json.dumps({"error": "Task not found"}))]

    task = await _enrich_task(pool, row)
    return [TextContent(type="text", text=json.dumps(task, indent=2, ensure_ascii=False))]


async def _create_task(pool, args: dict) -> list[TextContent]:
    task_id = str(uuid.uuid4())
    title = args["title"].strip()
    description = args.get("description", "")
    priority = args.get("priority", 2)
    due_date = args.get("due_date")
    category_id = args.get("category_id")
    tag_ids = args.get("tag_ids", [])

    row = await pool.fetchrow(
        """INSERT INTO tasks (id, title, description, priority, due_date, category_id)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING *""",
        task_id, title, description, priority, due_date, category_id,
    )

    for tag_id in tag_ids:
        await pool.execute(
            "INSERT INTO task_tags (task_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
            task_id, tag_id,
        )

    task = await _enrich_task(pool, row)
    return [TextContent(type="text", text=json.dumps(task, indent=2, ensure_ascii=False))]


async def _update_task(pool, args: dict) -> list[TextContent]:
    task_id = args["task_id"]

    existing = await pool.fetchrow("SELECT * FROM tasks WHERE id = $1", task_id)
    if not existing:
        return [TextContent(type="text", text=json.dumps({"error": "Task not found"}))]

    sets: list[str] = []
    params: list = []
    i = 0

    updatable = ["title", "description", "status", "priority", "due_date", "category_id"]
    for field in updatable:
        val = args.get(field)
        if val is not None:
            i += 1
            params.append(val)
            sets.append(f"{field} = ${i}")

    status = args.get("status")
    if status == "completed":
        i += 1
        params.append(datetime.now().isoformat())
        sets.append(f"completed_at = ${i}")
    elif status == "pending":
        sets.append("completed_at = NULL")

    if not sets:
        return [TextContent(type="text", text=json.dumps(_row_to_dict(existing), indent=2, ensure_ascii=False))]

    sets.append("updated_at = NOW()")
    i += 1
    params.append(task_id)

    query = f"UPDATE tasks SET {', '.join(sets)} WHERE id = ${i} RETURNING *"
    row = await pool.fetchrow(query, *params)

    await _record_daily_log(pool)

    task = await _enrich_task(pool, row)
    return [TextContent(type="text", text=json.dumps(task, indent=2, ensure_ascii=False))]


async def _delete_task(pool, args: dict) -> list[TextContent]:
    task_id = args["task_id"]
    result = await pool.fetchrow("DELETE FROM tasks WHERE id = $1 RETURNING id", task_id)
    if not result:
        return [TextContent(type="text", text=json.dumps({"error": "Task not found"}))]
    return [TextContent(type="text", text=json.dumps({"deleted": True, "task_id": task_id}))]


async def _list_categories(pool) -> list[TextContent]:
    rows = await pool.fetch("SELECT * FROM categories ORDER BY sort_order ASC, name ASC")
    categories = [_row_to_dict(r) for r in rows]
    return [TextContent(type="text", text=json.dumps(categories, indent=2, ensure_ascii=False))]


async def _create_category(pool, args: dict) -> list[TextContent]:
    name = args["name"].strip()
    color = args.get("color", "#DC2626")

    row = await pool.fetchrow(
        "INSERT INTO categories (name, color) VALUES ($1, $2) RETURNING *",
        name, color,
    )
    return [TextContent(type="text", text=json.dumps(_row_to_dict(row), indent=2, ensure_ascii=False))]


async def _list_tags(pool) -> list[TextContent]:
    rows = await pool.fetch("SELECT * FROM tags ORDER BY name ASC")
    tags = [_row_to_dict(r) for r in rows]
    return [TextContent(type="text", text=json.dumps(tags, indent=2, ensure_ascii=False))]


async def _create_tag(pool, args: dict) -> list[TextContent]:
    name = args["name"].strip().lower()

    row = await pool.fetchrow(
        "INSERT INTO tags (name) VALUES ($1) RETURNING *",
        name,
    )
    return [TextContent(type="text", text=json.dumps(_row_to_dict(row), indent=2, ensure_ascii=False))]


async def _get_stats(pool) -> list[TextContent]:
    total = await pool.fetchval("SELECT COUNT(*)::int FROM tasks WHERE parent_task_id IS NULL")
    completed = await pool.fetchval("SELECT COUNT(*)::int FROM tasks WHERE status = 'completed' AND parent_task_id IS NULL")
    pending = await pool.fetchval("SELECT COUNT(*)::int FROM tasks WHERE status = 'pending' AND parent_task_id IS NULL")
    rolled = await pool.fetchval("SELECT COUNT(*)::int FROM tasks WHERE status = 'rolled_over' AND parent_task_id IS NULL")
    streak = await _compute_streak(pool)

    stats = {
        "total": total,
        "completed": completed,
        "pending": pending,
        "rolled_over": rolled,
        "streak": streak,
    }
    return [TextContent(type="text", text=json.dumps(stats, indent=2, ensure_ascii=False))]


async def _get_heatmap(pool) -> list[TextContent]:
    rows = await pool.fetch(
        """SELECT date, tasks_completed
           FROM daily_logs
           WHERE date >= NOW() - INTERVAL '365 days'
           ORDER BY date ASC"""
    )
    data = [_row_to_dict(r) for r in rows]
    return [TextContent(type="text", text=json.dumps(data, indent=2, ensure_ascii=False))]


# ── Entry point ───────────────────────────────────────────────────

async def main():
    async with stdio_server() as (read_stream, write_stream):
        await server.run(read_stream, write_stream, server.create_initialization_options())


if __name__ == "__main__":
    asyncio.run(main())
