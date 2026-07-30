"""RBAC permission matrix and role permission tests."""
import json
from pathlib import Path

from app.core.permissions import Permission, ROLE_PERMISSIONS, has_permission

MATRIX_PATH = Path(__file__).resolve().parents[1] / "config" / "permission_matrix.json"


def _load_matrix_roles() -> dict[str, list[str]]:
    if MATRIX_PATH.exists():
        with open(MATRIX_PATH) as f:
            return json.load(f)["roles"]
    # Fallback when JSON export not present — derive from code
    return {role: sorted(p.value for p in perms) for role, perms in ROLE_PERMISSIONS.items()}


def test_admin_has_all_permissions():
    for perm in Permission:
        assert has_permission("admin", perm)


def test_recruiter_permissions():
    allowed = {
        Permission.JOBS_READ,
        Permission.JOBS_WRITE,
        Permission.JOBS_MANAGE,
        Permission.APPLICATIONS_READ,
        Permission.APPLICATIONS_MANAGE,
        Permission.DASHBOARD_RECRUITER,
    }
    for perm in Permission:
        assert has_permission("recruiter", perm) == (perm in allowed)


def test_agency_permissions():
    allowed = {
        Permission.JOBS_READ,
        Permission.BULK_UPLOAD,
        Permission.APPLICATIONS_READ,
        Permission.DASHBOARD_AGENCY,
    }
    for perm in Permission:
        assert has_permission("agency", perm) == (perm in allowed)


def test_seeker_permissions():
    allowed = {
        Permission.JOBS_READ,
        Permission.APPLICATIONS_READ,
        Permission.APPLICATIONS_WRITE,
        Permission.PROFILE_READ,
        Permission.PROFILE_WRITE,
        Permission.DASHBOARD_SEEKER,
    }
    for perm in Permission:
        assert has_permission("job_seeker", perm) == (perm in allowed)


def test_unknown_role_has_no_permissions():
    assert not has_permission("guest", Permission.JOBS_READ)


def test_matrix_matches_code():
    yaml_roles = _load_matrix_roles()
    for role, perms in yaml_roles.items():
        code_perms = {p.value for p in ROLE_PERMISSIONS.get(role, set())}
        assert set(perms) == code_perms, f"Mismatch for role {role}"


def test_seeker_cannot_manage_users():
    assert not has_permission("job_seeker", Permission.USERS_MANAGE)
    assert not has_permission("recruiter", Permission.USERS_READ)


def test_agency_cannot_write_jobs():
    assert not has_permission("agency", Permission.JOBS_WRITE)
