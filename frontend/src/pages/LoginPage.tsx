import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import OAuthButtons from '@/components/auth/OAuthButtons';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      navigate('/app');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  const oauthStart = async (provider: 'google' | 'linkedin') => {
    setError('');
    try {
      const redirectUri = `${window.location.origin}/oauth/callback?provider=${provider}`;
      const { authorize_url } = await api.oauthAuthorizeUrl(provider, redirectUri);
      sessionStorage.setItem('oauth_redirect', redirectUri);
      window.location.href = authorize_url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OAuth not configured');
    }
  };

  return (
    <div className="auth-page">
      <aside className="auth-panel-brand">
        <div>
          <Link to="/" className="text-2xl font-bold tracking-tight">JobPortal</Link>
          <p className="mt-2 text-white/70 text-sm">Find roles. Apply faster. Get hired.</p>
        </div>

        <div className="relative z-10 max-w-sm">
          <h2 className="text-3xl xl:text-4xl font-bold leading-tight">
            Welcome back to your career dashboard
          </h2>
          <p className="mt-4 text-white/80 text-sm leading-relaxed">
            Sign in to apply to recommended jobs, track applications, and manage your profile — all in one place.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-white/75">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-white/90" />
              Personalized job recommendations
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-white/90" />
              One-click apply with saved resume
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-white/90" />
              Real-time application status
            </li>
          </ul>
        </div>

        <p className="text-xs text-white/50 relative z-10">Trusted by job seekers and recruiters</p>

        <div className="absolute -bottom-24 -right-24 w-72 h-72 rounded-full bg-white/10 blur-2xl" aria-hidden />
        <div className="absolute top-20 -left-16 w-48 h-48 rounded-full bg-white/5 blur-xl" aria-hidden />
      </aside>

      <main className="auth-panel-form">
        <div className="auth-card">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-naukri-text">Sign in</h1>
            <p className="mt-1 text-sm text-naukri-muted">Use your email or continue with a social account</p>
          </div>

          {error && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <OAuthButtons onGoogle={() => oauthStart('google')} onLinkedIn={() => oauthStart('linkedin')} />

          <div className="auth-divider">
            <span>or sign in with email</span>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="auth-label">Email</label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                className="auth-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="auth-label">Password</label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="Enter your password"
                className="auth-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button type="submit" disabled={submitting} className="naukri-btn-primary w-full py-2.5">
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="mt-6 text-sm text-naukri-muted text-center">
            No account?{' '}
            <Link to="/register" className="font-medium text-naukri-blue hover:underline">
              Register
            </Link>
          </p>

          <p className="mt-4 text-center">
            <Link to="/" className="text-xs text-naukri-muted hover:text-naukri-blue">
              ← Back to home
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
