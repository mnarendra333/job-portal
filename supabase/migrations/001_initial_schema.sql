-- Job Portal Phase 1 schema

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE user_role AS ENUM ('admin', 'recruiter', 'agency', 'job_seeker');
CREATE TYPE auth_provider AS ENUM ('local', 'google', 'linkedin');
CREATE TYPE org_type AS ENUM ('employer', 'agency');
CREATE TYPE employment_type AS ENUM ('full_time', 'part_time', 'contract', 'internship');
CREATE TYPE job_status AS ENUM ('draft', 'published', 'closed');
CREATE TYPE application_source AS ENUM ('direct', 'agency');
CREATE TYPE application_status AS ENUM ('applied', 'under_review', 'shortlisted', 'rejected', 'selected');
CREATE TYPE bulk_item_status AS ENUM ('success', 'failed');

CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type org_type NOT NULL,
  website VARCHAR(500),
  logo_url VARCHAR(1000),
  description TEXT,
  industry VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255),
  full_name VARCHAR(255) NOT NULL,
  mobile VARCHAR(50),
  role user_role NOT NULL,
  auth_provider auth_provider NOT NULL DEFAULT 'local',
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ
);

CREATE TABLE oauth_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider auth_provider NOT NULL,
  provider_user_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_user_id)
);

CREATE TABLE skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  posted_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  description TEXT NOT NULL,
  location VARCHAR(255) NOT NULL,
  employment_type employment_type NOT NULL DEFAULT 'full_time',
  experience_min INTEGER,
  experience_max INTEGER,
  salary_min NUMERIC(12, 2),
  salary_max NUMERIC(12, 2),
  salary_visible BOOLEAN NOT NULL DEFAULT false,
  openings INTEGER NOT NULL DEFAULT 1,
  status job_status NOT NULL DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  expiry_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE job_skills (
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  PRIMARY KEY (job_id, skill_id)
);

CREATE TABLE candidate_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  headline VARCHAR(500),
  current_company VARCHAR(255),
  total_experience_years NUMERIC(4, 1),
  notice_period VARCHAR(100),
  current_ctc NUMERIC(12, 2),
  expected_ctc NUMERIC(12, 2),
  linkedin_url VARCHAR(500),
  portfolio_url VARCHAR(500),
  default_resume_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE resumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name VARCHAR(500) NOT NULL,
  file_path VARCHAR(1000) NOT NULL,
  file_size BIGINT NOT NULL DEFAULT 0,
  mime_type VARCHAR(100),
  uploaded_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  candidate_profile_id UUID REFERENCES candidate_profiles(id) ON DELETE SET NULL,
  candidate_name VARCHAR(255),
  candidate_email VARCHAR(255),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE candidate_profiles
  ADD CONSTRAINT fk_default_resume
  FOREIGN KEY (default_resume_id) REFERENCES resumes(id) ON DELETE SET NULL;

CREATE TABLE job_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  resume_id UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
  application_source application_source NOT NULL,
  applicant_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  agency_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  agency_organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  cover_letter TEXT,
  status application_status NOT NULL DEFAULT 'applied',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_direct_application
  ON job_applications (job_id, applicant_user_id)
  WHERE application_source = 'direct' AND applicant_user_id IS NOT NULL;

CREATE TABLE bulk_upload_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total_files INTEGER NOT NULL DEFAULT 0,
  success_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE bulk_upload_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES bulk_upload_batches(id) ON DELETE CASCADE,
  resume_id UUID REFERENCES resumes(id) ON DELETE SET NULL,
  application_id UUID REFERENCES job_applications(id) ON DELETE SET NULL,
  status bulk_item_status NOT NULL,
  error_message TEXT,
  file_name VARCHAR(500)
);

CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_org ON jobs(organization_id);
CREATE INDEX idx_applications_job ON job_applications(job_id);
CREATE INDEX idx_applications_status ON job_applications(status);
