import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';

export default function ChangePasswordPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  if (!user) return null;

  if (user.auth_provider !== 'local') {
    return (
      <div className="max-w-md">
        <Link to="/app/settings" className="text-sm text-naukri-blue hover:underline">← Settings</Link>
        <p className="mt-4 text-naukri-muted">
          Password change is only available for email/password accounts. You signed in with {user.auth_provider}.
        </p>
      </div>
    );
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    try {
      await api.account.changePassword(currentPassword, newPassword);
      setMessage('Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => navigate('/app/settings'), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Password change failed');
    }
  };

  return (
    <div className="max-w-md">
      <Link to="/app/settings" className="text-sm text-naukri-blue hover:underline">← Settings</Link>
      <h1 className="text-2xl font-bold mt-4 mb-6">Change Password</h1>
      {message && <p className="text-emerald-700 mb-4">{message}</p>}
      {error && <p className="text-red-600 mb-4">{error}</p>}
      <form onSubmit={onSubmit} className="card p-6 space-y-4">
        <input
          type="password"
          required
          placeholder="Current password"
          className="w-full border border-naukri-border rounded-lg px-3 py-2"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
        />
        <input
          type="password"
          required
          minLength={8}
          placeholder="New password (min 8 characters)"
          className="w-full border border-naukri-border rounded-lg px-3 py-2"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <input
          type="password"
          required
          minLength={8}
          placeholder="Confirm new password"
          className="w-full border border-naukri-border rounded-lg px-3 py-2"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
        <button type="submit" className="naukri-btn-primary w-full py-2">Update password</button>
      </form>
    </div>
  );
}
