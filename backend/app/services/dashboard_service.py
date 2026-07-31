from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    ApplicationSource,
    BulkUploadBatch,
    Job,
    JobApplication,
    JobStatus,
    User,
    UserRole,
)
from app.schemas import AdminDashboard, AgencyDashboard, BulkUploadBatchResponse, RecruiterDashboard, RecentApplicationSummary, SeekerDashboard
from app.services.job_service import get_bulk_batch


async def recruiter_dashboard(db: AsyncSession, user: User) -> RecruiterDashboard:
    if not user.organization_id:
        return RecruiterDashboard(
            total_jobs=0, published_jobs=0, draft_jobs=0, closed_jobs=0,
            total_applications=0, direct_applications=0, agency_applications=0, by_status={},
        )
    org_filter = Job.organization_id == user.organization_id
    total_jobs = (await db.execute(select(func.count()).select_from(Job).where(org_filter))).scalar() or 0
    published_jobs = (await db.execute(
        select(func.count()).select_from(Job).where(org_filter, Job.status == JobStatus.published)
    )).scalar() or 0
    draft_jobs = (await db.execute(
        select(func.count()).select_from(Job).where(org_filter, Job.status == JobStatus.draft)
    )).scalar() or 0
    closed_jobs = (await db.execute(
        select(func.count()).select_from(Job).where(org_filter, Job.status == JobStatus.closed)
    )).scalar() or 0

    job_ids_q = select(Job.id).where(org_filter)
    job_ids = [row[0] for row in (await db.execute(job_ids_q)).all()]
    if not job_ids:
        return RecruiterDashboard(
            total_jobs=total_jobs, published_jobs=published_jobs, draft_jobs=draft_jobs, closed_jobs=closed_jobs,
            total_applications=0, direct_applications=0, agency_applications=0, by_status={},
        )

    total_apps = (await db.execute(
        select(func.count()).select_from(JobApplication).where(JobApplication.job_id.in_(job_ids))
    )).scalar() or 0
    direct = (await db.execute(
        select(func.count()).select_from(JobApplication).where(
            JobApplication.job_id.in_(job_ids),
            JobApplication.application_source == ApplicationSource.direct,
        )
    )).scalar() or 0
    agency = (await db.execute(
        select(func.count()).select_from(JobApplication).where(
            JobApplication.job_id.in_(job_ids),
            JobApplication.application_source == ApplicationSource.agency,
        )
    )).scalar() or 0

    status_rows = (await db.execute(
        select(JobApplication.status, func.count())
        .where(JobApplication.job_id.in_(job_ids))
        .group_by(JobApplication.status)
    )).all()
    by_status = {row[0].value: row[1] for row in status_rows}

    recent_rows = (await db.execute(
        select(JobApplication, Job.title)
        .join(Job, Job.id == JobApplication.job_id)
        .where(JobApplication.job_id.in_(job_ids))
        .order_by(JobApplication.created_at.desc())
        .limit(8)
    )).all()
    from app.models import Resume, User as UserModel
    applicant_ids = [app.applicant_user_id for app, _ in recent_rows if app.applicant_user_id]
    resume_ids = [app.resume_id for app, _ in recent_rows if app.resume_id]
    user_names: dict = {}
    if applicant_ids:
        ur = await db.execute(select(UserModel.id, UserModel.full_name).where(UserModel.id.in_(applicant_ids)))
        user_names = {r[0]: r[1] for r in ur.all()}
    resume_names: dict = {}
    if resume_ids:
        rr = await db.execute(select(Resume.id, Resume.candidate_name).where(Resume.id.in_(resume_ids)))
        resume_names = {r[0]: r[1] for r in rr.all()}
    recent: list[RecentApplicationSummary] = []
    for app, job_title in recent_rows:
        candidate_name = user_names.get(app.applicant_user_id) if app.applicant_user_id else None
        if not candidate_name and app.resume_id:
            candidate_name = resume_names.get(app.resume_id)
        recent.append(RecentApplicationSummary(
            id=app.id,
            job_title=job_title,
            applicant_name=candidate_name,
            status=app.status.value,
            application_source=app.application_source.value,
            created_at=app.created_at,
        ))

    return RecruiterDashboard(
        total_jobs=total_jobs,
        published_jobs=published_jobs,
        draft_jobs=draft_jobs,
        closed_jobs=closed_jobs,
        total_applications=total_apps,
        direct_applications=direct,
        agency_applications=agency,
        by_status=by_status,
        recent_applications=recent,
    )


async def seeker_dashboard(db: AsyncSession, user: User) -> SeekerDashboard:
    count = (await db.execute(
        select(func.count()).select_from(JobApplication).where(JobApplication.applicant_user_id == user.id)
    )).scalar() or 0
    status_rows = (await db.execute(
        select(JobApplication.status, func.count())
        .where(JobApplication.applicant_user_id == user.id)
        .group_by(JobApplication.status)
    )).all()
    from app.services.job_service import list_recommended_jobs
    recommended = await list_recommended_jobs(db, user, limit=50)
    return SeekerDashboard(
        applied_count=count,
        by_status={row[0].value: row[1] for row in status_rows},
        recommended_count=len(recommended),
    )


async def agency_dashboard(db: AsyncSession, user: User) -> AgencyDashboard:
    batches_q = select(BulkUploadBatch).where(BulkUploadBatch.uploaded_by == user.id).order_by(
        BulkUploadBatch.created_at.desc()
    ).limit(5)
    batches = (await db.execute(batches_q)).scalars().all()
    total_batches = (await db.execute(
        select(func.count()).select_from(BulkUploadBatch).where(BulkUploadBatch.uploaded_by == user.id)
    )).scalar() or 0
    total_uploads = (await db.execute(
        select(func.coalesce(func.sum(BulkUploadBatch.success_count), 0))
        .where(BulkUploadBatch.uploaded_by == user.id)
    )).scalar() or 0
    recent = [await get_bulk_batch(db, b.id, user) for b in batches]
    return AgencyDashboard(total_uploads=total_uploads, total_batches=total_batches, recent_batches=recent)


async def admin_dashboard(db: AsyncSession, user: User) -> AdminDashboard:
    if user.role != UserRole.admin:
        raise ValueError("Admin access required")

    total_jobs = (await db.execute(select(func.count()).select_from(Job))).scalar() or 0
    published_jobs = (await db.execute(
        select(func.count()).select_from(Job).where(Job.status == JobStatus.published)
    )).scalar() or 0
    draft_jobs = (await db.execute(
        select(func.count()).select_from(Job).where(Job.status == JobStatus.draft)
    )).scalar() or 0
    closed_jobs = (await db.execute(
        select(func.count()).select_from(Job).where(Job.status == JobStatus.closed)
    )).scalar() or 0

    total_apps = (await db.execute(select(func.count()).select_from(JobApplication))).scalar() or 0
    direct = (await db.execute(
        select(func.count()).select_from(JobApplication).where(
            JobApplication.application_source == ApplicationSource.direct,
        )
    )).scalar() or 0
    agency = (await db.execute(
        select(func.count()).select_from(JobApplication).where(
            JobApplication.application_source == ApplicationSource.agency,
        )
    )).scalar() or 0

    total_recruiters = (await db.execute(
        select(func.count()).select_from(User).where(User.role == UserRole.recruiter)
    )).scalar() or 0
    total_agencies = (await db.execute(
        select(func.count()).select_from(User).where(User.role == UserRole.agency)
    )).scalar() or 0
    total_seekers = (await db.execute(
        select(func.count()).select_from(User).where(User.role == UserRole.job_seeker)
    )).scalar() or 0
    total_batches = (await db.execute(select(func.count()).select_from(BulkUploadBatch))).scalar() or 0

    status_rows = (await db.execute(
        select(JobApplication.status, func.count()).group_by(JobApplication.status)
    )).all()
    by_status = {row[0].value: row[1] for row in status_rows}

    batches_q = select(BulkUploadBatch).order_by(BulkUploadBatch.created_at.desc()).limit(5)
    batches = (await db.execute(batches_q)).scalars().all()
    recent = [await get_bulk_batch(db, b.id, user) for b in batches]

    return AdminDashboard(
        total_jobs=total_jobs,
        published_jobs=published_jobs,
        draft_jobs=draft_jobs,
        closed_jobs=closed_jobs,
        total_applications=total_apps,
        direct_applications=direct,
        agency_applications=agency,
        total_recruiters=total_recruiters,
        total_agencies=total_agencies,
        total_seekers=total_seekers,
        total_agency_batches=total_batches,
        by_status=by_status,
        recent_agency_uploads=recent,
    )
