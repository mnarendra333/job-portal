import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const ROLES = [
  { value: 'job_seeker', label: 'Job Seeker', org: false },
  { value: 'recruiter', label: 'Employer Recruiter', org: true },
  { value: 'agency', label: 'Agency / Third-party Recruiter', org: true },
];

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState('job_seeker');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mobile, setMobile] = useState('');
  const [orgName, setOrgName] = useState('');
  const [error, setError] = useState('');

  const needsOrg = ROLES.find((r) => r.value === role)?.org;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await register({
        email,
        password,
        full_name: fullName,
        mobile: mobile || undefined,
        role,
        organization_name: needsOrg ? orgName : undefined,
      });
      navigate('/app');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-slate-50 py-8">
      <div className="card p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6">Create account</h1>
        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-slate-600">I am a</label>
            <select className="w-full border rounded-lg px-3 py-2 mt-1" value={role} onChange={(e) => setRole(e.target.value)}>
              {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <input required placeholder="Full name" className="w-full border rounded-lg px-3 py-2" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <input type="email" required placeholder="Email" className="w-full border rounded-lg px-3 py-2" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input type="password" required minLength={8} placeholder="Password (min 8)" className="w-full border rounded-lg px-3 py-2" value={password} onChange={(e) => setPassword(e.target.value)} />
          <input placeholder="Mobile (optional)" className="w-full border rounded-lg px-3 py-2" value={mobile} onChange={(e) => setMobile(e.target.value)} />
          {needsOrg && (
            <input required placeholder="Organization / Company name" className="w-full border rounded-lg px-3 py-2" value={orgName} onChange={(e) => setOrgName(e.target.value)} />
          )}
          <button type="submit" className="w-full py-2 bg-teal-700 text-white rounded-lg font-medium">Register</button>
        </form>
        <p className="mt-4 text-sm text-slate-500 text-center">
          Already have an account? <Link to="/login" className="text-teal-700">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
