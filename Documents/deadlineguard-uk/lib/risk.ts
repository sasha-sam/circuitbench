export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface RiskResult {
  risk: RiskLevel;
  reasons: string[];
  accountsDays: number | null;
  confirmationDays: number | null;
}

export function daysUntil(dateString?: string | null): number | null {
  if (!dateString) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(dateString);
  date.setHours(0, 0, 0, 0);
  return Math.ceil((date.getTime() - today.getTime()) / 86_400_000);
}

export function calculateRisk(profile: Record<string, unknown>): RiskResult {
  const accounts = profile.accounts as Record<string, unknown> | undefined;
  const nextAccounts = accounts?.next_accounts as Record<string, unknown> | undefined;
  const cs = profile.confirmation_statement as Record<string, unknown> | undefined;

  const accountsOverdue = Boolean(nextAccounts?.overdue);
  const csOverdue = Boolean(cs?.overdue);

  const accountsDue = nextAccounts?.due_on as string | undefined;
  const csDue = cs?.next_due as string | undefined;

  const accountsDays = daysUntil(accountsDue);
  const confirmationDays = daysUntil(csDue);

  const reasons: string[] = [];

  if (accountsOverdue) reasons.push("Accounts are marked overdue at Companies House.");
  if (csOverdue) reasons.push("Confirmation statement is marked overdue at Companies House.");

  if (!accountsOverdue && accountsDays !== null) {
    if (accountsDays < 0)
      reasons.push("Accounts due date has passed.");
    else if (accountsDays <= 7)
      reasons.push(`Accounts are due in ${accountsDays} day${accountsDays === 1 ? "" : "s"} — file immediately.`);
    else if (accountsDays <= 14)
      reasons.push(`Accounts are due in ${accountsDays} days — file this week.`);
    else if (accountsDays <= 30)
      reasons.push(`Accounts are due in ${accountsDays} days — action required soon.`);
  }

  if (!csOverdue && confirmationDays !== null) {
    if (confirmationDays < 0)
      reasons.push("Confirmation statement due date has passed.");
    else if (confirmationDays <= 7)
      reasons.push(`Confirmation statement is due in ${confirmationDays} day${confirmationDays === 1 ? "" : "s"} — file immediately.`);
    else if (confirmationDays <= 14)
      reasons.push(`Confirmation statement is due in ${confirmationDays} days — file this week.`);
    else if (confirmationDays <= 30)
      reasons.push(`Confirmation statement is due in ${confirmationDays} days — action required soon.`);
  }

  if (accountsOverdue || csOverdue) {
    return { risk: "CRITICAL", reasons, accountsDays, confirmationDays };
  }

  if (
    (accountsDays !== null && accountsDays <= 14) ||
    (confirmationDays !== null && confirmationDays <= 14)
  ) {
    return { risk: "HIGH", reasons, accountsDays, confirmationDays };
  }

  if (
    (accountsDays !== null && accountsDays <= 30) ||
    (confirmationDays !== null && confirmationDays <= 30)
  ) {
    return { risk: "MEDIUM", reasons, accountsDays, confirmationDays };
  }

  if (reasons.length === 0) {
    reasons.push("No urgent filing deadline detected.");
  }

  return { risk: "LOW", reasons, accountsDays, confirmationDays };
}
