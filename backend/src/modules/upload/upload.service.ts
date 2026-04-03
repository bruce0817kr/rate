import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Personnel } from '../personnel/personnel.entity';
import { Project } from '../projects/project.entity';
import { ProjectPersonnel } from '../participation/project-personnel.entity';
import { User, UserRole } from '../users/user.entity';
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
  salaryBand: string;
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
}

export interface UserCsvRow {
  username: string;
  password: string;
  name: string;
  role: string;
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
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async uploadPersonnel(data: PersonnelCsvRow[]): Promise<UploadResult> {
    const result: UploadResult = { success: 0, failed: 0, errors: [] };

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      try {
        const existing = await this.personnelRepository.findOne({
          where: { employeeId: row.employeeId },
        });

        if (existing) {
          Object.assign(existing, {
            name: row.name,
            gender: row.gender,
            highestEducation: row.highestEducation,
            educationYear: parseInt(row.educationYear) || null,
            nationalResearcherNumber: row.nationalResearcherNumber,
            birthDate: new Date(row.birthDate),
            department: row.department,
            team: row.team,
            position: row.position,
            salaryBand: row.salaryBand,
            employmentType: row.employmentType || 'FULL_TIME',
            hireDate: new Date(row.hireDate),
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
            educationYear: parseInt(row.educationYear) || undefined,
            nationalResearcherNumber: row.nationalResearcherNumber,
            birthDate: new Date(row.birthDate),
            ssn: 'ENC_SKIP',
            department: row.department,
            team: row.team,
            position: row.position,
            salaryBand: row.salaryBand,
            employmentType: row.employmentType || 'FULL_TIME',
            hireDate: new Date(row.hireDate),
            isActive: true,
            salaryValidity: {
              startDate: new Date(),
              endDate: null,
            },
          });
          await this.personnelRepository.save(personnel);
        }
        result.success++;
      } catch (error) {
        result.failed++;
        result.errors.push(`Row ${i + 2}: ${error.message}`);
      }
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
            startDate: new Date(row.startDate),
            endDate: new Date(row.endDate),
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
            startDate: new Date(row.startDate),
            endDate: new Date(row.endDate),
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
        result.errors.push(`Row ${i + 2}: ${error.message}`);
      }
    }

    return result;
  }

  async uploadProjectPersonnel(data: ProjectPersonnelCsvRow[]): Promise<UploadResult> {
    const result: UploadResult = { success: 0, failed: 0, errors: [] };

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      try {
        const personnel = await this.personnelRepository.findOne({
          where: { employeeId: row.employeeId },
        });
        if (!personnel) {
          throw new Error(`Employee not found: ${row.employeeId}`);
        }

        const project = await this.projectRepository.findOne({
          where: { name: row.projectName },
        });
        if (!project) {
          throw new Error(`Project not found: ${row.projectName}`);
        }

        let pp = await this.projectPersonnelRepository.findOne({
          where: {
            personnel: { id: personnel.id },
            project: { id: project.id },
          },
        });

        const participationRate = parseFloat(row.participationRate);

        if (pp) {
          Object.assign(pp, {
            participationRate,
            startDate: new Date(row.startDate),
            endDate: row.endDate ? new Date(row.endDate) : null,
            calculationMethod: row.calculationMethod || 'MONTHLY',
            expenseCode: row.expenseCode || 'personnel-base',
            legalBasisCode: row.legalBasisCode || '고등과학기술촉진법',
            participatingTeam: row.participatingTeam || personnel.team,
            role: (row.role as any) || 'PARTICIPATING_RESEARCHER',
          });
          await this.projectPersonnelRepository.save(pp);
        } else {
          pp = this.projectPersonnelRepository.create({
            personnel,
            project,
            participationRate,
            startDate: new Date(row.startDate),
            endDate: row.endDate ? new Date(row.endDate) : null,
            calculationMethod: row.calculationMethod || 'MONTHLY',
            expenseCode: row.expenseCode || 'personnel-base',
            legalBasisCode: row.legalBasisCode || '고등과학기술촉진법',
            participatingTeam: row.participatingTeam || personnel.team,
            role: (row.role as any) || 'PARTICIPATING_RESEARCHER',
          });
          await this.projectPersonnelRepository.save(pp);
        }
        result.success++;
      } catch (error) {
        result.failed++;
        result.errors.push(`Row ${i + 2}: ${error.message}`);
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
        result.errors.push(`Row ${i + 2}: ${error.message}`);
      }
    }

    return result;
  }
}
