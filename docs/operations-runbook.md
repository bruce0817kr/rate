# Operations Runbook

## Environment

1. Copy `.env.example` to `.env`.
2. Replace `RATE_DB_PASSWORD` and `JWT_SECRET` with production secrets.
3. Keep `RATE_DB_HOST=localhost` and `RATE_DB_PORT=5433` for host-run migration commands against Docker Compose PostgreSQL, or set them to the target database endpoint for production operations.
4. Set `CORS_ORIGINS` to the exact frontend origins allowed to call the API.
5. Keep `ALLOW_SELF_REGISTRATION=false` for internal production operation.

## Database Migrations

Run from `backend`:

```powershell
npm run migration:show
npm run migration:run
```

Generate a migration after entity changes:

```powershell
npm run migration:generate
```

Rollback the latest migration only after confirming the rollback plan:

```powershell
npm run migration:revert
```

## Backup

Run from `saas-project` after Docker services are running:

```powershell
scripts\backup.bat
```

For Linux/macOS shells:

```bash
./scripts/backup.sh
```

The scripts read `POSTGRES_CONTAINER`, `RATE_DB_USERNAME`, and `RATE_DB_NAME` from the environment, with local defaults for development.

## Restore

Restore must be done during a maintenance window because it overwrites the target database.

```bash
./scripts/restore.sh ./backups/rate_db_YYYYMMDD_HHMMSS.sql
```

The script requires an explicit `yes` confirmation before restore.

## Smoke QA

After deploy, verify API login and the main UI routes:

```powershell
python scripts/qa_playwright.py
```

Expected result: JSON output with `"status": "ok"` and screenshots in `artifacts/qa`.

## CI Gate

The GitHub Actions workflow at `.github/workflows/ci.yml` runs:

- Backend `npm ci`, `npm run test`, `npm run build`
- Frontend `npm ci`, `npm test -- --watchAll=false`, `npm run build`
