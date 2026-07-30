import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { AdminUser } from '@/types';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roleFilter, setRoleFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    api.admin.users(roleFilter || undefined)
      .then(setUsers)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load users'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [roleFilter]);

  const toggleActive = async (u: AdminUser) => {
    setError('');
    try {
      const updated = await api.admin.setUserActive(u.id, !u.is_active);
      setUsers((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">User Management</h1>
      {error && <p className="text-red-600 mb-4">{error}</p>}
      <div className="flex gap-3 mb-4 flex-wrap">
        <select
          className="border rounded-lg px-3 py-2 text-sm"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="">All roles</option>
          <option value="job_seeker">Job seekers</option>
          <option value="recruiter">Recruiters</option>
          <option value="agency">Agencies</option>
          <option value="admin">Admins</option>
        </select>
      </div>
      {loading ? (
        <p className="text-slate-500">Loading users...</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-slate-500">
                <th className="p-3">Name</th>
                <th className="p-3">Email</th>
                <th className="p-3">Role</th>
                <th className="p-3">Organization</th>
                <th className="p-3">Status</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b last:border-0">
                  <td className="p-3 font-medium">{u.full_name}</td>
                  <td className="p-3">{u.email}</td>
                  <td className="p-3 capitalize">{u.role.replace('_', ' ')}</td>
                  <td className="p-3">{u.organization_name || '—'}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-xs ${u.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="p-3">
                    {u.role !== 'admin' && (
                      <button
                        type="button"
                        className="text-sm text-teal-700 hover:underline"
                        onClick={() => toggleActive(u)}
                      >
                        {u.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
