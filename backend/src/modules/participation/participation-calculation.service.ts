import { Injectable } from '@nestjs/common';
import { Personnel } from '../personnel/personnel.entity';
import { ProjectPersonnel } from './project-personnel.entity';

@Injectable()
export class ParticipationCalculationService {
  /**
   * Calculate monthly personnel cost based on participation rate and salary band
   * Formula: Monthly Cost = (Salary Band Midpoint) × (Participation Rate/100) × Participation Months
   * 
   * @param personnel - The personnel entity containing salary band info
   * @param projectPersonnel - The project participation entity
   * @param participationMonths - Number of months to calculate for
   * @returns Monthly personnel cost amount
   */
  calculateMonthlyCost(
    personnel: Personnel,
    projectPersonnel: ProjectPersonnel,
    participationMonths: number = 1,
  ): number {
    // Calculate midpoint of salary band (e.g., "3000-4000" -> 3500)
    const salaryMidpoint = this.getSalaryBandMidpoint(personnel.salaryBand);
    
    // Apply formula: midpoint × (participation rate/100) × months
    const monthlyCost = salaryMidpoint * 
                       (projectPersonnel.participationRate / 100) * 
                       participationMonths;
    
    return monthlyCost;
  }

  /**
   * Calculate the midpoint of a salary band string
   * @param salaryBand - String in format "MIN-MAX" (in 10,000 KRW units)
   * @returns Midpoint value as number
   */
  private getSalaryBandMidpoint(salaryBand: string): number {
    const [minStr, maxStr] = salaryBand.split('-');
    const min = parseFloat(minStr);
    const max = parseFloat(maxStr);
    
    if (isNaN(min) || isNaN(max)) {
      throw new Error(`Invalid salary band format: ${salaryBand}`);
    }
    
    return (min + max) / 2;
  }

  /**
   * Validate that participation rate is within acceptable limits (0-100%)
   * @param participationRate - Participation rate percentage
   * @returns True if valid, throws error otherwise
   */
  validateParticipationRate(participationRate: number): boolean {
    if (participationRate < 0 || participationRate > 100) {
      throw new Error(`Participation rate must be between 0 and 100, got: ${participationRate}`);
    }
    return true;
  }

  /**
   * Validate that total participation rate across all projects for a person doesn't exceed 100%
   * This would typically be called with aggregated data from a repository
   * @param totalParticipationRate - Sum of all participation rates for a person
   * @returns True if valid, throws error otherwise
   */
  validateTotalParticipationRate(totalParticipationRate: number): boolean {
    if (totalParticipationRate > 100) {
      throw new Error(`Total participation rate cannot exceed 100%, got: ${totalParticipationRate}%`);
    }
    return true;
  }

  /**
   * Calculate personnel cost for a specific month based on actual dates
   * @param personnel - The personnel entity
   * @param projectPersonnel - The project participation entity
   * @param year - Fiscal year (e.g., 2024)
   * @param month - Fiscal month (1-12)
   * @returns Calculated personnel cost for the month
   */
  calculateMonthlyCostByDate(
    personnel: Personnel,
    projectPersonnel: ProjectPersonnel,
    year: number,
    month: number,
  ): number {
    // Check if the participation period includes this month
    const participationStart = new Date(projectPersonnel.startDate);
    const participationEnd = projectPersonnel.endDate 
      ? new Date(projectPersonnel.endDate) 
      : new Date('9999-12-31'); // Far future if no end date
    
    const targetDate = new Date(year, month - 1, 1); // First day of target month
    const nextMonth = new Date(year, month, 1); // First day of next month
    
    // Check if target month overlaps with participation period
    const startsBeforeMonthEnd = participationStart < nextMonth;
    const endsAfterMonthStart = (!projectPersonnel.endDate || 
                                new Date(projectPersonnel.endDate) >= targetDate);
    
    if (!startsBeforeMonthEnd || !endsAfterMonthStart) {
      return 0; // No overlap, no cost for this month
    }
    
    // For simplicity in this implementation, we'll calculate as full month if there's any overlap
    // In a more precise implementation, we would calculate based on actual days
    return this.calculateMonthlyCost(personnel, projectPersonnel, 1);
  }
}