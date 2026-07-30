import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import LocationSelect from '@/components/jobs/LocationSelect';
import { api } from '@/lib/api';
import { DEFAULT_EDUCATION_LEVELS, DEFAULT_NOTICE_PERIODS } from '@/lib/jobFilterDefaults';

export default function JobFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [employmentType, setEmploymentType] = useState('full_time');
  const [expMin, setExpMin] = useState('');
  const [expMax, setExpMax] = useState('');
  const [salaryMin, setSalaryMin] = useState('');
  const [salaryMax, setSalaryMax] = useState('');
  const [salaryVisible, setSalaryVisible] = useState(false);
  const [openings, setOpenings] = useState('1');
  const [skills, setSkills] = useState('');
  const [education, setEducation] = useState('');
  const [noticePeriod, setNoticePeriod] = useState('');
  const [educationOptions, setEducationOptions] = useState<string[]>([]);
  const [noticeOptions, setNoticeOptions] = useState<string[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api.jobs.filters().then((meta) => {
      setEducationOptions(meta.education_levels.length ? meta.education_levels : DEFAULT_EDUCATION_LEVELS);
      setNoticeOptions(meta.notice_periods.length ? meta.notice_periods : DEFAULT_NOTICE_PERIODS);
    }).catch(() => {
      setEducationOptions(DEFAULT_EDUCATION_LEVELS);
      setNoticeOptions(DEFAULT_NOTICE_PERIODS);
    });
  }, []);

  useEffect(() => {
    if (id) {
      api.jobs.get(id).then((job) => {
        setTitle(job.title);
        setDescription(job.description);
        setLocation(job.location);
        setEmploymentType(job.employment_type);
        setExpMin(job.experience_min?.toString() ?? '');
        setExpMax(job.experience_max?.toString() ?? '');
        setSalaryMin(job.salary_min?.toString() ?? '');
        setSalaryMax(job.salary_max?.toString() ?? '');
        setSalaryVisible(job.salary_visible);
        setOpenings(job.openings.toString());
        setSkills(job.skills.join(', '));
        setEducation(job.education_requirement ?? '');
        setNoticePeriod(job.notice_period_max ?? '');
      }).catch(() => {});
    }
  }, [id]);

  const payload = () => ({
    title,
    description,
    location,
    employment_type: employmentType,
    experience_min: expMin ? parseInt(expMin, 10) : null,
    experience_max: expMax ? parseInt(expMax, 10) : null,
    salary_min: salaryMin ? parseFloat(salaryMin) : null,
    salary_max: salaryMax ? parseFloat(salaryMax) : null,
    salary_visible: salaryVisible,
    openings: parseInt(openings, 10) || 1,
    education_requirement: education || null,
    notice_period_max: noticePeriod || null,
    skills: skills.split(',').map((s) => s.trim()).filter(Boolean),
  });

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (id) await api.jobs.update(id, payload());
      else await api.jobs.create(payload());
      navigate('/app/jobs');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">{id ? 'Edit Job' : 'Post New Job'}</h1>
      {error && <p className="text-red-600 mb-4">{error}</p>}
      <form onSubmit={onSubmit} className="card p-6 space-y-4">
        <input required placeholder="Job title" className="w-full border rounded-lg px-3 py-2" value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea required placeholder="Job description" rows={6} className="w-full border rounded-lg px-3 py-2" value={description} onChange={(e) => setDescription(e.target.value)} />
        <div>
          <label className="text-sm text-slate-600 mb-1 block">Location</label>
          <LocationSelect required value={location} onChange={setLocation} />
        </div>
        <select className="w-full border rounded-lg px-3 py-2" value={employmentType} onChange={(e) => setEmploymentType(e.target.value)}>
          <option value="full_time">Full time</option>
          <option value="part_time">Part time</option>
          <option value="contract">Contract</option>
          <option value="internship">Internship</option>
        </select>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-slate-600 mb-1 block">Education required</label>
            <select className="w-full border rounded-lg px-3 py-2" value={education} onChange={(e) => setEducation(e.target.value)}>
              <option value="">Any / not specified</option>
              {educationOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm text-slate-600 mb-1 block">Max notice period</label>
            <select className="w-full border rounded-lg px-3 py-2" value={noticePeriod} onChange={(e) => setNoticePeriod(e.target.value)}>
              <option value="">Any / not specified</option>
              {noticeOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <input placeholder="Min experience (yrs)" type="number" className="border rounded-lg px-3 py-2" value={expMin} onChange={(e) => setExpMin(e.target.value)} />
          <input placeholder="Max experience (yrs)" type="number" className="border rounded-lg px-3 py-2" value={expMax} onChange={(e) => setExpMax(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <input placeholder="Salary min" type="number" className="border rounded-lg px-3 py-2" value={salaryMin} onChange={(e) => setSalaryMin(e.target.value)} />
          <input placeholder="Salary max" type="number" className="border rounded-lg px-3 py-2" value={salaryMax} onChange={(e) => setSalaryMax(e.target.value)} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={salaryVisible} onChange={(e) => setSalaryVisible(e.target.checked)} />
          Show salary on job listing
        </label>
        <input placeholder="Openings" type="number" min={1} className="w-full border rounded-lg px-3 py-2" value={openings} onChange={(e) => setOpenings(e.target.value)} />
        <input placeholder="Skills (comma separated)" className="w-full border rounded-lg px-3 py-2" value={skills} onChange={(e) => setSkills(e.target.value)} />
        <button type="submit" className="px-4 py-2 bg-teal-700 text-white rounded-lg">Save as Draft</button>
      </form>
    </div>
  );
}
