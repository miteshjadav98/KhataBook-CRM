/**
 * Compound Interest Calculator for KhataBook CRM.
 *
 * Rules:
 * - Paid within 30 days → No interest
 * - 1–6 months overdue → 3% per month compound
 * - > 6 months overdue → 6% per month compound
 *
 * Formula: A = P × (1 + r)^t
 */

export interface InterestResult {
  principal: number;
  interestAmount: number;
  totalWithInterest: number;
  monthsOverdue: number;
  rateApplied: number; // Monthly rate as decimal
}

/**
 * Calculate compound interest on a remaining amount based on how long it's been overdue.
 * @param principal - The remaining amount (P)
 * @param dueDateOrTransactionDate - The date from which to calculate overdue time
 * @param customRate - Optional: override rate from the transaction/shop level
 */
export function calculateInterest(
  principal: number,
  dueDateOrTransactionDate: Date,
  customRate?: number,
): InterestResult {
  if (principal <= 0) {
    return {
      principal,
      interestAmount: 0,
      totalWithInterest: principal,
      monthsOverdue: 0,
      rateApplied: 0,
    };
  }

  const now = new Date();
  const dueDate = new Date(dueDateOrTransactionDate);
  const diffMs = now.getTime() - dueDate.getTime();
  const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  const monthsOverdue = Math.floor(diffDays / 30);

  // No interest for first 30 days
  if (monthsOverdue <= 0) {
    return {
      principal,
      interestAmount: 0,
      totalWithInterest: principal,
      monthsOverdue: 0,
      rateApplied: 0,
    };
  }

  let rate: number;

  if (customRate !== undefined && customRate > 0) {
    // Use custom rate (stored as percentage, e.g., 3 for 3%)
    rate = customRate / 100;
  } else if (monthsOverdue <= 6) {
    rate = 0.03; // 3% per month
  } else {
    rate = 0.06; // 6% per month
  }

  // Compound interest: A = P × (1 + r)^t
  const totalWithInterest = principal * Math.pow(1 + rate, monthsOverdue);
  const interestAmount = totalWithInterest - principal;

  return {
    principal,
    interestAmount: Math.round(interestAmount * 100) / 100,
    totalWithInterest: Math.round(totalWithInterest * 100) / 100,
    monthsOverdue,
    rateApplied: rate,
  };
}
