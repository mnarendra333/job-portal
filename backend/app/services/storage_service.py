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


ALLOWED_AVATAR_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
ALLOWED_AVATAR_MIMES = {"image/jpeg", "image/png", "image/webp"}
MAX_AVATAR_BYTES = 2 * 1024 * 1024


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

    def file_exists(self, relative_path: str) -> bool:
        try:
            return self.resolve_path(relative_path).is_file()
        except ValueError:
            return False

    async def save_avatar(self, user_id: uuid.UUID, upload: UploadFile) -> str:
        ext = Path(upload.filename or "").suffix.lower()
        if ext not in ALLOWED_AVATAR_EXTENSIONS:
            raise ValueError("Profile photo must be JPG, PNG, or WEBP")
        if upload.content_type and upload.content_type not in ALLOWED_AVATAR_MIMES:
            raise ValueError("Unsupported image type")
        avatar_dir = self.base_dir / "avatars"
        avatar_dir.mkdir(parents=True, exist_ok=True)
        for old in avatar_dir.glob(f"{user_id}.*"):
            old.unlink(missing_ok=True)
        dest_path = avatar_dir / f"{user_id}{ext}"
        size = 0
        async with aiofiles.open(dest_path, "wb") as f:
            while chunk := await upload.read(1024 * 64):
                size += len(chunk)
                if size > MAX_AVATAR_BYTES:
                    dest_path.unlink(missing_ok=True)
                    raise ValueError("Profile photo must be 2MB or smaller")
                await f.write(chunk)
        return str(dest_path.relative_to(self.base_dir))


def build_demo_pdf_bytes(title: str = "Demo Resume") -> bytes:
    """Minimal valid PDF for seed/demo resumes."""
    safe = title.replace("(", "").replace(")", "")[:80]
    stream = f"BT /F1 18 Tf 72 720 Td ({safe}) Tj ET"
    stream_len = len(stream.encode())
    body = (
        f"%PDF-1.4\n"
        f"1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
        f"2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n"
        f"3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Contents 4 0 R"
        f"/Resources<</Font<</F1 5 0 R>>>>>>endobj\n"
        f"4 0 obj<</Length {stream_len}>>stream\n{stream}\nendstream endobj\n"
        f"5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\n"
        f"xref\n0 6\n0000000000 65535 f \n"
        f"trailer<</Size 6/Root 1 0 R>>\nstartxref\n0\n%%EOF"
    )
    return body.encode()


def write_seed_resume_file(upload_dir: str | Path, relative_path: str, title: str) -> Path:
    base = Path(upload_dir)
    dest = (base / relative_path).resolve()
    if not str(dest).startswith(str(base.resolve())):
        raise ValueError("Invalid file path")
    dest.parent.mkdir(parents=True, exist_ok=True)
    if not dest.is_file():
        dest.write_bytes(build_demo_pdf_bytes(title))
    return dest
