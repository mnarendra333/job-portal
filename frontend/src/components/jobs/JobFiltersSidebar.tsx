import { formatEmploymentType } from '@/lib/jobFormat';

export interface JobFilters {
  employmentType: string;
  skill: string;
  minExperience: number | null;
  maxExperience: number | null;
}

interface JobFiltersSidebarProps {
  filters: JobFilters;
  meta: { employment_types: string[]; skills: string[] };
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

export default function JobFiltersSidebar({
  filters,
  meta,
  onChange,
  onApply,
  onClear,
}: JobFiltersSidebarProps) {
  const set = (patch: Partial<JobFilters>) => onChange({ ...filters, ...patch });

  const activeBucket = EXPERIENCE_BUCKETS.findIndex(
    (b) => b.min === filters.minExperience && b.max === filters.maxExperience,
  );

  return (
    <aside className="naukri-sidebar-card sticky top-20">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-naukri-text">Filters</h2>
        <button type="button" onClick={onClear} className="text-xs text-naukri-blue hover:underline">
          Clear all
        </button>
      </div>

      <div className="space-y-5">
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
                  checked={activeBucket === i}
                  onChange={() => set({ minExperience: b.min, maxExperience: b.max })}
                />
                {b.label}
              </label>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-naukri-text mb-2">Skill</p>
          <select
            className="auth-input w-full text-sm"
            value={filters.skill}
            onChange={(e) => set({ skill: e.target.value })}
          >
            <option value="">All skills</option>
            {meta.skills.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      <button type="button" onClick={onApply} className="naukri-btn-primary w-full mt-5 py-2">
        Apply filters
      </button>
    </aside>
  );
}
