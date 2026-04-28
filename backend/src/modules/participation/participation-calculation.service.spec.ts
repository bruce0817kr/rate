import { ParticipationCalculationService } from './participation-calculation.service';

describe('ParticipationCalculationService', () => {
  const service = new ParticipationCalculationService();

  it('rejects an individual participation rate over 100%', () => {
    expect(() => service.validateParticipationRate(100.1)).toThrow('Participation rate must be between 0 and 100');
  });

  it('rejects total participation over 100%', () => {
    expect(() => service.validateTotalParticipationRate(101)).toThrow('Total participation rate cannot exceed 100%');
  });
});
