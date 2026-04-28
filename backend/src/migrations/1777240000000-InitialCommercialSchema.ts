import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialCommercialSchema1777240000000 implements MigrationInterface {
  name = 'InitialCommercialSchema1777240000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    await queryRunner.query(`DO $$ BEGIN CREATE TYPE "user_role_enum" AS ENUM ('ADMIN', 'STRATEGY_PLANNING', 'HR_GENERAL_AFFAIRS', 'HR_FINANCE', 'GENERAL'); EXCEPTION WHEN duplicate_object THEN null; END $$;`);
    await queryRunner.query(`DO $$ BEGIN CREATE TYPE "project_type_enum" AS ENUM ('NATIONAL_RD', 'LOCAL_SUBSIDY', 'MIXED'); EXCEPTION WHEN duplicate_object THEN null; END $$;`);
    await queryRunner.query(`DO $$ BEGIN CREATE TYPE "project_status_enum" AS ENUM ('PLANNING', 'APPROVED', 'IN_PROGRESS', 'COMPLETED', 'AUDITING'); EXCEPTION WHEN duplicate_object THEN null; END $$;`);
    await queryRunner.query(`DO $$ BEGIN CREATE TYPE "employment_type_enum" AS ENUM ('FULL_TIME', 'CONTRACT', 'PART_TIME', 'DISPATCHED'); EXCEPTION WHEN duplicate_object THEN null; END $$;`);
    await queryRunner.query(`DO $$ BEGIN CREATE TYPE "project_personnel_calculation_method_enum" AS ENUM ('MONTHLY', 'DAILY', 'HOURLY'); EXCEPTION WHEN duplicate_object THEN null; END $$;`);
    await queryRunner.query(`DO $$ BEGIN CREATE TYPE "project_personnel_role_enum" AS ENUM ('PRINCIPAL_INVESTIGATOR', 'PARTICIPATING_RESEARCHER'); EXCEPTION WHEN duplicate_object THEN null; END $$;`);
    await queryRunner.query(`DO $$ BEGIN CREATE TYPE "insurance_coverage_enum" AS ENUM ('EMPLOYEE_PART', 'EMPLOYER_PART', 'FULLY_COVERED'); EXCEPTION WHEN duplicate_object THEN null; END $$;`);
    await queryRunner.query(`DO $$ BEGIN CREATE TYPE "document_status_enum" AS ENUM ('NOT_SUBMITTED', 'PENDING', 'APPROVED', 'REJECTED'); EXCEPTION WHEN duplicate_object THEN null; END $$;`);
    await queryRunner.query(`DO $$ BEGIN CREATE TYPE "audit_action_enum" AS ENUM ('CREATE', 'UPDATE', 'DELETE'); EXCEPTION WHEN duplicate_object THEN null; END $$;`);
    await queryRunner.query(`DO $$ BEGIN CREATE TYPE "regulation_file_type_enum" AS ENUM ('PDF', 'HWP', 'DOC', 'DOCX', 'TXT'); EXCEPTION WHEN duplicate_object THEN null; END $$;`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "username" character varying NOT NULL UNIQUE,
        "passwordHash" character varying NOT NULL,
        "name" character varying NOT NULL,
        "role" "user_role_enum" NOT NULL DEFAULT 'GENERAL',
        "canManageActualSalary" boolean NOT NULL DEFAULT false,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "teams" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL UNIQUE,
        "department" character varying,
        "description" character varying,
        "managerName" character varying,
        "managerEmail" character varying,
        "managerPhone" character varying,
        "plannedHeadcount" integer,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "salary_bands" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "position" character varying NOT NULL,
        "fiscalYear" integer,
        "averageAnnualSalary" bigint NOT NULL,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "personnel" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "employeeId" character varying NOT NULL UNIQUE,
        "name" character varying NOT NULL,
        "gender" character varying NOT NULL,
        "highestEducation" character varying NOT NULL,
        "educationYear" integer NOT NULL,
        "nationalResearcherNumber" character varying NOT NULL,
        "birthDate" timestamp NOT NULL,
        "ssn" character varying NOT NULL,
        "department" character varying NOT NULL,
        "team" character varying NOT NULL,
        "position" character varying NOT NULL,
        "salaryReferencePosition" character varying,
        "positionAverageAnnualSalary" bigint,
        "employmentType" "employment_type_enum" NOT NULL,
        "hireDate" timestamp NOT NULL,
        "terminationDate" timestamp,
        "isActive" boolean NOT NULL DEFAULT true,
        "salaryValidity" jsonb NOT NULL,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "projects" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "fiscalYear" integer,
        "projectType" "project_type_enum" NOT NULL,
        "managingDepartment" character varying NOT NULL,
        "startDate" timestamp NOT NULL,
        "endDate" timestamp NOT NULL,
        "totalBudget" numeric(15,2) NOT NULL,
        "personnelBudget" numeric(15,2) NOT NULL,
        "personnelCostFinalTotal" numeric(15,2),
        "expectedPersonnelRevenue" numeric(15,2),
        "expectedIndirectRevenue" numeric(15,2),
        "budgetStatus" character varying(20),
        "fundingSources" jsonb,
        "status" "project_status_enum" NOT NULL,
        "legalBasis" jsonb NOT NULL,
        "internalRules" jsonb NOT NULL,
        "managingTeam" character varying NOT NULL,
        "participatingTeams" text NOT NULL,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "project_personnel" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "project_id" uuid,
        "personnel_id" uuid,
        "participationRate" numeric(5,2) NOT NULL,
        "fiscalYear" integer,
        "startDate" timestamp NOT NULL,
        "endDate" timestamp,
        "calculationMethod" "project_personnel_calculation_method_enum" NOT NULL,
        "expenseCode" character varying NOT NULL,
        "legalBasisCode" character varying NOT NULL,
        "participatingTeam" character varying NOT NULL,
        "role" "project_personnel_role_enum" NOT NULL DEFAULT 'PARTICIPATING_RESEARCHER',
        "actualAnnualSalaryOverride" numeric(15,2),
        "participationMonths" integer NOT NULL DEFAULT 12,
        "personnelCostOverride" numeric(15,2),
        "notes" character varying,
        "version" integer NOT NULL DEFAULT 1,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "fk_project_personnel_project" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "fk_project_personnel_personnel" FOREIGN KEY ("personnel_id") REFERENCES "personnel"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "project_personnel_segments" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "project_personnel_id" uuid,
        "startDate" date NOT NULL,
        "endDate" date NOT NULL,
        "participationRate" numeric(5,2) NOT NULL,
        "personnelCostOverride" numeric(15,2),
        "sortOrder" integer NOT NULL DEFAULT 0,
        "notes" character varying,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "fk_project_personnel_segments_project_personnel" FOREIGN KEY ("project_personnel_id") REFERENCES "project_personnel"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "personnel_costs" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "project_personnel_id" uuid,
        "personnel_id" uuid,
        "fiscalYear" integer NOT NULL,
        "fiscalMonth" integer NOT NULL,
        "calculationDate" timestamp NOT NULL,
        "baseSalary" numeric(15,2) NOT NULL,
        "appliedParticipationRate" numeric(5,2) NOT NULL,
        "calculatedAmount" numeric(15,2) NOT NULL,
        "expenseItem" character varying NOT NULL,
        "insuranceCoverage" "insurance_coverage_enum" NOT NULL,
        "documentStatus" "document_status_enum" NOT NULL,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "fk_personnel_costs_project_personnel" FOREIGN KEY ("project_personnel_id") REFERENCES "project_personnel"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "fk_personnel_costs_personnel" FOREIGN KEY ("personnel_id") REFERENCES "personnel"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "audit_logs" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "entityType" character varying NOT NULL,
        "entityId" character varying NOT NULL,
        "action" "audit_action_enum" NOT NULL,
        "changes" jsonb NOT NULL,
        "performedBy" character varying NOT NULL,
        "ipAddress" character varying,
        "userAgent" character varying,
        "timestamp" timestamp NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "regulation_documents" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "title" character varying NOT NULL,
        "description" text NOT NULL,
        "filePath" character varying NOT NULL,
        "fileType" "regulation_file_type_enum" NOT NULL,
        "version" character varying NOT NULL,
        "effectiveDate" timestamp NOT NULL,
        "expiryDate" timestamp,
        "applicableProjectTypes" text NOT NULL,
        "applicableTeams" text NOT NULL,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "regulation_documents"');
    await queryRunner.query('DROP TABLE IF EXISTS "audit_logs"');
    await queryRunner.query('DROP TABLE IF EXISTS "personnel_costs"');
    await queryRunner.query('DROP TABLE IF EXISTS "project_personnel_segments"');
    await queryRunner.query('DROP TABLE IF EXISTS "project_personnel"');
    await queryRunner.query('DROP TABLE IF EXISTS "projects"');
    await queryRunner.query('DROP TABLE IF EXISTS "personnel"');
    await queryRunner.query('DROP TABLE IF EXISTS "salary_bands"');
    await queryRunner.query('DROP TABLE IF EXISTS "teams"');
    await queryRunner.query('DROP TABLE IF EXISTS "users"');
    await queryRunner.query('DROP TYPE IF EXISTS "regulation_file_type_enum"');
    await queryRunner.query('DROP TYPE IF EXISTS "audit_action_enum"');
    await queryRunner.query('DROP TYPE IF EXISTS "document_status_enum"');
    await queryRunner.query('DROP TYPE IF EXISTS "insurance_coverage_enum"');
    await queryRunner.query('DROP TYPE IF EXISTS "project_personnel_role_enum"');
    await queryRunner.query('DROP TYPE IF EXISTS "project_personnel_calculation_method_enum"');
    await queryRunner.query('DROP TYPE IF EXISTS "employment_type_enum"');
    await queryRunner.query('DROP TYPE IF EXISTS "project_status_enum"');
    await queryRunner.query('DROP TYPE IF EXISTS "project_type_enum"');
    await queryRunner.query('DROP TYPE IF EXISTS "user_role_enum"');
  }
}
