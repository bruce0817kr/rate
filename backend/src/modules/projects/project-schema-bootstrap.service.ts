import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class ProjectSchemaBootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ProjectSchemaBootstrapService.name);

  constructor(private readonly dataSource: DataSource) {}

  async onApplicationBootstrap() {
    await this.dataSource.query(`
      ALTER TABLE "projects"
      ADD COLUMN IF NOT EXISTS "fiscalYear" integer NULL
    `);

    await this.dataSource.query(`
      UPDATE "projects"
      SET "fiscalYear" = EXTRACT(YEAR FROM "startDate")::int
      WHERE "fiscalYear" IS NULL
    `);

    await this.dataSource.query(`
      ALTER TABLE "project_personnel"
      ADD COLUMN IF NOT EXISTS "fiscalYear" integer NULL
    `);

    await this.dataSource.query(`
      UPDATE "project_personnel" pp
      SET "fiscalYear" = COALESCE(p."fiscalYear", EXTRACT(YEAR FROM pp."startDate")::int)
      FROM "projects" p
      WHERE pp.project_id = p.id
        AND pp."fiscalYear" IS NULL
    `);

    await this.dataSource.query(`
      ALTER TABLE "salary_bands"
      ADD COLUMN IF NOT EXISTS "fiscalYear" integer NULL
    `);

    await this.dataSource.query(`
      UPDATE "salary_bands"
      SET "fiscalYear" = EXTRACT(YEAR FROM now())::int
      WHERE "fiscalYear" IS NULL
    `);

    await this.dataSource.query(`
      DO $$
      DECLARE constraint_name text;
      BEGIN
        SELECT c.conname INTO constraint_name
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE n.nspname = 'public'
          AND t.relname = 'salary_bands'
          AND c.contype = 'u'
          AND pg_get_constraintdef(c.oid) = 'UNIQUE ("position")'
        LIMIT 1;

        IF constraint_name IS NOT NULL THEN
          EXECUTE format('ALTER TABLE "salary_bands" DROP CONSTRAINT %I', constraint_name);
        END IF;
      END $$;
    `);

    await this.dataSource.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint c
          JOIN pg_class t ON t.oid = c.conrelid
          JOIN pg_namespace n ON n.oid = t.relnamespace
          WHERE n.nspname = 'public'
            AND t.relname = 'salary_bands'
            AND c.conname = 'UQ_salary_bands_position_fiscalYear'
        ) THEN
          ALTER TABLE "salary_bands"
          ADD CONSTRAINT "UQ_salary_bands_position_fiscalYear" UNIQUE ("position", "fiscalYear");
        END IF;
      END $$;
    `);

    this.logger.log('Ensured fiscalYear columns and salary band year uniqueness');
  }
}
