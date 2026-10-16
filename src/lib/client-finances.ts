import { InstallmentScheduleItem } from "./types";

function roundCurrency(amount: number): number {
  return Number(amount.toFixed(2));
}

function addMonthsClamped(date: Date, months: number): Date {
  const monthStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
  const lastDay = new Date(
    Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 0)
  ).getUTCDate();
  monthStart.setUTCDate(Math.min(date.getUTCDate(), lastDay));
  return monthStart;
}

export function buildInstallmentSchedule(
  projectId: string,
  balance: number,
  installmentCount: number,
  firstDueDate: string
): InstallmentScheduleItem[] {
  if (!Number.isFinite(balance) || balance <= 0) {
    throw new Error("Installment balance must be greater than zero.");
  }
  if (!Number.isInteger(installmentCount) || installmentCount < 1 || installmentCount > 36) {
    throw new Error("Installment count must be between 1 and 36.");
  }

  const parsedDate = new Date(`${firstDueDate}T00:00:00.000Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(firstDueDate) ||
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !== firstDueDate
  ) {
    throw new Error("A valid first installment due date is required.");
  }

  const monthlyAmount = roundCurrency(balance / installmentCount);
  return Array.from({ length: installmentCount }, (_, index) => {
    const amount = index === installmentCount - 1
      ? roundCurrency(balance - monthlyAmount * (installmentCount - 1))
      : monthlyAmount;

    return {
      id: `inst-${projectId}-${index + 1}`,
      projectId,
      installmentNumber: index + 1,
      totalInstallments: installmentCount,
      amount,
      dueDate: addMonthsClamped(parsedDate, index).toISOString().slice(0, 10),
      status: "Pending",
    };
  });
}
