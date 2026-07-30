#!/usr/bin/env python3
"""Apply SQL migrations from supabase/migrations in filename order."""
import asyncio
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import text

from app.core.config import settings
from app.core.database import create_async_engine_from_url

MIGRATIONS_DIR = Path(__file__).resolve().parents[2] / "supabase" / "migrations"


def split_sql_statements(sql: str) -> list[str]:
    """Split a migration file into individual executable statements."""
    # Strip line comments
    lines = []
    for line in sql.splitlines():
        stripped = line.strip()
        if stripped.startswith("--"):
            continue
        lines.append(line)
    body = "\n".join(lines)
    parts = re.split(r";\s*\n", body)
    return [p.strip() for p in parts if p.strip()]


async def table_exists(conn, name: str) -> bool:
    result = await conn.execute(
        text(
            "SELECT 1 FROM information_schema.tables "
            "WHERE table_schema = 'public' AND table_name = :n"
        ),
        {"n": name},
    )
    return result.scalar() is not None


async def run_migrations() -> None:
    files = sorted(MIGRATIONS_DIR.glob("*.sql"))
    if not files:
        print("No migration files found.")
        return

    engine = create_async_engine_from_url(settings.database_url, echo=False)
    async with engine.begin() as conn:
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS schema_migrations (
                filename VARCHAR(255) PRIMARY KEY,
                applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        """))
        result = await conn.execute(text("SELECT filename FROM schema_migrations"))
        applied = {row[0] for row in result.all()}

        for path in files:
            if path.name in applied:
                print(f"skip  {path.name}")
                continue

            # Existing DBs created before schema_migrations: skip initial bootstrap
            if path.name == "001_initial_schema.sql" and await table_exists(conn, "users"):
                print(f"skip  {path.name} (schema already exists)")
                await conn.execute(
                    text("INSERT INTO schema_migrations (filename) VALUES (:f)"),
                    {"f": path.name},
                )
                continue

            print(f"apply {path.name}")
            for stmt in split_sql_statements(path.read_text()):
                await conn.execute(text(stmt))
            await conn.execute(
                text("INSERT INTO schema_migrations (filename) VALUES (:f)"),
                {"f": path.name},
            )
    await engine.dispose()
    print("Migrations complete.")


if __name__ == "__main__":
    asyncio.run(run_migrations())
