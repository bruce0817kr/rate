# Security Audit Triage

Last checked: 2026-04-29

## Scope

This note records the npm audit status after the commercial-readiness hardening work.
It is a triage record, not a blanket approval to run forced dependency upgrades.

## Current audit summary

| Area | Command | Result |
| --- | --- | --- |
| Backend | `npm audit --json` | 26 total: 4 low, 13 moderate, 9 high |
| Frontend | `npm audit --json` | 30 total: 9 low, 6 moderate, 15 high |

## Backend classification

Backend findings matter more because this service handles authenticated API requests,
file uploads, database access, and audit logging.

Immediate attention:

- `multer`: high severity upload DoS advisories. The app already enforces extension,
  empty-file, and size checks, but the dependency should be upgraded in a dedicated
  upload regression task because `multer@2` is a major upgrade.
- `@nestjs/core` / `@nestjs/platform-express`: audit remediation points to Nest 11.
  The project is already on the latest Nest 10 line (`10.4.22`), so this is not a
  safe patch-only update.
- `xlsx`: high severity advisories with no npm audit fix available. Treat uploaded
  spreadsheet parsing as a known risk area and keep file-size/type validation in place.

Deferred to planned upgrade:

- `@nestjs/cli`, `@nestjs/schematics`, Angular devkit, `webpack`, `glob`, `tar`,
  `inquirer`, and related transitive findings are primarily build/dev tooling.
- `@nestjs/config` remediation points to a major update. Do not force this inside a
  production stabilization patch.
- `typeorm` / `uuid` audit output proposes an unsafe downgrade or major path. Keep the
  current TypeORM line unless a tested migration plan exists.

## Frontend classification

Most frontend findings are inside the Create React App toolchain:

- `react-scripts`
- `webpack-dev-server`
- `svgo`
- `postcss`
- Jest/jsdom chain
- Workbox chain

The built Nginx-served frontend does not run the dev server in production. Do not run
`npm audit fix --force`; audit proposes replacing `react-scripts` with an invalid or
breaking path. Move this to a separate frontend tooling migration, preferably away from
Create React App.

## Policy

- Do not run `npm audit fix --force` on this repository without a separate branch,
  changelog review, and full backend/frontend regression run.
- Fix backend runtime direct dependencies before frontend build-tool findings.
- Treat major upgrades as planned work, not drive-by stabilization.
- Keep upload validation tests mandatory while `multer` and `xlsx` remain flagged.

## Recommended next work

1. Plan a backend dependency upgrade task:
   - Nest 10 to Nest 11 compatibility review.
   - `multer@2` upload regression tests.
   - TypeORM/Nest TypeORM compatibility check.
2. Plan a frontend tooling migration task:
   - Replace Create React App with a maintained build stack.
   - Re-run UI smoke tests and `/gtp_rate` production build verification.
3. Re-run audits after each planned upgrade and update this file.
