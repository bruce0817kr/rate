import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions } from 'typeorm';
import { Project } from './project.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { ProjectPersonnel } from '../participation/project-personnel.entity';
import { ProjectPersonnelSegment } from '../participation/project-personnel-segment.entity';
import { SalaryBand } from '../salary-bands/salary-band.entity';

@Injectable()
export class ProjectService {
  constructor(
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @InjectRepository(ProjectPersonnel)
    private projectPersonnelRepository: Repository<ProjectPersonnel>,
    @InjectRepository(ProjectPersonnelSegment)
    private projectPersonnelSegmentRepository: Repository<ProjectPersonnelSegment>,
    @InjectRepository(SalaryBand)
    private salaryBandRepository: Repository<SalaryBand>,
  ) {}

  private resolveFiscalYear(dto: Pick<CreateProjectDto, 'fiscalYear' | 'startDate'>): number {
    if (dto.fiscalYear) return Number(dto.fiscalYear);
    const parsed = new Date(dto.startDate);
    return Number.isNaN(parsed.getTime()) ? new Date().getFullYear() : parsed.getUTCFullYear();
  }

  async createProject(createProjectDto: CreateProjectDto): Promise<Project> {
    const fiscalYear = this.resolveFiscalYear(createProjectDto);
    // Check if project with same name already exists
    const existingProject = await this.projectRepository.findOne({
      where: { name: createProjectDto.name, fiscalYear },
    });

    if (existingProject) {
      throw new ConflictException(`Project with name ${createProjectDto.name} already exists for ${fiscalYear}`);
    }

    // Create new project entity
    const project = this.projectRepository.create({
      ...createProjectDto,
      fiscalYear,
      status: createProjectDto.status ?? 'PLANNING',
      legalBasis: createProjectDto.legalBasis ?? {},
      internalRules: createProjectDto.internalRules ?? {},
    });

    return await this.projectRepository.save(project);
  }

  async findAllProjects(options: FindManyOptions<Project> = {}, fiscalYear?: number): Promise<Project[]> {
    return await this.projectRepository.find({
      ...options,
      where: {
        ...(options.where as Record<string, any> || {}),
        ...(fiscalYear ? { fiscalYear } : {}),
      },
    });
  }

  async findProjectById(id: string): Promise<Project> {
    const project = await this.projectRepository.findOne({ where: { id } });
    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }
    return project;
  }

  async updateProject(id: string, updateData: Partial<CreateProjectDto>): Promise<Project> {
    const project = await this.findProjectById(id);
    
    // Merge update data
    Object.assign(project, updateData);
    if (updateData.fiscalYear !== undefined || updateData.startDate !== undefined) {
      project.fiscalYear = updateData.fiscalYear ?? this.resolveFiscalYear({
        fiscalYear: undefined,
        startDate: String(updateData.startDate || project.startDate),
      });
    }
    
    return await this.projectRepository.save(project);
  }

  async removeProject(id: string): Promise<void> {
    const result = await this.projectRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }
  }

  async findProjectsByManagingTeam(team: string): Promise<Project[]> {
    return await this.projectRepository.find({
      where: { managingTeam: team },
    });
  }

  async findProjectsByParticipatingTeam(team: string): Promise<Project[]> {
    return await this.projectRepository.find({
      where: { participatingTeams: team },
    });
  }

  async getDepartmentRevenueSummary(fiscalYear?: number): Promise<any[]> {
    const qb = this.projectRepository.createQueryBuilder('p');
    if (fiscalYear) {
      qb.where('p."fiscalYear" = :fiscalYear', { fiscalYear });
    }
    const projects = await qb.getMany();

    const teamMap = new Map<string, {
      team: string;
      projectCount: number;
      expectedPersonnelRevenue: number;
      expectedIndirectRevenue: number;
      projects: { name: string; budgetStatus: string | null; expectedPersonnelRevenue: number | null; expectedIndirectRevenue: number | null; totalBudget: number; fundingSources: Record<string, number> | null }[];
    }>();

    for (const p of projects) {
      if (!p.managingTeam) continue;
      if (!teamMap.has(p.managingTeam)) {
        teamMap.set(p.managingTeam, {
          team: p.managingTeam,
          projectCount: 0,
          expectedPersonnelRevenue: 0,
          expectedIndirectRevenue: 0,
          projects: [],
        });
      }
      const entry = teamMap.get(p.managingTeam)!;
      entry.projectCount += 1;
      entry.expectedPersonnelRevenue += Number(p.expectedPersonnelRevenue ?? 0);
      entry.expectedIndirectRevenue += Number(p.expectedIndirectRevenue ?? 0);
      entry.projects.push({
        name: p.name,
        budgetStatus: p.budgetStatus,
        expectedPersonnelRevenue: p.expectedPersonnelRevenue ? Number(p.expectedPersonnelRevenue) : null,
        expectedIndirectRevenue: p.expectedIndirectRevenue ? Number(p.expectedIndirectRevenue) : null,
        totalBudget: Number(p.totalBudget),
        fundingSources: p.fundingSources,
      });
    }

    return Array.from(teamMap.values()).sort((a, b) => a.team.localeCompare(b.team, 'ko'));
  }

  private shiftDateToYear(value: Date | string | null | undefined, targetYear: number): Date | null {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return new Date(Date.UTC(targetYear, date.getUTCMonth(), date.getUTCDate()));
  }

  async copyFiscalYear(sourceYear: number, targetYear: number): Promise<{
    salaryBandsCreated: number;
    projectsCreated: number;
    assignmentsCreated: number;
  }> {
    if (!sourceYear || !targetYear || sourceYear === targetYear) {
      throw new ConflictException('sourceYear and targetYear must be different valid years');
    }

    const sourceSalaryBands = await this.salaryBandRepository.find({
      where: { fiscalYear: sourceYear, isActive: true },
    });
    let salaryBandsCreated = 0;
    for (const band of sourceSalaryBands) {
      const existing = await this.salaryBandRepository.findOne({
        where: { position: band.position, fiscalYear: targetYear },
      });
      if (existing) continue;
      await this.salaryBandRepository.save(
        this.salaryBandRepository.create({
          position: band.position,
          fiscalYear: targetYear,
          averageAnnualSalary: band.averageAnnualSalary,
          isActive: band.isActive,
        }),
      );
      salaryBandsCreated += 1;
    }

    const sourceProjects = await this.projectRepository.find({ where: { fiscalYear: sourceYear } });
    const projectMap = new Map<string, Project>();
    let projectsCreated = 0;

    for (const project of sourceProjects) {
      let targetProject = await this.projectRepository.findOne({
        where: { name: project.name, fiscalYear: targetYear },
      });
      if (!targetProject) {
        targetProject = await this.projectRepository.save(
          this.projectRepository.create({
            name: project.name,
            fiscalYear: targetYear,
            projectType: project.projectType,
            managingDepartment: project.managingDepartment,
            startDate: this.shiftDateToYear(project.startDate, targetYear) || new Date(Date.UTC(targetYear, 0, 1)),
            endDate: this.shiftDateToYear(project.endDate, targetYear) || new Date(Date.UTC(targetYear, 11, 31)),
            totalBudget: project.totalBudget,
            personnelBudget: project.personnelBudget,
            personnelCostFinalTotal: project.personnelCostFinalTotal,
            status: project.status,
            legalBasis: project.legalBasis,
            internalRules: project.internalRules,
            managingTeam: project.managingTeam,
            participatingTeams: project.participatingTeams,
          }),
        );
        projectsCreated += 1;
      }
      projectMap.set(project.id, targetProject);
    }

    const sourceAssignments = await this.projectPersonnelRepository.find({
      where: { fiscalYear: sourceYear },
      relations: ['project', 'personnel', 'segments'],
    });
    let assignmentsCreated = 0;

    for (const assignment of sourceAssignments) {
      const targetProject = projectMap.get(assignment.project.id);
      if (!targetProject) continue;

      const existing = await this.projectPersonnelRepository.findOne({
        where: {
          project: { id: targetProject.id },
          personnel: { id: assignment.personnel.id },
          fiscalYear: targetYear,
        },
      });
      if (existing) continue;

      const copiedAssignment = await this.projectPersonnelRepository.save(
        this.projectPersonnelRepository.create({
          project: targetProject,
          personnel: assignment.personnel,
          participationRate: assignment.participationRate,
          fiscalYear: targetYear,
          startDate: this.shiftDateToYear(assignment.startDate, targetYear) || targetProject.startDate,
          endDate: this.shiftDateToYear(assignment.endDate, targetYear),
          calculationMethod: assignment.calculationMethod,
          expenseCode: assignment.expenseCode,
          legalBasisCode: assignment.legalBasisCode,
          participatingTeam: assignment.participatingTeam,
          role: assignment.role,
          actualAnnualSalaryOverride: assignment.actualAnnualSalaryOverride,
          participationMonths: assignment.participationMonths,
          personnelCostOverride: assignment.personnelCostOverride,
          notes: assignment.notes,
          version: 1,
        }),
      );

      const segments = (assignment.segments || []).map((segment) =>
        this.projectPersonnelSegmentRepository.create({
          projectPersonnel: copiedAssignment,
          startDate: this.shiftDateToYear(segment.startDate, targetYear) || copiedAssignment.startDate,
          endDate: this.shiftDateToYear(segment.endDate, targetYear) || copiedAssignment.endDate || copiedAssignment.startDate,
          participationRate: segment.participationRate,
          personnelCostOverride: segment.personnelCostOverride,
          sortOrder: segment.sortOrder,
          notes: segment.notes,
        }),
      );
      if (segments.length > 0) {
        await this.projectPersonnelSegmentRepository.save(segments);
      }
      assignmentsCreated += 1;
    }

    return { salaryBandsCreated, projectsCreated, assignmentsCreated };
  }
}
