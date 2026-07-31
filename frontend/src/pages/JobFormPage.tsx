import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import LocationSelect from '@/components/jobs/LocationSelect';
import SkillTagsInput from '@/components/jobs/SkillTagsInput';
import { api } from '@/lib/api';
import { DEFAULT_EDUCATION_LEVELS, DEFAULT_NOTICE_PERIODS } from '@/lib/jobFilterDefaults';

const WORK_MODES = [
  { value: 'on_site', label: 'On-site' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'remote', label: 'Remote' },
];

export default function JobFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [employmentType, setEmploymentType] = useState('full_time');
  const [workMode, setWorkMode] = useState('on_site');
  const [expMin, setExpMin] = useState('');
  const [expMax, setExpMax] = useState('');
  const [salaryMin, setSalaryMin] = useState('');
  const [salaryMax, setSalaryMax] = useState('');
  const [salaryCurrency, setSalaryCurrency] = useState('INR');
  const [salaryPeriod, setSalaryPeriod] = useState('annual');
  const [salaryVisible, setSalaryVisible] = useState(false);
  const [openings, setOpenings] = useState('1');
  const [expiryDate, setExpiryDate] = useState('');
  const [skillList, setSkillList] = useState<string[]>([]);
  const [education, setEducation] = useState('');
  const [noticePeriod, setNoticePeriod] = useState('');
  const [visibleToVendors, setVisibleToVendors] = useState(true);
  const [visibleToStudents, setVisibleToStudents] = useState(true);
  const [educationOptions, setEducationOptions] = useState<string[]>([]);
  const [noticeOptions, setNoticeOptions] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

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
        setWorkMode(job.work_mode ?? 'on_site');
        setExpMin(job.experience_min?.toString() ?? '');
        setExpMax(job.experience_max?.toString() ?? '');
        setSalaryMin(job.salary_min?.toString() ?? '');
        setSalaryMax(job.salary_max?.toString() ?? '');
        setSalaryCurrency(job.salary_currency ?? 'INR');
        setSalaryPeriod(job.salary_period ?? 'annual');
        setSalaryVisible(job.salary_visible);
        setOpenings(job.openings.toString());
        setExpiryDate(job.expiry_date ?? '');
        setSkillList(job.skills ?? []);
        setEducation(job.education_requirement ?? '');
        setNoticePeriod(job.notice_period_max ?? '');
        setVisibleToVendors(job.visible_to_vendors ?? true);
        setVisibleToStudents(job.visible_to_students ?? true);
      }).catch(() => {});
    }
  }, [id]);

  const payload = () => ({
    title,
    description,
    location,
    employment_type: employmentType,
    work_mode: workMode,
    experience_min: expMin ? parseInt(expMin, 10) : null,
    experience_max: expMax ? parseInt(expMax, 10) : null,
    salary_min: salaryMin ? parseFloat(salaryMin) : null,
    salary_max: salaryMax ? parseFloat(salaryMax) : null,
    salary_currency: salaryCurrency,
    salary_period: salaryPeriod,
    salary_visible: salaryVisible,
    openings: parseInt(openings, 10) || 1,
    expiry_date: expiryDate || null,
    education_requirement: education || null,
    notice_period_max: noticePeriod || null,
    visible_to_vendors: visibleToVendors,
    visible_to_students: visibleToStudents,
    skills: skillList,
  });

  const saveJob = async (publish: boolean) => {
    setError('');
    setSaving(true);
    try {
      const job = id
        ? await api.jobs.update(id, payload())
        : await api.jobs.create(payload());
      if (publish) {
        await api.jobs.updateStatus(job.id, 'published');
      }
      navigate('/app/jobs');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const onDraft = (e: FormEvent) => {
    e.preventDefault();
    saveJob(false);
  };

  const onPublish = (e: FormEvent) => {
    e.preventDefault();
    saveJob(true);
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">{id ? 'Edit Job' : 'Post New Job'}</h1>
      {error && <p className="text-red-600 mb-4">{error}</p>}
      <form className="card p-6 space-y-4">
        <div>
          <label className="text-sm text-slate-600 mb-1 block">Job title</label>
          <input required className="w-full border rounded-lg px-3 py-2" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label className="text-sm text-slate-600 mb-1 block">Job description</label>
          <textarea required rows={6} className="w-full border rounded-lg px-3 py-2" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div>
          <label className="text-sm text-slate-600 mb-1 block">Location</label>
          <LocationSelect required value={location} onChange={setLocation} />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-slate-600 mb-1 block">Employment type</label>
            <select className="w-full border rounded-lg px-3 py-2" value={employmentType} onChange={(e) => setEmploymentType(e.target.value)}>
              <option value="full_time">Full time</option>
              <option value="part_time">Part time</option>
              <option value="contract">Contract</option>
              <option value="internship">Internship</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-slate-600 mb-1 block">Work mode</label>
            <select className="w-full border rounded-lg px-3 py-2" value={workMode} onChange={(e) => setWorkMode(e.target.value)}>
              {WORK_MODES.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
        </div>
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
          <div>
            <label className="text-sm text-slate-600 mb-1 block">Min experience (years)</label>
            <input type="number" min={0} className="w-full border rounded-lg px-3 py-2" value={expMin} onChange={(e) => setExpMin(e.target.value)} />
          </div>
          <div>
            <label className="text-sm text-slate-600 mb-1 block">Max experience (years)</label>
            <input type="number" min={0} className="w-full border rounded-lg px-3 py-2" value={expMax} onChange={(e) => setExpMax(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-slate-600 mb-1 block">Currency</label>
            <select className="w-full border rounded-lg px-3 py-2" value={salaryCurrency} onChange={(e) => setSalaryCurrency(e.target.value)}>
              <option value="INR">₹ INR</option>
              <option value="USD">$ USD</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-slate-600 mb-1 block">Pay period</label>
            <select className="w-full border rounded-lg px-3 py-2" value={salaryPeriod} onChange={(e) => setSalaryPeriod(e.target.value)}>
              <option value="annual">Annual</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-slate-600 mb-1 block">Salary min</label>
            <input type="number" min={0} className="w-full border rounded-lg px-3 py-2" value={salaryMin} onChange={(e) => setSalaryMin(e.target.value)} />
          </div>
          <div>
            <label className="text-sm text-slate-600 mb-1 block">Salary max</label>
            <input type="number" min={0} className="w-full border rounded-lg px-3 py-2" value={salaryMax} onChange={(e) => setSalaryMax(e.target.value)} />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={salaryVisible} onChange={(e) => setSalaryVisible(e.target.checked)} />
          Show salary on job listing
        </label>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-slate-600 mb-1 block">Number of openings</label>
            <input type="number" min={1} className="w-full border rounded-lg px-3 py-2" value={openings} onChange={(e) => setOpenings(e.target.value)} />
          </div>
          <div>
            <label className="text-sm text-slate-600 mb-1 block">Application deadline</label>
            <input type="date" className="w-full border rounded-lg px-3 py-2" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="text-sm text-slate-600 mb-2 block">Target visibility</label>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={visibleToStudents} onChange={(e) => setVisibleToStudents(e.target.checked)} />
              Students / Job seekers
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={visibleToVendors} onChange={(e) => setVisibleToVendors(e.target.checked)} />
              Vendors / Agencies
            </label>
          </div>
        </div>
        <SkillTagsInput value={skillList} onChange={setSkillList} />
        <div className="flex flex-wrap gap-3 pt-2">
          <button type="button" disabled={saving} onClick={onDraft} className="px-4 py-2 border rounded-lg hover:bg-slate-50 disabled:opacity-50">
            Save as Draft
          </button>
          <button type="button" disabled={saving} onClick={onPublish} className="px-4 py-2 bg-teal-700 text-white rounded-lg hover:bg-teal-800 disabled:opacity-50">
            {saving ? 'Saving…' : 'Publish / Post Job'}
          </button>
        </div>
      </form>
    </div>
  );
}
