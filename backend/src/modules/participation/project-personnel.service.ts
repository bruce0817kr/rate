import { Injectable, NotFoundException, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions, FindOptionsWhere } from 'typeorm';
import { ProjectPersonnel } from './project-personnel.entity';
import { ProjectPersonnelSegment } from './project-personnel-segment.entity';
import { ProjectPersonnelRole } from './project-personnel-role.enum';
import { Project } from '../projects/project.entity';
import { Personnel } from '../personnel/personnel.entity';
import { UserRole } from '../users/user.entity';
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

  private canManageActualSalary(viewer?: { role?: UserRole; canManageActualSalary?: boolean } | null): boolean {
    return !!viewer && (viewer.role === UserRole.ADMIN || viewer.canManageActualSalary === true);
  }

  private maskActualSalaryOverride<T extends ProjectPersonnel>(projectPersonnel: T, viewer?: { role?: UserRole; canManageActualSalary?: boolean } | null): T {
    if (this.canManageActualSalary(viewer)) {
      return projectPersonnel;
    }

    return {
      ...projectPersonnel,
      actualAnnualSalaryOverride: null,
    };
  }

  private maskActualSalaryOverrides(
    projectPersonnels: ProjectPersonnel[],
    viewer?: { role?: UserRole; canManageActualSalary?: boolean } | null,
  ): ProjectPersonnel[] {
    return projectPersonnels.map((item) => this.maskActualSalaryOverride(item, viewer));
  }

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

  private isActiveOn(date: Date, startDate: Date, endDate: Date | null | undefined): boolean {
    return startDate <= date && (!endDate || endDate >= date);
  }

  private getParticipationWindows(projectPersonnel: ProjectPersonnel): Array<{
    startDate: Date;
    endDate: Date | null;
    participationRate: number;
  }> {
    const persistedSegments = projectPersonnel.segments?.filter((segment) => segment?.startDate && segment?.endDate) ?? [];
    if (persistedSegments.length) {
      return persistedSegments.map((segment) => ({
        startDate: new Date(segment.startDate),
        endDate: new Date(segment.endDate),
        participationRate: Number(segment.participationRate),
      }));
    }

    return [{
      startDate: new Date(projectPersonnel.startDate),
      endDate: projectPersonnel.endDate ? new Date(projectPersonnel.endDate) : null,
      participationRate: Number(projectPersonnel.participationRate),
    }];
  }

  private getWindowBoundaryPoints(
    windows: Array<{ startDate: Date; endDate: Date | null | undefined }>,
  ): Date[] {
    const points = windows.flatMap((window) => [window.startDate, window.endDate]).filter((date): date is Date => !!date);
    return Array.from(new Map(points.map((date) => [date.getTime(), date])).values());
  }

  private getActiveWindowRateAt(
    windows: Array<{ startDate: Date; endDate: Date | null; participationRate: number }>,
    point: Date,
  ): number {
    return windows.reduce((sum, window) => {
      if (this.isActiveOn(point, window.startDate, window.endDate)) {
        return sum + Number(window.participationRate);
      }
      return sum;
    }, 0);
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
    const hasSegmentsKey = Object.prototype.hasOwnProperty.call(createProjectPersonnelDto, 'segments');
    if (!hasSegmentsKey) {
      return this.buildSegmentsFromLegacy(projectPersonnel, {
        ...fallback,
        endDate: fallback.endDate ?? undefined,
      });
    }

    const providedSegments = createProjectPersonnelDto.segments;
    if (!Array.isArray(providedSegments) || providedSegments.length === 0) {
      throw new BadRequestException('segments must contain at least one segment when provided');
    }

    return providedSegments.map((segment, index) =>
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
    await this.projectPersonnelSegmentRepository.delete({
      projectPersonnel: { id: projectPersonnel.id },
    } as FindOptionsWhere<ProjectPersonnelSegment>);
    return await this.projectPersonnelSegmentRepository.save(segments);
  }

  private resolveFiscalYear(
    project: Project,
    dto?: { fiscalYear?: number; startDate?: string | Date },
  ): number {
    if (dto?.fiscalYear) return Number(dto.fiscalYear);
    if (project.fiscalYear) return Number(project.fiscalYear);
    const parsed = new Date(dto?.startDate || project.startDate);
    return Number.isNaN(parsed.getTime()) ? new Date().getFullYear() : parsed.getUTCFullYear();
  }

  private async validateRoleLimits(
    personnelId: string,
    newRole: ProjectPersonnelRole,
    candidateWindows: Array<{ startDate: Date; endDate: Date | null }>,
    excludeProjectPersonnelId?: string,
  ): Promise<void> {
    const existingParticipations = await this.projectPersonnelRepository.find({
      where: { personnel: { id: personnelId } },
      relations: ['project', 'segments'],
    });

    const comparableParticipations = excludeProjectPersonnelId
      ? existingParticipations.filter((pp) => pp.id !== excludeProjectPersonnelId)
      : existingParticipations;
    const existingWindowsByParticipation = comparableParticipations.map((participation) => ({
      participation,
      windows: this.getParticipationWindows(participation),
    }));
    const boundaryPoints = this.getWindowBoundaryPoints([
      ...candidateWindows,
      ...existingWindowsByParticipation.flatMap((item) => item.windows),
    ]);
    const newRoleIsPI = newRole === ProjectPersonnelRole.PRINCIPAL_INVESTIGATOR;

    boundaryPoints.forEach((point) => {
      const candidateIsActive = candidateWindows.some((window) =>
        this.isActiveOn(point, window.startDate, window.endDate),
      );
      if (!candidateIsActive) {
        return;
      }

      const activeParticipations = existingWindowsByParticipation.filter((item) =>
        item.windows.some((window) => this.isActiveOn(point, window.startDate, window.endDate)),
      );
      const piCount = activeParticipations.filter(
        (item) => item.participation.role === ProjectPersonnelRole.PRINCIPAL_INVESTIGATOR,
      ).length;
      const wouldBePI = newRoleIsPI ? piCount + 1 : piCount;
      const wouldBeTotal = activeParticipations.length + 1;

      if (wouldBePI > 3) {
        throw new BadRequestException(
          `Principal investigator assignments cannot exceed 3 active projects, got: ${wouldBePI}`,
        );
      }

      if (wouldBeTotal > 5) {
        throw new BadRequestException(
          `Active project assignments cannot exceed 5, got: ${wouldBeTotal}`,
        );
      }
    });
  }

  private async validateTotalParticipationWindows(
    personnelId: string,
    candidateWindows: Array<{ startDate: Date; endDate: Date | null; participationRate: number }>,
    excludeProjectPersonnelId?: string,
  ): Promise<void> {
    const existingParticipations = await this.projectPersonnelRepository.find({
      where: { personnel: { id: personnelId } },
      relations: ['segments'],
    });

    const comparableParticipations = excludeProjectPersonnelId
      ? existingParticipations.filter((pp) => pp.id !== excludeProjectPersonnelId)
      : existingParticipations;

    const existingWindows = comparableParticipations.flatMap((participation) =>
      this.getParticipationWindows(participation),
    );
    const boundaryPoints = this.getWindowBoundaryPoints([...candidateWindows, ...existingWindows]);

    boundaryPoints.forEach((point) => {
      const candidateRate = this.getActiveWindowRateAt(candidateWindows, point);
      if (candidateRate === 0) {
        return;
      }
      const existingRate = this.getActiveWindowRateAt(existingWindows, point);
      this.participationCalculationService.validateTotalParticipationRate(candidateRate + existingRate);
    });
  }

  async createProjectPersonnel(
    createProjectPersonnelDto: CreateProjectPersonnelDto,
    viewer?: { role?: UserRole; canManageActualSalary?: boolean } | null,
  ): Promise<ProjectPersonnel> {
    if (
      createProjectPersonnelDto.actualAnnualSalaryOverride !== undefined &&
      !this.canManageActualSalary(viewer)
    ) {
      throw new ForbiddenException('Actual annual salary override is not allowed for this user');
    }

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

    const roleToAssign = createProjectPersonnelDto.role || ProjectPersonnelRole.PARTICIPATING_RESEARCHER;
    let projectPersonnel = this.projectPersonnelRepository.create({
      ...createProjectPersonnelDto,
      project,
      personnel,
      fiscalYear: this.resolveFiscalYear(project, createProjectPersonnelDto),
      participationMonths: createProjectPersonnelDto.participationMonths ?? 12,
      actualAnnualSalaryOverride: createProjectPersonnelDto.actualAnnualSalaryOverride ?? null,
      personnelCostOverride: createProjectPersonnelDto.personnelCostOverride ?? null,
    });

    const segments = this.buildSegments(projectPersonnel, createProjectPersonnelDto, {
      startDate: createProjectPersonnelDto.startDate,
      endDate: createProjectPersonnelDto.endDate,
      participationRate: createProjectPersonnelDto.participationRate,
      participationMonths: createProjectPersonnelDto.participationMonths,
      personnelCostOverride: createProjectPersonnelDto.personnelCostOverride,
    });
    this.validateSegments(segments);
    const candidateWindows = segments.map((segment) => ({
      startDate: new Date(segment.startDate),
      endDate: new Date(segment.endDate),
      participationRate: Number(segment.participationRate),
    }));

    await this.validateRoleLimits(createProjectPersonnelDto.personnelId, roleToAssign, candidateWindows);
    await this.validateTotalParticipationWindows(createProjectPersonnelDto.personnelId, candidateWindows);

    projectPersonnel = await this.projectPersonnelRepository.save(projectPersonnel);
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

    return this.maskActualSalaryOverride(savedProjectPersonnel, viewer);
  }

  async findAll(
    options: FindManyOptions<ProjectPersonnel> = {},
    viewer?: { role?: UserRole; canManageActualSalary?: boolean } | null,
    fiscalYear?: number,
  ): Promise<ProjectPersonnel[]> {
    const projectPersonnels = await this.projectPersonnelRepository.find({
      relations: ['project', 'personnel'],
      ...options,
      where: {
        ...(options.where as Record<string, any> || {}),
        ...(fiscalYear ? { fiscalYear } : {}),
      },
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

    return this.maskActualSalaryOverrides(projectPersonnels, viewer);
  }

  async findOne(
    id: string,
    viewer?: { role?: UserRole; canManageActualSalary?: boolean } | null,
  ): Promise<ProjectPersonnel> {
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

    return this.maskActualSalaryOverride(projectPersonnel, viewer);
  }

  async update(
    id: string,
    updateData: UpdateProjectPersonnelDto,
    viewer?: { role?: UserRole; canManageActualSalary?: boolean } | null,
  ): Promise<ProjectPersonnel> {
    const projectPersonnel = await this.findOne(id, viewer && this.canManageActualSalary(viewer) ? viewer : { role: UserRole.ADMIN, canManageActualSalary: true });
    const previous = {
      participationRate: Number(projectPersonnel.participationRate),
      role: projectPersonnel.role,
      startDate: projectPersonnel.startDate,
      endDate: projectPersonnel.endDate,
      participationMonths: projectPersonnel.participationMonths,
      actualAnnualSalaryOverride: projectPersonnel.actualAnnualSalaryOverride,
      personnelCostOverride: projectPersonnel.personnelCostOverride,
    };

    if (
      updateData.actualAnnualSalaryOverride !== undefined &&
      !this.canManageActualSalary(viewer)
    ) {
      throw new ForbiddenException('Actual annual salary override is not allowed for this user');
    }
    
    if (updateData.participationRate !== undefined) {
      this.participationCalculationService.validateParticipationRate(updateData.participationRate);
    }

    const changesLegacyParticipationFields =
      updateData.startDate !== undefined ||
      updateData.endDate !== undefined ||
      updateData.participationRate !== undefined ||
      updateData.participationMonths !== undefined ||
      updateData.personnelCostOverride !== undefined;

    if (updateData.segments === undefined && (projectPersonnel.segments?.length || 0) > 1 && changesLegacyParticipationFields) {
      throw new BadRequestException('Multi-segment assignments must be updated with replacement segments');
    }

    const roleToAssign = updateData.role ?? projectPersonnel.role;
    Object.assign(projectPersonnel, updateData);

    let nextSegments: ProjectPersonnelSegment[] | null = null;

    if (updateData.segments !== undefined) {
      nextSegments = this.buildSegments(projectPersonnel, updateData, {
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
    } else if ((projectPersonnel.segments?.length || 0) <= 1 && (
      updateData.startDate !== undefined ||
      updateData.endDate !== undefined ||
      updateData.participationRate !== undefined ||
      updateData.participationMonths !== undefined ||
      updateData.personnelCostOverride !== undefined
    )) {
      nextSegments = this.buildSegmentsFromLegacy(projectPersonnel, {
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
    } else if (updateData.role !== undefined) {
      nextSegments = this.getParticipationWindows(projectPersonnel).map((window, index) =>
        this.projectPersonnelSegmentRepository.create({
          projectPersonnel,
          startDate: window.startDate,
          endDate: window.endDate ?? new Date('9999-12-31T00:00:00.000Z'),
          participationRate: window.participationRate,
          personnelCostOverride: projectPersonnel.personnelCostOverride,
          sortOrder: index,
          notes: null,
        }),
      );
    }

    if (nextSegments) {
      this.validateSegments(nextSegments);
      const candidateWindows = nextSegments.map((segment) => ({
        startDate: new Date(segment.startDate),
        endDate: new Date(segment.endDate),
        participationRate: Number(segment.participationRate),
      }));
      await this.validateRoleLimits(
        projectPersonnel.personnel.id,
        roleToAssign,
        candidateWindows,
        projectPersonnel.id,
      );
      await this.validateTotalParticipationWindows(
        projectPersonnel.personnel.id,
        candidateWindows,
        projectPersonnel.id,
      );
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
        previous,
        next: {
          participationRate: Number(updated.participationRate),
          role: updated.role,
          startDate: updated.startDate,
          endDate: updated.endDate,
          participationMonths: updated.participationMonths,
          actualAnnualSalaryOverride: updated.actualAnnualSalaryOverride,
          personnelCostOverride: updated.personnelCostOverride,
        },
        changes: updateData,
        newVersion: projectPersonnel.version,
      },
      'SYSTEM',
    );

    return this.maskActualSalaryOverride(updated, viewer);
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
      baseSalary: this.participationCalculationService.getApplicableAnnualSalary(
        projectPersonnel.personnel,
        projectPersonnel,
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
