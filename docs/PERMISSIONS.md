# Job Portal — Permissions Matrix

| Permission | admin | recruiter | agency | job_seeker |
|------------|-------|-----------|--------|------------|
| jobs:read | ✓ | ✓ | ✓ | ✓ |
| jobs:write | ✓ | ✓ | | |
| jobs:manage | ✓ | ✓ | | |
| applications:read | ✓ | ✓ | ✓ | ✓ |
| applications:write | ✓ | | | ✓ |
| applications:manage | ✓ | ✓ | | |
| profile:read | ✓ | | | ✓ |
| profile:write | ✓ | | | ✓ |
| bulk:upload | ✓ | | ✓ | |
| dashboard:recruiter | ✓ | ✓ | | |
| dashboard:seeker | ✓ | | | ✓ |
| dashboard:agency | ✓ | | ✓ | |

## Role capabilities

- **admin** — full access; seeded manually
- **recruiter** — post/manage jobs for own employer org; review applications
- **agency** — browse jobs; bulk upload resumes; view upload history
- **job_seeker** — profile + resume; apply once per job; track applications
