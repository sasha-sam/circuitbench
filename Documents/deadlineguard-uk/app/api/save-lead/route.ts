import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      email,
      companyNumber,
      companyName,
      companyStatus,
      accountsDue,
      confirmationStatementDue,
      riskLevel,
    } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { error: "A valid email address is required." },
        { status: 400 }
      );
    }

    if (!companyNumber || typeof companyNumber !== "string") {
      return NextResponse.json(
        { error: "Company number is required." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const { error } = await supabase.from("tracked_companies").insert({
      email: email.toLowerCase().trim(),
      company_number: companyNumber,
      company_name: companyName ?? null,
      company_status: companyStatus ?? null,
      accounts_due: accountsDue ?? null,
      confirmation_statement_due: confirmationStatementDue ?? null,
      risk_level: riskLevel ?? null,
      plan: "free",
    });

    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Could not save reminder.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
