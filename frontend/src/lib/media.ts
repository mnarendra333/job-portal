/** Build URL for uploaded media (avatars, etc.) */
export function mediaUrl(relativePath: string | undefined | null): string | undefined {
  if (!relativePath) return undefined;
  if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) return relativePath;
  const apiBase = import.meta.env.VITE_API_URL || '/api/v1';
  const origin = apiBase.replace(/\/api\/v1\/?$/, '') || '';
  const path = relativePath.startsWith('/') ? relativePath : `/uploads/${relativePath}`;
  return `${origin}${path}`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}
