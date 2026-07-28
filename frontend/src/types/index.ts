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
  openings?: number;
  published_at?: string;
  skills: string[];
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
  total_applications: number;
  direct_applications: number;
  agency_applications: number;
  by_status: Record<string, number>;
}

export interface SeekerDashboard {
  applied_count: number;
  by_status: Record<string, number>;
}

export interface BulkUploadBatch {
  id: string;
  job_id: string;
  job_title?: string;
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
