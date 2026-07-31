import { FormEvent, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Camera, KeyRound, Mail, Shield, Building2 } from 'lucide-react';
import UserAvatar from '@/components/UserAvatar';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fullName, setFullName] = useState(user?.full_name ?? '');
  const [mobile, setMobile] = useState(user?.mobile ?? '');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

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

  const onAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    setMessage('');
    try {
      await api.account.uploadAvatar(file);
      await refreshUser();
      setMessage('Profile photo updated.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-2">Settings</h1>
      <p className="text-sm text-naukri-muted mb-6">Manage your profile photo and account details.</p>
      {message && <p className="text-sm text-emerald-700 mb-4 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">{message}</p>}
      {error && <p className="text-sm text-red-600 mb-4 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}

      <div className="card p-6 mb-6">
        <h2 className="font-semibold text-naukri-text mb-4 flex items-center gap-2">
          <Camera className="w-4 h-4 text-teal-600" />
          Profile photo
        </h2>
        <div className="flex flex-wrap items-center gap-5">
          <UserAvatar name={user.full_name} avatarUrl={user.avatar_url} size="xl" />
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={onAvatarChange}
            />
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 disabled:opacity-50 transition-colors"
            >
              <Camera className="w-4 h-4" />
              {uploading ? 'Uploading…' : 'Upload photo'}
            </button>
            <p className="text-xs text-naukri-muted mt-2">JPG, PNG or WEBP · max 2MB</p>
          </div>
        </div>
      </div>

      <div className="card p-6 mb-6 space-y-3 text-sm">
        <div className="flex justify-between gap-4 items-center">
          <span className="text-naukri-muted flex items-center gap-2"><Mail className="w-4 h-4" /> Email</span>
          <span className="font-medium text-naukri-text">{user.email}</span>
        </div>
        <div className="flex justify-between gap-4 items-center">
          <span className="text-naukri-muted flex items-center gap-2"><Shield className="w-4 h-4" /> Role</span>
          <span className="font-medium text-naukri-text capitalize">{user.role.replace('_', ' ')}</span>
        </div>
        {user.organization_name && (
          <div className="flex justify-between gap-4 items-center">
            <span className="text-naukri-muted flex items-center gap-2"><Building2 className="w-4 h-4" /> Organization</span>
            <span className="font-medium text-naukri-text">{user.organization_name}</span>
          </div>
        )}
        <div className="flex justify-between gap-4 items-center">
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
          <Link to="/app/settings/password" className="inline-flex items-center gap-1.5 text-naukri-blue hover:underline">
            <KeyRound className="w-4 h-4" />
            Change password
          </Link>
        </p>
      )}
    </div>
  );
}
