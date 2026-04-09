import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectPersonnelService } from './project-personnel.service';
import { ProjectPersonnel } from './project-personnel.entity';
import { Project } from '../projects/project.entity';
import { Personnel } from '../personnel/personnel.entity';
import { ProjectPersonnelRole } from './project-personnel-role.enum';
import { ParticipationCalculationService } from './participation-calculation.service';
import { AuditService } from '../audit/audit.service';

describe('ProjectPersonnelService', () => {
  let service: ProjectPersonnelService;
  let projectPersonnelRepository: jest.Mocked<Repository<ProjectPersonnel>>;
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
    salaryBand: '5000-6000',
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
    calculateMonthlyCost: jest.fn(),
    getSalaryBandMidpoint: jest.fn(),
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
    projectRepository = module.get(getRepositoryToken(Project));
    personnelRepository = module.get(getRepositoryToken(Personnel));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOne', () => {
    it('should return a project personnel by id', async () => {
      projectPersonnelRepository.findOne.mockResolvedValue(mockProjectPersonnel as ProjectPersonnel);

      const result = await service.findOne('pp-1');

      expect(result).toEqual(mockProjectPersonnel);
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
});
