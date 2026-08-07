from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.pagination import PaginatedResponse, build_paginated, normalize_pagination
from app.models import Organization, User, UserRole
from app.schemas import AdminUserResponse


async def _org_name(db: AsyncSession, org_id: UUID | None) -> str | None:
    if not org_id:
        return None
    r = await db.execute(select(Organization.name).where(Organization.id == org_id))
    return r.scalar_one_or_none()


async def list_users(
    db: AsyncSession, role: str | None = None, page: int = 1, page_size: int = 20,
) -> PaginatedResponse[AdminUserResponse]:
    page, page_size, offset = normalize_pagination(page, page_size)
    q = select(User)
    if role:
        try:
            q = q.where(User.role == UserRole(role))
        except ValueError:
            raise ValueError("Invalid role filter")
    count_stmt = select(func.count()).select_from(q.subquery())
    total = (await db.execute(count_stmt)).scalar() or 0
    result = await db.execute(q.order_by(User.created_at.desc()).offset(offset).limit(page_size))
    users = result.scalars().all()
    out = []
    for u in users:
        out.append(AdminUserResponse(
            id=u.id,
            email=u.email,
            full_name=u.full_name,
            role=u.role.value,
            organization_name=await _org_name(db, u.organization_id),
            is_active=u.is_active,
            created_at=u.created_at,
            last_login_at=u.last_login_at,
        ))
    return build_paginated(out, total, page, page_size)


async def set_user_active(db: AsyncSession, actor: User, user_id: UUID, is_active: bool) -> AdminUserResponse:
    if actor.role != UserRole.admin:
        raise ValueError("Admin access required")
    if actor.id == user_id:
        raise ValueError("Cannot change your own account status")
    result = await db.execute(select(User).where(User.id == user_id))
    target = result.scalar_one_or_none()
    if not target:
        raise ValueError("User not found")
    if target.role == UserRole.admin and not is_active:
        raise ValueError("Cannot deactivate admin accounts")
    target.is_active = is_active
    await db.commit()
    await db.refresh(target)
    return AdminUserResponse(
        id=target.id,
        email=target.email,
        full_name=target.full_name,
        role=target.role.value,
        organization_name=await _org_name(db, target.organization_id),
        is_active=target.is_active,
        created_at=target.created_at,
        last_login_at=target.last_login_at,
    )
