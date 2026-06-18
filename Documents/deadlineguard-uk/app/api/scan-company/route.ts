import { NextResponse } from "next/server";
import { searchCompany, getCompanyProfile, getOfficers, getFilingHistory, getPSC } from "@/lib/companiesHouse";
import { calculateRisk } from "@/lib/risk";

function looksLikeCompanyNumber(query: string): boolean {
  return /^[A-Z0-9]{6,8}$/i.test(query.trim());
}

function formatAddress(addr: Record<string, string> | undefined): string | null {
  if (!addr) return null;
  return [
    addr.care_of,
    addr.premises,
    addr.po_box ? `PO Box ${addr.po_box}` : null,
    addr.address_line_1,
    addr.address_line_2,
    addr.locality,
    addr.region,
    addr.postal_code,
    addr.country,
  ].filter(Boolean).join(", ");
}

function humaniseFilingDescription(
  description: string,
  descriptionValues: Record<string, unknown> | undefined
): string {
  if (!descriptionValues) return description.replace(/-/g, " ");
  const v = descriptionValues;

  const fmtDate = (d: unknown) => {
    if (!d || typeof d !== "string") return "";
    return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  };

  switch (description) {
    case "accounts-with-accounts-type-group":
      return `Group accounts made up to ${fmtDate(v.made_up_date)}`;
    case "accounts-with-accounts-type-full":
      return `Full accounts made up to ${fmtDate(v.made_up_date)}`;
    case "accounts-with-accounts-type-small":
      return `Small company accounts made up to ${fmtDate(v.made_up_date)}`;
    case "accounts-with-accounts-type-micro-entity":
      return `Micro-entity accounts made up to ${fmtDate(v.made_up_date)}`;
    case "accounts-with-accounts-type-dormant":
      return `Dormant accounts made up to ${fmtDate(v.made_up_date)}`;
    case "accounts-with-accounts-type-abbreviated":
      return `Abbreviated accounts made up to ${fmtDate(v.made_up_date)}`;
    case "confirmation-statement-with-no-updates":
      return `Confirmation statement (no updates) made up to ${fmtDate(v.made_up_date)}`;
    case "confirmation-statement-with-updates":
      return `Confirmation statement (with updates) made up to ${fmtDate(v.made_up_date)}`;
    case "termination-director-company-with-name-termination-date":
      return `Director resigned: ${v.officer_name}${v.termination_date ? ` on ${fmtDate(v.termination_date)}` : ""}`;
    case "termination-director-company-with-name":
      return `Director resigned: ${v.officer_name}`;
    case "appointment-of-director":
    case "appoint-person-director-company-with-name":
      return `Director appointed: ${v.officer_name}`;
    case "change-person-director-company-with-change-date":
      return `Director details changed: ${v.officer_name}`;
    case "change-person-secretary-company-with-change-date":
      return `Secretary details changed: ${v.officer_name}`;
    case "termination-secretary-company-with-name-termination-date":
      return `Secretary resigned: ${v.officer_name}`;
    case "appoint-person-secretary-company-with-name":
      return `Secretary appointed: ${v.officer_name}`;
    case "capital-cancellation-shares": {
      const cap = Array.isArray(v.capital) ? (v.capital as Record<string, string>[])[0] : null;
      return `Share cancellation${cap ? ` — ${cap.currency} ${cap.figure}` : ""}${v.date ? ` (${fmtDate(v.date)})` : ""}`;
    }
    case "change-registered-office-address-company-with-date":
      return `Registered office address changed`;
    case "notification-of-pscs":
      return `PSC notification`;
    case "cessation-of-pscs":
      return `PSC ceased`;
    case "change-of-name-company":
      return `Company name changed`;
    default:
      return description.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { query } = body;

    if (!query || typeof query !== "string" || !query.trim()) {
      return NextResponse.json(
        { error: "Please enter a company name or Companies House number." },
        { status: 400 }
      );
    }

    let companyNumber = query.trim();

    if (!looksLikeCompanyNumber(companyNumber)) {
      const searchResults = await searchCompany(query.trim());
      if (!searchResults.items?.length) {
        return NextResponse.json(
          { error: "No company found matching that name. Try the full registered name or company number." },
          { status: 404 }
        );
      }
      companyNumber = searchResults.items[0].company_number;
    }

    const [profile, officersData, filingData, pscData] = await Promise.all([
      getCompanyProfile(companyNumber),
      getOfficers(companyNumber).catch(() => null),
      getFilingHistory(companyNumber).catch(() => null),
      getPSC(companyNumber).catch(() => null),
    ]);

    const { risk, reasons, accountsDays, confirmationDays } = calculateRisk(profile);

    const accounts = profile.accounts?.next_accounts;
    const lastAccounts = profile.accounts?.last_accounts;
    const accountingRef = profile.accounts?.accounting_reference_date;
    const cs = profile.confirmation_statement;

    const officers = (officersData?.items ?? [])
      .filter((o: Record<string, unknown>) => !o.resigned_on)
      .map((o: Record<string, unknown>) => ({
        name: o.name as string,
        role: o.officer_role as string,
        appointedOn: (o.appointed_on as string) ?? null,
        nationality: (o.nationality as string) ?? null,
        countryOfResidence: (o.country_of_residence as string) ?? null,
        dateOfBirth: o.date_of_birth
          ? { month: (o.date_of_birth as Record<string, number>).month, year: (o.date_of_birth as Record<string, number>).year }
          : null,
        occupation: (o.occupation as string) ?? null,
        idVerificationDue: (o.identity_verification_details as Record<string, string> | null)
          ?.appointment_verification_statement_due_on ?? null,
      }));

    const filings = (filingData?.items ?? []).map((f: Record<string, unknown>) => ({
      date: f.date as string,
      actionDate: (f.action_date as string) ?? null,
      type: f.type as string,
      category: f.category as string,
      subcategory: (f.subcategory as string) ?? null,
      description: humaniseFilingDescription(
        f.description as string ?? "",
        f.description_values as Record<string, unknown> | undefined
      ),
      pages: (f.pages as number) ?? null,
    }));

    const pscs = (pscData?.items ?? [])
      .filter((p: Record<string, unknown>) => !p.ceased_on)
      .map((p: Record<string, unknown>) => ({
        name: (p.name as string) ?? null,
        kind: (p.kind as string) ?? null,
        naturesOfControl: (p.natures_of_control as string[]) ?? [],
        notifiedOn: (p.notified_on as string) ?? null,
        nationality: (p.nationality as string) ?? null,
        countryOfResidence: (p.country_of_residence as string) ?? null,
        dateOfBirth: p.date_of_birth
          ? { month: (p.date_of_birth as Record<string, number>).month, year: (p.date_of_birth as Record<string, number>).year }
          : null,
      }));

    return NextResponse.json({
      companyName: profile.company_name,
      companyNumber: profile.company_number,
      companyStatus: profile.company_status,
      companyStatusDetail: profile.company_status_detail ?? null,
      companyType: profile.type ?? null,
      jurisdiction: profile.jurisdiction ?? null,
      incorporatedOn: profile.date_of_creation ?? null,
      sicCodes: profile.sic_codes ?? [],
      previousNames: (profile.previous_company_names ?? []).map(
        (n: Record<string, string>) => ({ name: n.name, effectiveFrom: n.effective_from, ceasedOn: n.ceased_on })
      ),
      canFile: Boolean(profile.can_file),
      hasSuperSecurePscs: Boolean(profile.has_super_secure_pscs),

      registeredOffice: formatAddress(profile.registered_office_address),
      registeredOfficeInDispute: Boolean(profile.registered_office_is_in_dispute),
      undeliverableRegisteredOffice: Boolean(profile.undeliverable_registered_office_address),

      accountsDue: accounts?.due_on ?? null,
      accountsOverdue: Boolean(accounts?.overdue),
      accountsPeriodEnd: accounts?.period_end_on ?? null,
      accountsPeriodStart: accounts?.period_start_on ?? null,
      accountingReferenceDate: accountingRef ? `${accountingRef.day}/${accountingRef.month}` : null,
      lastAccountsMadeUpTo: lastAccounts?.made_up_to ?? null,
      lastAccountsType: lastAccounts?.type ?? null,
      lastAccountsPeriodStart: lastAccounts?.period_start_on ?? null,
      lastAccountsPeriodEnd: lastAccounts?.period_end_on ?? null,

      confirmationStatementDue: cs?.next_due ?? null,
      confirmationStatementOverdue: Boolean(cs?.overdue),
      confirmationStatementLastMadeUpTo: cs?.last_made_up_to ?? null,
      confirmationStatementNextMadeUpTo: cs?.next_made_up_to ?? null,

      hasCharges: Boolean(profile.has_charges),
      hasInsolvencyHistory: Boolean(profile.has_insolvency_history),
      hasBeenLiquidated: Boolean(profile.has_been_liquidated),
      lastFullMembersListDate: profile.last_full_members_list_date ?? null,

      riskLevel: risk,
      riskReasons: reasons,
      accountsDays,
      confirmationDays,

      officers,
      totalActiveOfficers: officersData?.active_count ?? null,
      totalResignedOfficers: officersData?.resigned_count ?? null,

      filings,
      totalFilings: filingData?.total_count ?? null,

      pscs,
      totalPscs: pscData?.active_count ?? null,
      pscExempt: (pscData?.items?.length === 0 && pscData?.total_results === 0) ? true : false,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Something went wrong.";
    const status = message === "Company not found" ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
