import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectPersonnelService } from './project-personnel.service';
import { ProjectPersonnel } from './project-personnel.entity';
import { ProjectPersonnelSegment } from './project-personnel-segment.entity';
import { Project } from '../projects/project.entity';
import { Personnel } from '../personnel/personnel.entity';
import { ProjectPersonnelRole } from './project-personnel-role.enum';
import { ParticipationCalculationService } from './participation-calculation.service';
import { AuditService } from '../audit/audit.service';
import { UpdateProjectPersonnelDto } from './dto/update-project-personnel.dto';

describe('ProjectPersonnelService', () => {
  let service: ProjectPersonnelService;
  let projectPersonnelRepository: jest.Mocked<Repository<ProjectPersonnel>>;
  let projectPersonnelSegmentRepository: jest.Mocked<Repository<ProjectPersonnelSegment>>;
  let projectRepository: jest.Mocked<Repository<Project>>;
  let personnelRepository: jest.Mocked<Repository<Personnel>>;

  const mockProject: Partial<Project> = {
    id: 'project-1',
    name: 'Test Project',
    managingTeam: '연구팀',
    status: 'IN_PROGRESS',
  };

  const mockPersonnel: Partial<Personnel> = {
    id: 'personnel-1',
    employeeId: 'EMP0001',
    name: 'Test User',
    team: '연구팀',
    position: '팀장',
    positionAverageAnnualSalary: 55000000,
    isActive: true,
  };

  const mockProjectPersonnel: Partial<ProjectPersonnel> = {
    id: 'pp-1',
    project: mockProject as Project,
    personnel: mockPersonnel as Personnel,
    participationRate: 50,
    role: ProjectPersonnelRole.PRINCIPAL_INVESTIGATOR,
    startDate: new Date('2024-01-01'),
    endDate: new Date('2027-12-31'),
    version: 1,
  };

  const mockParticipationCalculationService = {
    validateParticipationRate: jest.fn(),
    validateTotalParticipationRate: jest.fn(),
    calculateMonthlyCost: jest.fn(),
    getApplicableAnnualSalary: jest.fn(),
  };

  const mockAuditService = {
    logChange: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectPersonnelService,
        {
          provide: getRepositoryToken(ProjectPersonnel),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ProjectPersonnelSegment),
          useValue: {
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Project),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Personnel),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: ParticipationCalculationService,
          useValue: mockParticipationCalculationService,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
      ],
    }).compile();

    service = module.get<ProjectPersonnelService>(ProjectPersonnelService);
    projectPersonnelRepository = module.get(getRepositoryToken(ProjectPersonnel));
    projectPersonnelSegmentRepository = module.get(getRepositoryToken(ProjectPersonnelSegment));
    projectRepository = module.get(getRepositoryToken(Project));
    personnelRepository = module.get(getRepositoryToken(Personnel));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOne', () => {
    it('should return a project personnel by id', async () => {
      projectPersonnelRepository.findOne.mockResolvedValue(mockProjectPersonnel as ProjectPersonnel);
      projectPersonnelSegmentRepository.find.mockResolvedValue([]);

      const result = await service.findOne('pp-1');

      expect(result).toMatchObject({
        ...mockProjectPersonnel,
        actualAnnualSalaryOverride: null,
      });
      expect(projectPersonnelRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'pp-1' },
        relations: ['project', 'personnel'],
      });
    });

    it('should throw NotFoundException if not found', async () => {
      projectPersonnelRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow();
    });
  });

  describe('getTotalParticipationRate', () => {
    it('should return total participation rate for personnel', async () => {
      const participations = [
        { ...mockProjectPersonnel, participationRate: 50 },
        { ...mockProjectPersonnel, id: 'pp-2', participationRate: 30 },
      ];
      projectPersonnelRepository.find.mockResolvedValue(participations as ProjectPersonnel[]);

      const result = await service.getTotalParticipationRate('personnel-1');

      expect(result).toBe(80);
    });

    it('should return 0 if no participations', async () => {
      projectPersonnelRepository.find.mockResolvedValue([]);

      const result = await service.getTotalParticipationRate('personnel-1');

      expect(result).toBe(0);
    });
  });

  describe('role limit validation', () => {
    it('should validate that PI role count does not exceed 3', async () => {
      const existingParticipations = [
        { ...mockProjectPersonnel, role: ProjectPersonnelRole.PRINCIPAL_INVESTIGATOR },
        { ...mockProjectPersonnel, id: 'pp-2', role: ProjectPersonnelRole.PRINCIPAL_INVESTIGATOR },
        { ...mockProjectPersonnel, id: 'pp-3', role: ProjectPersonnelRole.PRINCIPAL_INVESTIGATOR },
      ];
      projectPersonnelRepository.find.mockResolvedValue(existingParticipations as ProjectPersonnel[]);

      await expect(
        service.createProjectPersonnel({
          projectId: 'project-1',
          personnelId: 'personnel-1',
          participationRate: 20,
          role: ProjectPersonnelRole.PRINCIPAL_INVESTIGATOR,
          startDate: '2024-01-01',
          calculationMethod: 'MONTHLY',
          expenseCode: 'EXP001',
          legalBasisCode: 'LEGAL001',
          participatingTeam: '연구팀',
        }),
      ).rejects.toThrow();
    });

    it('should validate that total role count does not exceed 5', async () => {
      const existingParticipations = [
        { ...mockProjectPersonnel, role: ProjectPersonnelRole.PRINCIPAL_INVESTIGATOR },
        { ...mockProjectPersonnel, id: 'pp-2', role: ProjectPersonnelRole.PARTICIPATING_RESEARCHER },
        { ...mockProjectPersonnel, id: 'pp-3', role: ProjectPersonnelRole.PARTICIPATING_RESEARCHER },
        { ...mockProjectPersonnel, id: 'pp-4', role: ProjectPersonnelRole.PARTICIPATING_RESEARCHER },
        { ...mockProjectPersonnel, id: 'pp-5', role: ProjectPersonnelRole.PARTICIPATING_RESEARCHER },
      ];
      projectPersonnelRepository.find.mockResolvedValue(existingParticipations as ProjectPersonnel[]);

      await expect(
        service.createProjectPersonnel({
          projectId: 'project-1',
          personnelId: 'personnel-1',
          participationRate: 20,
          role: ProjectPersonnelRole.PARTICIPATING_RESEARCHER,
          startDate: '2024-01-01',
          calculationMethod: 'MONTHLY',
          expenseCode: 'EXP001',
          legalBasisCode: 'LEGAL001',
          participatingTeam: '연구팀',
        }),
      ).rejects.toThrow();
    });
  });

  describe('segment support', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-04-10T00:00:00.000Z'));
      projectRepository.findOne.mockResolvedValue(mockProject as Project);
      personnelRepository.findOne.mockResolvedValue(mockPersonnel as Personnel);
      projectPersonnelRepository.findOne.mockResolvedValue(null);
      projectPersonnelRepository.find.mockResolvedValue([] as ProjectPersonnel[]);
      projectPersonnelRepository.create.mockImplementation((input: any) => input);
      projectPersonnelRepository.save.mockImplementation(async (input: any) => ({
        id: input.id || 'pp-segmented',
        version: input.version || 1,
        ...input,
      }));
      projectPersonnelSegmentRepository.create.mockImplementation((input: any) => input);
      projectPersonnelSegmentRepository.save.mockImplementation(async (input: any) => input);
      projectPersonnelSegmentRepository.find.mockResolvedValue([] as ProjectPersonnelSegment[]);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should persist provided segments and sync legacy fields from the active segment', async () => {
      const result = await service.createProjectPersonnel({
        projectId: 'project-1',
        personnelId: 'personnel-1',
        participationRate: 20,
        startDate: '2026-01-01',
        calculationMethod: 'MONTHLY',
        expenseCode: 'EXP001',
        legalBasisCode: 'LEGAL001',
        participatingTeam: '연구팀',
        actualAnnualSalaryOverride: 72000000,
        segments: [
          {
            startDate: '2026-01-01',
            endDate: '2026-03-31',
            participationRate: 20,
            sortOrder: 0,
          },
          {
            startDate: '2026-04-01',
            endDate: '2026-08-31',
            participationRate: 80,
            sortOrder: 1,
          },
        ],
      } as any, { role: 'ADMIN', canManageActualSalary: true } as any);

      expect(projectPersonnelSegmentRepository.save).toHaveBeenCalled();
      expect(result.participationRate).toBe(80);
      expect(result.participationMonths).toBe(8);
      expect(result.segments).toHaveLength(2);
    });

    it('should create a fallback segment when legacy payload is used without segments', async () => {
      const result = await service.createProjectPersonnel({
        projectId: 'project-1',
        personnelId: 'personnel-1',
        participationRate: 50,
        startDate: '2026-01-01',
        calculationMethod: 'MONTHLY',
        expenseCode: 'EXP001',
        legalBasisCode: 'LEGAL001',
        participatingTeam: '연구팀',
        participationMonths: 3,
      } as any);

      expect(result.segments).toHaveLength(1);
      expect(result.segments?.[0].participationRate).toBe(50);
      expect(result.participationMonths).toBe(3);
    });
  });

  describe('commercial safety checks', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      projectRepository.findOne.mockResolvedValue(mockProject as Project);
      personnelRepository.findOne.mockResolvedValue(mockPersonnel as Personnel);
      projectPersonnelRepository.find.mockResolvedValue([] as ProjectPersonnel[]);
      projectPersonnelRepository.create.mockImplementation((input: any) => input);
      projectPersonnelRepository.save.mockImplementation(async (input: any) => input);
      projectPersonnelSegmentRepository.create.mockImplementation((input: any) => input);
      projectPersonnelSegmentRepository.save.mockImplementation(async (input: any) => input);
      projectPersonnelSegmentRepository.find.mockResolvedValue([] as ProjectPersonnelSegment[]);
    });

    it('rejects actual salary override from viewers without salary permission', async () => {
      await expect(
        service.createProjectPersonnel(
          {
            projectId: 'project-1',
            personnelId: 'personnel-1',
            participationRate: 20,
            startDate: '2026-01-01',
            calculationMethod: 'MONTHLY',
            expenseCode: 'EXP001',
            legalBasisCode: 'LEGAL001',
            participatingTeam: '연구팀',
            actualAnnualSalaryOverride: 72000000,
          } as any,
          { role: 'GENERAL', canManageActualSalary: false } as any,
        ),
      ).rejects.toThrow('Actual annual salary override is not allowed');
    });

    it('records previous and next values in update audit logs', async () => {
      const existing = {
        ...mockProjectPersonnel,
        actualAnnualSalaryOverride: 70000000,
      } as ProjectPersonnel;
      projectPersonnelRepository.findOne.mockResolvedValue(existing);
      projectPersonnelRepository.save.mockImplementation(async (input: any) => input);

      await service.update(
        'pp-1',
        { participationRate: 60, actualAnnualSalaryOverride: 71000000 } as any,
        { role: 'ADMIN', canManageActualSalary: true } as any,
      );

      expect(mockAuditService.logChange).toHaveBeenCalledWith(
        'ProjectPersonnel',
        'pp-1',
        'UPDATE',
        expect.objectContaining({
          previous: expect.objectContaining({
            participationRate: 50,
            actualAnnualSalaryOverride: 70000000,
          }),
          next: expect.objectContaining({
            participationRate: 60,
            actualAnnualSalaryOverride: 71000000,
          }),
        }),
        'SYSTEM',
      );
    });

    it('rejects creating an active assignment when total active participation would exceed 100%', async () => {
      projectPersonnelRepository.find.mockResolvedValue([
        {
          ...mockProjectPersonnel,
          id: 'pp-existing',
          participationRate: 60,
          role: ProjectPersonnelRole.PARTICIPATING_RESEARCHER,
          endDate: new Date('2027-12-31'),
        } as ProjectPersonnel,
      ]);
      mockParticipationCalculationService.validateTotalParticipationRate.mockImplementation((total: number) => {
        if (total > 100) {
          throw new Error(`Total participation rate cannot exceed 100%, got: ${total}%`);
        }
      });

      await expect(
        service.createProjectPersonnel({
          projectId: 'project-1',
          personnelId: 'personnel-1',
          participationRate: 50,
          startDate: '2026-01-01',
          endDate: '2026-12-31',
          calculationMethod: 'MONTHLY',
          expenseCode: 'EXP001',
          legalBasisCode: 'LEGAL001',
          participatingTeam: '연구팀',
        }),
      ).rejects.toThrow('Total participation rate cannot exceed 100%');
    });

    it('rejects date-only updates that would make role assignments exceed 5 active projects', async () => {
      const historicalAssignment = {
        ...mockProjectPersonnel,
        id: 'pp-1',
        role: ProjectPersonnelRole.PARTICIPATING_RESEARCHER,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        participationRate: 10,
        personnel: mockPersonnel as Personnel,
      } as ProjectPersonnel;
      projectPersonnelRepository.findOne.mockResolvedValue(historicalAssignment);
      projectPersonnelRepository.find.mockResolvedValue([
        ...Array.from({ length: 5 }, (_, index) => ({
          ...mockProjectPersonnel,
          id: `pp-active-${index}`,
          role: ProjectPersonnelRole.PARTICIPATING_RESEARCHER,
          endDate: new Date('2027-12-31'),
        } as ProjectPersonnel)),
        historicalAssignment,
      ]);

      await expect(
        service.update('pp-1', { endDate: '2027-12-31' }),
      ).rejects.toThrow();
    });

    it('allows non-overlapping existing windows when no point in time exceeds 100% participation', async () => {
      projectPersonnelRepository.find.mockResolvedValue([
        {
          ...mockProjectPersonnel,
          id: 'pp-january',
          participationRate: 30,
          role: ProjectPersonnelRole.PARTICIPATING_RESEARCHER,
          startDate: new Date('2026-01-01'),
          endDate: new Date('2026-01-31'),
        } as ProjectPersonnel,
        {
          ...mockProjectPersonnel,
          id: 'pp-december',
          participationRate: 30,
          role: ProjectPersonnelRole.PARTICIPATING_RESEARCHER,
          startDate: new Date('2026-12-01'),
          endDate: new Date('2026-12-31'),
        } as ProjectPersonnel,
      ]);
      mockParticipationCalculationService.validateTotalParticipationRate.mockImplementation((total: number) => {
        if (total > 100) {
          throw new Error(`Total participation rate cannot exceed 100%, got: ${total}%`);
        }
      });

      await expect(
        service.createProjectPersonnel({
          projectId: 'project-1',
          personnelId: 'personnel-1',
          participationRate: 50,
          startDate: '2026-01-01',
          endDate: '2026-12-31',
          calculationMethod: 'MONTHLY',
          expenseCode: 'EXP001',
          legalBasisCode: 'LEGAL001',
          participatingTeam: '연구팀',
        }),
      ).resolves.toBeDefined();
    });

    it('rejects future assignments that would exceed 5 active projects during the candidate window', async () => {
      projectPersonnelRepository.find.mockResolvedValue(
        Array.from({ length: 5 }, (_, index) => ({
          ...mockProjectPersonnel,
          id: `pp-future-${index}`,
          participationRate: 1,
          role: ProjectPersonnelRole.PARTICIPATING_RESEARCHER,
          startDate: new Date('2027-01-01'),
          endDate: new Date('2027-12-31'),
        } as ProjectPersonnel)),
      );

      await expect(
        service.createProjectPersonnel({
          projectId: 'project-1',
          personnelId: 'personnel-1',
          participationRate: 1,
          startDate: '2027-06-01',
          endDate: '2027-06-30',
          calculationMethod: 'MONTHLY',
          expenseCode: 'EXP001',
          legalBasisCode: 'LEGAL001',
          participatingTeam: '연구팀',
        }),
      ).rejects.toThrow('Active project assignments cannot exceed 5');
    });

    it('rejects legacy field updates on multi-segment records unless replacement segments are provided', async () => {
      projectPersonnelRepository.findOne.mockResolvedValue({
        ...mockProjectPersonnel,
        personnel: mockPersonnel as Personnel,
        segments: [],
      } as ProjectPersonnel);
      projectPersonnelSegmentRepository.find.mockResolvedValue([
        {
          projectPersonnel: mockProjectPersonnel as ProjectPersonnel,
          startDate: new Date('2026-01-01'),
          endDate: new Date('2026-03-31'),
          participationRate: 20,
          personnelCostOverride: null,
          sortOrder: 0,
          notes: null,
        } as ProjectPersonnelSegment,
        {
          projectPersonnel: mockProjectPersonnel as ProjectPersonnel,
          startDate: new Date('2026-04-01'),
          endDate: new Date('2026-12-31'),
          participationRate: 40,
          personnelCostOverride: null,
          sortOrder: 1,
          notes: null,
        } as ProjectPersonnelSegment,
      ]);

      await expect(
        service.update('pp-1', { participationRate: 60 }),
      ).rejects.toThrow('segments');
    });

    it('rejects empty replacement segments on multi-segment records with legacy field updates', async () => {
      projectPersonnelRepository.findOne.mockResolvedValue({
        ...mockProjectPersonnel,
        personnel: mockPersonnel as Personnel,
        segments: [],
      } as ProjectPersonnel);
      projectPersonnelSegmentRepository.find.mockResolvedValue([
        {
          projectPersonnel: mockProjectPersonnel as ProjectPersonnel,
          startDate: new Date('2026-01-01'),
          endDate: new Date('2026-03-31'),
          participationRate: 20,
          personnelCostOverride: null,
          sortOrder: 0,
          notes: null,
        } as ProjectPersonnelSegment,
        {
          projectPersonnel: mockProjectPersonnel as ProjectPersonnel,
          startDate: new Date('2026-04-01'),
          endDate: new Date('2026-12-31'),
          participationRate: 40,
          personnelCostOverride: null,
          sortOrder: 1,
          notes: null,
        } as ProjectPersonnelSegment,
      ]);

      await expect(
        service.update('pp-1', { segments: [], participationRate: 60 }),
      ).rejects.toThrow('segments');
    });

    it('rejects empty replacement segments on multi-segment records even without legacy fields', async () => {
      projectPersonnelRepository.findOne.mockResolvedValue({
        ...mockProjectPersonnel,
        personnel: mockPersonnel as Personnel,
        segments: [],
      } as ProjectPersonnel);
      projectPersonnelSegmentRepository.find.mockResolvedValue([
        {
          projectPersonnel: mockProjectPersonnel as ProjectPersonnel,
          startDate: new Date('2026-01-01'),
          endDate: new Date('2026-03-31'),
          participationRate: 20,
          personnelCostOverride: null,
          sortOrder: 0,
          notes: null,
        } as ProjectPersonnelSegment,
        {
          projectPersonnel: mockProjectPersonnel as ProjectPersonnel,
          startDate: new Date('2026-04-01'),
          endDate: new Date('2026-12-31'),
          participationRate: 40,
          personnelCostOverride: null,
          sortOrder: 1,
          notes: null,
        } as ProjectPersonnelSegment,
      ]);

      await expect(
        service.update('pp-1', { segments: [] }),
      ).rejects.toThrow('segments');
    });

    it('rejects null replacement segments on multi-segment records with legacy field updates', async () => {
      projectPersonnelRepository.findOne.mockResolvedValue({
        ...mockProjectPersonnel,
        personnel: mockPersonnel as Personnel,
        segments: [],
      } as ProjectPersonnel);
      projectPersonnelSegmentRepository.find.mockResolvedValue([
        {
          projectPersonnel: mockProjectPersonnel as ProjectPersonnel,
          startDate: new Date('2026-01-01'),
          endDate: new Date('2026-03-31'),
          participationRate: 20,
          personnelCostOverride: null,
          sortOrder: 0,
          notes: null,
        } as ProjectPersonnelSegment,
        {
          projectPersonnel: mockProjectPersonnel as ProjectPersonnel,
          startDate: new Date('2026-04-01'),
          endDate: new Date('2026-12-31'),
          participationRate: 40,
          personnelCostOverride: null,
          sortOrder: 1,
          notes: null,
        } as ProjectPersonnelSegment,
      ]);
      const updateData = { segments: null, participationRate: 60 } as unknown as UpdateProjectPersonnelDto;

      await expect(service.update('pp-1', updateData)).rejects.toThrow('segments');
    });

    it('rejects null replacement segments on multi-segment records even without legacy fields', async () => {
      projectPersonnelRepository.findOne.mockResolvedValue({
        ...mockProjectPersonnel,
        personnel: mockPersonnel as Personnel,
        segments: [],
      } as ProjectPersonnel);
      projectPersonnelSegmentRepository.find.mockResolvedValue([
        {
          projectPersonnel: mockProjectPersonnel as ProjectPersonnel,
          startDate: new Date('2026-01-01'),
          endDate: new Date('2026-03-31'),
          participationRate: 20,
          personnelCostOverride: null,
          sortOrder: 0,
          notes: null,
        } as ProjectPersonnelSegment,
        {
          projectPersonnel: mockProjectPersonnel as ProjectPersonnel,
          startDate: new Date('2026-04-01'),
          endDate: new Date('2026-12-31'),
          participationRate: 40,
          personnelCostOverride: null,
          sortOrder: 1,
          notes: null,
        } as ProjectPersonnelSegment,
      ]);
      const updateData = { segments: null } as unknown as UpdateProjectPersonnelDto;

      await expect(service.update('pp-1', updateData)).rejects.toThrow('segments');
    });
  });
});
