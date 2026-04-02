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

  it('should calculate midpoint of salary band correctly', () => {
    expect(service['getSalaryBandMidpoint']('3000-4000')).toBe(3500);
    expect(service['getSalaryBandMidpoint']('4000-5000')).toBe(4500);
    expect(service['getSalaryBandMidpoint']('2000-3000')).toBe(2500);
  });

  it('should throw error for invalid salary band format', () => {
    expect(() => service['getSalaryBandMidpoint']('invalid')).toThrow();
    expect(() => service['getSalaryBandMidpoint']('3000')).toThrow();
    expect(() => service['getSalaryBandMidpoint']('3000-4000-5000')).toThrow();
  });

  it('should calculate monthly cost correctly', () => {
    const mockPersonnel = {
      salaryBand: '4000-5000', // midpoint 4500
    } as any;

    const mockProjectPersonnel = {
      participationRate: 50, // 50%
    } as any;

    // 4500 * (50/100) * 1 = 2250
    expect(service.calculateMonthlyCost(mockPersonnel, mockProjectPersonnel, 1)).toBe(2250);
    
    // 4500 * (50/100) * 2 = 4500
    expect(service.calculateMonthlyCost(mockPersonnel, mockProjectPersonnel, 2)).toBe(4500);
    
    // 4500 * (100/100) * 1 = 4500
    expect(service.calculateMonthlyCost(mockPersonnel, {...mockProjectPersonnel, participationRate: 100}, 1)).toBe(4500);
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