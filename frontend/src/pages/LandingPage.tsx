import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import JobCard from '@/components/jobs/JobCard';
import { api } from '@/lib/api';
import type { JobListItem } from '@/types';

export default function LandingPage() {
  const [jobs, setJobs] = useState<JobListItem[]>([]);

  useEffect(() => {
    api.jobs.list().then(setJobs).catch(() => setJobs([]));
  }, []);

  return (
    <div>
      <section className="app-gradient text-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Job Distribution + Resume Collection</h1>
          <p className="text-lg text-white/90 mb-8">
            Employers post jobs. Candidates apply directly. Agencies upload candidate resumes in bulk — all in one portal.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link to="/jobs" className="px-6 py-3 bg-white text-teal-800 rounded-lg font-semibold hover:bg-slate-100">Browse Jobs</Link>
            <Link to="/register" className="px-6 py-3 border-2 border-white rounded-lg font-semibold hover:bg-white/10">Get Started</Link>
            <Link to="/login" className="px-6 py-3 text-white/90 underline">Sign in</Link>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold mb-8 text-center">How it works</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { title: 'Employers post jobs', desc: 'Recruiters create and publish job openings with skills, salary, and location.', color: 'bg-blue-50 border-blue-200' },
            { title: 'Candidates apply', desc: 'Job seekers register, upload resume, and apply with one click.', color: 'bg-emerald-50 border-emerald-200' },
            { title: 'Agencies bulk upload', desc: 'Third-party recruiters upload multiple resumes per job in one go.', color: 'bg-violet-50 border-violet-200' },
          ].map((c) => (
            <div key={c.title} className={`card p-6 border ${c.color}`}>
              <h3 className="font-semibold text-lg mb-2">{c.title}</h3>
              <p className="text-slate-600 text-sm">{c.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 pb-16">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-naukri-text">Featured openings</h2>
          <Link to="/jobs" className="text-sm font-medium text-naukri-blue hover:underline">View all jobs →</Link>
        </div>
        <div className="flex flex-col gap-4">
          {jobs.slice(0, 5).map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
          {jobs.length === 0 && <p className="text-naukri-muted">No jobs posted yet. Run setup to load demo data.</p>}
        </div>
      </section>
    </div>
  );
}
