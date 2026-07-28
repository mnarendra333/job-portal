import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function OAuthCallbackPage() {
  const [params] = useSearchParams();
  const { oauthLogin } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;

    const code = params.get('code');
    const provider = (params.get('provider') || 'google') as 'google' | 'linkedin';
    const redirectUri = sessionStorage.getItem('oauth_redirect') || `${window.location.origin}/oauth/callback?provider=${provider}`;
    const role = sessionStorage.getItem('oauth_role') || undefined;
    const orgName = sessionStorage.getItem('oauth_org') || undefined;

    if (!code) {
      setError('Missing authorization code');
      return;
    }

    handled.current = true;
    sessionStorage.removeItem('oauth_redirect');

    oauthLogin(provider, code, redirectUri, { role, organization_name: orgName })
      .then(() => navigate('/app'))
      .catch((err) => setError(err instanceof Error ? err.message : 'OAuth failed'));
  }, [params, oauthLogin, navigate]);

  if (error) return <div className="min-h-screen flex items-center justify-center text-red-600 px-4 text-center">{error}</div>;
  return <div className="min-h-screen flex items-center justify-center text-slate-500">Completing sign in...</div>;
}
