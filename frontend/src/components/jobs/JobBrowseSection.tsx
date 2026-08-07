import { useCallback, useEffect, useState } from 'react';
import JobCard from '@/components/jobs/JobCard';
import JobFiltersSidebar, { type JobFilters } from '@/components/jobs/JobFiltersSidebar';
import LocationAutocomplete from '@/components/jobs/LocationAutocomplete';
import Pagination from '@/components/Pagination';
import { api } from '@/lib/api';
import { withFilterDefaults } from '@/lib/jobFilterDefaults';
import type { JobFilterMeta, JobListItem } from '@/types';

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

type JobBrowseSectionProps = {
  id?: string;
  title?: string;
  subtitle?: string;
  pageSize?: number;
  showSidebar?: boolean;
};

export default function JobBrowseSection({
  id = 'jobs',
  title = 'All jobs',
  subtitle,
  pageSize = 12,
  showSidebar = true,
}: JobBrowseSectionProps) {
  const [jobs, setJobs] = useState<JobListItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
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

  const syncSidebarFromSearch = () => {
    setSidebarFilters((prev) => ({
      ...prev,
      keyword: keyword || prev.keyword,
      location: location || prev.location,
    }));
  };

  const load = useCallback(() => {
    setLoading(true);
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
      page,
      page_size: pageSize,
    })
      .then((res) => {
        setJobs(res.items);
        setTotal(res.total);
        setTotalPages(res.total_pages);
      })
      .catch(() => {
        setJobs([]);
        setTotal(0);
        setTotalPages(0);
      })
      .finally(() => setLoading(false));
  }, [keyword, location, sidebarFilters, page, pageSize]);

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

  const applySearch = () => {
    syncSidebarFromSearch();
    if (page === 1) load();
    else setPage(1);
  };

  const clearFilters = () => {
    setSidebarFilters(EMPTY_FILTERS);
    setKeyword('');
    setLocation('');
    setPage(1);
  };

  return (
    <section id={id} className="max-w-7xl mx-auto px-4 py-10 scroll-mt-16">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-naukri-text">{title}</h2>
        {subtitle && <p className="text-sm text-naukri-muted mt-1">{subtitle}</p>}
        {!loading && (
          <p className="text-sm text-naukri-muted mt-1">{total} open position{total === 1 ? '' : 's'}</p>
        )}
      </div>

      <div className="card p-4 mb-6 flex gap-3 flex-wrap items-start">
        <input
          className="auth-input flex-1 min-w-[160px]"
          placeholder="Skills, designation, companies"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') applySearch();
          }}
        />
        <LocationAutocomplete
          value={location}
          onChange={setLocation}
          onSelect={applySearch}
          className="flex-1 min-w-[160px]"
        />
        <button type="button" onClick={applySearch} className="naukri-btn-primary shrink-0">
          Search
        </button>
      </div>

      <div className="flex gap-6 flex-col xl:flex-row">
        {showSidebar && (
          <div className="w-full xl:w-72 shrink-0">
            <JobFiltersSidebar
              filters={sidebarFilters}
              meta={filterMeta}
              onChange={setSidebarFilters}
              onApply={() => {
                syncSidebarFromSearch();
                if (page === 1) load();
                else setPage(1);
              }}
              onClear={clearFilters}
            />
          </div>
        )}

        <div className="flex-1 min-w-0">
          {loading ? (
            <p className="text-naukri-muted py-8 text-center">Loading jobs...</p>
          ) : jobs.length === 0 ? (
            <p className="text-naukri-muted py-8 text-center">No jobs found. Try adjusting your search or filters.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {jobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
              <Pagination
                page={page}
                totalPages={totalPages}
                total={total}
                pageSize={pageSize}
                onPageChange={setPage}
                className="pt-2"
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
