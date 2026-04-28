export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ParticipationValidationInput {
  personnelId: string;
  newRate: number;
  role: string;
  currentTotalRate: number;
  currentPiCount: number;
  currentTotalRoleCount: number;
}

const PI_ROLE = 'PRINCIPAL_INVESTIGATOR';
const MAX_PI_ROLES = 3;
const MAX_TOTAL_ROLES = 5;
const MAX_PARTICIPATION_RATE = 100;

export function validateParticipation(input: ParticipationValidationInput): ValidationResult {
  const { newRate, role, currentTotalRate, currentPiCount, currentTotalRoleCount } = input;
  const errors: string[] = [];
  const warnings: string[] = [];

  const newTotalRate = currentTotalRate + newRate;
  if (newTotalRate > MAX_PARTICIPATION_RATE) {
    errors.push(`총 참여율이 ${MAX_PARTICIPATION_RATE}%를 초과합니다. (${newTotalRate}%)`);
  }

  if (role === PI_ROLE) {
    if (currentPiCount >= MAX_PI_ROLES) {
      errors.push(`연구책임자(PI) 역할이 ${MAX_PI_ROLES}개를 초과할 수 없습니다.`);
    }
  }

  if (currentTotalRoleCount >= MAX_TOTAL_ROLES) {
    errors.push(`총 역할 수가 ${MAX_TOTAL_ROLES}개를 초과할 수 없습니다.`);
  }

  if (newRate > 80) {
    warnings.push(`개별 참여율이 ${newRate}%로 높습니다.`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export function formatParticipationSummary(
  currentTotalRate: number,
  currentPiCount: number,
  currentTotalRoleCount: number
): string {
  const parts: string[] = [];
  parts.push(`참여율: ${currentTotalRate}%`);
  parts.push(`PI: ${currentPiCount}/${MAX_PI_ROLES}`);
  parts.push(`역할: ${currentTotalRoleCount}/${MAX_TOTAL_ROLES}`);
  return parts.join(' | ');
}
