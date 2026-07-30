#!/usr/bin/env python3
"""Seed demo data for job portal."""
import argparse
import asyncio
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

try:
    from sqlalchemy import delete, func, select, text
    from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
except ImportError as e:
    print("Missing dependencies. Use the project venv:", file=sys.stderr)
    print("  cd backend && ./scripts/seed.sh --reset", file=sys.stderr)
    print("  # or: PYTHONPATH=. .venv/bin/python scripts/seed_demo.py --reset", file=sys.stderr)
    raise SystemExit(1) from e

from app.core.config import settings
from app.core.database import create_async_engine_from_url
from app.core.security import hash_password
from app.models import (
    ApplicationSource,
    ApplicationStatus,
    AuthProvider,
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

DEMO_JOBS = [
    {
        "title": "Senior Full Stack Developer",
        "description": "Build and maintain our job portal and internal tools using React and FastAPI. 5+ years experience required.",
        "location": "Hyderabad",
        "employment_type": EmploymentType.full_time,
        "experience_min": 5,
        "experience_max": 10,
        "salary_min": 1800000,
        "salary_max": 2800000,
        "salary_visible": True,
        "openings": 2,
        "skills": ["React", "Python", "PostgreSQL", "FastAPI"],
        "education_requirement": "B.Tech",
        "notice_period_max": "60 days",
    },
    {
        "title": "DevOps Engineer",
        "description": "Manage CI/CD pipelines, Kubernetes clusters, and cloud infrastructure on AWS.",
        "location": "Bangalore",
        "employment_type": EmploymentType.full_time,
        "experience_min": 3,
        "experience_max": 8,
        "salary_min": 1500000,
        "salary_max": 2200000,
        "salary_visible": False,
        "openings": 1,
        "skills": ["AWS", "Docker", "Kubernetes", "Terraform"],
        "education_requirement": "Bachelor's Degree",
        "notice_period_max": "30 days",
    },
    {
        "title": "HR Business Partner",
        "description": "Partner with leadership on talent strategy, employee engagement, and workforce planning.",
        "location": "Mumbai",
        "employment_type": EmploymentType.full_time,
        "experience_min": 4,
        "experience_max": 9,
        "salary_min": 1200000,
        "salary_max": 1800000,
        "salary_visible": True,
        "openings": 1,
        "skills": ["HR", "Talent Acquisition", "Employee Relations"],
        "education_requirement": "MBA",
        "notice_period_max": "90 days",
    },
    {
        "title": "Data Analyst Intern",
        "description": "Support analytics team with SQL queries, dashboards, and reporting.",
        "location": "Remote",
        "employment_type": EmploymentType.internship,
        "experience_min": 0,
        "experience_max": 1,
        "salary_min": 25000,
        "salary_max": 40000,
        "salary_visible": True,
        "openings": 3,
        "skills": ["SQL", "Excel", "Python"],
        "education_requirement": "Bachelor's Degree",
        "notice_period_max": "Immediate",
    },
    {
        "title": "Sales Executive",
        "description": "Drive B2B sales for our SaaS recruitment platform across South India.",
        "location": "Chennai",
        "employment_type": EmploymentType.full_time,
        "experience_min": 2,
        "experience_max": 6,
        "salary_min": 600000,
        "salary_max": 1200000,
        "salary_visible": True,
        "openings": 4,
        "skills": ["B2B Sales", "SaaS", "CRM"],
        "education_requirement": "Bachelor's Degree",
        "notice_period_max": "15 days",
    },
]


async def reset_db(session: AsyncSession) -> None:
    from sqlalchemy import text
    await session.execute(text("""
        TRUNCATE bulk_upload_items, bulk_upload_batches, job_applications,
        job_skills, resumes, candidate_profiles, jobs, skills,
        oauth_accounts, users, organizations CASCADE
    """))
    await session.commit()


async def get_or_create_skill(session: AsyncSession, name: str) -> Skill:
    result = await session.execute(select(Skill).where(Skill.name == name))
    skill = result.scalar_one_or_none()
    if skill:
        return skill
    skill = Skill(name=name)
    session.add(skill)
    await session.flush()
    return skill


async def seed(reset: bool = False) -> None:
    engine = create_async_engine_from_url(settings.database_url, echo=False)
    Session = async_sessionmaker(engine, expire_on_commit=False)

    async with Session() as session:
        if reset:
            await reset_db(session)

        existing = await session.execute(select(User).where(User.email == "admin@demo.jobs"))
        if existing.scalar_one_or_none():
            print("Demo data already exists. Use --reset to reload.")
            return

        employer = Organization(name="TechCorp India", type=OrgType.employer, industry="Technology", website="https://techcorp.example.com")
        agency = Organization(name="TalentBridge Staffing", type=OrgType.agency, industry="Recruitment")
        session.add_all([employer, agency])
        await session.flush()

        admin = User(email="admin@demo.jobs", password_hash=hash_password("admin1234"), full_name="Portal Admin", role=UserRole.admin, auth_provider=AuthProvider.local)
        recruiter = User(email="recruiter@demo.jobs", password_hash=hash_password("admin1234"), full_name="Priya Sharma", role=UserRole.recruiter, auth_provider=AuthProvider.local, organization_id=employer.id, mobile="+91-9876543210")
        agency_user = User(email="agency@demo.jobs", password_hash=hash_password("admin1234"), full_name="Raj Kumar", role=UserRole.agency, auth_provider=AuthProvider.local, organization_id=agency.id)
        seekers = []
        for i, (email, name) in enumerate([
            ("seeker@demo.jobs", "Ananya Reddy"),
            ("seeker2@demo.jobs", "Vikram Singh"),
            ("seeker3@demo.jobs", "Meera Patel"),
        ], 1):
            u = User(email=email, password_hash=hash_password("admin1234"), full_name=name, role=UserRole.job_seeker, auth_provider=AuthProvider.local)
            session.add(u)
            await session.flush()
            session.add(CandidateProfile(
                user_id=u.id,
                headline=f"Software Professional #{i}",
                total_experience_years=2 + i,
                education="B.Tech" if i == 1 else "Bachelor's Degree",
                notice_period="30 days" if i == 1 else "60 days",
            ))
            seekers.append(u)

        session.add_all([admin, recruiter, agency_user])
        await session.flush()

        now = datetime.now(timezone.utc)
        jobs = []
        for jd in DEMO_JOBS:
            job = Job(
                organization_id=employer.id,
                posted_by=recruiter.id,
                title=jd["title"],
                description=jd["description"],
                location=jd["location"],
                employment_type=jd["employment_type"],
                experience_min=jd["experience_min"],
                experience_max=jd["experience_max"],
                salary_min=jd["salary_min"],
                salary_max=jd["salary_max"],
                salary_visible=jd["salary_visible"],
                openings=jd["openings"],
                education_requirement=jd.get("education_requirement"),
                notice_period_max=jd.get("notice_period_max"),
                status=JobStatus.published,
                published_at=now,
                expiry_date=date.today() + timedelta(days=60),
            )
            session.add(job)
            await session.flush()
            for sk in jd["skills"]:
                skill = await get_or_create_skill(session, sk)
                session.add(JobSkill(job_id=job.id, skill_id=skill.id))
            jobs.append(job)

        # Placeholder resumes (no actual files for seed)
        for seeker in seekers[:2]:
            profile = (await session.execute(select(CandidateProfile).where(CandidateProfile.user_id == seeker.id))).scalar_one()
            resume = Resume(
                file_name=f"{seeker.full_name.replace(' ', '_')}_resume.pdf",
                file_path=f"seed/{seeker.id}.pdf",
                file_size=102400,
                mime_type="application/pdf",
                uploaded_by_user_id=seeker.id,
                candidate_profile_id=profile.id,
                candidate_name=seeker.full_name,
                candidate_email=seeker.email,
            )
            session.add(resume)
            await session.flush()
            profile.default_resume_id = resume.id
            app = JobApplication(
                job_id=jobs[0].id,
                resume_id=resume.id,
                application_source=ApplicationSource.direct,
                applicant_user_id=seeker.id,
                status=ApplicationStatus.applied,
            )
            session.add(app)

        # Agency-uploaded application
        agency_resume = Resume(
            file_name="candidate_external.pdf",
            file_path=f"seed/agency_{agency_user.id}.pdf",
            file_size=88000,
            mime_type="application/pdf",
            uploaded_by_user_id=agency_user.id,
            candidate_name="External Candidate",
            candidate_email="external@example.com",
        )
        session.add(agency_resume)
        await session.flush()
        session.add(JobApplication(
            job_id=jobs[1].id,
            resume_id=agency_resume.id,
            application_source=ApplicationSource.agency,
            agency_user_id=agency_user.id,
            agency_organization_id=agency.id,
            status=ApplicationStatus.under_review,
        ))

        await session.commit()
        print(f"Seeded: 1 employer, 1 agency, {len(seekers)} seekers, {len(jobs)} jobs, sample applications")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--reset", action="store_true")
    args = parser.parse_args()
    asyncio.run(seed(reset=args.reset))
