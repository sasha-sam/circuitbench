import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI not configured." },
        { status: 503 }
      );
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const report = await req.json();

    const prompt = `You are a UK company compliance assistant. You are NOT a lawyer or accountant and must not give legal or accounting advice.

You have been given the following public Companies House information:

Company: ${report.companyName}
Company number: ${report.companyNumber}
Status: ${report.companyStatus}
Accounts due: ${report.accountsDue ?? "Not available"}
Accounts overdue: ${report.accountsOverdue ? "Yes" : "No"}
Confirmation statement due: ${report.confirmationStatementDue ?? "Not available"}
Confirmation statement overdue: ${report.confirmationStatementOverdue ? "Yes" : "No"}
Risk level: ${report.riskLevel}
Reasons: ${report.riskReasons?.join("; ")}

Write three sections:

1. RISK SUMMARY — one short paragraph explaining the risk in plain English. Do not use jargon. Do not claim they broke the law unless overdue is "Yes".

2. ACTION CHECKLIST — exactly 4 numbered steps they should take now.

3. EMAIL TO ACCOUNTANT — a short, professional email they can copy and send to their accountant. Include the company name, company number, and relevant due dates.

Rules:
- Keep the entire response under 220 words.
- Do not give legal advice.
- Do not use the word "illegal".
- End with: This information is based on public Companies House data and is not professional advice.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    });

    return NextResponse.json({
      text: completion.choices[0].message.content,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Could not generate report.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
