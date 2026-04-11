import { Test, TestingModule } from '@nestjs/testing';
import { ParticipationCalculationService } from '../src/modules/participation/participation-calculation.service';

describe('ParticipationCalculationService', () => {
  let service: ParticipationCalculationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ParticipationCalculationService],
    }).compile();

    service = module.get<ParticipationCalculationService>(ParticipationCalculationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return applicable annual salary using override first', () => {
    expect(
      service.getApplicableAnnualSalary(
        { positionAverageAnnualSalary: 61000000 } as any,
        { actualAnnualSalaryOverride: 72000000 } as any,
      ),
    ).toBe(72000000);
  });

  it('should fall back to position average annual salary', () => {
    expect(
      service.getApplicableAnnualSalary(
        { positionAverageAnnualSalary: 61000000 } as any,
        { actualAnnualSalaryOverride: null } as any,
      ),
    ).toBe(61000000);
  });

  it('should calculate monthly cost correctly', () => {
    const mockPersonnel = {
      positionAverageAnnualSalary: 54000000,
    } as any;

    const mockProjectPersonnel = {
      participationRate: 50,
      actualAnnualSalaryOverride: null,
    } as any;

    expect(service.calculateMonthlyCost(mockPersonnel, mockProjectPersonnel, 1)).toBe(2250000);
    
    expect(service.calculateMonthlyCost(mockPersonnel, mockProjectPersonnel, 2)).toBe(4500000);
    
    expect(service.calculateMonthlyCost(mockPersonnel, {...mockProjectPersonnel, participationRate: 100}, 1)).toBe(4500000);
  });

  it('should validate participation rate within bounds', () => {
    expect(() => service.validateParticipationRate(50)).not.toThrow();
    expect(() => service.validateParticipationRate(0)).not.toThrow();
    expect(() => service.validateParticipationRate(100)).not.toThrow();
    
    expect(() => service.validateParticipationRate(-1)).toThrow();
    expect(() => service.validateParticipationRate(101)).toThrow();
  });

  it('should validate total participation rate', () => {
    expect(() => service.validateTotalParticipationRate(80)).not.toThrow();
    expect(() => service.validateTotalParticipationRate(100)).not.toThrow();
    
    expect(() => service.validateTotalParticipationRate(101)).toThrow();
  });
});
