import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class ProjectPersonnelSchemaBootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ProjectPersonnelSchemaBootstrapService.name);

  constructor(private readonly dataSource: DataSource) {}

  async onApplicationBootstrap() {
    const columns = await this.dataSource.query(
      `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'project_personnel'
          AND column_name IN ('annualSalary', 'actualAnnualSalaryOverride')
      `,
    );

    const columnNames = new Set<string>(columns.map((row: { column_name: string }) => row.column_name));
    const hasLegacyColumn = columnNames.has('annualSalary');
    const hasNewColumn = columnNames.has('actualAnnualSalaryOverride');

    if (!hasLegacyColumn && !hasNewColumn) {
      return;
    }

    if (hasLegacyColumn && !hasNewColumn) {
      await this.dataSource.query(
        `ALTER TABLE "project_personnel" RENAME COLUMN "annualSalary" TO "actualAnnualSalaryOverride"`,
      );
      this.logger.log('Renamed project_personnel.annualSalary to actualAnnualSalaryOverride');
      return;
    }

    if (hasLegacyColumn && hasNewColumn) {
      await this.dataSource.query(
        `
          UPDATE "project_personnel"
          SET "actualAnnualSalaryOverride" = COALESCE("actualAnnualSalaryOverride", "annualSalary")
          WHERE "annualSalary" IS NOT NULL
        `,
      );
      await this.dataSource.query(
        `ALTER TABLE "project_personnel" DROP COLUMN "annualSalary"`,
      );
      this.logger.log('Backfilled and dropped legacy project_personnel.annualSalary column');
    }
  }
}
