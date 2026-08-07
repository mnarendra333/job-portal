import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { decodeOAuthState, oauthRedirectUri, type OAuthProvider } from '@/lib/oauth';

export default function OAuthCallbackPage() {
  const [params] = useSearchParams();
  const { oauthLogin } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;

    const code = params.get('code');
    const returnedState = params.get('state');
    const savedState = sessionStorage.getItem('oauth_state');
    const statePayload = decodeOAuthState(returnedState) || decodeOAuthState(savedState);

    if (!code) {
      setError(params.get('error_description') || params.get('error') || 'Missing authorization code');
      return;
    }

    if (!returnedState || !savedState || returnedState !== savedState || !statePayload) {
      setError('Invalid OAuth state. Please try signing in again.');
      return;
    }

    const provider = statePayload.provider as OAuthProvider;
    const redirectUri = sessionStorage.getItem('oauth_redirect') || oauthRedirectUri();
    const role = statePayload.role || sessionStorage.getItem('oauth_role') || undefined;
    const orgName = statePayload.organization_name || sessionStorage.getItem('oauth_org') || undefined;

    handled.current = true;
    sessionStorage.removeItem('oauth_redirect');
    sessionStorage.removeItem('oauth_state');
    sessionStorage.removeItem('oauth_role');
    sessionStorage.removeItem('oauth_org');

    oauthLogin(provider, code, redirectUri, { role, organization_name: orgName })
      .then(() => navigate('/app'))
      .catch((err) => setError(err instanceof Error ? err.message : 'OAuth failed'));
  }, [params, oauthLogin, navigate]);

  if (error) return <div className="min-h-screen flex items-center justify-center text-red-600 px-4 text-center">{error}</div>;
  return <div className="min-h-screen flex items-center justify-center text-slate-500">Completing sign in...</div>;
}
