export type OAuthProvider = 'google' | 'linkedin';

export type OAuthStatePayload = {
  provider: OAuthProvider;
  role?: string;
  organization_name?: string;
};

export function oauthRedirectUri(): string {
  return `${window.location.origin}/oauth/callback`;
}

export function encodeOAuthState(payload: OAuthStatePayload): string {
  const json = JSON.stringify(payload);
  return btoa(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeOAuthState(state: string | null): OAuthStatePayload | null {
  if (!state) return null;
  try {
    const padded = state + '='.repeat((4 - (state.length % 4)) % 4);
    const json = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
    const data = JSON.parse(json) as OAuthStatePayload;
    if (data.provider !== 'google' && data.provider !== 'linkedin') return null;
    return data;
  } catch {
    return null;
  }
}
