"""Async PostgreSQL URL helpers (Neon/Railway libpq params → asyncpg connect_args)."""

from __future__ import annotations

from sqlalchemy.engine import make_url

# libpq query keys passed by Neon/Supabase/Railway that asyncpg.connect() rejects
_ASYNCPG_STRIP_QUERY_KEYS = frozenset({
    "sslmode",
    "channel_binding",
    "options",
    "gssencmode",
    "target_session_attrs",
})


def prepare_async_database_url(database_url: str) -> tuple[str, dict]:
    """Return (sqlalchemy_url, connect_args) safe for create_async_engine + asyncpg."""
    url_str = database_url.strip()
    if url_str.startswith("postgresql://") and "+asyncpg" not in url_str:
        url_str = url_str.replace("postgresql://", "postgresql+asyncpg://", 1)

    url = make_url(url_str)
    query = dict(url.query)

    sslmode = query.pop("sslmode", None)
    for key in _ASYNCPG_STRIP_QUERY_KEYS:
        query.pop(key, None)

    connect_args: dict = {}
    if sslmode in ("require", "verify-ca", "verify-full", "prefer"):
        connect_args["ssl"] = True
    elif sslmode == "disable":
        connect_args["ssl"] = False

    host = (url.host or "").lower()
    if "ssl" not in connect_args and any(h in host for h in ("neon.tech", "supabase.co", "render.com")):
        connect_args["ssl"] = True

    url = url.set(query=query)
    return url.render_as_string(hide_password=False), connect_args


def create_async_engine_from_url(database_url: str, *, echo: bool = False):
    from sqlalchemy.ext.asyncio import create_async_engine

    url, connect_args = prepare_async_database_url(database_url)
    kwargs = {"echo": echo}
    if connect_args:
        kwargs["connect_args"] = connect_args
    return create_async_engine(url, **kwargs)
