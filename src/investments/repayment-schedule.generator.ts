import { Prisma } from '@prisma/client';
import { toMoney, Money } from '../common/money';

export interface GeneratedScheduleEntry {
  dueDate: Date;
  principalDue: Money;
  roiDue: Money;
  totalDue: Money;
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

/**
 * Builds the repayment schedule for an investment (blueprint §11 — monthly
 * ROI, quarterly ROI, or bullet repayment). ROI for each period is split
 * evenly across periods, with the last period absorbing any rounding
 * remainder so the schedule's total ROI always equals the investment's
 * total expected ROI exactly (no cent lost to rounding).
 */
export function generateRepaymentSchedule(params: {
  principal: Prisma.Decimal.Value;
  expectedRoiPercent: Prisma.Decimal.Value;
  roiType: 'MONTHLY' | 'QUARTERLY' | 'BULLET';
  tenureMonths: number;
  investmentDate: Date;
}): GeneratedScheduleEntry[] {
  const principal = toMoney(params.principal);
  const totalRoi = principal.times(toMoney(params.expectedRoiPercent).dividedBy(100));

  if (params.roiType === 'BULLET') {
    const dueDate = addMonths(params.investmentDate, params.tenureMonths);
    return [
      {
        dueDate,
        principalDue: principal,
        roiDue: totalRoi,
        totalDue: principal.plus(totalRoi),
      },
    ];
  }

  const periodMonths = params.roiType === 'MONTHLY' ? 1 : 3;
  const periodCount = Math.ceil(params.tenureMonths / periodMonths);
  const roiPerPeriod = totalRoi.dividedBy(periodCount).toDecimalPlaces(3);
  const roiRemainder = totalRoi.minus(roiPerPeriod.times(periodCount - 1)).minus(roiPerPeriod);

  const entries: GeneratedScheduleEntry[] = [];
  for (let period = 1; period <= periodCount; period++) {
    const isLast = period === periodCount;
    const monthsElapsed = Math.min(period * periodMonths, params.tenureMonths);
    const roiDue = isLast ? roiPerPeriod.plus(roiRemainder) : roiPerPeriod;
    const principalDue = isLast ? principal : toMoney(0);

    entries.push({
      dueDate: addMonths(params.investmentDate, monthsElapsed),
      principalDue,
      roiDue,
      totalDue: principalDue.plus(roiDue),
    });
  }
  return entries;
}
