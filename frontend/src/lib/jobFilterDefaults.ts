/** Fallback filter options — matches backend EDUCATION_LEVELS / NOTICE_PERIODS */
export const DEFAULT_EDUCATION_LEVELS = [
  "Bachelor's Degree",
  "Master's Degree",
  'MBA',
  'B.Tech',
  'M.Tech',
  'BCA',
  'MCA',
  'PhD',
  'Diploma',
];

export const DEFAULT_NOTICE_PERIODS = [
  'Immediate',
  '15 days',
  '30 days',
  '60 days',
  '90 days',
];

export function withFilterDefaults(meta: {
  locations: string[];
  employment_types: string[];
  skills: string[];
  education_levels: string[];
  notice_periods: string[];
  salary_min?: number;
  salary_max?: number;
}) {
  return {
    ...meta,
    education_levels: meta.education_levels.length ? meta.education_levels : DEFAULT_EDUCATION_LEVELS,
    notice_periods: meta.notice_periods.length ? meta.notice_periods : DEFAULT_NOTICE_PERIODS,
  };
}
