from enum import Enum


class Permission(str, Enum):
    JOBS_READ = "jobs:read"
    JOBS_WRITE = "jobs:write"
    JOBS_MANAGE = "jobs:manage"
    APPLICATIONS_READ = "applications:read"
    APPLICATIONS_WRITE = "applications:write"
    APPLICATIONS_MANAGE = "applications:manage"
    PROFILE_READ = "profile:read"
    PROFILE_WRITE = "profile:write"
    BULK_UPLOAD = "bulk:upload"
    DASHBOARD_RECRUITER = "dashboard:recruiter"
    DASHBOARD_SEEKER = "dashboard:seeker"
    DASHBOARD_AGENCY = "dashboard:agency"
    DASHBOARD_ADMIN = "dashboard:admin"
    USERS_READ = "users:read"
    USERS_MANAGE = "users:manage"


ROLE_PERMISSIONS: dict[str, set[Permission]] = {
    "admin": {p for p in Permission},
    "recruiter": {
        Permission.JOBS_READ,
        Permission.JOBS_WRITE,
        Permission.JOBS_MANAGE,
        Permission.APPLICATIONS_READ,
        Permission.APPLICATIONS_MANAGE,
        Permission.DASHBOARD_RECRUITER,
    },
    "agency": {
        Permission.JOBS_READ,
        Permission.BULK_UPLOAD,
        Permission.APPLICATIONS_READ,
        Permission.DASHBOARD_AGENCY,
    },
    "job_seeker": {
        Permission.JOBS_READ,
        Permission.APPLICATIONS_READ,
        Permission.APPLICATIONS_WRITE,
        Permission.PROFILE_READ,
        Permission.PROFILE_WRITE,
        Permission.DASHBOARD_SEEKER,
    },
}


def has_permission(role: str, permission: Permission) -> bool:
    return permission in ROLE_PERMISSIONS.get(role, set())
