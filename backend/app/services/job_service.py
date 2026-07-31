import io
import re
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import ROLE_PERMISSIONS
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
    AccountUpdateRequest,
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

EDUCATION_LEVELS = [
    "Bachelor's Degree",
    "Master's Degree",
    "MBA",
    "B.Tech",
    "M.Tech",
    "BCA",
    "MCA",
    "PhD",
    "Diploma",
]

NOTICE_PERIODS = ["Immediate", "15 days", "30 days", "60 days", "90 days"]

PREDEFINED_LOCATIONS = [
    "Bangalore",
    "Mumbai",
    "Delhi NCR",
    "Hyderabad",
    "Chennai",
    "Pune",
    "Kolkata",
    "Ahmedabad",
    "Gurgaon",
    "Noida",
    "Remote",
    "Kochi",
    "Jaipur",
    "Chandigarh",
    "Indore",
    "Lucknow",
    "Coimbatore",
    "Visakhapatnam",
    "Bhubaneswar",
    "Nagpur",
]


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


async def _bulk_job_skills(db: AsyncSession, job_ids: list[UUID]) -> dict[UUID, list[str]]:
    if not job_ids:
        return {}
    result = await db.execute(
        select(JobSkill.job_id, Skill.name)
        .join(Skill, Skill.id == JobSkill.skill_id)
        .where(JobSkill.job_id.in_(job_ids))
        .order_by(Skill.name)
    )
    out: dict[UUID, list[str]] = {jid: [] for jid in job_ids}
    for job_id, name in result.all():
        out[job_id].append(name)
    return out


async def _bulk_org_names(db: AsyncSession, org_ids: list[UUID]) -> dict[UUID, str]:
    if not org_ids:
        return {}
    result = await db.execute(select(Organization.id, Organization.name).where(Organization.id.in_(org_ids)))
    return {row[0]: row[1] for row in result.all()}


async def _bulk_application_counts(db: AsyncSession, job_ids: list[UUID]) -> dict[UUID, int]:
    if not job_ids:
        return {}
    result = await db.execute(
        select(JobApplication.job_id, func.count())
        .where(JobApplication.job_id.in_(job_ids))
        .group_by(JobApplication.job_id)
    )
    return {row[0]: row[1] for row in result.all()}


def _visibility_filter(user: User | None):
    """Return SQLAlchemy filter for published job visibility by role."""
    if not user:
        return None
    if user.role == UserRole.agency:
        return Job.visible_to_vendors.is_(True)
    if user.role == UserRole.job_seeker:
        return Job.visible_to_students.is_(True)
    return None


def _job_visible_to_user(job: Job, user: User | None) -> bool:
    if not user or user.role in (UserRole.admin, UserRole.recruiter):
        return True
    if user.role == UserRole.agency:
        return job.visible_to_vendors
    if user.role == UserRole.job_seeker:
        return job.visible_to_students
    return True


def _build_job_response(
    job: Job,
    skills: list[str],
    org_name: str | None,
    application_count: int = 0,
    user_has_applied: bool = False,
    user_application_status: str | None = None,
) -> JobResponse:
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
        salary_currency=getattr(job, "salary_currency", None) or "INR",
        salary_period=getattr(job, "salary_period", None) or "annual",
        openings=job.openings,
        work_mode=getattr(job, "work_mode", None) or "on_site",
        visible_to_vendors=getattr(job, "visible_to_vendors", True),
        visible_to_students=getattr(job, "visible_to_students", True),
        status=job.status.value,
        published_at=job.published_at,
        expiry_date=job.expiry_date,
        created_at=job.created_at,
        skills=skills,
        education_requirement=job.education_requirement,
        notice_period_max=job.notice_period_max,
        application_count=application_count,
        user_has_applied=user_has_applied,
        user_application_status=user_application_status,
    )


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
    perms = sorted(p.value for p in ROLE_PERMISSIONS.get(user.role.value, set()))
    return UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        mobile=user.mobile,
        role=user.role.value,
        auth_provider=user.auth_provider.value,
        organization_id=user.organization_id,
        organization_name=org_name,
        permissions=perms,
        avatar_url=user.avatar_url,
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


async def update_account(db: AsyncSession, user: User, body: AccountUpdateRequest) -> UserResponse:
    if body.full_name is not None:
        user.full_name = body.full_name.strip()
    if body.mobile is not None:
        user.mobile = body.mobile.strip() or None
    await db.commit()
    await db.refresh(user)
    return await get_user_response(db, user)


async def upload_avatar(
    db: AsyncSession, user: User, upload: UploadFile, storage: StorageService,
) -> UserResponse:
    rel_path = await storage.save_avatar(user.id, upload)
    user.avatar_url = rel_path
    await db.commit()
    await db.refresh(user)
    return await get_user_response(db, user)


async def change_password(db: AsyncSession, user: User, current_password: str, new_password: str) -> None:
    if user.auth_provider != AuthProvider.local:
        raise ValueError("Password change is only available for email/password accounts")
    if not user.password_hash or not verify_password(current_password, user.password_hash):
        raise ValueError("Current password is incorrect")
    user.password_hash = hash_password(new_password)
    await db.commit()


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
        salary_currency=body.salary_currency,
        salary_period=body.salary_period,
        openings=body.openings,
        work_mode=body.work_mode,
        visible_to_vendors=body.visible_to_vendors,
        visible_to_students=body.visible_to_students,
        expiry_date=body.expiry_date,
        education_requirement=body.education_requirement,
        notice_period_max=body.notice_period_max,
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
                  "salary_min", "salary_max", "salary_visible", "salary_currency", "salary_period",
                  "openings", "work_mode", "visible_to_vendors", "visible_to_students",
                  "expiry_date", "education_requirement", "notice_period_max"):
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
    if job.status == JobStatus.published and not _job_visible_to_user(job, user):
        raise ValueError("Job not found")
    skills = await _job_skills(db, job.id)
    org_name = await _org_name(db, job.organization_id)
    count_result = await db.execute(
        select(func.count()).select_from(JobApplication).where(JobApplication.job_id == job.id)
    )
    user_has_applied = False
    user_application_status = None
    if user and user.role == UserRole.job_seeker:
        app_result = await db.execute(
            select(JobApplication.status).where(
                JobApplication.job_id == job.id,
                JobApplication.applicant_user_id == user.id,
                JobApplication.application_source == ApplicationSource.direct,
            )
        )
        app_status = app_result.scalar_one_or_none()
        if app_status:
            user_has_applied = True
            user_application_status = app_status.value
    return _build_job_response(
        job, skills, org_name,
        application_count=count_result.scalar() or 0,
        user_has_applied=user_has_applied,
        user_application_status=user_application_status,
    )


async def list_published_jobs(
    db: AsyncSession,
    keyword: str | None = None,
    location: str | None = None,
    employment_type: str | None = None,
    skill: str | None = None,
    skills: list[str] | None = None,
    min_experience: int | None = None,
    max_experience: int | None = None,
    min_salary: float | None = None,
    max_salary: float | None = None,
    education: str | None = None,
    notice_period: str | None = None,
    user: User | None = None,
) -> list[JobListItem]:
    q = select(Job).where(Job.status == JobStatus.published)
    vis = _visibility_filter(user)
    if vis is not None:
        q = q.where(vis)
    if keyword:
        kw = keyword.strip()
        skill_match = (
            select(JobSkill.job_id)
            .join(Skill, Skill.id == JobSkill.skill_id)
            .where(Skill.name.ilike(f"%{kw}%"))
        )
        q = q.where(
            Job.title.ilike(f"%{kw}%")
            | Job.description.ilike(f"%{kw}%")
            | Job.id.in_(skill_match)
        )
    if location:
        q = q.where(Job.location.ilike(f"%{location}%"))
    if employment_type:
        q = q.where(Job.employment_type == employment_type)
    if min_experience is not None:
        q = q.where((Job.experience_max.is_(None)) | (Job.experience_max >= min_experience))
    if max_experience is not None:
        q = q.where((Job.experience_min.is_(None)) | (Job.experience_min <= max_experience))
    if min_salary is not None:
        q = q.where((Job.salary_max.is_(None)) | (Job.salary_max >= min_salary))
    if max_salary is not None:
        q = q.where((Job.salary_min.is_(None)) | (Job.salary_min <= max_salary))
    if education:
        q = q.where(Job.education_requirement.ilike(f"%{education}%"))
    if notice_period:
        q = q.where(Job.notice_period_max.ilike(f"%{notice_period}%"))
    skill_filters = [s.strip() for s in (skills or []) if s.strip()]
    if skill and skill not in skill_filters:
        skill_filters.append(skill.strip())
    if skill_filters:
        q = q.join(JobSkill, JobSkill.job_id == Job.id).join(Skill, Skill.id == JobSkill.skill_id)
        q = q.where(or_(*[Skill.name.ilike(f"%{s}%") for s in skill_filters]))
    q = q.order_by(Job.published_at.desc().nullslast())
    result = await db.execute(q)
    jobs = result.scalars().unique().all()
    if not jobs:
        return []
    job_ids = [j.id for j in jobs]
    org_ids = list({j.organization_id for j in jobs})
    skills_map = await _bulk_job_skills(db, job_ids)
    org_names = await _bulk_org_names(db, org_ids)
    items = []
    for job in jobs:
        org_name = org_names.get(job.organization_id)
        _, logo, rating, reviews = await _org_details(db, job.organization_id)
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
            salary_currency=getattr(job, "salary_currency", None) or "INR",
            salary_period=getattr(job, "salary_period", None) or "annual",
            openings=job.openings,
            work_mode=getattr(job, "work_mode", None) or "on_site",
            published_at=job.published_at,
            skills=skills_map.get(job.id, []),
            education_requirement=job.education_requirement,
            notice_period_max=job.notice_period_max,
        ))
    return items


NOTICE_PERIOD_DAYS = {
    "immediate": 0,
    "15 days": 15,
    "30 days": 30,
    "60 days": 60,
    "90 days": 90,
}


def _notice_days(value: str | None) -> int | None:
    if not value:
        return None
    return NOTICE_PERIOD_DAYS.get(value.strip().lower(), None)


def _compute_match_score(profile: CandidateProfile | None, job: Job, job_skills: list[str]) -> int:
    if not profile:
        return 0
    score = 0
    seeker_exp = float(profile.total_experience_years or 0)
    if job.experience_min is not None and seeker_exp >= job.experience_min:
        if job.experience_max is None or seeker_exp <= job.experience_max:
            score += 25
        elif seeker_exp <= job.experience_max + 2:
            score += 12
    elif job.experience_min is None:
        score += 10

    if profile.education and job.education_requirement:
        pe = profile.education.lower()
        je = job.education_requirement.lower()
        if pe == je or pe in je or je in pe:
            score += 25

    seeker_days = _notice_days(profile.notice_period)
    job_days = _notice_days(job.notice_period_max)
    if seeker_days is not None and job_days is not None and seeker_days <= job_days:
        score += 20
    elif seeker_days is None or job_days is None:
        score += 5

    headline = (profile.headline or "").lower()
    if job_skills and headline:
        hits = sum(1 for s in job_skills if s.lower() in headline)
        score += min(30, int((hits / max(len(job_skills), 1)) * 30))

    return min(score, 100)


async def _job_to_list_item(db: AsyncSession, job: Job, match_score: int | None = None) -> JobListItem:
    skills = await _job_skills(db, job.id)
    org_name, logo, rating, reviews = await _org_details(db, job.organization_id)
    return JobListItem(
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
        education_requirement=job.education_requirement,
        notice_period_max=job.notice_period_max,
        match_score=match_score,
    )


async def list_recommended_jobs(db: AsyncSession, user: User, limit: int = 20) -> list[JobListItem]:
    if user.role != UserRole.job_seeker:
        raise ValueError("Recommended jobs are for job seekers only")
    profile_result = await db.execute(select(CandidateProfile).where(CandidateProfile.user_id == user.id))
    profile = profile_result.scalar_one_or_none()
    applied_result = await db.execute(
        select(JobApplication.job_id).where(JobApplication.applicant_user_id == user.id)
    )
    applied_ids = {row[0] for row in applied_result.all()}
    result = await db.execute(
        select(Job).where(Job.status == JobStatus.published).order_by(Job.published_at.desc().nullslast())
    )
    jobs = result.scalars().all()
    scored: list[tuple[int, Job]] = []
    for job in jobs:
        if job.id in applied_ids:
            continue
        skills = await _job_skills(db, job.id)
        score = _compute_match_score(profile, job, skills)
        if score > 0:
            scored.append((score, job))
    scored.sort(key=lambda x: (-x[0], x[1].published_at or datetime.min.replace(tzinfo=timezone.utc)))
    items = []
    for score, job in scored[:limit]:
        items.append(await _job_to_list_item(db, job, match_score=score))
    return items


async def list_job_locations(db: AsyncSession, q: str | None = None, limit: int = 15) -> list[str]:
    stmt = (
        select(Job.location)
        .where(Job.status == JobStatus.published)
        .distinct()
    )
    if q:
        stmt = stmt.where(Job.location.ilike(f"%{q}%"))
    stmt = stmt.order_by(Job.location).limit(limit)
    result = await db.execute(stmt)
    return [row[0] for row in result.all()]


async def get_job_filter_meta(db: AsyncSession) -> dict:
    loc_result = await db.execute(
        select(Job.location)
        .where(Job.status == JobStatus.published)
        .distinct()
        .order_by(Job.location)
    )
    locations = [r[0] for r in loc_result.all()]

    type_result = await db.execute(
        select(Job.employment_type)
        .where(Job.status == JobStatus.published)
        .distinct()
    )
    employment_types = sorted({r[0].value for r in type_result.all()})

    skill_result = await db.execute(
        select(Skill.name)
        .join(JobSkill, JobSkill.skill_id == Skill.id)
        .join(Job, Job.id == JobSkill.job_id)
        .where(Job.status == JobStatus.published)
        .distinct()
        .order_by(Skill.name)
    )
    skills = [r[0] for r in skill_result.all()]

    salary_result = await db.execute(
        select(func.min(Job.salary_min), func.max(Job.salary_max))
        .where(Job.status == JobStatus.published)
    )
    salary_row = salary_result.one_or_none()
    salary_min = float(salary_row[0]) if salary_row and salary_row[0] is not None else None
    salary_max = float(salary_row[1]) if salary_row and salary_row[1] is not None else None

    return {
        "locations": locations,
        "employment_types": employment_types,
        "skills": skills,
        "education_levels": EDUCATION_LEVELS,
        "notice_periods": NOTICE_PERIODS,
        "salary_min": salary_min,
        "salary_max": salary_max,
    }


async def list_all_job_locations(db: AsyncSession) -> list[str]:
    db_result = await db.execute(
        select(Job.location).where(Job.status == JobStatus.published).distinct().order_by(Job.location)
    )
    db_locs = {r[0] for r in db_result.all() if r[0]}
    combined = list(PREDEFINED_LOCATIONS)
    for loc in sorted(db_locs):
        if loc not in combined:
            combined.append(loc)
    return combined


async def list_my_jobs(db: AsyncSession, user: User) -> list[JobResponse]:
    if user.role == UserRole.admin:
        result = await db.execute(select(Job).order_by(Job.created_at.desc()))
    elif not user.organization_id:
        return []
    else:
        result = await db.execute(
            select(Job).where(Job.organization_id == user.organization_id).order_by(Job.created_at.desc())
        )
    jobs = result.scalars().all()
    if not jobs:
        return []
    job_ids = [j.id for j in jobs]
    org_ids = list({j.organization_id for j in jobs})
    skills_map = await _bulk_job_skills(db, job_ids)
    org_map = await _bulk_org_names(db, org_ids)
    counts_map = await _bulk_application_counts(db, job_ids)
    return [
        _build_job_response(
            job,
            skills_map.get(job.id, []),
            org_map.get(job.organization_id),
            application_count=counts_map.get(job.id, 0),
        )
        for job in jobs
    ]


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
        education=profile.education,
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
    uploader_result = await db.execute(
        select(User.full_name, User.organization_id, Organization.name)
        .select_from(User)
        .outerjoin(Organization, Organization.id == User.organization_id)
        .where(User.id == batch.uploaded_by)
    )
    uploader_row = uploader_result.one_or_none()
    items_result = await db.execute(select(BulkUploadItem).where(BulkUploadItem.batch_id == batch.id))
    items = items_result.scalars().all()
    return BulkUploadBatchResponse(
        id=batch.id,
        job_id=batch.job_id,
        job_title=job_title,
        uploaded_by=batch.uploaded_by,
        uploaded_by_name=uploader_row[0] if uploader_row else None,
        agency_name=uploader_row[2] if uploader_row else None,
        agency_organization_id=uploader_row[1] if uploader_row else None,
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


async def _applications_to_responses(db: AsyncSession, apps: list[JobApplication]) -> list[ApplicationResponse]:
    if not apps:
        return []
    job_ids = list({a.job_id for a in apps})
    resume_ids = list({a.resume_id for a in apps if a.resume_id})
    agency_org_ids = list({a.agency_organization_id for a in apps if a.agency_organization_id})
    applicant_ids = list({a.applicant_user_id for a in apps if a.applicant_user_id})

    job_rows = (await db.execute(
        select(Job.id, Job.title, Job.location, Job.organization_id).where(Job.id.in_(job_ids))
    )).all()
    job_map = {r[0]: (r[1], r[2], r[3]) for r in job_rows}

    org_ids = list({r[3] for r in job_rows if r[3]} | set(agency_org_ids))
    org_map = await _bulk_org_names(db, org_ids)

    resume_map: dict[UUID, tuple] = {}
    if resume_ids:
        rr = await db.execute(
            select(Resume.id, Resume.file_name, Resume.candidate_name, Resume.candidate_email)
            .where(Resume.id.in_(resume_ids))
        )
        resume_map = {r[0]: (r[1], r[2], r[3]) for r in rr.all()}

    user_map: dict[UUID, tuple] = {}
    if applicant_ids:
        ur = await db.execute(
            select(User.id, User.full_name, User.email).where(User.id.in_(applicant_ids))
        )
        user_map = {r[0]: (r[1], r[2]) for r in ur.all()}

    profile_map: dict[UUID, tuple] = {}
    if applicant_ids:
        pr = await db.execute(
            select(
                CandidateProfile.user_id,
                CandidateProfile.notice_period,
                CandidateProfile.education,
                CandidateProfile.total_experience_years,
            ).where(CandidateProfile.user_id.in_(applicant_ids))
        )
        profile_map = {r[0]: (r[1], r[2], r[3]) for r in pr.all()}

    out: list[ApplicationResponse] = []
    for app in apps:
        job_title = job_location = org_name = None
        job_row = job_map.get(app.job_id)
        if job_row:
            job_title, job_location, org_id = job_row
            org_name = org_map.get(org_id) if org_id else None
        resume_row = resume_map.get(app.resume_id)
        resume_name = resume_row[0] if resume_row else None
        candidate_name = resume_row[1] if resume_row else None
        candidate_email = resume_row[2] if resume_row else None
        agency_name = org_map.get(app.agency_organization_id) if app.agency_organization_id else None
        if app.applicant_user_id and not candidate_name:
            urow = user_map.get(app.applicant_user_id)
            if urow:
                candidate_name, candidate_email = urow
        applicant_notice_period = applicant_education = None
        applicant_experience_years = None
        if app.applicant_user_id:
            prow = profile_map.get(app.applicant_user_id)
            if prow:
                applicant_notice_period, applicant_education = prow[0], prow[1]
                applicant_experience_years = float(prow[2]) if prow[2] is not None else None
        out.append(ApplicationResponse(
            id=app.id,
            job_id=app.job_id,
            job_title=job_title,
            job_location=job_location,
            organization_name=org_name,
            resume_id=app.resume_id,
            resume_file_name=resume_name,
            application_source=app.application_source.value,
            applicant_name=candidate_name,
            applicant_email=candidate_email,
            applicant_notice_period=applicant_notice_period,
            applicant_education=applicant_education,
            applicant_experience_years=applicant_experience_years,
            agency_name=agency_name,
            cover_letter=app.cover_letter,
            status=app.status.value,
            created_at=app.created_at,
        ))
    return out


async def _application_to_response(db: AsyncSession, app: JobApplication) -> ApplicationResponse:
    job_title = None
    job_location = None
    org_name = None
    jr = await db.execute(
        select(Job.title, Job.location, Job.organization_id).where(Job.id == app.job_id)
    )
    job_row = jr.one_or_none()
    if job_row:
        job_title, job_location, org_id = job_row[0], job_row[1], job_row[2]
        org_name = await _org_name(db, org_id)
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
    applicant_notice_period = None
    applicant_education = None
    applicant_experience_years = None
    if app.applicant_user_id:
        pr = await db.execute(
            select(
                CandidateProfile.notice_period,
                CandidateProfile.education,
                CandidateProfile.total_experience_years,
            ).where(CandidateProfile.user_id == app.applicant_user_id)
        )
        prow = pr.one_or_none()
        if prow:
            applicant_notice_period, applicant_education = prow[0], prow[1]
            applicant_experience_years = float(prow[2]) if prow[2] is not None else None
    return ApplicationResponse(
        id=app.id,
        job_id=app.job_id,
        job_title=job_title,
        job_location=job_location,
        organization_name=org_name,
        resume_id=app.resume_id,
        resume_file_name=resume_name,
        application_source=app.application_source.value,
        applicant_name=candidate_name,
        applicant_email=candidate_email,
        applicant_notice_period=applicant_notice_period,
        applicant_education=applicant_education,
        applicant_experience_years=applicant_experience_years,
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
    return await _applications_to_responses(db, apps)


async def list_my_applications(db: AsyncSession, user: User) -> list[ApplicationResponse]:
    result = await db.execute(
        select(JobApplication).where(JobApplication.applicant_user_id == user.id).order_by(JobApplication.created_at.desc())
    )
    apps = result.scalars().all()
    return await _applications_to_responses(db, apps)


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


async def list_all_applications(
    db: AsyncSession,
    user: User,
    keyword: str | None = None,
    status: str | None = None,
    source: str | None = None,
    location: str | None = None,
    education: str | None = None,
    notice_period: str | None = None,
    min_experience: float | None = None,
    skill: str | None = None,
) -> list[ApplicationResponse]:
    if user.role != UserRole.admin:
        raise ValueError("Admin access required")

    q = select(JobApplication).join(Job, Job.id == JobApplication.job_id)
    if status:
        try:
            q = q.where(JobApplication.status == ApplicationStatus(status))
        except ValueError:
            raise ValueError("Invalid status filter")
    if source:
        try:
            q = q.where(JobApplication.application_source == ApplicationSource(source))
        except ValueError:
            raise ValueError("Invalid source filter")
    if location:
        q = q.where(Job.location.ilike(f"%{location}%"))
    if skill:
        q = q.join(JobSkill, JobSkill.job_id == Job.id).join(Skill, Skill.id == JobSkill.skill_id)
        q = q.where(Skill.name.ilike(f"%{skill}%"))

    q = q.order_by(JobApplication.created_at.desc())
    result = await db.execute(q)
    apps = result.scalars().unique().all()
    if not apps:
        return []

    responses = await _applications_to_responses(db, apps)
    out: list[ApplicationResponse] = []
    for resp in responses:
        if education and (resp.applicant_education or "").lower() != education.lower():
            continue
        if notice_period and (resp.applicant_notice_period or "") != notice_period:
            continue
        if min_experience is not None:
            exp = resp.applicant_experience_years
            if exp is None or exp < min_experience:
                continue
        if keyword:
            kw_lower = keyword.lower()
            hay = " ".join([
                resp.applicant_name or "",
                resp.applicant_email or "",
                resp.job_title or "",
                resp.resume_file_name or "",
                resp.organization_name or "",
                resp.agency_name or "",
            ]).lower()
            if kw_lower not in hay:
                continue
        out.append(resp)
    return out


async def bulk_update_application_status(
    db: AsyncSession, user: User, application_ids: list[UUID], status: str,
) -> list[ApplicationResponse]:
    if user.role not in (UserRole.admin, UserRole.recruiter):
        raise ValueError("Not authorized")
    try:
        new_status = ApplicationStatus(status)
    except ValueError:
        raise ValueError("Invalid status")
    updated = []
    for app_id in application_ids:
        result = await db.execute(select(JobApplication).where(JobApplication.id == app_id))
        app = result.scalar_one_or_none()
        if not app:
            continue
        await _get_owned_job(db, user, app.job_id)
        app.status = new_status
        updated.append(app)
    await db.commit()
    return [await _application_to_response(db, a) for a in updated]


async def list_all_bulk_batches(db: AsyncSession, user: User) -> list[BulkUploadBatchResponse]:
    if user.role != UserRole.admin:
        raise ValueError("Admin access required")
    result = await db.execute(select(BulkUploadBatch).order_by(BulkUploadBatch.created_at.desc()))
    batches = result.scalars().all()
    return [await get_bulk_batch(db, b.id, user) for b in batches]


def _safe_zip_segment(name: str, fallback: str = "file") -> str:
    cleaned = re.sub(r"[^\w.\- ]", "_", (name or fallback).strip())
    return (cleaned[:120] or fallback).replace(" ", "_")


async def download_bulk_resumes_zip(
    db: AsyncSession,
    user: User,
    storage: StorageService,
    *,
    batch_id: UUID | None = None,
    agency_organization_id: UUID | None = None,
) -> tuple[bytes, str]:
    if user.role != UserRole.admin:
        raise ValueError("Admin access required")

    q = (
        select(BulkUploadItem, Resume, BulkUploadBatch, Job.title, Organization.name)
        .join(BulkUploadBatch, BulkUploadBatch.id == BulkUploadItem.batch_id)
        .join(Resume, Resume.id == BulkUploadItem.resume_id)
        .join(Job, Job.id == BulkUploadBatch.job_id)
        .join(User, User.id == BulkUploadBatch.uploaded_by)
        .outerjoin(Organization, Organization.id == User.organization_id)
        .where(BulkUploadItem.status == BulkItemStatus.success)
        .where(BulkUploadItem.resume_id.isnot(None))
    )
    if batch_id:
        q = q.where(BulkUploadBatch.id == batch_id)
    if agency_organization_id:
        q = q.where(User.organization_id == agency_organization_id)

    rows = (await db.execute(q)).all()
    if not rows:
        raise ValueError("No resumes found to download")

    buf = io.BytesIO()
    seen: set[str] = set()
    added = 0
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for item, resume, _batch, job_title, org_name in rows:
            if not storage.file_exists(resume.file_path):
                continue
            path = storage.resolve_path(resume.file_path)
            agency_seg = _safe_zip_segment(org_name or "agency")
            job_seg = _safe_zip_segment(job_title or "job")
            file_seg = _safe_zip_segment(resume.file_name or item.file_name or "resume.pdf")
            arcname = f"{agency_seg}/{job_seg}/{file_seg}"
            n = 1
            while arcname in seen:
                stem, _, ext = file_seg.rpartition(".")
                suffix = f"_{n}.{ext}" if ext else f"_{n}"
                arcname = f"{agency_seg}/{job_seg}/{stem}{suffix}" if ext else f"{agency_seg}/{job_seg}/{file_seg}_{n}"
                n += 1
            seen.add(arcname)
            zf.write(path, arcname)
            added += 1

    if added == 0:
        raise ValueError("No resume files available on server")

    if batch_id:
        filename = f"{_safe_zip_segment(rows[0][3] or 'batch')}_resumes.zip"
    elif agency_organization_id:
        filename = f"{_safe_zip_segment(rows[0][4] or 'agency')}_resumes.zip"
    else:
        filename = "all_agency_resumes.zip"

    return buf.getvalue(), filename
