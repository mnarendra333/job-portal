import { Link } from 'react-router-dom';
import type { JobListItem } from '@/types';
import {
  companyInitials,
  formatExperience,
  formatPostedAgo,
  formatSalary,
} from '@/lib/jobFormat';

interface JobCardProps {
  job: JobListItem;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: (id: string, checked: boolean) => void;
  hidden?: boolean;
  saved?: boolean;
  onHide?: (id: string) => void;
  onSave?: (id: string) => void;
}

function BriefcaseIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 .414-.336.75-.75.75h-4.5a.75.75 0 01-.75-.75v-4.25m0 0h4.125c.621 0 1.125-.504 1.125-1.125V9.372m0 0H5.625M20.25 14.15H5.625m0 0v-4.25m0 4.25V5.625c0-.621.504-1.125 1.125-1.125h3.375c.621 0 1.125.504 1.125 1.125v3.375M5.625 9.872V5.625m0 0h3.375" />
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
    </svg>
  );
}

function DocIcon() {
  return (
    <svg className="w-4 h-4 shrink-0 mt-0.5 text-naukri-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}

export default function JobCard({
  job,
  selectable,
  selected,
  onSelect,
  hidden,
  saved,
  onHide,
  onSave,
}: JobCardProps) {
  if (hidden) return null;

  return (
    <article className="naukri-job-card group relative">
      <div className="flex gap-3">
        {selectable && (
          <label className="pt-1 shrink-0 cursor-pointer">
            <input
              type="checkbox"
              className="naukri-checkbox"
              checked={selected}
              onChange={(e) => onSelect?.(job.id, e.target.checked)}
              onClick={(e) => e.stopPropagation()}
            />
          </label>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex justify-between gap-4">
            <div className="min-w-0">
              <Link to={`/jobs/${job.id}`} className="naukri-job-title hover:text-naukri-blue">
                {job.title}
              </Link>
              {job.match_score != null && job.match_score > 0 && (
                <span className="ml-2 text-xs font-medium text-violet-700 bg-violet-50 px-2 py-0.5 rounded">
                  {job.match_score}% match
                </span>
              )}
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                <span className="naukri-company-name">{job.organization_name}</span>
                {job.company_rating != null && (
                  <>
                    <span className="inline-flex items-center gap-0.5 text-sm text-naukri-text">
                      <span className="text-amber-500">★</span>
                      {job.company_rating.toFixed(1)}
                    </span>
                    {job.company_reviews != null && (
                      <span className="text-sm text-naukri-muted">
                        | {job.company_reviews.toLocaleString('en-IN')} Reviews
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="naukri-logo-box shrink-0">
              {job.organization_logo_url ? (
                <img src={job.organization_logo_url} alt="" className="w-full h-full object-contain p-1" />
              ) : (
                <span className="text-xs font-semibold text-naukri-muted">{companyInitials(job.organization_name)}</span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-4 text-sm text-naukri-text">
            <span className="inline-flex items-center gap-1.5">
              <BriefcaseIcon />
              {formatExperience(job.experience_min, job.experience_max)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="font-medium">₹</span>
              {formatSalary(job.salary_min, job.salary_max, job.salary_visible)}
            </span>
            <span className="inline-flex items-center gap-1.5 min-w-0">
              <LocationIcon />
              <span className="truncate max-w-[200px]">{job.location}</span>
            </span>
          </div>

          {job.description_snippet && (
            <div className="flex gap-2 mt-3 text-sm text-naukri-muted leading-snug">
              <DocIcon />
              <p className="line-clamp-2">{job.description_snippet}</p>
            </div>
          )}

          {job.skills.length > 0 && (
            <p className="mt-3 text-sm text-naukri-skill">
              {job.skills.join(' ')}
            </p>
          )}

          <div className="flex items-center justify-between mt-4 pt-3 border-t border-naukri-border">
            <span className="text-xs text-naukri-muted">{formatPostedAgo(job.published_at)}</span>
            <div className="flex items-center gap-4">
              {onHide && (
                <button type="button" className="naukri-action-btn" onClick={() => onHide(job.id)}>
                  <span aria-hidden>👁</span> Hide
                </button>
              )}
              {onSave && (
                <button
                  type="button"
                  className={`naukri-action-btn ${saved ? 'text-naukri-blue' : ''}`}
                  onClick={() => onSave(job.id)}
                >
                  <span aria-hidden>{saved ? '🔖' : '☆'}</span> Save
                </button>
              )}
              {!onHide && !onSave && (
                <Link to={`/jobs/${job.id}`} className="text-sm font-medium text-naukri-blue hover:underline">
                  View & Apply →
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
