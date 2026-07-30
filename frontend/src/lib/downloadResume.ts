import { api } from '@/lib/api';

export async function downloadResume(applicationId: string, filename?: string) {
  const token = localStorage.getItem('access_token');
  const res = await fetch(api.applications.downloadUrl(applicationId), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error('Resume download failed');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || 'resume';
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadResumes(applicationIds: string[], apps: { id: string; resume_file_name?: string }[]) {
  for (const id of applicationIds) {
    const app = apps.find((a) => a.id === id);
    await downloadResume(id, app?.resume_file_name || 'resume');
    await new Promise((r) => setTimeout(r, 300));
  }
}
