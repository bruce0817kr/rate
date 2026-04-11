import { Injectable } from '@nestjs/common';
import { Personnel } from '../personnel/personnel.entity';
import { ProjectPersonnel } from './project-personnel.entity';

@Injectable()
export class ParticipationCalculationService {
  getApplicableAnnualSalary(
    personnel: Personnel,
    projectPersonnel: Pick<ProjectPersonnel, 'actualAnnualSalaryOverride'>,
  ): number {
    return Number(
      projectPersonnel.actualAnnualSalaryOverride ??
      personnel.positionAverageAnnualSalary ??
      0,
    );
  }

  calculateMonthlyCost(
    personnel: Personnel,
    projectPersonnel: ProjectPersonnel,
    participationMonths: number = 1,
  ): number {
    const annualSalary = this.getApplicableAnnualSalary(personnel, projectPersonnel);
    return (annualSalary / 12) * (projectPersonnel.participationRate / 100) * participationMonths;
  }

  validateParticipationRate(participationRate: number): boolean {
    if (participationRate < 0 || participationRate > 100) {
      throw new Error(`Participation rate must be between 0 and 100, got: ${participationRate}`);
    }
    return true;
  }

  validateTotalParticipationRate(totalParticipationRate: number): boolean {
    if (totalParticipationRate > 100) {
      throw new Error(`Total participation rate cannot exceed 100%, got: ${totalParticipationRate}%`);
    }
    return true;
  }

  calculateMonthlyCostByDate(
    personnel: Personnel,
    projectPersonnel: ProjectPersonnel,
    year: number,
    month: number,
  ): number {
    const participationStart = new Date(projectPersonnel.startDate);
    const participationEnd = projectPersonnel.endDate
      ? new Date(projectPersonnel.endDate)
      : new Date('9999-12-31');

    const targetDate = new Date(year, month - 1, 1);
    const nextMonth = new Date(year, month, 1);

    const startsBeforeMonthEnd = participationStart < nextMonth;
    const endsAfterMonthStart = (!projectPersonnel.endDate ||
      new Date(projectPersonnel.endDate) >= targetDate);

    if (!startsBeforeMonthEnd || !endsAfterMonthStart) {
      return 0;
    }

    return this.calculateMonthlyCost(personnel, projectPersonnel, 1);
  }
}
