import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import JobCard from '@/components/jobs/JobCard';
import JobFiltersSidebar, { type JobFilters } from '@/components/jobs/JobFiltersSidebar';
import LocationAutocomplete from '@/components/jobs/LocationAutocomplete';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { withFilterDefaults } from '@/lib/jobFilterDefaults';
import type { JobFilterMeta, JobListItem } from '@/types';

type TabId = 'profile' | 'might_like' | 'preferences';

const MAX_SELECT = 5;
const HIDDEN_KEY = 'job_portal_hidden_jobs';
const SAVED_KEY = 'job_portal_saved_jobs';

const EMPTY_FILTERS: JobFilters = {
  keyword: '',
  location: '',
  employmentType: '',
  skills: [],
  minExperience: null,
  maxExperience: null,
  minSalary: null,
  maxSalary: null,
  education: '',
  noticePeriod: '',
};

function loadIds(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function saveIds(key: string, ids: Set<string>) {
  localStorage.setItem(key, JSON.stringify([...ids]));
}

function hasActiveSearch(
  keyword: string,
  location: string,
  filters: JobFilters,
): boolean {
  return Boolean(
    keyword.trim()
    || location.trim()
    || filters.keyword.trim()
    || filters.location.trim()
    || filters.employmentType
    || filters.skills.length
    || filters.education
    || filters.noticePeriod
    || filters.minExperience != null
    || filters.maxExperience != null
    || filters.minSalary != null
    || filters.maxSalary != null,
  );
}

export default function JobsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [jobs, setJobs] = useState<JobListItem[]>([]);
  const [keyword, setKeyword] = useState('');
  const [location, setLocation] = useState('');
  const [sidebarFilters, setSidebarFilters] = useState<JobFilters>(EMPTY_FILTERS);
  const [filterMeta, setFilterMeta] = useState<JobFilterMeta>({
    locations: [],
    employment_types: [],
    skills: [],
    education_levels: [],
    notice_periods: [],
  });
  const [loading, setLoading] = useState(true);
  const initialTab = (searchParams.get('tab') as TabId) || 'profile';
  const [tab, setTab] = useState<TabId>(initialTab);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [hidden, setHidden] = useState<Set<string>>(() => loadIds(HIDDEN_KEY));
  const [saved, setSaved] = useState<Set<string>>(() => loadIds(SAVED_KEY));

  const isSeeker = user?.role === 'job_seeker';
  const searching = hasActiveSearch(keyword, location, sidebarFilters);

  const load = useCallback(() => {
    setLoading(true);
    const useRecommended = isSeeker && tab === 'profile' && !searching;
    if (useRecommended) {
      api.jobs.recommended()
        .then(setJobs)
        .catch(() => setJobs([]))
        .finally(() => setLoading(false));
      return;
    }
    const searchKeyword = [keyword, sidebarFilters.keyword].filter(Boolean).join(' ') || undefined;
    const searchLocation = location || sidebarFilters.location || undefined;
    api.jobs.list({
      keyword: searchKeyword,
      location: searchLocation,
      employment_type: sidebarFilters.employmentType || undefined,
      skills: sidebarFilters.skills.length ? sidebarFilters.skills : undefined,
      min_experience: sidebarFilters.minExperience ?? undefined,
      max_experience: sidebarFilters.maxExperience ?? undefined,
      min_salary: sidebarFilters.minSalary ?? undefined,
      max_salary: sidebarFilters.maxSalary ?? undefined,
      education: sidebarFilters.education || undefined,
      notice_period: sidebarFilters.noticePeriod || undefined,
    })
      .then(setJobs)
      .finally(() => setLoading(false));
  }, [keyword, location, sidebarFilters, isSeeker, tab, searching]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    api.jobs.filters()
      .then((data) => setFilterMeta(withFilterDefaults(data)))
      .catch(() => setFilterMeta(withFilterDefaults({
        locations: [],
        employment_types: [],
        skills: [],
        education_levels: [],
        notice_periods: [],
      })));
  }, []);

  const visibleJobs = useMemo(() => jobs.filter((j) => !hidden.has(j.id)), [jobs, hidden]);

  const tabJobs = useMemo(() => {
    if (searching) return visibleJobs;
    if (tab === 'profile' && isSeeker) return visibleJobs;
    if (tab === 'preferences') return visibleJobs.filter((j) => j.skills.length >= 3);
    if (tab === 'might_like') return [...visibleJobs].sort((a, b) => (b.match_score ?? 0) - (a.match_score ?? 0));
    return visibleJobs;
  }, [visibleJobs, tab, isSeeker, searching]);

  const primaryTabLabel = searching
    ? 'Search results'
    : isSeeker
      ? 'Recommended'
      : 'All jobs';

  const toggleSelect = (id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) {
        if (next.size >= MAX_SELECT) return prev;
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const handleHide = (id: string) => {
    setHidden((prev) => {
      const next = new Set(prev);
      next.add(id);
      saveIds(HIDDEN_KEY, next);
      return next;
    });
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleSave = (id: string) => {
    setSaved((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      saveIds(SAVED_KEY, next);
      return next;
    });
  };

  const applySelected = () => {
    const first = [...selected][0];
    if (!first) return;
    if (!user) {
      navigate('/login');
      return;
    }
    navigate(`/jobs/${first}`);
  };

  const clearFilters = () => {
    setSidebarFilters(EMPTY_FILTERS);
    setKeyword('');
    setLocation('');
  };

  const syncSidebarFromSearch = () => {
    setSidebarFilters((prev) => ({
      ...prev,
      keyword: keyword || prev.keyword,
      location: location || prev.location,
    }));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <Link to="/" className="text-sm text-naukri-muted hover:text-naukri-blue mb-2 inline-block">← Home</Link>
          <h1 className="text-xl font-bold text-naukri-text">
            {isSeeker && tab === 'profile' ? 'Recommended jobs for you' : 'Browse jobs'}
          </h1>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          {isSeeker && (
            <span className="text-sm text-naukri-muted">You can select upto {MAX_SELECT} jobs to apply</span>
          )}
          {isSeeker && (
            <button
              type="button"
              className="naukri-btn-primary"
              disabled={selected.size === 0}
              onClick={applySelected}
            >
              Apply{selected.size > 0 ? ` (${selected.size})` : ''}
            </button>
          )}
        </div>
      </div>

      <div className="card p-4 mb-6 flex gap-3 flex-wrap items-start">
        <input
          className="auth-input flex-1 min-w-[160px]"
          placeholder="Skills, designation, companies"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              syncSidebarFromSearch();
              load();
            }
          }}
        />
        <LocationAutocomplete
          value={location}
          onChange={setLocation}
          onSelect={() => {
            syncSidebarFromSearch();
            load();
          }}
          className="flex-1 min-w-[160px]"
        />
        <button
          type="button"
          onClick={() => {
            syncSidebarFromSearch();
            load();
          }}
          className="naukri-btn-primary shrink-0"
        >
          Search
        </button>
      </div>

      <div className="flex gap-6 flex-col xl:flex-row">
        <div className="w-full xl:w-72 shrink-0 order-2 xl:order-1">
          <JobFiltersSidebar
            filters={sidebarFilters}
            meta={filterMeta}
            onChange={setSidebarFilters}
            onApply={() => {
              syncSidebarFromSearch();
              load();
            }}
            onClear={clearFilters}
          />
        </div>

        <div className="flex-1 min-w-0 order-1 xl:order-2">
          <div className="flex gap-6 border-b border-naukri-border mb-5 overflow-x-auto">
            <button type="button" className={`naukri-tab whitespace-nowrap ${tab === 'profile' ? 'naukri-tab-active' : ''}`} onClick={() => setTab('profile')}>
              {primaryTabLabel} ({searching ? tabJobs.length : visibleJobs.length})
            </button>
            {!searching && (
              <>
            <button type="button" className={`naukri-tab whitespace-nowrap ${tab === 'might_like' ? 'naukri-tab-active' : ''}`} onClick={() => setTab('might_like')}>
              You might like ({visibleJobs.length})
            </button>
            <button type="button" className={`naukri-tab whitespace-nowrap ${tab === 'preferences' ? 'naukri-tab-active' : ''}`} onClick={() => setTab('preferences')}>
              Preferences ({visibleJobs.filter((j) => j.skills.length >= 3).length})
            </button>
              </>
            )}
          </div>

          {loading ? (
            <p className="text-naukri-muted py-8 text-center">Loading jobs...</p>
          ) : tabJobs.length === 0 ? (
            <p className="text-naukri-muted py-8 text-center">No jobs found. Try adjusting your search or filters.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {tabJobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  selectable={isSeeker}
                  selected={selected.has(job.id)}
                  onSelect={toggleSelect}
                  saved={saved.has(job.id)}
                  onHide={handleHide}
                  onSave={handleSave}
                />
              ))}
            </div>
          )}
        </div>

        <aside className="w-full xl:w-64 shrink-0 order-3">
          <div className="naukri-sidebar-card sticky top-20">
            <h2 className="font-semibold text-naukri-text mb-4">Your preferences</h2>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-naukri-muted">Location</span>
                <p className="naukri-pref-tag mt-1 inline-block">{location || sidebarFilters.location || 'Any location'}</p>
              </div>
              {sidebarFilters.education && (
                <div>
                  <span className="text-naukri-muted">Education</span>
                  <p className="naukri-pref-tag mt-1 inline-block">{sidebarFilters.education}</p>
                </div>
              )}
              {saved.size > 0 && (
                <div className="pt-3 border-t border-naukri-border">
                  <p className="font-medium text-naukri-text">{saved.size} saved job{saved.size !== 1 ? 's' : ''}</p>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
