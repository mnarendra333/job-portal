#!/usr/bin/env python3
"""Create missing on-disk files for resume records (seed + cloud redeploy recovery)."""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import select

from app.core.config import settings
from app.core.database import create_async_engine_from_url
from app.models import Resume
from app.services.storage_service import StorageService
from sqlalchemy.ext.asyncio import async_sessionmaker


async def main() -> None:
    storage = StorageService()
    engine = create_async_engine_from_url(settings.database_url, echo=False)
    Session = async_sessionmaker(engine, expire_on_commit=False)
    created = 0
    async with Session() as session:
        result = await session.execute(select(Resume))
        for resume in result.scalars().all():
            if not resume.file_path:
                continue
            try:
                path = storage.resolve_path(resume.file_path)
            except ValueError:
                continue
            if path.is_file():
                continue
            pdf_path = path if path.suffix.lower() == ".pdf" else path.with_suffix(".pdf")
            if pdf_path.is_file():
                continue
            storage.materialize_resume_file(
                resume.file_path,
                file_name=resume.file_name,
                candidate_name=resume.candidate_name,
            )
            created += 1
            print(f"created placeholder for {resume.file_path}")
    await engine.dispose()
    print(f"Done. Created {created} placeholder file(s) under {settings.upload_dir}/")


if __name__ == "__main__":
    asyncio.run(main())
