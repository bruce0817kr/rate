import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class PersonnelSchemaBootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(PersonnelSchemaBootstrapService.name);

  constructor(private readonly dataSource: DataSource) {}

  async onApplicationBootstrap() {
    await this.dataSource.query(`
      ALTER TABLE "personnel"
      ADD COLUMN IF NOT EXISTS "salaryReferencePosition" character varying NULL
    `);

    await this.dataSource.query(`
      UPDATE "personnel"
      SET "salaryReferencePosition" = '부장'
      WHERE "salaryReferencePosition" IS NULL
        AND "position" IN ('본부장', '수석부장')
    `);

    await this.dataSource.query(`
      UPDATE "personnel" p
      SET "positionAverageAnnualSalary" = s."averageAnnualSalary"
      FROM "salary_bands" s
      WHERE COALESCE(p."salaryReferencePosition", p."position") = s."position"
        AND p."positionAverageAnnualSalary" IS NULL
    `);

    this.logger.log('Ensured personnel.salaryReferencePosition exists and backfilled average salaries');
  }
}
