import base64
import json

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import create_access_token, create_refresh_token, hash_password
from app.models import AuthProvider, CandidateProfile, OAuthAccount, Organization, OrgType, User, UserRole
from app.services.job_service import get_user_response


GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"
LINKEDIN_TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken"
LINKEDIN_USERINFO_URL = "https://api.linkedin.com/v2/userinfo"


def _decode_jwt_payload(token: str) -> dict:
    parts = token.split(".")
    if len(parts) != 3:
        raise ValueError("Invalid id_token")
    payload = parts[1]
    padding = "=" * (-len(payload) % 4)
    return json.loads(base64.urlsafe_b64decode(payload + padding))


async def _linkedin_profile(client: httpx.AsyncClient, token_data: dict) -> dict:
    """Prefer OIDC id_token claims; fall back to userinfo endpoint."""
    id_token = token_data.get("id_token")
    if id_token:
        try:
            info = _decode_jwt_payload(id_token)
            if info.get("sub"):
                return info
        except (ValueError, json.JSONDecodeError):
            pass

    access_token = token_data.get("access_token")
    if not access_token:
        raise ValueError("LinkedIn token response missing access_token and id_token")

    user_resp = await client.get(
        LINKEDIN_USERINFO_URL,
        headers={"Authorization": f"Bearer {access_token}"},
    )
    if user_resp.status_code != 200:
        detail = user_resp.text[:300]
        raise ValueError(f"Failed to fetch LinkedIn user info ({user_resp.status_code}): {detail}")
    return user_resp.json()


async def _find_oauth_user(db: AsyncSession, provider: AuthProvider, provider_user_id: str) -> User | None:
    result = await db.execute(
        select(OAuthAccount).where(
            OAuthAccount.provider == provider,
            OAuthAccount.provider_user_id == provider_user_id,
        )
    )
    account = result.scalar_one_or_none()
    if not account:
        return None
    ur = await db.execute(select(User).where(User.id == account.user_id, User.is_active.is_(True)))
    return ur.scalar_one_or_none()


async def _link_oauth_to_existing_user(
    db: AsyncSession,
    user: User,
    provider: AuthProvider,
    provider_user_id: str,
) -> User:
    result = await db.execute(
        select(OAuthAccount).where(
            OAuthAccount.user_id == user.id,
            OAuthAccount.provider == provider,
        )
    )
    if not result.scalar_one_or_none():
        db.add(OAuthAccount(user_id=user.id, provider=provider, provider_user_id=provider_user_id))
        await db.commit()
        await db.refresh(user)
    return user


async def _resolve_oauth_user(
    db: AsyncSession,
    provider: AuthProvider,
    provider_user_id: str,
    email: str,
    full_name: str,
    role: str | None,
    organization_name: str | None,
) -> User:
    user = await _find_oauth_user(db, provider, provider_user_id)
    if user:
        return user

    result = await db.execute(select(User).where(User.email == email, User.is_active.is_(True)))
    existing = result.scalar_one_or_none()
    if existing:
        return await _link_oauth_to_existing_user(db, existing, provider, provider_user_id)

    effective_role = role or "job_seeker"
    return await _create_oauth_user(db, provider, provider_user_id, email, full_name, effective_role, organization_name)


async def _create_oauth_user(
    db: AsyncSession,
    provider: AuthProvider,
    provider_user_id: str,
    email: str,
    full_name: str,
    role: str,
    organization_name: str | None,
) -> User:
    role_map = {
        "recruiter": UserRole.recruiter,
        "agency": UserRole.agency,
        "job_seeker": UserRole.job_seeker,
    }
    if role not in role_map:
        raise ValueError("Role required for new OAuth signup: recruiter, agency, or job_seeker")

    org_id = None
    user_role = role_map[role]
    if user_role in (UserRole.recruiter, UserRole.agency):
        if not organization_name:
            raise ValueError("Organization name required for recruiter/agency OAuth signup")
        org = Organization(
            name=organization_name,
            type=OrgType.employer if user_role == UserRole.recruiter else OrgType.agency,
        )
        db.add(org)
        await db.flush()
        org_id = org.id

    user = User(
        email=email,
        password_hash=None,
        full_name=full_name,
        role=user_role,
        auth_provider=provider,
        organization_id=org_id,
    )
    db.add(user)
    await db.flush()
    if user_role == UserRole.job_seeker:
        db.add(CandidateProfile(user_id=user.id))
    db.add(OAuthAccount(user_id=user.id, provider=provider, provider_user_id=provider_user_id))
    await db.commit()
    await db.refresh(user)
    return user


def _tokens_for_user(user: User) -> tuple[str, str]:
    token_data = {
        "role": user.role.value,
        "organization_id": str(user.organization_id) if user.organization_id else None,
    }
    return create_access_token(str(user.id), token_data), create_refresh_token(str(user.id))


async def oauth_google(
    db: AsyncSession,
    code: str,
    redirect_uri: str,
    role: str | None,
    organization_name: str | None,
) -> tuple[User, str, str]:
    if not settings.google_client_id or not settings.google_client_secret:
        raise ValueError("Google OAuth is not configured")

    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            },
        )
        if token_resp.status_code != 200:
            detail = token_resp.text[:300]
            raise ValueError(f"Failed to exchange Google authorization code ({token_resp.status_code}): {detail}")
        token_data = token_resp.json()
        access_token = token_data.get("access_token")
        if not access_token:
            raise ValueError("Google token response missing access_token")
        user_resp = await client.get(GOOGLE_USERINFO_URL, headers={"Authorization": f"Bearer {access_token}"})
        if user_resp.status_code != 200:
            detail = user_resp.text[:300]
            raise ValueError(f"Failed to fetch Google user info ({user_resp.status_code}): {detail}")
        info = user_resp.json()

    provider_id = info.get("sub")
    email = info.get("email")
    name = info.get("name") or email
    if not provider_id or not email:
        raise ValueError("Incomplete Google profile")

    user = await _resolve_oauth_user(
        db, AuthProvider.google, provider_id, email, name, role, organization_name
    )
    return user, *_tokens_for_user(user)


async def oauth_linkedin(
    db: AsyncSession,
    code: str,
    redirect_uri: str,
    role: str | None,
    organization_name: str | None,
) -> tuple[User, str, str]:
    if not settings.linkedin_client_id or not settings.linkedin_client_secret:
        raise ValueError("LinkedIn OAuth is not configured")

    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            LINKEDIN_TOKEN_URL,
            data={
                "code": code,
                "client_id": settings.linkedin_client_id,
                "client_secret": settings.linkedin_client_secret,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        if token_resp.status_code != 200:
            detail = token_resp.text[:300]
            raise ValueError(f"Failed to exchange LinkedIn authorization code ({token_resp.status_code}): {detail}")
        token_data = token_resp.json()
        info = await _linkedin_profile(client, token_data)

    provider_id = info.get("sub")
    email = info.get("email")
    name = info.get("name") or info.get("given_name") or email
    if not provider_id:
        raise ValueError("Incomplete LinkedIn profile (missing subject id)")
    if not email:
        raise ValueError("LinkedIn did not share your email. Allow email access or use email/password login.")

    user = await _resolve_oauth_user(
        db, AuthProvider.linkedin, provider_id, email, name, role, organization_name
    )
    return user, *_tokens_for_user(user)


def oauth_authorize_url(provider: str, redirect_uri: str, state: str) -> str:
    if provider == "google":
        if not settings.google_client_id:
            raise ValueError("Google OAuth is not configured")
        params = (
            f"client_id={settings.google_client_id}"
            f"&redirect_uri={redirect_uri}"
            f"&response_type=code&scope=openid%20email%20profile"
            f"&state={state}&access_type=offline"
        )
        return f"https://accounts.google.com/o/oauth2/v2/auth?{params}"
    if provider == "linkedin":
        if not settings.linkedin_client_id:
            raise ValueError("LinkedIn OAuth is not configured")
        params = (
            f"response_type=code&client_id={settings.linkedin_client_id}"
            f"&redirect_uri={redirect_uri}"
            f"&scope=openid%20profile%20email"
            f"&state={state}"
        )
        return f"https://www.linkedin.com/oauth/v2/authorization?{params}"
    raise ValueError("Unknown provider")
