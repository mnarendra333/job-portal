from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str
    mobile: str | None = None
    role: str  # recruiter | agency | job_seeker
    organization_name: str | None = None  # required for recruiter/agency


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AccountUpdateRequest(BaseModel):
    full_name: str | None = None
    mobile: str | None = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8)


class OAuthRequest(BaseModel):
    code: str
    redirect_uri: str
    role: str | None = None  # required on first signup via OAuth
    organization_name: str | None = None


class UserResponse(BaseModel):
    id: UUID
    email: str
    full_name: str
    mobile: str | None
    role: str
    auth_provider: str
    organization_id: UUID | None
    organization_name: str | None = None
    permissions: list[str] = []

    class Config:
        from_attributes = True


class OrganizationResponse(BaseModel):
    id: UUID
    name: str
    type: str
    website: str | None
    industry: str | None

    class Config:
        from_attributes = True


class JobCreate(BaseModel):
    title: str
    description: str
    location: str
    employment_type: str = "full_time"
    experience_min: int | None = None
    experience_max: int | None = None
    salary_min: float | None = None
    salary_max: float | None = None
    salary_visible: bool = False
    openings: int = 1
    expiry_date: date | None = None
    education_requirement: str | None = None
    notice_period_max: str | None = None
    skills: list[str] = []


class JobUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    location: str | None = None
    employment_type: str | None = None
    experience_min: int | None = None
    experience_max: int | None = None
    salary_min: float | None = None
    salary_max: float | None = None
    salary_visible: bool | None = None
    openings: int | None = None
    expiry_date: date | None = None
    education_requirement: str | None = None
    notice_period_max: str | None = None
    skills: list[str] | None = None


class JobStatusUpdate(BaseModel):
    status: str


class JobResponse(BaseModel):
    id: UUID
    organization_id: UUID
    organization_name: str | None = None
    posted_by: UUID
    title: str
    description: str
    location: str
    employment_type: str
    experience_min: int | None
    experience_max: int | None
    salary_min: float | None
    salary_max: float | None
    salary_visible: bool
    openings: int
    status: str
    published_at: datetime | None
    expiry_date: date | None
    created_at: datetime
    skills: list[str] = []
    education_requirement: str | None = None
    notice_period_max: str | None = None
    application_count: int = 0
    user_has_applied: bool = False
    user_application_status: str | None = None

    class Config:
        from_attributes = True


class JobListItem(BaseModel):
    id: UUID
    title: str
    description_snippet: str | None = None
    location: str
    employment_type: str
    organization_name: str | None
    organization_logo_url: str | None = None
    company_rating: float | None = None
    company_reviews: int | None = None
    experience_min: int | None
    experience_max: int | None
    salary_min: float | None
    salary_max: float | None
    salary_visible: bool
    openings: int = 1
    published_at: datetime | None
    skills: list[str] = []
    education_requirement: str | None = None
    notice_period_max: str | None = None
    match_score: int | None = None


class JobFilterMeta(BaseModel):
    locations: list[str] = []
    employment_types: list[str] = []
    skills: list[str] = []
    education_levels: list[str] = []
    notice_periods: list[str] = []
    salary_min: float | None = None
    salary_max: float | None = None


class CandidateProfileUpdate(BaseModel):
    headline: str | None = None
    current_company: str | None = None
    total_experience_years: float | None = None
    notice_period: str | None = None
    education: str | None = None
    current_ctc: float | None = None
    expected_ctc: float | None = None
    linkedin_url: str | None = None
    portfolio_url: str | None = None


class CandidateProfileResponse(BaseModel):
    id: UUID
    user_id: UUID
    headline: str | None
    current_company: str | None
    total_experience_years: float | None
    notice_period: str | None
    education: str | None = None
    current_ctc: float | None
    expected_ctc: float | None
    linkedin_url: str | None
    portfolio_url: str | None
    default_resume_id: UUID | None
    default_resume_name: str | None = None

    class Config:
        from_attributes = True


class ResumeResponse(BaseModel):
    id: UUID
    file_name: str
    file_size: int
    uploaded_at: datetime

    class Config:
        from_attributes = True


class ApplyRequest(BaseModel):
    cover_letter: str | None = None
    resume_id: UUID | None = None  # use existing resume if set


class ApplicationResponse(BaseModel):
    id: UUID
    job_id: UUID
    job_title: str | None = None
    job_location: str | None = None
    organization_name: str | None = None
    resume_id: UUID
    resume_file_name: str | None = None
    application_source: str
    applicant_name: str | None = None
    applicant_email: str | None = None
    applicant_notice_period: str | None = None
    applicant_education: str | None = None
    applicant_experience_years: float | None = None
    agency_name: str | None = None
    cover_letter: str | None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class ApplicationStatusUpdate(BaseModel):
    status: str


class BulkApplicationStatusUpdate(BaseModel):
    application_ids: list[UUID]
    status: str


class BulkUploadItemResponse(BaseModel):
    id: UUID
    file_name: str | None
    status: str
    error_message: str | None
    application_id: UUID | None


class BulkUploadBatchResponse(BaseModel):
    id: UUID
    job_id: UUID
    job_title: str | None = None
    total_files: int
    success_count: int
    failed_count: int
    created_at: datetime
    items: list[BulkUploadItemResponse] = []


class RecruiterDashboard(BaseModel):
    total_jobs: int
    published_jobs: int
    total_applications: int
    direct_applications: int
    agency_applications: int
    by_status: dict[str, int]


class SeekerDashboard(BaseModel):
    applied_count: int
    by_status: dict[str, int]
    recommended_count: int = 0


class AdminUserResponse(BaseModel):
    id: UUID
    email: str
    full_name: str
    role: str
    organization_name: str | None = None
    is_active: bool
    created_at: datetime
    last_login_at: datetime | None = None


class UserStatusUpdate(BaseModel):
    is_active: bool


class AgencyDashboard(BaseModel):
    total_uploads: int
    total_batches: int
    recent_batches: list[BulkUploadBatchResponse]


class AdminDashboard(BaseModel):
    total_jobs: int
    published_jobs: int
    draft_jobs: int
    closed_jobs: int
    total_applications: int
    direct_applications: int
    agency_applications: int
    total_recruiters: int
    total_agencies: int
    total_seekers: int
    total_agency_batches: int
    by_status: dict[str, int]
    recent_agency_uploads: list[BulkUploadBatchResponse] = []
