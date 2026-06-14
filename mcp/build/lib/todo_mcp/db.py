import sys
import asyncpg
from .config import DATABASE_URL

_pool: asyncpg.Pool | None = None


async def get_pool() -> asyncpg.Pool:
    global _pool
    if _pool is None:
        try:
            _pool = await asyncpg.create_pool(
                dsn=DATABASE_URL,
                min_size=1,
                max_size=5,
                ssl=False,
                timeout=10,
            )
        except Exception as e:
            print(f"[todo-mcp] Failed to connect to PostgreSQL: {e}", file=sys.stderr)
            print(f"[todo-mcp] DATABASE_URL={DATABASE_URL}", file=sys.stderr)
            raise
    return _pool


async def close_pool() -> None:
    global _pool
    if _pool:
        await _pool.close()
        _pool = None
