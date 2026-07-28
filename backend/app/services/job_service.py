from datetime import datetime, timezone
from pathlib import Path
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token, create_refresh_token, hash_password, verify_password
from app.models import (
    ApplicationSource,
    ApplicationStatus,
    AuthProvider,
    BulkItemStatus,
    BulkUploadBatch,
    BulkUploadItem,
    CandidateProfile,
    EmploymentType,
    Job,
    JobApplication,
    JobSkill,
    JobStatus,
    Organization,
    OrgType,
    Resume,
    Skill,
    User,
    UserRole,
)
from app.schemas import (
    ApplicationResponse,
    BulkUploadBatchResponse,
    BulkUploadItemResponse,
    CandidateProfileResponse,
    CandidateProfileUpdate,
    JobCreate,
    JobListItem,
    JobResponse,
    JobUpdate,
    RegisterRequest,
    ResumeResponse,
    UserResponse,
)
from app.services.storage_service import StorageService
from fastapi import UploadFile


async def _get_or_create_skill(db: AsyncSession, name: str) -> Skill:
    normalized = name.strip().lower()
    result = await db.execute(select(Skill).where(func.lower(Skill.name) == normalized))
    skill = result.scalar_one_or_none()
    if skill:
        return skill
    skill = Skill(name=name.strip())
    db.add(skill)
    await db.flush()
    return skill


async def _job_skills(db: AsyncSession, job_id: UUID) -> list[str]:
    result = await db.execute(
        select(Skill.name)
        .join(JobSkill, JobSkill.skill_id == Skill.id)
        .where(JobSkill.job_id == job_id)
    )
    return [row[0] for row in result.all()]


async def _org_name(db: AsyncSession, org_id: UUID | None) -> str | None:
    if not org_id:
        return None
    result = await db.execute(select(Organization.name).where(Organization.id == org_id))
    return result.scalar_one_or_none()


async def _org_details(db: AsyncSession, org_id: UUID | None) -> tuple[str | None, str | None, float | None, int | None]:
    if not org_id:
        return None, None, None, None
    result = await db.execute(
        select(Organization.name, Organization.logo_url).where(Organization.id == org_id)
    )
    row = result.one_or_none()
    if not row:
        return None, None, None, None
    name, logo = row[0], row[1]
    seed = sum(ord(c) for c in str(org_id))
    rating = round(2.8 + (seed % 22) / 10, 1)
    reviews = 150 + (seed % 4800)
    return name, logo, rating, reviews


def _description_snippet(text: str, limit: int = 140) -> str:
    one_line = " ".join(text.split())
    if len(one_line) <= limit:
        return one_line
    return one_line[: limit - 3].rstrip() + "..."


def user_to_response(user: User, org_name: str | None = None) -> UserResponse:
    return UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        mobile=user.mobile,
        role=user.role.value,
        auth_provider=user.auth_provider.value,
        organization_id=user.organization_id,
        organization_name=org_name,
    )


async def register_user(db: AsyncSession, body: RegisterRequest) -> tuple[User, str, str]:
    role_map = {
        "recruiter": UserRole.recruiter,
        "agency": UserRole.agency,
        "job_seeker": UserRole.job_seeker,
    }
    if body.role not in role_map:
        raise ValueError("Invalid role. Choose recruiter, agency, or job_seeker")

    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise ValueError("Email already registered")

    org_id = None
    role = role_map[body.role]
    if role in (UserRole.recruiter, UserRole.agency):
        if not body.organization_name:
            raise ValueError("Organization name is required for recruiter and agency accounts")
        org = Organization(
            name=body.organization_name,
            type=OrgType.employer if role == UserRole.recruiter else OrgType.agency,
        )
        db.add(org)
        await db.flush()
        org_id = org.id

    user = User(
        email=body.email,
        password_hash=hash_password(body.password),
        full_name=body.full_name,
        mobile=body.mobile,
        role=role,
        auth_provider=AuthProvider.local,
        organization_id=org_id,
    )
    db.add(user)
    await db.flush()

    if role == UserRole.job_seeker:
        db.add(CandidateProfile(user_id=user.id))

    await db.commit()
    await db.refresh(user)
    token_data = {"role": user.role.value, "organization_id": str(org_id) if org_id else None}
    return user, create_access_token(str(user.id), token_data), create_refresh_token(str(user.id))


async def login_user(db: AsyncSession, email: str, password: str) -> tuple[User, str, str]:
    result = await db.execute(select(User).where(User.email == email, User.is_active.is_(True)))
    user = result.scalar_one_or_none()
    if not user or not user.password_hash or not verify_password(password, user.password_hash):
        raise ValueError("Invalid email or password")
    user.last_login_at = datetime.now(timezone.utc)
    await db.commit()
    token_data = {"role": user.role.value, "organization_id": str(user.organization_id) if user.organization_id else None}
    return user, create_access_token(str(user.id), token_data), create_refresh_token(str(user.id))


async def get_user_response(db: AsyncSession, user: User) -> UserResponse:
    org_name = await _org_name(db, user.organization_id)
    return user_to_response(user, org_name)


async def create_job(db: AsyncSession, user: User, body: JobCreate) -> JobResponse:
    if not user.organization_id:
        raise ValueError("Recruiter must belong to an organization")
    try:
        emp_type = EmploymentType(body.employment_type)
    except ValueError:
        raise ValueError("Invalid employment type")
    job = Job(
        organization_id=user.organization_id,
        posted_by=user.id,
        title=body.title,
        description=body.description,
        location=body.location,
        employment_type=emp_type,
        experience_min=body.experience_min,
        experience_max=body.experience_max,
        salary_min=body.salary_min,
        salary_max=body.salary_max,
        salary_visible=body.salary_visible,
        openings=body.openings,
        expiry_date=body.expiry_date,
        status=JobStatus.draft,
    )
    db.add(job)
    await db.flush()
    for skill_name in body.skills:
        if skill_name.strip():
            skill = await _get_or_create_skill(db, skill_name)
            db.add(JobSkill(job_id=job.id, skill_id=skill.id))
    await db.commit()
    return await get_job(db, job.id, user)


async def update_job(db: AsyncSession, user: User, job_id: UUID, body: JobUpdate) -> JobResponse:
    job = await _get_owned_job(db, user, job_id)
    for field in ("title", "description", "location", "experience_min", "experience_max",
                  "salary_min", "salary_max", "salary_visible", "openings", "expiry_date"):
        val = getattr(body, field)
        if val is not None:
            setattr(job, field, val)
    if body.employment_type is not None:
        try:
            job.employment_type = EmploymentType(body.employment_type)
        except ValueError:
            raise ValueError("Invalid employment type")
    if body.skills is not None:
        await db.execute(select(JobSkill).where(JobSkill.job_id == job.id))
        from sqlalchemy import delete
        await db.execute(delete(JobSkill).where(JobSkill.job_id == job.id))
        for skill_name in body.skills:
            if skill_name.strip():
                skill = await _get_or_create_skill(db, skill_name)
                db.add(JobSkill(job_id=job.id, skill_id=skill.id))
    await db.commit()
    return await get_job(db, job.id, user)


async def update_job_status(db: AsyncSession, user: User, job_id: UUID, status: str) -> JobResponse:
    job = await _get_owned_job(db, user, job_id)
    try:
        new_status = JobStatus(status)
    except ValueError:
        raise ValueError("Invalid status")
    job.status = new_status
    if new_status == JobStatus.published and not job.published_at:
        job.published_at = datetime.now(timezone.utc)
    await db.commit()
    return await get_job(db, job.id, user)


async def _get_owned_job(db: AsyncSession, user: User, job_id: UUID) -> Job:
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise ValueError("Job not found")
    if user.role != UserRole.admin and job.organization_id != user.organization_id:
        raise ValueError("Not authorized to manage this job")
    return job


async def get_job(db: AsyncSession, job_id: UUID, user: User | None = None) -> JobResponse:
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise ValueError("Job not found")
    if job.status != JobStatus.published and (not user or (user.role not in (UserRole.admin,) and job.organization_id != user.organization_id)):
        raise ValueError("Job not found")
    skills = await _job_skills(db, job.id)
    org_name = await _org_name(db, job.organization_id)
    count_result = await db.execute(
        select(func.count()).select_from(JobApplication).where(JobApplication.job_id == job.id)
    )
    return JobResponse(
        id=job.id,
        organization_id=job.organization_id,
        organization_name=org_name,
        posted_by=job.posted_by,
        title=job.title,
        description=job.description,
        location=job.location,
        employment_type=job.employment_type.value,
        experience_min=job.experience_min,
        experience_max=job.experience_max,
        salary_min=float(job.salary_min) if job.salary_min else None,
        salary_max=float(job.salary_max) if job.salary_max else None,
        salary_visible=job.salary_visible,
        openings=job.openings,
        status=job.status.value,
        published_at=job.published_at,
        expiry_date=job.expiry_date,
        created_at=job.created_at,
        skills=skills,
        application_count=count_result.scalar() or 0,
    )


async def list_published_jobs(
    db: AsyncSession,
    keyword: str | None = None,
    location: str | None = None,
    employment_type: str | None = None,
) -> list[JobListItem]:
    q = select(Job).where(Job.status == JobStatus.published)
    if keyword:
        q = q.where(Job.title.ilike(f"%{keyword}%") | Job.description.ilike(f"%{keyword}%"))
    if location:
        q = q.where(Job.location.ilike(f"%{location}%"))
    if employment_type:
        q = q.where(Job.employment_type == employment_type)
    q = q.order_by(Job.published_at.desc().nullslast())
    result = await db.execute(q)
    jobs = result.scalars().all()
    items = []
    for job in jobs:
        skills = await _job_skills(db, job.id)
        org_name, logo, rating, reviews = await _org_details(db, job.organization_id)
        items.append(JobListItem(
            id=job.id,
            title=job.title,
            description_snippet=_description_snippet(job.description),
            location=job.location,
            employment_type=job.employment_type.value,
            organization_name=org_name,
            organization_logo_url=logo,
            company_rating=rating,
            company_reviews=reviews,
            experience_min=job.experience_min,
            experience_max=job.experience_max,
            salary_min=float(job.salary_min) if job.salary_min else None,
            salary_max=float(job.salary_max) if job.salary_max else None,
            salary_visible=job.salary_visible,
            openings=job.openings,
            published_at=job.published_at,
            skills=skills,
        ))
    return items


async def list_my_jobs(db: AsyncSession, user: User) -> list[JobResponse]:
    if not user.organization_id:
        return []
    result = await db.execute(
        select(Job).where(Job.organization_id == user.organization_id).order_by(Job.created_at.desc())
    )
    jobs = result.scalars().all()
    out = []
    for job in jobs:
        out.append(await get_job(db, job.id, user))
    return out


async def get_profile(db: AsyncSession, user: User) -> CandidateProfileResponse:
    result = await db.execute(select(CandidateProfile).where(CandidateProfile.user_id == user.id))
    profile = result.scalar_one_or_none()
    if not profile:
        profile = CandidateProfile(user_id=user.id)
        db.add(profile)
        await db.commit()
        await db.refresh(profile)
    resume_name = None
    if profile.default_resume_id:
        r = await db.execute(select(Resume.file_name).where(Resume.id == profile.default_resume_id))
        resume_name = r.scalar_one_or_none()
    return CandidateProfileResponse(
        id=profile.id,
        user_id=profile.user_id,
        headline=profile.headline,
        current_company=profile.current_company,
        total_experience_years=float(profile.total_experience_years) if profile.total_experience_years else None,
        notice_period=profile.notice_period,
        current_ctc=float(profile.current_ctc) if profile.current_ctc else None,
        expected_ctc=float(profile.expected_ctc) if profile.expected_ctc else None,
        linkedin_url=profile.linkedin_url,
        portfolio_url=profile.portfolio_url,
        default_resume_id=profile.default_resume_id,
        default_resume_name=resume_name,
    )


async def update_profile(db: AsyncSession, user: User, body: CandidateProfileUpdate) -> CandidateProfileResponse:
    result = await db.execute(select(CandidateProfile).where(CandidateProfile.user_id == user.id))
    profile = result.scalar_one_or_none()
    if not profile:
        profile = CandidateProfile(user_id=user.id)
        db.add(profile)
        await db.flush()
    for field in body.model_fields:
        val = getattr(body, field)
        if val is not None:
            setattr(profile, field, val)
    await db.commit()
    return await get_profile(db, user)


async def upload_profile_resume(db: AsyncSession, user: User, upload: UploadFile, storage: StorageService) -> ResumeResponse:
    result = await db.execute(select(CandidateProfile).where(CandidateProfile.user_id == user.id))
    profile = result.scalar_one_or_none()
    if not profile:
        profile = CandidateProfile(user_id=user.id)
        db.add(profile)
        await db.flush()
    rel_path, file_name, size, mime = await storage.save_resume_for_profile(user.id, upload)
    resume = Resume(
        file_name=file_name,
        file_path=rel_path,
        file_size=size,
        mime_type=mime,
        uploaded_by_user_id=user.id,
        candidate_profile_id=profile.id,
        candidate_name=user.full_name,
        candidate_email=user.email,
    )
    db.add(resume)
    await db.flush()
    profile.default_resume_id = resume.id
    await db.commit()
    await db.refresh(resume)
    return ResumeResponse(id=resume.id, file_name=resume.file_name, file_size=resume.file_size, uploaded_at=resume.uploaded_at)


async def apply_to_job(
    db: AsyncSession,
    user: User,
    job_id: UUID,
    cover_letter: str | None,
    resume_id: UUID | None,
    upload: UploadFile | None,
    storage: StorageService,
) -> ApplicationResponse:
    job_result = await db.execute(select(Job).where(Job.id == job_id, Job.status == JobStatus.published))
    job = job_result.scalar_one_or_none()
    if not job:
        raise ValueError("Job not available for applications")

    existing = await db.execute(
        select(JobApplication).where(
            JobApplication.job_id == job_id,
            JobApplication.applicant_user_id == user.id,
            JobApplication.application_source == ApplicationSource.direct,
        )
    )
    if existing.scalar_one_or_none():
        raise ValueError("You have already applied to this job")

    profile_result = await db.execute(select(CandidateProfile).where(CandidateProfile.user_id == user.id))
    profile = profile_result.scalar_one_or_none()
    if not profile:
        profile = CandidateProfile(user_id=user.id)
        db.add(profile)
        await db.flush()

    resume: Resume | None = None
    if upload and upload.filename:
        rel_path, file_name, size, mime = await storage.save_resume_for_profile(user.id, upload)
        resume = Resume(
            file_name=file_name,
            file_path=rel_path,
            file_size=size,
            mime_type=mime,
            uploaded_by_user_id=user.id,
            candidate_profile_id=profile.id,
            candidate_name=user.full_name,
            candidate_email=user.email,
        )
        db.add(resume)
        await db.flush()
    elif resume_id:
        r = await db.execute(select(Resume).where(Resume.id == resume_id, Resume.uploaded_by_user_id == user.id))
        resume = r.scalar_one_or_none()
    elif profile.default_resume_id:
        r = await db.execute(select(Resume).where(Resume.id == profile.default_resume_id))
        resume = r.scalar_one_or_none()

    if not resume:
        raise ValueError("Resume required. Upload a resume or set a default resume in your profile.")

    app = JobApplication(
        job_id=job_id,
        resume_id=resume.id,
        application_source=ApplicationSource.direct,
        applicant_user_id=user.id,
        cover_letter=cover_letter,
        status=ApplicationStatus.applied,
    )
    db.add(app)
    await db.commit()
    await db.refresh(app)
    return await _application_to_response(db, app)


async def bulk_upload_resumes(
    db: AsyncSession,
    user: User,
    job_id: UUID,
    files: list[UploadFile],
    storage: StorageService,
) -> BulkUploadBatchResponse:
    if not user.organization_id:
        raise ValueError("Agency user must belong to an organization")

    job_result = await db.execute(select(Job).where(Job.id == job_id, Job.status == JobStatus.published))
    job = job_result.scalar_one_or_none()
    if not job:
        raise ValueError("Job not available")

    if len(files) > 20:
        raise ValueError("Maximum 20 files per bulk upload")

    batch = BulkUploadBatch(
        job_id=job_id,
        uploaded_by=user.id,
        total_files=len(files),
    )
    db.add(batch)
    await db.flush()

    success = 0
    failed = 0
    items: list[BulkUploadItem] = []

    for f in files:
        item = BulkUploadItem(batch_id=batch.id, file_name=f.filename, status=BulkItemStatus.failed)
        try:
            if not f.filename:
                raise ValueError("Empty filename")
            rel_path, file_name, size, mime = await storage.save_resume_for_job(job_id, f)
            resume = Resume(
                file_name=file_name,
                file_path=rel_path,
                file_size=size,
                mime_type=mime,
                uploaded_by_user_id=user.id,
                candidate_name=Path(file_name).stem if file_name else None,
            )
            db.add(resume)
            await db.flush()
            app = JobApplication(
                job_id=job_id,
                resume_id=resume.id,
                application_source=ApplicationSource.agency,
                agency_user_id=user.id,
                agency_organization_id=user.organization_id,
                status=ApplicationStatus.applied,
            )
            db.add(app)
            await db.flush()
            item.status = BulkItemStatus.success
            item.resume_id = resume.id
            item.application_id = app.id
            success += 1
        except Exception as e:
            item.error_message = str(e)
            failed += 1
        items.append(item)
        db.add(item)

    batch.success_count = success
    batch.failed_count = failed
    await db.commit()
    return await get_bulk_batch(db, batch.id, user)


async def get_bulk_batch(db: AsyncSession, batch_id: UUID, user: User) -> BulkUploadBatchResponse:
    result = await db.execute(select(BulkUploadBatch).where(BulkUploadBatch.id == batch_id))
    batch = result.scalar_one_or_none()
    if not batch:
        raise ValueError("Batch not found")
    if user.role != UserRole.admin and batch.uploaded_by != user.id:
        raise ValueError("Not authorized")
    job_result = await db.execute(select(Job.title).where(Job.id == batch.job_id))
    job_title = job_result.scalar_one_or_none()
    items_result = await db.execute(select(BulkUploadItem).where(BulkUploadItem.batch_id == batch.id))
    items = items_result.scalars().all()
    return BulkUploadBatchResponse(
        id=batch.id,
        job_id=batch.job_id,
        job_title=job_title,
        total_files=batch.total_files,
        success_count=batch.success_count,
        failed_count=batch.failed_count,
        created_at=batch.created_at,
        items=[BulkUploadItemResponse(
            id=i.id, file_name=i.file_name, status=i.status.value,
            error_message=i.error_message, application_id=i.application_id,
        ) for i in items],
    )


async def list_my_bulk_batches(db: AsyncSession, user: User) -> list[BulkUploadBatchResponse]:
    result = await db.execute(
        select(BulkUploadBatch).where(BulkUploadBatch.uploaded_by == user.id).order_by(BulkUploadBatch.created_at.desc())
    )
    batches = result.scalars().all()
    return [await get_bulk_batch(db, b.id, user) for b in batches]


async def _application_to_response(db: AsyncSession, app: JobApplication) -> ApplicationResponse:
    job_title = None
    jr = await db.execute(select(Job.title).where(Job.id == app.job_id))
    job_title = jr.scalar_one_or_none()
    resume_name = None
    rr = await db.execute(select(Resume.file_name, Resume.candidate_name, Resume.candidate_email).where(Resume.id == app.resume_id))
    row = rr.one_or_none()
    resume_name = row[0] if row else None
    candidate_name = row[1] if row else None
    candidate_email = row[2] if row else None
    agency_name = None
    if app.agency_organization_id:
        agency_name = await _org_name(db, app.agency_organization_id)
    if app.applicant_user_id and not candidate_name:
        ur = await db.execute(select(User.full_name, User.email).where(User.id == app.applicant_user_id))
        urow = ur.one_or_none()
        if urow:
            candidate_name, candidate_email = urow[0], urow[1]
    return ApplicationResponse(
        id=app.id,
        job_id=app.job_id,
        job_title=job_title,
        resume_id=app.resume_id,
        resume_file_name=resume_name,
        application_source=app.application_source.value,
        applicant_name=candidate_name,
        applicant_email=candidate_email,
        agency_name=agency_name,
        cover_letter=app.cover_letter,
        status=app.status.value,
        created_at=app.created_at,
    )


async def list_job_applications(db: AsyncSession, user: User, job_id: UUID) -> list[ApplicationResponse]:
    job = await _get_owned_job(db, user, job_id)
    result = await db.execute(
        select(JobApplication).where(JobApplication.job_id == job.id).order_by(JobApplication.created_at.desc())
    )
    apps = result.scalars().all()
    return [await _application_to_response(db, a) for a in apps]


async def list_my_applications(db: AsyncSession, user: User) -> list[ApplicationResponse]:
    result = await db.execute(
        select(JobApplication).where(JobApplication.applicant_user_id == user.id).order_by(JobApplication.created_at.desc())
    )
    apps = result.scalars().all()
    return [await _application_to_response(db, a) for a in apps]


async def update_application_status(db: AsyncSession, user: User, app_id: UUID, status: str) -> ApplicationResponse:
    try:
        new_status = ApplicationStatus(status)
    except ValueError:
        raise ValueError("Invalid status")
    result = await db.execute(select(JobApplication).where(JobApplication.id == app_id))
    app = result.scalar_one_or_none()
    if not app:
        raise ValueError("Application not found")
    job = await _get_owned_job(db, user, app.job_id)
    app.status = new_status
    await db.commit()
    return await _application_to_response(db, app)


async def get_resume_for_download(db: AsyncSession, user: User, app_id: UUID) -> tuple[Resume, JobApplication]:
    result = await db.execute(select(JobApplication).where(JobApplication.id == app_id))
    app = result.scalar_one_or_none()
    if not app:
        raise ValueError("Application not found")
    if user.role == UserRole.job_seeker:
        if app.applicant_user_id != user.id:
            raise ValueError("Not authorized")
    else:
        await _get_owned_job(db, user, app.job_id)
    r = await db.execute(select(Resume).where(Resume.id == app.resume_id))
    resume = r.scalar_one_or_none()
    if not resume:
        raise ValueError("Resume not found")
    return resume, app
