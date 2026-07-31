import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function LandingPage() {
  const { user } = useAuth();

  return (
    <div>
      <section className="app-gradient text-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Job Distribution + Resume Collection</h1>
          <p className="text-lg text-white/90 mb-8">
            Employers post jobs. Candidates apply directly. Agencies upload candidate resumes in bulk — all in one portal.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            {user ? (
              <>
                <Link to="/jobs" className="px-6 py-3 bg-white text-teal-800 rounded-lg font-semibold hover:bg-slate-100">
                  Browse Jobs
                </Link>
                <Link to="/app" className="px-6 py-3 border-2 border-white rounded-lg font-semibold hover:bg-white/10">
                  Go to Dashboard
                </Link>
              </>
            ) : (
              <>
                <Link to="/login" className="px-6 py-3 bg-white text-teal-800 rounded-lg font-semibold hover:bg-slate-100">
                  Sign in to Browse Jobs
                </Link>
                <Link to="/register" className="px-6 py-3 border-2 border-white rounded-lg font-semibold hover:bg-white/10">
                  Get Started
                </Link>
                <Link to="/login" className="px-6 py-3 text-white/90 underline">
                  Sign in
                </Link>
              </>
            )}
          </div>
          {user && (
            <p className="mt-6 text-white/80 text-sm">
              Welcome back, <span className="font-semibold text-white">{user.full_name}</span>
            </p>
          )}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold mb-8 text-center text-naukri-text">How it works</h2>
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

      {!user && (
        <section className="max-w-6xl mx-auto px-4 pb-16 text-center">
          <p className="text-naukri-muted mb-4">Job listings are available after you sign in.</p>
          <Link to="/login" className="text-sm font-medium text-naukri-blue hover:underline">Sign in to view openings →</Link>
        </section>
      )}
    </div>
  );
}
