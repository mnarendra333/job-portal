from uuid import UUID

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
from app.schemas import AgencyDashboard, BulkUploadBatchResponse, RecruiterDashboard, SeekerDashboard
from app.services.job_service import get_bulk_batch


async def recruiter_dashboard(db: AsyncSession, user: User) -> RecruiterDashboard:
    if not user.organization_id:
        return RecruiterDashboard(
            total_jobs=0, published_jobs=0, total_applications=0,
            direct_applications=0, agency_applications=0, by_status={},
        )
    jobs_q = select(func.count()).select_from(Job).where(Job.organization_id == user.organization_id)
    total_jobs = (await db.execute(jobs_q)).scalar() or 0
    pub_q = select(func.count()).select_from(Job).where(
        Job.organization_id == user.organization_id, Job.status == JobStatus.published
    )
    published_jobs = (await db.execute(pub_q)).scalar() or 0

    job_ids_q = select(Job.id).where(Job.organization_id == user.organization_id)
    job_ids = [row[0] for row in (await db.execute(job_ids_q)).all()]
    if not job_ids:
        return RecruiterDashboard(
            total_jobs=total_jobs, published_jobs=published_jobs,
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

    return RecruiterDashboard(
        total_jobs=total_jobs,
        published_jobs=published_jobs,
        total_applications=total_apps,
        direct_applications=direct,
        agency_applications=agency,
        by_status=by_status,
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
    return SeekerDashboard(applied_count=count, by_status={row[0].value: row[1] for row in status_rows})


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
