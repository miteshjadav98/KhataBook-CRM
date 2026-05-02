export function calculateAccruedInterest(
  principalAmount: number,
  dueDate: Date,
  currentDate: Date,
  annualInterestRatePct: number,
): number {
  if (currentDate <= dueDate) return 0;

  // Calculate difference in days
  const timeDiff = currentDate.getTime() - dueDate.getTime();
  const daysOverdue = Math.floor(timeDiff / (1000 * 3600 * 24));

  // Simple Interest: PRT/100 (where T is time in years)
  // Daily Interest Rate = (Annual Rate / 100) / 365
  const dailyRate = (annualInterestRatePct / 100) / 365;
  const accruedInterest = principalAmount * dailyRate * daysOverdue;

  return Number(accruedInterest.toFixed(2));
}
