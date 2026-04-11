import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Personnel } from '../personnel/personnel.entity';
import { PersonnelEmploymentType } from '../personnel/personnel.enum';
import { Project } from '../projects/project.entity';
import { ProjectPersonnel } from '../participation/project-personnel.entity';
import { ProjectPersonnelSegment } from '../participation/project-personnel-segment.entity';
import { User, UserRole } from '../users/user.entity';
import { Team } from '../teams/team.entity';
import * as bcrypt from 'bcrypt';

export interface UploadResult {
  success: number;
  failed: number;
  errors: string[];
}

export interface PersonnelCsvRow {
  employeeId: string;
  name: string;
  gender: string;
  highestEducation: string;
  educationYear: string;
  nationalResearcherNumber: string;
  birthDate: string;
  department: string;
  team: string;
  position: string;
  positionAverageAnnualSalary?: string;
  employmentType: string;
  hireDate: string;
}

export interface ProjectCsvRow {
  name: string;
  projectType: string;
  managingDepartment: string;
  startDate: string;
  endDate: string;
  totalBudget: string;
  personnelBudget: string;
  status: string;
  managingTeam: string;
  participatingTeams: string;
}

export interface ProjectPersonnelCsvRow {
  employeeId: string;
  projectName: string;
  participationRate: string;
  role: string;
  startDate: string;
  endDate: string;
  calculationMethod: string;
  expenseCode: string;
  legalBasisCode: string;
  participatingTeam: string;
  notes?: string;
}

export interface UserCsvRow {
  username: string;
  password: string;
  name: string;
  role: string;
}

export interface TeamCsvRow {
  name: string;
  department?: string;
  description?: string;
  managerName?: string;
  managerEmail?: string;
  managerPhone?: string;
  plannedHeadcount?: string;
  isActive?: string;
}

@Injectable()
export class UploadService {
  constructor(
    @InjectRepository(Personnel)
    private personnelRepository: Repository<Personnel>,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @InjectRepository(ProjectPersonnel)
    private projectPersonnelRepository: Repository<ProjectPersonnel>,
    @InjectRepository(ProjectPersonnelSegment)
    private projectPersonnelSegmentRepository: Repository<ProjectPersonnelSegment>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Team)
    private teamRepository: Repository<Team>,
  ) {}

  private normalizeKey(value?: string | null): string {
    return (value ?? '')
      .toString()
      .trim()
      .toLowerCase()
      .replace(/[\s_-]/g, '');
  }

  private normalizeEmploymentType(value?: string): PersonnelEmploymentType {
    const raw = (value ?? '').toString().trim();
    if (!raw) {
      return PersonnelEmploymentType.FULL_TIME;
    }

    const normalized = this.normalizeKey(raw);
    const mapping: Record<string, PersonnelEmploymentType> = {
      full: PersonnelEmploymentType.FULL_TIME,
      fulltime: PersonnelEmploymentType.FULL_TIME,
      regular: PersonnelEmploymentType.FULL_TIME,
      정규: PersonnelEmploymentType.FULL_TIME,
      정규직: PersonnelEmploymentType.FULL_TIME,
      contract: PersonnelEmploymentType.CONTRACT,
      계약: PersonnelEmploymentType.CONTRACT,
      계약직: PersonnelEmploymentType.CONTRACT,
      part: PersonnelEmploymentType.PART_TIME,
      parttime: PersonnelEmploymentType.PART_TIME,
      시간제: PersonnelEmploymentType.PART_TIME,
      dispatch: PersonnelEmploymentType.DISPATCHED,
      dispatched: PersonnelEmploymentType.DISPATCHED,
      파견: PersonnelEmploymentType.DISPATCHED,
      파견직: PersonnelEmploymentType.DISPATCHED,
    };

    if (mapping[normalized]) {
      return mapping[normalized];
    }

    const upper = raw.toUpperCase() as PersonnelEmploymentType;
    if (Object.values(PersonnelEmploymentType).includes(upper)) {
      return upper;
    }

    throw new Error(`고용형태 값이 유효하지 않습니다. (입력값: ${raw})`);
  }

  private normalizeDateText(value: unknown): string {
    const raw = (value ?? '').toString().trim();
    if (!raw) {
      return '';
    }

    if (/^\d+(\.\d+)?$/.test(raw)) {
      const serial = Number(raw);
      if (Number.isFinite(serial) && serial > 20000 && serial < 90000) {
        const excelEpoch = new Date(Date.UTC(1899, 11, 30));
        const parsed = new Date(excelEpoch.getTime() + Math.round(serial) * 86400000);
        return `${parsed.getUTCFullYear().toString().padStart(4, '0')}-${(parsed.getUTCMonth() + 1)
          .toString()
          .padStart(2, '0')}-${parsed.getUTCDate().toString().padStart(2, '0')}`;
      }
    }

    // Accept dotted/slashed dates from uploads: 2024.03.01 / 2024/03/01
    let normalized = raw.replace(/\./g, '-').replace(/\//g, '-');
    if (/^\d{8}$/.test(normalized)) {
      normalized = `${normalized.slice(0, 4)}-${normalized.slice(4, 6)}-${normalized.slice(6, 8)}`;
    }

    const match = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (!match) {
      return normalized;
    }

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  }

  private countInclusiveMonths(startDate: Date, endDate: Date): number {
    return (
      (endDate.getUTCFullYear() - startDate.getUTCFullYear()) * 12 +
      (endDate.getUTCMonth() - startDate.getUTCMonth()) +
      1
    );
  }

  private syncLegacyParticipationFromSegments(
    projectPersonnel: ProjectPersonnel,
    segments: ProjectPersonnelSegment[],
  ): ProjectPersonnel {
    const ordered = [...segments].sort(
      (left, right) => new Date(left.startDate).getTime() - new Date(right.startDate).getTime(),
    );
    const now = new Date();
    const currentSegment = ordered.find((segment) => {
      const startDate = new Date(segment.startDate);
      const endDate = new Date(segment.endDate);
      return startDate <= now && endDate >= now;
    });

    projectPersonnel.startDate = ordered[0].startDate;
    projectPersonnel.endDate = ordered[ordered.length - 1].endDate;
    projectPersonnel.participationRate = Number(currentSegment?.participationRate || 0);
    projectPersonnel.participationMonths = ordered.reduce((sum, segment) => {
      return sum + this.countInclusiveMonths(new Date(segment.startDate), new Date(segment.endDate));
    }, 0);
    projectPersonnel.personnelCostOverride = ordered.reduce<number | null>((sum, segment) => {
      if (segment.personnelCostOverride === null || segment.personnelCostOverride === undefined) {
        return sum;
      }
      return (sum ?? 0) + Number(segment.personnelCostOverride);
    }, null);

    return projectPersonnel;
  }

  private parseDateOrThrow(value: unknown, fieldName: string): Date {
    const normalized = this.normalizeDateText(value);
    if (!normalized) {
      throw new Error(`${fieldName} 값이 비어 있습니다.`);
    }

    const strict = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (strict) {
      const year = Number(strict[1]);
      const month = Number(strict[2]);
      const day = Number(strict[3]);
      const parsed = new Date(Date.UTC(year, month - 1, day));

      if (
        parsed.getUTCFullYear() === year &&
        parsed.getUTCMonth() + 1 === month &&
        parsed.getUTCDate() === day
      ) {
        return parsed;
      }
    }

    const fallback = new Date(normalized);
    if (Number.isNaN(fallback.getTime())) {
      throw new Error(`${fieldName} 날짜 형식이 올바르지 않습니다. (예: 2024-03-01 또는 2024.03.01)`);
    }
    return fallback;
  }

  private getErrorMessage(error: unknown): string {
    if (typeof error === 'string') {
      return error;
    }

    if (error instanceof BadRequestException) {
      const response = error.getResponse();
      if (typeof response === 'string') {
        return response;
      }

      if (typeof response === 'object' && response !== null) {
        const message = (response as { message?: string | string[] }).message;
        if (Array.isArray(message)) {
          return message.join(', ');
        }
        if (typeof message === 'string') {
          return message;
        }
      }

      return error.message;
    }

    if (error instanceof Error) {
      return error.message;
    }

    return '알 수 없는 오류가 발생했습니다.';
  }

  private toKoreanError(rawMessage: string): string {
    const enumMatch = rawMessage.match(
      /invalid input value for enum personnel_employmenttype_enum: "(.+?)"/i,
    );
    if (enumMatch) {
      return `고용형태 값이 유효하지 않습니다. (입력값: ${enumMatch[1]})`;
    }

    if (rawMessage.startsWith('Employee not found:')) {
      const employeeId = rawMessage.replace('Employee not found:', '').trim();
      return `인력 정보를 찾을 수 없습니다. (사번: ${employeeId})`;
    }

    if (rawMessage.startsWith('Project not found:')) {
      const projectName = rawMessage.replace('Project not found:', '').trim();
      return `사업 정보를 찾을 수 없습니다. (사업명: ${projectName})`;
    }

    if (/duplicate key value violates unique constraint/i.test(rawMessage)) {
      return '중복된 값이 있어 저장할 수 없습니다.';
    }

    if (/null value in column/i.test(rawMessage)) {
      return '필수값이 비어 있어 저장할 수 없습니다.';
    }

    if (/invalid input syntax/i.test(rawMessage)) {
      return '입력 형식이 올바르지 않습니다.';
    }

    if (/name is required/i.test(rawMessage)) {
      return '팀명(name)은 필수 입력값입니다.';
    }

    return rawMessage;
  }

  private pushRowError(errors: string[], rowNumber: number, error: unknown): void {
    const raw = this.getErrorMessage(error);
    const translated = this.toKoreanError(raw);
    errors.push(`행 ${rowNumber}: ${translated}`);
  }

  private async syncTeamsFromPersonnelRows(rows: PersonnelCsvRow[]): Promise<void> {
    const teamMap = new Map<string, { department: string | null }>();

    rows.forEach((row) => {
      const teamName = row.team?.trim();
      if (!teamName) {
        return;
      }

      const department = row.department?.trim() || null;
      const current = teamMap.get(teamName);
      if (!current) {
        teamMap.set(teamName, { department });
        return;
      }

      if (!current.department && department) {
        teamMap.set(teamName, { department });
      }
    });

    const teamNames = Array.from(teamMap.keys());
    if (teamNames.length === 0) {
      return;
    }

    const existingTeams = await this.teamRepository.find({
      where: { name: In(teamNames) },
    });
    const existingByName = new Map(existingTeams.map((team) => [team.name, team]));

    const toCreate: Team[] = [];
    const toUpdate: Team[] = [];

    teamNames.forEach((teamName) => {
      const source = teamMap.get(teamName)!;
      const existing = existingByName.get(teamName);

      if (!existing) {
        toCreate.push(
          this.teamRepository.create({
            name: teamName,
            department: source.department,
            isActive: true,
          }),
        );
        return;
      }

      let changed = false;
      if (!existing.department && source.department) {
        existing.department = source.department;
        changed = true;
      }
      if (!existing.isActive) {
        existing.isActive = true;
        changed = true;
      }

      if (changed) {
        toUpdate.push(existing);
      }
    });

    if (toCreate.length > 0) {
      await this.teamRepository.save(toCreate);
    }
    if (toUpdate.length > 0) {
      await this.teamRepository.save(toUpdate);
    }
  }

  async uploadPersonnel(data: PersonnelCsvRow[]): Promise<UploadResult> {
    const result: UploadResult = { success: 0, failed: 0, errors: [] };
    const successfulRows: PersonnelCsvRow[] = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      try {
        const existing = await this.personnelRepository.findOne({
          where: { employeeId: row.employeeId },
        });

        const employmentType = this.normalizeEmploymentType(row.employmentType);

        if (existing) {
          Object.assign(existing, {
            name: row.name,
            gender: row.gender,
            highestEducation: row.highestEducation,
            educationYear: parseInt(row.educationYear, 10) || null,
            nationalResearcherNumber: row.nationalResearcherNumber,
            birthDate: this.parseDateOrThrow(row.birthDate, '생년월일'),
            department: row.department,
            team: row.team,
            position: row.position,
            positionAverageAnnualSalary: row.positionAverageAnnualSalary ? Number(row.positionAverageAnnualSalary) : null,
            employmentType,
            hireDate: this.parseDateOrThrow(row.hireDate, '입사일'),
            isActive: true,
            salaryValidity: {
              startDate: new Date(),
              endDate: null,
            },
          });
          await this.personnelRepository.save(existing);
        } else {
          const personnel = this.personnelRepository.create({
            employeeId: row.employeeId,
            name: row.name,
            gender: row.gender,
            highestEducation: row.highestEducation,
            educationYear: parseInt(row.educationYear, 10) || undefined,
            nationalResearcherNumber: row.nationalResearcherNumber,
            birthDate: this.parseDateOrThrow(row.birthDate, '생년월일'),
            ssn: 'ENC_SKIP',
            department: row.department,
            team: row.team,
            position: row.position,
            positionAverageAnnualSalary: row.positionAverageAnnualSalary ? Number(row.positionAverageAnnualSalary) : null,
            employmentType,
            hireDate: this.parseDateOrThrow(row.hireDate, '입사일'),
            isActive: true,
            salaryValidity: {
              startDate: new Date(),
              endDate: null,
            },
          });
          await this.personnelRepository.save(personnel);
        }

        successfulRows.push(row);
        result.success++;
      } catch (error) {
        result.failed++;
        this.pushRowError(result.errors, i + 2, error);
      }
    }

    try {
      await this.syncTeamsFromPersonnelRows(successfulRows);
    } catch (error) {
      const raw = this.getErrorMessage(error);
      result.errors.push(`팀 목록 동기화 실패: ${this.toKoreanError(raw)}`);
    }

    return result;
  }

  async uploadProjects(data: ProjectCsvRow[]): Promise<UploadResult> {
    const result: UploadResult = { success: 0, failed: 0, errors: [] };

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      try {
        const existing = await this.projectRepository.findOne({
          where: { name: row.name },
        });

        if (existing) {
          Object.assign(existing, {
            projectType: row.projectType || 'NATIONAL_RD',
            managingDepartment: row.managingDepartment,
            startDate: this.parseDateOrThrow(row.startDate, '사업 시작일'),
            endDate: this.parseDateOrThrow(row.endDate, '사업 종료일'),
            totalBudget: parseFloat(row.totalBudget) || 0,
            personnelBudget: parseFloat(row.personnelBudget) || 0,
            status: row.status || 'IN_PROGRESS',
            legalBasis: {},
            internalRules: {},
            managingTeam: row.managingTeam,
            participatingTeams: row.participatingTeams
              ? row.participatingTeams.split(';').map((s) => s.trim())
              : [],
          });
          await this.projectRepository.save(existing);
        } else {
          const project = this.projectRepository.create({
            name: row.name,
            projectType: row.projectType || 'NATIONAL_RD',
            managingDepartment: row.managingDepartment,
            startDate: this.parseDateOrThrow(row.startDate, '사업 시작일'),
            endDate: this.parseDateOrThrow(row.endDate, '사업 종료일'),
            totalBudget: parseFloat(row.totalBudget) || 0,
            personnelBudget: parseFloat(row.personnelBudget) || 0,
            status: row.status || 'IN_PROGRESS',
            legalBasis: {},
            internalRules: {},
            managingTeam: row.managingTeam,
            participatingTeams: row.participatingTeams
              ? row.participatingTeams.split(';').map((s) => s.trim())
              : [],
          });
          await this.projectRepository.save(project);
        }

        result.success++;
      } catch (error) {
        result.failed++;
        this.pushRowError(result.errors, i + 2, error);
      }
    }

    return result;
  }

  async uploadProjectPersonnel(
    data: ProjectPersonnelCsvRow[],
  ): Promise<UploadResult> {
    const result: UploadResult = { success: 0, failed: 0, errors: [] };
    const groups = new Map<string, Array<{ row: ProjectPersonnelCsvRow; rowNumber: number }>>();

    data.forEach((row, index) => {
      const key = `${row.employeeId}::${row.projectName}`;
      const current = groups.get(key) || [];
      current.push({ row, rowNumber: index + 2 });
      groups.set(key, current);
    });

    for (const entries of groups.values()) {
      const first = entries[0];
      try {
        const personnel = await this.personnelRepository.findOne({
          where: { employeeId: first.row.employeeId },
        });
        if (!personnel) {
          throw new Error(`Employee not found: ${first.row.employeeId}`);
        }

        const project = await this.projectRepository.findOne({
          where: { name: first.row.projectName },
        });
        if (!project) {
          throw new Error(`Project not found: ${first.row.projectName}`);
        }

        let pp = await this.projectPersonnelRepository.findOne({
          where: {
            personnel: { id: personnel.id },
            project: { id: project.id },
          },
        });

        const segments = entries
          .map(({ row }, index) =>
            this.projectPersonnelSegmentRepository.create({
              projectPersonnel: pp as ProjectPersonnel,
              startDate: this.parseDateOrThrow(row.startDate, '참여 시작일'),
              endDate: row.endDate
                ? this.parseDateOrThrow(row.endDate, '참여 종료일')
                : this.parseDateOrThrow(row.startDate, '참여 종료일'),
              participationRate: parseFloat(row.participationRate) || 0,
              personnelCostOverride: null,
              sortOrder: index,
              notes: row.notes || null,
            }),
          )
          .sort((left, right) => new Date(left.startDate).getTime() - new Date(right.startDate).getTime());

        if (pp) {
          Object.assign(pp, {
            calculationMethod: first.row.calculationMethod || 'MONTHLY',
            expenseCode: first.row.expenseCode || 'personnel-base',
            legalBasisCode: first.row.legalBasisCode || 'DEFAULT',
            participatingTeam: first.row.participatingTeam || personnel.team,
            role: (first.row.role as any) || 'PARTICIPATING_RESEARCHER',
          });
        } else {
          pp = this.projectPersonnelRepository.create({
            personnel,
            project,
            calculationMethod: first.row.calculationMethod || 'MONTHLY',
            expenseCode: first.row.expenseCode || 'personnel-base',
            legalBasisCode: first.row.legalBasisCode || 'DEFAULT',
            participatingTeam: first.row.participatingTeam || personnel.team,
            role: (first.row.role as any) || 'PARTICIPATING_RESEARCHER',
            participationRate: 0,
            startDate: this.parseDateOrThrow(first.row.startDate, '참여 시작일'),
            endDate: first.row.endDate ? this.parseDateOrThrow(first.row.endDate, '참여 종료일') : null,
            participationMonths: 1,
          });
        }

        pp = await this.projectPersonnelRepository.save(pp);
        await this.projectPersonnelSegmentRepository.delete({ projectPersonnel: { id: pp.id } as any });
        const segmentsToSave = segments.map((segment) =>
          this.projectPersonnelSegmentRepository.create({
            ...segment,
            projectPersonnel: pp,
          }),
        );
        const savedSegments = await this.projectPersonnelSegmentRepository.save(segmentsToSave);
        this.syncLegacyParticipationFromSegments(pp, savedSegments);
        await this.projectPersonnelRepository.save(pp);

        result.success += entries.length;
      } catch (error) {
        result.failed += entries.length;
        entries.forEach(({ rowNumber }) => this.pushRowError(result.errors, rowNumber, error));
      }
    }

    return result;
  }

  async uploadUsers(data: UserCsvRow[]): Promise<UploadResult> {
    const result: UploadResult = { success: 0, failed: 0, errors: [] };

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      try {
        const existing = await this.userRepository.findOne({
          where: { username: row.username },
        });

        const passwordHash = await bcrypt.hash(row.password, 10);

        if (existing) {
          Object.assign(existing, {
            name: row.name,
            role: (row.role as UserRole) || UserRole.GENERAL,
            passwordHash,
          });
          await this.userRepository.save(existing);
        } else {
          const user = this.userRepository.create({
            username: row.username,
            passwordHash,
            name: row.name,
            role: (row.role as UserRole) || UserRole.GENERAL,
            isActive: true,
          });
          await this.userRepository.save(user);
        }

        result.success++;
      } catch (error) {
        result.failed++;
        this.pushRowError(result.errors, i + 2, error);
      }
    }

    return result;
  }

  async uploadTeams(data: TeamCsvRow[]): Promise<UploadResult> {
    const result: UploadResult = { success: 0, failed: 0, errors: [] };

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      try {
        if (!row.name?.trim()) {
          throw new BadRequestException('name is required');
        }

        const name = row.name.trim();
        const existing = await this.teamRepository.findOne({
          where: { name },
        });

        const payload = {
          name,
          department: row.department?.trim() || null,
          description: row.description?.trim() || null,
          managerName: row.managerName?.trim() || null,
          managerEmail: row.managerEmail?.trim() || null,
          managerPhone: row.managerPhone?.trim() || null,
          plannedHeadcount: row.plannedHeadcount
            ? parseInt(row.plannedHeadcount, 10) || null
            : null,
          isActive: row.isActive ? row.isActive.toLowerCase() !== 'false' : true,
        };

        if (existing) {
          Object.assign(existing, payload);
          await this.teamRepository.save(existing);
        } else {
          const team = this.teamRepository.create(payload);
          await this.teamRepository.save(team);
        }

        result.success++;
      } catch (error) {
        result.failed++;
        this.pushRowError(result.errors, i + 2, error);
      }
    }

    return result;
  }
}

