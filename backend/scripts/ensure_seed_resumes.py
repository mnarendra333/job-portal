#!/usr/bin/env python3
"""Create missing on-disk files for seed/demo resume records."""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import select

from app.core.config import settings
from app.core.database import create_async_engine_from_url
from app.models import Resume
from app.services.storage_service import write_seed_resume_file
from sqlalchemy.ext.asyncio import async_sessionmaker


async def main() -> None:
    engine = create_async_engine_from_url(settings.database_url, echo=False)
    Session = async_sessionmaker(engine, expire_on_commit=False)
    created = 0
    async with Session() as session:
        result = await session.execute(select(Resume))
        for resume in result.scalars().all():
            if not resume.file_path.startswith("seed/"):
                continue
            dest = Path(settings.upload_dir) / resume.file_path
            if dest.is_file():
                continue
            title = resume.candidate_name or resume.file_name or "Demo Resume"
            write_seed_resume_file(settings.upload_dir, resume.file_path, f"{title} — Resume")
            created += 1
            print(f"created {resume.file_path}")
    await engine.dispose()
    print(f"Done. Created {created} file(s) under {settings.upload_dir}/")


if __name__ == "__main__":
    asyncio.run(main())
