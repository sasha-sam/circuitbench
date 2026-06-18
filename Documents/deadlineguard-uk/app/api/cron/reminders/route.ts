import { NextResponse } from "next/server";
import { Resend } from "resend";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getCompanyProfile } from "@/lib/companiesHouse";
import { calculateRisk, daysUntil } from "@/lib/risk";

const REMINDER_DAYS = [30, 14, 7];

function shouldSendReminder(
  profile: Record<string, unknown>,
  accountsOverdue: boolean,
  csOverdue: boolean,
  accountsDays: number | null,
  confirmationDays: number | null
): boolean {
  if (accountsOverdue || csOverdue) return true;
  if (accountsDays !== null && REMINDER_DAYS.includes(accountsDays)) return true;
  if (confirmationDays !== null && REMINDER_DAYS.includes(confirmationDays)) return true;
  return false;
}

function buildEmailBody(
  companyName: string,
  companyNumber: string,
  accountsDue: string | null,
  confirmationDue: string | null,
  riskLevel: string,
  reasons: string[]
): string {
  return `Legalite.ai — Compliance Reminder

Company: ${companyName}
Company number: ${companyNumber}

Accounts due: ${accountsDue ?? "Not available"}
Confirmation statement due: ${confirmationDue ?? "Not available"}

Risk level: ${riskLevel}

${reasons.map((r) => `• ${r}`).join("\n")}

Action: Log in to your Companies House account or contact your accountant to file before the deadline.

---
This reminder is based on public Companies House data and is not legal or accounting advice.
To stop receiving these reminders, reply UNSUBSCRIBE to this email.

Legalite.ai — legalite.ai`;
}

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "RESEND_API_KEY not configured." }, { status: 503 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const supabase = getSupabaseAdmin();

  const { data: companies, error } = await supabase
    .from("tracked_companies")
    .select("*")
    .limit(200);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const item of companies ?? []) {
    try {
      const profile = await getCompanyProfile(item.company_number);
      const { risk, reasons, accountsDays, confirmationDays } = calculateRisk(profile);

      const accountsDue = (profile.accounts as Record<string, unknown>)?.next_accounts
        ? ((profile.accounts as Record<string, unknown>).next_accounts as Record<string, unknown>)?.due_on as string | null
        : null;
      const confirmationDue = (profile.confirmation_statement as Record<string, unknown>)?.next_due as string | null;

      const accountsOverdue = Boolean(
        ((profile.accounts as Record<string, unknown>)?.next_accounts as Record<string, unknown>)?.overdue
      );
      const csOverdue = Boolean(
        (profile.confirmation_statement as Record<string, unknown>)?.overdue
      );

      if (!shouldSendReminder(profile, accountsOverdue, csOverdue, accountsDays, confirmationDays)) {
        skipped++;
        continue;
      }

      await resend.emails.send({
        from: "Legalite.ai <alerts@legalite.ai>",
        to: item.email,
        subject: `${profile.company_name}: Companies House deadline reminder`,
        text: buildEmailBody(
          profile.company_name as string,
          profile.company_number as string,
          accountsDue ?? null,
          confirmationDue ?? null,
          risk,
          reasons
        ),
      });

      sent++;
    } catch (err) {
      errors.push(
        `${item.company_number}: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    }
  }

  return NextResponse.json({ ok: true, sent, skipped, errors });
}
