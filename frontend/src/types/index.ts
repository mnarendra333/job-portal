export type UserRole = 'admin' | 'recruiter' | 'agency' | 'job_seeker';

export interface User {
  id: string;
  email: string;
  full_name: string;
  mobile?: string;
  role: UserRole;
  auth_provider: string;
  organization_id?: string;
  organization_name?: string;
  permissions?: string[];
  avatar_url?: string | null;
}

export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  organization_name?: string;
  is_active: boolean;
  created_at: string;
  last_login_at?: string;
}

export interface JobListItem {
  id: string;
  title: string;
  description_snippet?: string;
  location: string;
  employment_type: string;
  organization_name?: string;
  organization_logo_url?: string;
  company_rating?: number;
  company_reviews?: number;
  experience_min?: number;
  experience_max?: number;
  salary_min?: number;
  salary_max?: number;
  salary_visible: boolean;
  salary_currency?: string;
  salary_period?: string;
  work_mode?: string;
  openings?: number;
  published_at?: string;
  skills: string[];
  education_requirement?: string;
  notice_period_max?: string;
  match_score?: number;
}

export interface JobFilterMeta {
  locations: string[];
  employment_types: string[];
  skills: string[];
  education_levels: string[];
  notice_periods: string[];
  salary_min?: number;
  salary_max?: number;
}

export interface Job extends JobListItem {
  organization_id: string;
  posted_by: string;
  description: string;
  openings: number;
  status: string;
  expiry_date?: string;
  created_at: string;
  application_count: number;
  education_requirement?: string;
  notice_period_max?: string;
  work_mode?: string;
  salary_currency?: string;
  salary_period?: string;
  visible_to_vendors?: boolean;
  visible_to_students?: boolean;
  user_has_applied?: boolean;
  user_application_status?: string;
}

export interface Application {
  id: string;
  job_id: string;
  job_title?: string;
  resume_id: string;
  resume_file_name?: string;
  application_source: 'direct' | 'agency';
  applicant_name?: string;
  applicant_email?: string;
  applicant_notice_period?: string;
  applicant_education?: string;
  applicant_experience_years?: number;
  job_location?: string;
  organization_name?: string;
  agency_name?: string;
  cover_letter?: string;
  status: string;
  created_at: string;
}

export interface CandidateProfile {
  id: string;
  user_id: string;
  headline?: string;
  current_company?: string;
  total_experience_years?: number;
  notice_period?: string;
  education?: string;
  current_ctc?: number;
  expected_ctc?: number;
  linkedin_url?: string;
  portfolio_url?: string;
  default_resume_id?: string;
  default_resume_name?: string;
}

export interface RecruiterDashboard {
  total_jobs: number;
  published_jobs: number;
  draft_jobs?: number;
  closed_jobs?: number;
  total_applications: number;
  direct_applications: number;
  agency_applications: number;
  by_status: Record<string, number>;
  recent_applications?: {
    id: string;
    job_title?: string;
    applicant_name?: string;
    status: string;
    application_source: string;
    created_at: string;
  }[];
}

export interface SeekerDashboard {
  applied_count: number;
  by_status: Record<string, number>;
  recommended_count?: number;
}

export interface BulkUploadBatch {
  id: string;
  job_id: string;
  job_title?: string;
  uploaded_by?: string;
  uploaded_by_name?: string;
  agency_name?: string;
  agency_organization_id?: string;
  total_files: number;
  success_count: number;
  failed_count: number;
  created_at: string;
  items: { id: string; file_name?: string; status: string; error_message?: string; application_id?: string }[];
}

export interface AgencyDashboard {
  total_uploads: number;
  total_batches: number;
  recent_batches: BulkUploadBatch[];
}

export interface AdminDashboard {
  total_jobs: number;
  published_jobs: number;
  draft_jobs: number;
  closed_jobs: number;
  total_applications: number;
  direct_applications: number;
  agency_applications: number;
  total_recruiters: number;
  total_agencies: number;
  total_seekers: number;
  total_agency_batches: number;
  by_status: Record<string, number>;
  recent_agency_uploads: BulkUploadBatch[];
}
