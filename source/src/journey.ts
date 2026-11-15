import type { Scenario } from './types.ts';
import { employmentSettings } from './payroll.ts';

/** The quick journey calculator uses one explicit CNC-style charge percentage, independent of the contract tab. */
export function journeyScenario(scenario: Scenario): Scenario {
  const p = employmentSettings(scenario);
  return { ...scenario, planning: { ...p, contract: 'indefinite', partTime: false, period: undefined, preferredStrategy: 'hiring',
    comparisonBasis: 'monthly', contractHeadcount: undefined, contractHours: undefined, comparedContracts: undefined, salaryFloor: 1, taxProfile: 'custom', customCharges: scenario.charges,
    taxConfirmed: false, benefits: 0, otherMonthly: 0, severanceReserve: 0, monthlyRevenue: 0, revenueRate: 0 } };
}
