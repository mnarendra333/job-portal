from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_optional_user, require_permission
from app.core.permissions import Permission
from app.db.session import get_db
from app.models import User
from app.schemas import (
    AgencyDashboard,
    ApplicationResponse,
    ApplicationStatusUpdate,
    ApplyRequest,
    BulkUploadBatchResponse,
    CandidateProfileResponse,
    CandidateProfileUpdate,
    JobCreate,
    JobListItem,
    JobResponse,
    JobStatusUpdate,
    JobUpdate,
    LoginRequest,
    OAuthRequest,
    RecruiterDashboard,
    RegisterRequest,
    ResumeResponse,
    SeekerDashboard,
    TokenResponse,
    UserResponse,
)
from app.services import dashboard_service, job_service, oauth_service
from app.services.storage_service import StorageService

router = APIRouter()
storage = StorageService()


def _handle_value_error(e: ValueError) -> HTTPException:
    return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# --- Auth ---
@router.post("/auth/register", response_model=TokenResponse)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    try:
        user, access, refresh = await job_service.register_user(db, body)
        return TokenResponse(access_token=access, refresh_token=refresh)
    except ValueError as e:
        raise _handle_value_error(e)


@router.post("/auth/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    try:
        user, access, refresh = await job_service.login_user(db, body.email, body.password)
        return TokenResponse(access_token=access, refresh_token=refresh)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))


@router.get("/auth/me", response_model=UserResponse)
async def me(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await job_service.get_user_response(db, user)


@router.get("/auth/oauth/{provider}/authorize")
async def oauth_authorize(provider: str, redirect_uri: str, state: str = "jobs"):
    try:
        url = oauth_service.oauth_authorize_url(provider, redirect_uri, state)
        return {"authorize_url": url}
    except ValueError as e:
        raise _handle_value_error(e)


@router.post("/auth/oauth/google", response_model=TokenResponse)
async def oauth_google(body: OAuthRequest, db: AsyncSession = Depends(get_db)):
    try:
        user, access, refresh = await oauth_service.oauth_google(
            db, body.code, body.redirect_uri, body.role, body.organization_name
        )
        return TokenResponse(access_token=access, refresh_token=refresh)
    except ValueError as e:
        raise _handle_value_error(e)


@router.post("/auth/oauth/linkedin", response_model=TokenResponse)
async def oauth_linkedin(body: OAuthRequest, db: AsyncSession = Depends(get_db)):
    try:
        user, access, refresh = await oauth_service.oauth_linkedin(
            db, body.code, body.redirect_uri, body.role, body.organization_name
        )
        return TokenResponse(access_token=access, refresh_token=refresh)
    except ValueError as e:
        raise _handle_value_error(e)


# --- Public jobs ---
@router.get("/jobs", response_model=list[JobListItem])
async def list_jobs(
    keyword: str | None = None,
    location: str | None = None,
    employment_type: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    return await job_service.list_published_jobs(db, keyword, location, employment_type)


@router.get("/jobs/{job_id}", response_model=JobResponse)
async def get_job(job_id: UUID, db: AsyncSession = Depends(get_db), user: User | None = Depends(get_optional_user)):
    try:
        return await job_service.get_job(db, job_id, user)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# --- Recruiter jobs ---
@router.post("/jobs", response_model=JobResponse)
async def create_job(
    body: JobCreate,
    user: User = Depends(require_permission(Permission.JOBS_WRITE)),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await job_service.create_job(db, user, body)
    except ValueError as e:
        raise _handle_value_error(e)


@router.get("/jobs/mine/list", response_model=list[JobResponse])
async def my_jobs(
    user: User = Depends(require_permission(Permission.JOBS_READ)),
    db: AsyncSession = Depends(get_db),
):
    return await job_service.list_my_jobs(db, user)


@router.put("/jobs/{job_id}", response_model=JobResponse)
async def update_job(
    job_id: UUID,
    body: JobUpdate,
    user: User = Depends(require_permission(Permission.JOBS_WRITE)),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await job_service.update_job(db, user, job_id, body)
    except ValueError as e:
        raise _handle_value_error(e)


@router.patch("/jobs/{job_id}/status", response_model=JobResponse)
async def patch_job_status(
    job_id: UUID,
    body: JobStatusUpdate,
    user: User = Depends(require_permission(Permission.JOBS_MANAGE)),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await job_service.update_job_status(db, user, job_id, body.status)
    except ValueError as e:
        raise _handle_value_error(e)


# --- Job seeker profile ---
@router.get("/profile", response_model=CandidateProfileResponse)
async def get_profile(
    user: User = Depends(require_permission(Permission.PROFILE_READ)),
    db: AsyncSession = Depends(get_db),
):
    return await job_service.get_profile(db, user)


@router.put("/profile", response_model=CandidateProfileResponse)
async def update_profile(
    body: CandidateProfileUpdate,
    user: User = Depends(require_permission(Permission.PROFILE_WRITE)),
    db: AsyncSession = Depends(get_db),
):
    return await job_service.update_profile(db, user, body)


@router.post("/profile/resume", response_model=ResumeResponse)
async def upload_profile_resume(
    file: UploadFile = File(...),
    user: User = Depends(require_permission(Permission.PROFILE_WRITE)),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await job_service.upload_profile_resume(db, user, file, storage)
    except ValueError as e:
        raise _handle_value_error(e)


# --- Applications ---
@router.post("/jobs/{job_id}/apply", response_model=ApplicationResponse)
async def apply_to_job(
    job_id: UUID,
    cover_letter: str | None = Form(None),
    resume_id: str | None = Form(None),
    file: UploadFile | None = File(None),
    user: User = Depends(require_permission(Permission.APPLICATIONS_WRITE)),
    db: AsyncSession = Depends(get_db),
):
    try:
        rid = UUID(resume_id) if resume_id else None
        return await job_service.apply_to_job(db, user, job_id, cover_letter, rid, file, storage)
    except ValueError as e:
        raise _handle_value_error(e)


@router.get("/applications/mine", response_model=list[ApplicationResponse])
async def my_applications(
    user: User = Depends(require_permission(Permission.APPLICATIONS_READ)),
    db: AsyncSession = Depends(get_db),
):
    return await job_service.list_my_applications(db, user)


@router.get("/jobs/{job_id}/applications", response_model=list[ApplicationResponse])
async def job_applications(
    job_id: UUID,
    user: User = Depends(require_permission(Permission.APPLICATIONS_MANAGE)),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await job_service.list_job_applications(db, user, job_id)
    except ValueError as e:
        raise _handle_value_error(e)


@router.patch("/applications/{app_id}/status", response_model=ApplicationResponse)
async def update_app_status(
    app_id: UUID,
    body: ApplicationStatusUpdate,
    user: User = Depends(require_permission(Permission.APPLICATIONS_MANAGE)),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await job_service.update_application_status(db, user, app_id, body.status)
    except ValueError as e:
        raise _handle_value_error(e)


@router.get("/applications/{app_id}/resume/download")
async def download_resume(
    app_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        resume, _ = await job_service.get_resume_for_download(db, user, app_id)
        path = storage.resolve_path(resume.file_path)
        return FileResponse(path, filename=resume.file_name, media_type=resume.mime_type or "application/octet-stream")
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# --- Agency bulk upload ---
@router.post("/jobs/{job_id}/bulk-upload", response_model=BulkUploadBatchResponse)
async def bulk_upload(
    job_id: UUID,
    files: list[UploadFile] = File(...),
    user: User = Depends(require_permission(Permission.BULK_UPLOAD)),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await job_service.bulk_upload_resumes(db, user, job_id, files, storage)
    except ValueError as e:
        raise _handle_value_error(e)


@router.get("/bulk-uploads/mine", response_model=list[BulkUploadBatchResponse])
async def my_bulk_uploads(
    user: User = Depends(require_permission(Permission.BULK_UPLOAD)),
    db: AsyncSession = Depends(get_db),
):
    return await job_service.list_my_bulk_batches(db, user)


@router.get("/bulk-uploads/{batch_id}", response_model=BulkUploadBatchResponse)
async def get_bulk_upload(
    batch_id: UUID,
    user: User = Depends(require_permission(Permission.BULK_UPLOAD)),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await job_service.get_bulk_batch(db, batch_id, user)
    except ValueError as e:
        raise _handle_value_error(e)


# --- Dashboards ---
@router.get("/dashboard/recruiter", response_model=RecruiterDashboard)
async def recruiter_dashboard(
    user: User = Depends(require_permission(Permission.DASHBOARD_RECRUITER)),
    db: AsyncSession = Depends(get_db),
):
    return await dashboard_service.recruiter_dashboard(db, user)


@router.get("/dashboard/seeker", response_model=SeekerDashboard)
async def seeker_dashboard(
    user: User = Depends(require_permission(Permission.DASHBOARD_SEEKER)),
    db: AsyncSession = Depends(get_db),
):
    return await dashboard_service.seeker_dashboard(db, user)


@router.get("/dashboard/agency", response_model=AgencyDashboard)
async def agency_dashboard(
    user: User = Depends(require_permission(Permission.DASHBOARD_AGENCY)),
    db: AsyncSession = Depends(get_db),
):
    return await dashboard_service.agency_dashboard(db, user)
