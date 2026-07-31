from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_optional_user, require_permission
from app.core.permissions import Permission
from app.db.session import get_db
from app.models import User
from app.schemas import (
    AccountUpdateRequest,
    AdminDashboard,
    AdminUserResponse,
    AgencyDashboard,
    ApplicationResponse,
    ApplicationStatusUpdate,
    ApplyRequest,
    BulkApplicationStatusUpdate,
    BulkUploadBatchResponse,
    CandidateProfileResponse,
    CandidateProfileUpdate,
    ChangePasswordRequest,
    JobCreate,
    JobFilterMeta,
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
    UserStatusUpdate,
)
from app.services import admin_service, dashboard_service, job_service, oauth_service
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


@router.put("/auth/account", response_model=UserResponse)
async def update_account(
    body: AccountUpdateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await job_service.update_account(db, user, body)
    except ValueError as e:
        raise _handle_value_error(e)


@router.post("/auth/avatar", response_model=UserResponse)
async def upload_avatar(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await job_service.upload_avatar(db, user, file, storage)
    except ValueError as e:
        raise _handle_value_error(e)


@router.post("/auth/change-password", status_code=204)
async def change_password(
    body: ChangePasswordRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        await job_service.change_password(db, user, body.current_password, body.new_password)
    except ValueError as e:
        raise _handle_value_error(e)


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


# --- Jobs (authenticated) ---
@router.get("/jobs/locations/all", response_model=list[str])
async def all_job_locations(
    user: User = Depends(require_permission(Permission.JOBS_READ)),
    db: AsyncSession = Depends(get_db),
):
    return await job_service.list_all_job_locations(db)


@router.get("/jobs/locations", response_model=list[str])
async def job_locations(
    q: str | None = None,
    user: User = Depends(require_permission(Permission.JOBS_READ)),
    db: AsyncSession = Depends(get_db),
):
    return await job_service.list_job_locations(db, q)


@router.get("/jobs/filters", response_model=JobFilterMeta)
async def job_filters(
    user: User = Depends(require_permission(Permission.JOBS_READ)),
    db: AsyncSession = Depends(get_db),
):
    data = await job_service.get_job_filter_meta(db)
    return JobFilterMeta(**data)


@router.get("/jobs", response_model=list[JobListItem])
async def list_jobs(
    keyword: str | None = None,
    location: str | None = None,
    employment_type: str | None = None,
    skill: str | None = None,
    skills: str | None = None,
    min_experience: int | None = None,
    max_experience: int | None = None,
    min_salary: float | None = None,
    max_salary: float | None = None,
    education: str | None = None,
    notice_period: str | None = None,
    user: User = Depends(require_permission(Permission.JOBS_READ)),
    db: AsyncSession = Depends(get_db),
):
    skill_list = [s.strip() for s in skills.split(",") if s.strip()] if skills else None
    return await job_service.list_published_jobs(
        db,
        keyword,
        location,
        employment_type,
        skill,
        skill_list,
        min_experience,
        max_experience,
        min_salary,
        max_salary,
        education,
        notice_period,
        user=user,
    )


@router.get("/jobs/recommended", response_model=list[JobListItem])
async def recommended_jobs(
    user: User = Depends(require_permission(Permission.DASHBOARD_SEEKER)),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await job_service.list_recommended_jobs(db, user)
    except ValueError as e:
        raise _handle_value_error(e)


@router.get("/jobs/mine/list", response_model=list[JobResponse])
async def my_jobs(
    user: User = Depends(require_permission(Permission.JOBS_READ)),
    db: AsyncSession = Depends(get_db),
):
    return await job_service.list_my_jobs(db, user)


@router.get("/jobs/{job_id}", response_model=JobResponse)
async def get_job(
    job_id: UUID,
    user: User = Depends(require_permission(Permission.JOBS_READ)),
    db: AsyncSession = Depends(get_db),
):
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


@router.get("/applications/all", response_model=list[ApplicationResponse])
async def all_applications(
    keyword: str | None = None,
    status: str | None = None,
    source: str | None = None,
    location: str | None = None,
    education: str | None = None,
    notice_period: str | None = None,
    min_experience: float | None = None,
    skill: str | None = None,
    user: User = Depends(require_permission(Permission.DASHBOARD_ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await job_service.list_all_applications(
            db, user, keyword, status, source, location, education, notice_period, min_experience, skill,
        )
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


@router.patch("/applications/bulk-status", response_model=list[ApplicationResponse])
async def bulk_update_app_status(
    body: BulkApplicationStatusUpdate,
    user: User = Depends(require_permission(Permission.APPLICATIONS_MANAGE)),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await job_service.bulk_update_application_status(db, user, body.application_ids, body.status)
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
        if not storage.file_exists(resume.file_path):
            raise HTTPException(status_code=404, detail="Resume file not found on server")
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


@router.get("/bulk-uploads/all", response_model=list[BulkUploadBatchResponse])
async def all_bulk_uploads(
    user: User = Depends(require_permission(Permission.DASHBOARD_ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await job_service.list_all_bulk_batches(db, user)
    except ValueError as e:
        raise _handle_value_error(e)


@router.get("/bulk-uploads/download/all")
async def download_all_agency_resumes(
    user: User = Depends(require_permission(Permission.DASHBOARD_ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    try:
        data, filename = await job_service.download_bulk_resumes_zip(db, user, storage)
        return Response(
            content=data,
            media_type="application/zip",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except ValueError as e:
        raise _handle_value_error(e)


@router.get("/bulk-uploads/download/agency/{org_id}")
async def download_agency_resumes(
    org_id: UUID,
    user: User = Depends(require_permission(Permission.DASHBOARD_ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    try:
        data, filename = await job_service.download_bulk_resumes_zip(
            db, user, storage, agency_organization_id=org_id
        )
        return Response(
            content=data,
            media_type="application/zip",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except ValueError as e:
        raise _handle_value_error(e)


@router.get("/bulk-uploads/download/batch/{batch_id}")
async def download_batch_resumes(
    batch_id: UUID,
    user: User = Depends(require_permission(Permission.DASHBOARD_ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    try:
        data, filename = await job_service.download_bulk_resumes_zip(db, user, storage, batch_id=batch_id)
        return Response(
            content=data,
            media_type="application/zip",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
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
@router.get("/dashboard/admin", response_model=AdminDashboard)
async def admin_dashboard(
    user: User = Depends(require_permission(Permission.DASHBOARD_ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await dashboard_service.admin_dashboard(db, user)
    except ValueError as e:
        raise _handle_value_error(e)


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


# --- Admin user management ---
@router.get("/admin/users", response_model=list[AdminUserResponse])
async def admin_list_users(
    role: str | None = None,
    user: User = Depends(require_permission(Permission.USERS_READ)),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await admin_service.list_users(db, role)
    except ValueError as e:
        raise _handle_value_error(e)


@router.patch("/admin/users/{user_id}", response_model=AdminUserResponse)
async def admin_update_user_status(
    user_id: UUID,
    body: UserStatusUpdate,
    user: User = Depends(require_permission(Permission.USERS_MANAGE)),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await admin_service.set_user_active(db, user, user_id, body.is_active)
    except ValueError as e:
        raise _handle_value_error(e)
