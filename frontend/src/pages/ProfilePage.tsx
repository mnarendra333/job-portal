import { FormEvent, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { CandidateProfile } from '@/types';

export default function ProfilePage() {
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = () => api.profile.get().then(setProfile).catch(() => {});
  useEffect(() => { load(); }, []);

  const onSave = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!profile) return;
    setError('');
    try {
      const updated = await api.profile.update({
        headline: profile.headline,
        current_company: profile.current_company,
        total_experience_years: profile.total_experience_years,
        notice_period: profile.notice_period,
        current_ctc: profile.current_ctc,
        expected_ctc: profile.expected_ctc,
        linkedin_url: profile.linkedin_url,
        portfolio_url: profile.portfolio_url,
      });
      setProfile(updated);
      setMessage('Profile saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    }
  };

  const onResume = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      await api.profile.uploadResume(fd);
      load();
      setMessage('Resume uploaded.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    }
  };

  if (!profile) return <p>Loading...</p>;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">My Profile</h1>
      {message && <p className="text-emerald-700 mb-4">{message}</p>}
      {error && <p className="text-red-600 mb-4">{error}</p>}
      <form onSubmit={onSave} className="card p-6 space-y-4">
        <input placeholder="Headline" className="w-full border rounded-lg px-3 py-2" value={profile.headline ?? ''} onChange={(e) => setProfile({ ...profile, headline: e.target.value })} />
        <input placeholder="Current company" className="w-full border rounded-lg px-3 py-2" value={profile.current_company ?? ''} onChange={(e) => setProfile({ ...profile, current_company: e.target.value })} />
        <input placeholder="Total experience (years)" type="number" step="0.5" className="w-full border rounded-lg px-3 py-2" value={profile.total_experience_years ?? ''} onChange={(e) => setProfile({ ...profile, total_experience_years: parseFloat(e.target.value) || undefined })} />
        <input placeholder="Notice period" className="w-full border rounded-lg px-3 py-2" value={profile.notice_period ?? ''} onChange={(e) => setProfile({ ...profile, notice_period: e.target.value })} />
        <div className="grid grid-cols-2 gap-3">
          <input placeholder="Current CTC" type="number" className="border rounded-lg px-3 py-2" value={profile.current_ctc ?? ''} onChange={(e) => setProfile({ ...profile, current_ctc: parseFloat(e.target.value) || undefined })} />
          <input placeholder="Expected CTC" type="number" className="border rounded-lg px-3 py-2" value={profile.expected_ctc ?? ''} onChange={(e) => setProfile({ ...profile, expected_ctc: parseFloat(e.target.value) || undefined })} />
        </div>
        <input placeholder="LinkedIn URL" className="w-full border rounded-lg px-3 py-2" value={profile.linkedin_url ?? ''} onChange={(e) => setProfile({ ...profile, linkedin_url: e.target.value })} />
        <input placeholder="Portfolio URL" className="w-full border rounded-lg px-3 py-2" value={profile.portfolio_url ?? ''} onChange={(e) => setProfile({ ...profile, portfolio_url: e.target.value })} />
        <div>
          <p className="text-sm text-slate-600 mb-2">Default resume: {profile.default_resume_name || 'None uploaded'}</p>
          <input type="file" accept=".pdf,.doc,.docx" onChange={onResume} />
        </div>
        <button type="submit" className="px-4 py-2 bg-teal-700 text-white rounded-lg">Save Profile</button>
      </form>
    </div>
  );
}
