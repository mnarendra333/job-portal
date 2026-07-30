import { formatEmploymentType } from '@/lib/jobFormat';
import LocationAutocomplete from '@/components/jobs/LocationAutocomplete';
import type { JobFilterMeta } from '@/types';

export interface JobFilters {
  keyword: string;
  location: string;
  employmentType: string;
  skills: string[];
  minExperience: number | null;
  maxExperience: number | null;
  minSalary: number | null;
  maxSalary: number | null;
  education: string;
  noticePeriod: string;
}

interface JobFiltersSidebarProps {
  filters: JobFilters;
  meta: JobFilterMeta;
  onChange: (next: JobFilters) => void;
  onApply: () => void;
  onClear: () => void;
}

const EXPERIENCE_BUCKETS = [
  { label: 'Any experience', min: null, max: null },
  { label: 'Fresher (0–1 yrs)', min: null, max: 1 },
  { label: '2–5 yrs', min: 2, max: 5 },
  { label: '5–10 yrs', min: 5, max: 10 },
  { label: '10+ yrs', min: 10, max: null },
];

const SALARY_BUCKETS = [
  { label: 'Any salary', min: null, max: null },
  { label: 'Up to ₹6 LPA', min: null, max: 600000 },
  { label: '₹6–12 LPA', min: 600000, max: 1200000 },
  { label: '₹12–20 LPA', min: 1200000, max: 2000000 },
  { label: '₹20 LPA+', min: 2000000, max: null },
];

function formatLpa(amount: number) {
  return `₹${(amount / 100000).toFixed(1)}L`;
}

export default function JobFiltersSidebar({
  filters,
  meta,
  onChange,
  onApply,
  onClear,
}: JobFiltersSidebarProps) {
  const set = (patch: Partial<JobFilters>) => onChange({ ...filters, ...patch });

  const activeExpBucket = EXPERIENCE_BUCKETS.findIndex(
    (b) => b.min === filters.minExperience && b.max === filters.maxExperience,
  );

  const activeSalaryBucket = SALARY_BUCKETS.findIndex(
    (b) => b.min === filters.minSalary && b.max === filters.maxSalary,
  );

  const toggleSkill = (skill: string) => {
    const next = filters.skills.includes(skill)
      ? filters.skills.filter((s) => s !== skill)
      : [...filters.skills, skill];
    set({ skills: next });
  };

  return (
    <aside className="naukri-sidebar-card sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-naukri-text">Filters</h2>
        <button type="button" onClick={onClear} className="text-xs text-naukri-blue hover:underline">
          Clear all
        </button>
      </div>

      <div className="space-y-5">
        <div>
          <p className="text-sm font-medium text-naukri-text mb-2">Keywords</p>
          <input
            type="text"
            className="auth-input w-full text-sm"
            placeholder="Skills, role, company..."
            value={filters.keyword}
            onChange={(e) => set({ keyword: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && onApply()}
          />
        </div>

        <div>
          <p className="text-sm font-medium text-naukri-text mb-2">Location</p>
          <LocationAutocomplete
            value={filters.location}
            onChange={(location) => set({ location })}
            placeholder="City or remote"
            className="w-full"
          />
          {meta.locations.length > 0 && (
            <select
              className="auth-input w-full text-sm mt-2"
              value={filters.location}
              onChange={(e) => set({ location: e.target.value })}
            >
              <option value="">All locations</option>
              {meta.locations.map((loc) => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          )}
        </div>

        <div>
          <p className="text-sm font-medium text-naukri-text mb-2">Salary range</p>
          <div className="space-y-1.5">
            {SALARY_BUCKETS.map((b, i) => (
              <label key={b.label} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="salary"
                  checked={activeSalaryBucket === i}
                  onChange={() => set({ minSalary: b.min, maxSalary: b.max })}
                />
                {b.label}
              </label>
            ))}
          </div>
          {(meta.salary_min != null || meta.salary_max != null) && (
            <p className="text-xs text-naukri-muted mt-2">
              Jobs range: {meta.salary_min != null ? formatLpa(meta.salary_min) : '—'} – {meta.salary_max != null ? formatLpa(meta.salary_max) : '—'}
            </p>
          )}
        </div>

        <div>
          <p className="text-sm font-medium text-naukri-text mb-2">Education</p>
          <select
            className="auth-input w-full text-sm"
            value={filters.education}
            onChange={(e) => set({ education: e.target.value })}
          >
            <option value="">Any education</option>
            {meta.education_levels.map((level) => (
              <option key={level} value={level}>{level}</option>
            ))}
          </select>
        </div>

        <div>
          <p className="text-sm font-medium text-naukri-text mb-2">Availability to join</p>
          <select
            className="auth-input w-full text-sm"
            value={filters.noticePeriod}
            onChange={(e) => set({ noticePeriod: e.target.value })}
          >
            <option value="">Any notice period</option>
            {meta.notice_periods.map((np) => (
              <option key={np} value={np}>{np}</option>
            ))}
          </select>
          <p className="text-xs text-naukri-muted mt-1">Filter by maximum notice period the job accepts.</p>
        </div>

        <div>
          <p className="text-sm font-medium text-naukri-text mb-2">Job type</p>
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="radio"
                name="employment_type"
                checked={!filters.employmentType}
                onChange={() => set({ employmentType: '' })}
              />
              All types
            </label>
            {meta.employment_types.map((t) => (
              <label key={t} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="employment_type"
                  checked={filters.employmentType === t}
                  onChange={() => set({ employmentType: t })}
                />
                {formatEmploymentType(t)}
              </label>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-naukri-text mb-2">Experience</p>
          <div className="space-y-1.5">
            {EXPERIENCE_BUCKETS.map((b, i) => (
              <label key={b.label} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="experience"
                  checked={activeExpBucket === i}
                  onChange={() => set({ minExperience: b.min, maxExperience: b.max })}
                />
                {b.label}
              </label>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-naukri-text mb-2">Skills</p>
          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
            {meta.skills.map((s) => (
              <label key={s} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.skills.includes(s)}
                  onChange={() => toggleSkill(s)}
                />
                {s}
              </label>
            ))}
            {meta.skills.length === 0 && (
              <p className="text-xs text-naukri-muted">No skills listed yet</p>
            )}
          </div>
        </div>
      </div>

      <button type="button" onClick={onApply} className="naukri-btn-primary w-full mt-5 py-2">
        Apply filters
      </button>
    </aside>
  );
}
