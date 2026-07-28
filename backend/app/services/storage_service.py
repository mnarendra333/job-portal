import uuid
from pathlib import Path

import aiofiles
from fastapi import UploadFile

from app.core.config import settings

ALLOWED_RESUME_EXTENSIONS = {".pdf", ".doc", ".docx"}
ALLOWED_RESUME_MIMES = {
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}


class StorageService:
    def __init__(self) -> None:
        self.base_dir = Path(settings.upload_dir)
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def _job_dir(self, job_id: uuid.UUID, subfolder: str = "") -> Path:
        path = self.base_dir / "jobs" / str(job_id)
        if subfolder:
            path = path / subfolder
        path.mkdir(parents=True, exist_ok=True)
        return path

    def _profile_dir(self, user_id: uuid.UUID) -> Path:
        path = self.base_dir / "profiles" / str(user_id)
        path.mkdir(parents=True, exist_ok=True)
        return path

    def validate_resume(self, upload: UploadFile) -> None:
        ext = Path(upload.filename or "").suffix.lower()
        if ext not in ALLOWED_RESUME_EXTENSIONS:
            raise ValueError(f"Unsupported file type. Allowed: {', '.join(ALLOWED_RESUME_EXTENSIONS)}")
        if upload.content_type and upload.content_type not in ALLOWED_RESUME_MIMES:
            if ext not in ALLOWED_RESUME_EXTENSIONS:
                raise ValueError("Unsupported file type")

    async def save_resume_for_job(
        self,
        job_id: uuid.UUID,
        upload: UploadFile,
        subfolder: str = "agency",
    ) -> tuple[str, str, int, str | None]:
        self.validate_resume(upload)
        ext = Path(upload.filename or "file").suffix
        stored_name = f"{uuid.uuid4()}{ext}"
        dest_dir = self._job_dir(job_id, subfolder)
        dest_path = dest_dir / stored_name
        size = 0
        async with aiofiles.open(dest_path, "wb") as f:
            while chunk := await upload.read(1024 * 64):
                size += len(chunk)
                if size > settings.max_resume_size_bytes:
                    dest_path.unlink(missing_ok=True)
                    raise ValueError(f"File exceeds {settings.max_resume_size_mb}MB limit")
                await f.write(chunk)
        rel_path = str(dest_path.relative_to(self.base_dir))
        return rel_path, upload.filename or stored_name, size, upload.content_type

    async def save_resume_for_profile(
        self,
        user_id: uuid.UUID,
        upload: UploadFile,
    ) -> tuple[str, str, int, str | None]:
        self.validate_resume(upload)
        ext = Path(upload.filename or "file").suffix
        stored_name = f"{uuid.uuid4()}{ext}"
        dest_dir = self._profile_dir(user_id)
        dest_path = dest_dir / stored_name
        size = 0
        async with aiofiles.open(dest_path, "wb") as f:
            while chunk := await upload.read(1024 * 64):
                size += len(chunk)
                if size > settings.max_resume_size_bytes:
                    dest_path.unlink(missing_ok=True)
                    raise ValueError(f"File exceeds {settings.max_resume_size_mb}MB limit")
                await f.write(chunk)
        rel_path = str(dest_path.relative_to(self.base_dir))
        return rel_path, upload.filename or stored_name, size, upload.content_type

    def resolve_path(self, relative_path: str) -> Path:
        full = (self.base_dir / relative_path).resolve()
        if not str(full).startswith(str(self.base_dir.resolve())):
            raise ValueError("Invalid file path")
        return full
