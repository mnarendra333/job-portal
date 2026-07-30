import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name ?? '');
  const [mobile, setMobile] = useState(user?.mobile ?? '');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  if (!user) return null;

  const onSave = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      await api.account.update({ full_name: fullName, mobile: mobile || undefined });
      await refreshUser();
      setMessage('Account settings saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      {message && <p className="text-emerald-700 mb-4">{message}</p>}
      {error && <p className="text-red-600 mb-4">{error}</p>}

      <div className="card p-6 mb-6 space-y-3 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-naukri-muted">Email</span>
          <span className="font-medium text-naukri-text">{user.email}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-naukri-muted">Role</span>
          <span className="font-medium text-naukri-text capitalize">{user.role.replace('_', ' ')}</span>
        </div>
        {user.organization_name && (
          <div className="flex justify-between gap-4">
            <span className="text-naukri-muted">Organization</span>
            <span className="font-medium text-naukri-text">{user.organization_name}</span>
          </div>
        )}
        <div className="flex justify-between gap-4">
          <span className="text-naukri-muted">Sign-in method</span>
          <span className="font-medium text-naukri-text capitalize">{user.auth_provider}</span>
        </div>
      </div>

      <form onSubmit={onSave} className="card p-6 space-y-4">
        <h2 className="font-semibold text-naukri-text">Account details</h2>
        <input
          required
          placeholder="Full name"
          className="w-full border border-naukri-border rounded-lg px-3 py-2"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
        <input
          placeholder="Mobile"
          className="w-full border border-naukri-border rounded-lg px-3 py-2"
          value={mobile}
          onChange={(e) => setMobile(e.target.value)}
        />
        <button type="submit" className="naukri-btn-primary px-4 py-2">Save changes</button>
      </form>

      {user.auth_provider === 'local' && (
        <p className="mt-6 text-sm text-naukri-muted">
          <Link to="/app/settings/password" className="text-naukri-blue hover:underline">
            Change password →
          </Link>
        </p>
      )}
    </div>
  );
}
