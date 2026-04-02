import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions } from 'typeorm';
import { ProjectPersonnel } from './project-personnel.entity';
import { ProjectPersonnelRole } from './project-personnel-role.enum';
import { Project } from '../projects/project.entity';
import { Personnel } from '../personnel/personnel.entity';
import { CreateProjectPersonnelDto } from './dto/create-project-personnel.dto';
import { UpdateProjectPersonnelDto } from './dto/update-project-personnel.dto';
import { ParticipationCalculationService } from './participation-calculation.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class ProjectPersonnelService {
  constructor(
    @InjectRepository(ProjectPersonnel)
    private projectPersonnelRepository: Repository<ProjectPersonnel>,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @InjectRepository(Personnel)
    private personnelRepository: Repository<Personnel>,
    private participationCalculationService: ParticipationCalculationService,
    private auditService: AuditService,
  ) {}

  private async validateRoleLimits(
    personnelId: string,
    newRole: ProjectPersonnelRole,
    excludeProjectPersonnelId?: string,
  ): Promise<void> {
    const existingParticipations = await this.projectPersonnelRepository.find({
      where: { personnel: { id: personnelId } },
      relations: ['project'],
    });

    let activeParticipations = existingParticipations.filter(
      pp => !pp.endDate || pp.endDate > new Date(),
    );

    if (excludeProjectPersonnelId) {
      activeParticipations = activeParticipations.filter(pp => pp.id !== excludeProjectPersonnelId);
    }

    const piCount = activeParticipations.filter(
      pp => pp.role === ProjectPersonnelRole.PRINCIPAL_INVESTIGATOR,
    ).length;

    const totalRoles = activeParticipations.length;

    const newRoleIsPI = newRole === ProjectPersonnelRole.PRINCIPAL_INVESTIGATOR;
    const wouldBePI = newRoleIsPI ? piCount + 1 : piCount;
    const wouldBeTotal = totalRoles + 1;

    if (wouldBePI > 3) {
      throw new BadRequestException(
        `연구책임자 역할이 ${wouldBePI}개가 됩니다. 한 사람이 연구책임자로 참여할 수 있는 프로젝트는 최대 3개입니다.`,
      );
    }

    if (wouldBeTotal > 5) {
      throw new BadRequestException(
        `총 역할 수가 ${wouldBeTotal}개가 됩니다. 한 사람이 참여할 수 있는 총 역할(연구책임자+공동연구원+참여연구원)은 최대 5개입니다.`,
      );
    }
  }

  async createProjectPersonnel(createProjectPersonnelDto: CreateProjectPersonnelDto): Promise<ProjectPersonnel> {
    // Validate that the project exists
    const project = await this.projectRepository.findOne({
      where: { id: createProjectPersonnelDto.projectId },
    });
    if (!project) {
      throw new NotFoundException(`Project with ID ${createProjectPersonnelDto.projectId} not found`);
    }

    // Validate that the personnel exists
    const personnel = await this.personnelRepository.findOne({
      where: { id: createProjectPersonnelDto.personnelId },
    });
    if (!personnel) {
      throw new NotFoundException(`Personnel with ID ${createProjectPersonnelDto.personnelId} not found`);
    }

    // Validate role limits (max 3 PI, max 5 total)
    const roleToAssign = createProjectPersonnelDto.role || ProjectPersonnelRole.PARTICIPATING_RESEARCHER;
    await this.validateRoleLimits(createProjectPersonnelDto.personnelId, roleToAssign);

    // Check if this specific project-personnel combination already exists
    const existing = await this.projectPersonnelRepository.findOne({
      where: {
        project: { id: createProjectPersonnelDto.projectId },
        personnel: { id: createProjectPersonnelDto.personnelId },
      },
    });
    if (existing) {
      throw new ConflictException(
        `Personnel ${createProjectPersonnelDto.personnelId} is already assigned to project ${createProjectPersonnelDto.projectId}`
      );
    }

    // Validate participation rate is within bounds (0-100)
    this.participationCalculationService.validateParticipationRate(
      createProjectPersonnelDto.participationRate
    );

    // Create new project-personnel entity
    const projectPersonnel = this.projectPersonnelRepository.create({
      ...createProjectPersonnelDto,
      project,
      personnel,
    });

    const savedProjectPersonnel = await this.projectPersonnelRepository.save(projectPersonnel);

    // Log to audit trail
    await this.auditService.logChange(
      'ProjectPersonnel',
      savedProjectPersonnel.id,
      'CREATE',
      {
        projectId: createProjectPersonnelDto.projectId,
        personnelId: createProjectPersonnelDto.personnelId,
        participationRate: createProjectPersonnelDto.participationRate,
      },
      'SYSTEM',
    );

    return savedProjectPersonnel;
  }

  async findAll(options: FindManyOptions<ProjectPersonnel> = {}): Promise<ProjectPersonnel[]> {
    return await this.projectPersonnelRepository.find(options);
  }

  async findOne(id: string): Promise<ProjectPersonnel> {
    const projectPersonnel = await this.projectPersonnelRepository.findOne({
      where: { id },
      relations: ['project', 'personnel'],
    });
    if (!projectPersonnel) {
      throw new NotFoundException(`ProjectPersonnel with ID ${id} not found`);
    }
    return projectPersonnel;
  }

  async update(id: string, updateData: UpdateProjectPersonnelDto): Promise<ProjectPersonnel> {
    const projectPersonnel = await this.findOne(id);
    
    if (updateData.participationRate !== undefined) {
      this.participationCalculationService.validateParticipationRate(updateData.participationRate);
    }

    if (updateData.role !== undefined) {
      await this.validateRoleLimits(
        projectPersonnel.personnel.id,
        updateData.role,
        projectPersonnel.id,
      );
    }

    Object.assign(projectPersonnel, updateData);
    
    // Increment version for optimistic locking
    projectPersonnel.version += 1;
    
    const updated = await this.projectPersonnelRepository.save(projectPersonnel);
    
    // Log to audit trail
    await this.auditService.logChange(
      'ProjectPersonnel',
      id,
      'UPDATE',
      {
        changes: updateData,
        newVersion: projectPersonnel.version,
      },
      'SYSTEM',
    );

    return updated;
  }

  async remove(id: string): Promise<void> {
    const projectPersonnel = await this.findOne(id);
    
    const result = await this.projectPersonnelRepository.remove(projectPersonnel);
    
    // Log to audit trail
    await this.auditService.logChange(
      'ProjectPersonnel',
      id,
      'DELETE',
      {
        projectId: projectPersonnel.project.id,
        personnelId: projectPersonnel.personnel.id,
        participationRate: projectPersonnel.participationRate,
      },
      'SYSTEM',
    );
  }

  async findByProjectId(projectId: string): Promise<ProjectPersonnel[]> {
    return await this.projectPersonnelRepository.find({
      where: { project: { id: projectId } },
      relations: ['personnel'],
    });
  }

  async findByPersonnelId(personnelId: string): Promise<ProjectPersonnel[]> {
    return await this.projectPersonnelRepository.find({
      where: { personnel: { id: personnelId } },
      relations: ['project'],
    });
  }

  /**
   * Calculate the personnel cost for a specific project-personnel assignment
   * @param projectPersonnelId - The ID of the project-personnel assignment
   * @param fiscalYear - The fiscal year to calculate for
   * @param fiscalMonth - The fiscal month to calculate for (1-12)
   * @returns Calculated personnel cost
   */
  async calculatePersonnelCost(
    projectPersonnelId: string,
    fiscalYear: number,
    fiscalMonth: number,
  ): Promise<{ amount: number; details: Record<string, any> }> {
    const projectPersonnel = await this.findOne(projectPersonnelId);
    
    // Calculate the monthly cost
    const monthlyCost = this.participationCalculationService.calculateMonthlyCost(
      projectPersonnel.personnel,
      projectPersonnel,
      1, // Calculate for 1 month
    );
    
    // Create personnel cost record
    const personnelCost = {
      projectPersonnelId,
      fiscalYear,
      fiscalMonth,
      calculationDate: new Date(),
      baseSalary: this.participationCalculationService.getSalaryBandMidpoint(
        projectPersonnel.personnel.salaryBand
      ),
      appliedParticipationRate: projectPersonnel.participationRate,
      calculatedAmount: monthlyCost,
      expenseItem: 'base-salary', // This would come from the expenseCode in a real implementation
      insuranceCoverage: 'EMPLOYER_PART', // Simplified
      documentStatus: 'NOT_SUBMITTED',
    };
    
    return {
      amount: monthlyCost,
      details: personnelCost,
    };
  }

  /**
   * Get total participation rate for a specific personnel across all active projects
   * @param personnelId - The ID of the personnel
   * @returns Total participation rate percentage
   */
  async getTotalParticipationRate(personnelId: string): Promise<number> {
    const projectPersonnels = await this.findByPersonnelId(personnelId);
    
    // Sum only active participations (those without end date or with future end date)
    const totalRate = projectPersonnels
      .filter(pp => !pp.endDate || pp.endDate > new Date())
      .reduce((sum, pp) => sum + pp.participationRate, 0);
      
    return totalRate;
  }
}