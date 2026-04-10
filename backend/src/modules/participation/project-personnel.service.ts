import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions } from 'typeorm';
import { ProjectPersonnel } from './project-personnel.entity';
import { ProjectPersonnelSegment } from './project-personnel-segment.entity';
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
    @InjectRepository(ProjectPersonnelSegment)
    private projectPersonnelSegmentRepository: Repository<ProjectPersonnelSegment>,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @InjectRepository(Personnel)
    private personnelRepository: Repository<Personnel>,
    private participationCalculationService: ParticipationCalculationService,
    private auditService: AuditService,
  ) {}

  private addMonths(date: Date, months: number): Date {
    const next = new Date(date);
    next.setUTCMonth(next.getUTCMonth() + months);
    return next;
  }

  private deriveEndDate(startDate: Date, participationMonths?: number, explicitEndDate?: string | Date): Date {
    if (explicitEndDate) return new Date(explicitEndDate);
    if (!participationMonths || participationMonths <= 1) return new Date(startDate);
    const next = this.addMonths(startDate, participationMonths);
    next.setUTCDate(next.getUTCDate() - 1);
    return next;
  }

  private countInclusiveMonths(startDate: Date, endDate: Date): number {
    return (
      (endDate.getUTCFullYear() - startDate.getUTCFullYear()) * 12 +
      (endDate.getUTCMonth() - startDate.getUTCMonth()) +
      1
    );
  }

  private validateSegments(segments: ProjectPersonnelSegment[]): void {
    const ordered = [...segments].sort(
      (left, right) => new Date(left.startDate).getTime() - new Date(right.startDate).getTime(),
    );

    ordered.forEach((segment) => {
      this.participationCalculationService.validateParticipationRate(Number(segment.participationRate));
      if (new Date(segment.startDate) > new Date(segment.endDate)) {
        throw new BadRequestException('참여 구간의 시작일은 종료일보다 늦을 수 없습니다.');
      }
    });

    for (let i = 1; i < ordered.length; i += 1) {
      const prevEnd = new Date(ordered[i - 1].endDate);
      const currentStart = new Date(ordered[i].startDate);
      if (currentStart <= prevEnd) {
        throw new BadRequestException('동일 참여자의 참여 구간 기간이 서로 겹칠 수 없습니다.');
      }
    }
  }

  private buildSegmentsFromLegacy(
    projectPersonnel: ProjectPersonnel,
    payload: {
      startDate: string | Date;
      endDate?: string | Date;
      participationRate: number;
      participationMonths?: number;
      personnelCostOverride?: number | null;
    },
  ): ProjectPersonnelSegment[] {
    const startDate = new Date(payload.startDate);
    const endDate = this.deriveEndDate(startDate, payload.participationMonths, payload.endDate);

    return [
      this.projectPersonnelSegmentRepository.create({
        projectPersonnel,
        startDate,
        endDate,
        participationRate: payload.participationRate,
        personnelCostOverride: payload.personnelCostOverride ?? null,
        sortOrder: 0,
        notes: null,
      }),
    ];
  }

  private buildSegments(
    projectPersonnel: ProjectPersonnel,
    createProjectPersonnelDto: CreateProjectPersonnelDto | UpdateProjectPersonnelDto,
    fallback: {
      startDate: string | Date;
      endDate?: string | Date | null;
      participationRate: number;
      participationMonths?: number;
      personnelCostOverride?: number | null;
    },
  ): ProjectPersonnelSegment[] {
    if (!createProjectPersonnelDto.segments || createProjectPersonnelDto.segments.length === 0) {
      return this.buildSegmentsFromLegacy(projectPersonnel, {
        ...fallback,
        endDate: fallback.endDate ?? undefined,
      });
    }

    return createProjectPersonnelDto.segments.map((segment, index) =>
      this.projectPersonnelSegmentRepository.create({
        projectPersonnel,
        startDate: new Date(segment.startDate),
        endDate: new Date(segment.endDate),
        participationRate: Number(segment.participationRate),
        personnelCostOverride:
          segment.personnelCostOverride === undefined || segment.personnelCostOverride === null
            ? null
            : Number(segment.personnelCostOverride),
        sortOrder: segment.sortOrder ?? index,
        notes: segment.notes ?? null,
      }),
    );
  }

  private applyLegacyFieldsFromSegments(
    projectPersonnel: ProjectPersonnel,
    segments: ProjectPersonnelSegment[],
  ): ProjectPersonnel {
    if (!segments.length) {
      projectPersonnel.participationRate = 0;
      projectPersonnel.participationMonths = 0;
      projectPersonnel.startDate = new Date();
      projectPersonnel.endDate = null;
      return projectPersonnel;
    }

    const ordered = [...segments].sort(
      (left, right) => new Date(left.startDate).getTime() - new Date(right.startDate).getTime(),
    );
    const now = new Date();
    const currentSegment = ordered.find((segment) => {
      const startDate = new Date(segment.startDate);
      const endDate = new Date(segment.endDate);
      return startDate <= now && endDate >= now;
    });

    projectPersonnel.startDate = new Date(ordered[0].startDate);
    projectPersonnel.endDate = new Date(ordered[ordered.length - 1].endDate);
    projectPersonnel.participationMonths = ordered.reduce((sum, segment) => {
      return sum + this.countInclusiveMonths(new Date(segment.startDate), new Date(segment.endDate));
    }, 0);
    projectPersonnel.participationRate = Number(currentSegment?.participationRate ?? 0);
    projectPersonnel.personnelCostOverride = ordered.reduce<number | null>((sum, segment) => {
      if (segment.personnelCostOverride === null || segment.personnelCostOverride === undefined) {
        return sum;
      }
      return (sum ?? 0) + Number(segment.personnelCostOverride);
    }, null);

    return projectPersonnel;
  }

  private async replaceSegments(
    projectPersonnel: ProjectPersonnel,
    segments: ProjectPersonnelSegment[],
  ): Promise<ProjectPersonnelSegment[]> {
    this.validateSegments(segments);
    await this.projectPersonnelSegmentRepository.delete({ projectPersonnel: { id: projectPersonnel.id } as any });
    return await this.projectPersonnelSegmentRepository.save(segments);
  }

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
    const project = await this.projectRepository.findOne({
      where: { id: createProjectPersonnelDto.projectId },
    });
    if (!project) {
      throw new NotFoundException(`Project with ID ${createProjectPersonnelDto.projectId} not found`);
    }

    const personnel = await this.personnelRepository.findOne({
      where: { id: createProjectPersonnelDto.personnelId },
    });
    if (!personnel) {
      throw new NotFoundException(`Personnel with ID ${createProjectPersonnelDto.personnelId} not found`);
    }

    const roleToAssign = createProjectPersonnelDto.role || ProjectPersonnelRole.PARTICIPATING_RESEARCHER;
    await this.validateRoleLimits(createProjectPersonnelDto.personnelId, roleToAssign);

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

    this.participationCalculationService.validateParticipationRate(
      createProjectPersonnelDto.participationRate
    );

    let projectPersonnel = this.projectPersonnelRepository.create({
      ...createProjectPersonnelDto,
      project,
      personnel,
      participationMonths: createProjectPersonnelDto.participationMonths ?? 12,
      annualSalary: createProjectPersonnelDto.annualSalary ?? null,
      personnelCostOverride: createProjectPersonnelDto.personnelCostOverride ?? null,
    });

    projectPersonnel = await this.projectPersonnelRepository.save(projectPersonnel);

    const segments = this.buildSegments(projectPersonnel, createProjectPersonnelDto, {
      startDate: createProjectPersonnelDto.startDate,
      endDate: createProjectPersonnelDto.endDate,
      participationRate: createProjectPersonnelDto.participationRate,
      participationMonths: createProjectPersonnelDto.participationMonths,
      personnelCostOverride: createProjectPersonnelDto.personnelCostOverride,
    });
    const savedSegments = await this.replaceSegments(projectPersonnel, segments);

    projectPersonnel.segments = savedSegments;
    projectPersonnel = this.applyLegacyFieldsFromSegments(projectPersonnel, savedSegments);
    const savedProjectPersonnel = await this.projectPersonnelRepository.save(projectPersonnel);

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
    const projectPersonnels = await this.projectPersonnelRepository.find({
      relations: ['project', 'personnel'],
      ...options,
    });

    for (const projectPersonnel of projectPersonnels) {
      const segments = await this.projectPersonnelSegmentRepository.find({
        where: { projectPersonnel: { id: projectPersonnel.id } as any },
        order: { sortOrder: 'ASC', startDate: 'ASC' },
      });
      projectPersonnel.segments = segments.length
        ? segments
        : this.buildSegmentsFromLegacy(projectPersonnel, {
            startDate: projectPersonnel.startDate,
            endDate: projectPersonnel.endDate ?? undefined,
            participationRate: Number(projectPersonnel.participationRate),
            participationMonths: projectPersonnel.participationMonths,
            personnelCostOverride: projectPersonnel.personnelCostOverride,
          });
    }

    return projectPersonnels;
  }

  async findOne(id: string): Promise<ProjectPersonnel> {
    const projectPersonnel = await this.projectPersonnelRepository.findOne({
      where: { id },
      relations: ['project', 'personnel'],
    });
    if (!projectPersonnel) {
      throw new NotFoundException(`ProjectPersonnel with ID ${id} not found`);
    }

    const segments = await this.projectPersonnelSegmentRepository.find({
      where: { projectPersonnel: { id } as any },
      order: { sortOrder: 'ASC', startDate: 'ASC' },
    });
    projectPersonnel.segments = segments.length
      ? segments
      : this.buildSegmentsFromLegacy(projectPersonnel, {
          startDate: projectPersonnel.startDate,
          endDate: projectPersonnel.endDate ?? undefined,
          participationRate: Number(projectPersonnel.participationRate),
          participationMonths: projectPersonnel.participationMonths,
          personnelCostOverride: projectPersonnel.personnelCostOverride,
        });

    return projectPersonnel;
  }

  async update(id: string, updateData: UpdateProjectPersonnelDto): Promise<ProjectPersonnel> {
    const projectPersonnel = await this.findOne(id);
    
    if (updateData.participationRate !== undefined) {
      this.participationCalculationService.validateParticipationRate(updateData.participationRate);

      // 개인 총 참여율 100% 초과 허용 정책: 개별 참여율 유효성(0~100)만 검증
    }

    if (updateData.role !== undefined) {
      await this.validateRoleLimits(
        projectPersonnel.personnel.id,
        updateData.role,
        projectPersonnel.id,
      );
    }

    Object.assign(projectPersonnel, updateData);

    if (updateData.segments !== undefined) {
      const nextSegments = this.buildSegments(projectPersonnel, updateData, {
        startDate: updateData.startDate || projectPersonnel.startDate,
        endDate: updateData.endDate || projectPersonnel.endDate || undefined,
        participationRate:
          updateData.participationRate !== undefined
            ? updateData.participationRate
            : Number(projectPersonnel.participationRate),
        participationMonths:
          updateData.participationMonths !== undefined
            ? updateData.participationMonths
            : projectPersonnel.participationMonths,
        personnelCostOverride:
          updateData.personnelCostOverride !== undefined
            ? updateData.personnelCostOverride
            : projectPersonnel.personnelCostOverride,
      });
      const savedSegments = await this.replaceSegments(projectPersonnel, nextSegments);
      projectPersonnel.segments = savedSegments;
      this.applyLegacyFieldsFromSegments(projectPersonnel, savedSegments);
    } else if ((projectPersonnel.segments?.length || 0) <= 1 && (
      updateData.startDate !== undefined ||
      updateData.endDate !== undefined ||
      updateData.participationRate !== undefined ||
      updateData.participationMonths !== undefined ||
      updateData.personnelCostOverride !== undefined
    )) {
      const nextSegments = this.buildSegmentsFromLegacy(projectPersonnel, {
        startDate: updateData.startDate || projectPersonnel.startDate,
        endDate: updateData.endDate || projectPersonnel.endDate || undefined,
        participationRate:
          updateData.participationRate !== undefined
            ? updateData.participationRate
            : Number(projectPersonnel.participationRate),
        participationMonths:
          updateData.participationMonths !== undefined
            ? updateData.participationMonths
            : projectPersonnel.participationMonths,
        personnelCostOverride:
          updateData.personnelCostOverride !== undefined
            ? updateData.personnelCostOverride
            : projectPersonnel.personnelCostOverride,
      });
      const savedSegments = await this.replaceSegments(projectPersonnel, nextSegments);
      projectPersonnel.segments = savedSegments;
      this.applyLegacyFieldsFromSegments(projectPersonnel, savedSegments);
    }
    
    projectPersonnel.version += 1;
    
    const updated = await this.projectPersonnelRepository.save(projectPersonnel);
    
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
    
    await this.projectPersonnelRepository.remove(projectPersonnel);
    
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

  async calculatePersonnelCost(
    projectPersonnelId: string,
    fiscalYear: number,
    fiscalMonth: number,
  ): Promise<{ amount: number; details: Record<string, any> }> {
    const projectPersonnel = await this.findOne(projectPersonnelId);
    
    const monthlyCost = this.participationCalculationService.calculateMonthlyCost(
      projectPersonnel.personnel,
      projectPersonnel,
      1,
    );
    
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
      expenseItem: 'base-salary',
      insuranceCoverage: 'EMPLOYER_PART',
      documentStatus: 'NOT_SUBMITTED',
    };
    
    return {
      amount: monthlyCost,
      details: personnelCost,
    };
  }

  async getTotalParticipationRate(personnelId: string): Promise<number> {
    const projectPersonnels = await this.findByPersonnelId(personnelId);
    
    const totalRate = projectPersonnels
      .filter(pp => !pp.endDate || pp.endDate > new Date())
      .reduce((sum, pp) => sum + pp.participationRate, 0);
      
    return totalRate;
  }
}
