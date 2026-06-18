"use client";

interface Officer {
  name: string;
  role: string;
  appointedOn: string | null;
  nationality: string | null;
  countryOfResidence: string | null;
  dateOfBirth: { month: number; year: number } | null;
  occupation: string | null;
  idVerificationDue: string | null;
}

interface Filing {
  date: string;
  actionDate: string | null;
  type: string;
  category: string;
  subcategory: string | null;
  description: string;
  pages: number | null;
}

interface PSC {
  name: string | null;
  kind: string | null;
  naturesOfControl: string[];
  notifiedOn: string | null;
  nationality: string | null;
  countryOfResidence: string | null;
  dateOfBirth: { month: number; year: number } | null;
}

interface PreviousName {
  name: string;
  effectiveFrom: string;
  ceasedOn: string;
}

export interface ReportData {
  companyName: string;
  companyNumber: string;
  companyStatus: string;
  companyStatusDetail: string | null;
  companyType: string | null;
  jurisdiction: string | null;
  incorporatedOn: string | null;
  sicCodes: string[];
  previousNames: PreviousName[];
  canFile: boolean;
  hasSuperSecurePscs: boolean;

  registeredOffice: string | null;
  registeredOfficeInDispute: boolean;
  undeliverableRegisteredOffice: boolean;

  accountsDue: string | null;
  accountsOverdue: boolean;
  accountsPeriodEnd: string | null;
  accountsPeriodStart: string | null;
  accountingReferenceDate: string | null;
  lastAccountsMadeUpTo: string | null;
  lastAccountsType: string | null;
  lastAccountsPeriodStart: string | null;
  lastAccountsPeriodEnd: string | null;

  confirmationStatementDue: string | null;
  confirmationStatementOverdue: boolean;
  confirmationStatementLastMadeUpTo: string | null;
  confirmationStatementNextMadeUpTo: string | null;

  hasCharges: boolean;
  hasInsolvencyHistory: boolean;
  hasBeenLiquidated: boolean;
  lastFullMembersListDate: string | null;

  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  riskReasons: string[];
  accountsDays: number | null;
  confirmationDays: number | null;

  officers: Officer[];
  totalActiveOfficers: number | null;
  totalResignedOfficers: number | null;

  filings: Filing[];
  totalFilings: number | null;

  pscs: PSC[];
  totalPscs: number | null;
  pscExempt: boolean;
}

// ── Lookup tables ────────────────────────────────────────────────────────────

const COMPANY_TYPE_LABELS: Record<string, string> = {
  "ltd": "Private Limited Company (Ltd)",
  "plc": "Public Limited Company (PLC)",
  "llp": "Limited Liability Partnership (LLP)",
  "lp": "Limited Partnership (LP)",
  "royal-charter": "Royal Charter Company",
  "community-interest-company": "Community Interest Company (CIC)",
  "industrial-and-provident-society": "Industrial & Provident Society",
  "registered-society-non-registered-company": "Registered Society",
  "converted-or-closed": "Converted / Closed",
  "uk-establishment": "UK Establishment (overseas)",
  "other": "Other",
};

const JURISDICTION_LABELS: Record<string, string> = {
  "england-wales": "England & Wales",
  "scotland": "Scotland",
  "northern-ireland": "Northern Ireland",
  "wales": "Wales",
  "england": "England",
  "noneu": "Non-EU",
  "united-kingdom": "United Kingdom",
  "european-union": "European Union",
};

const ROLE_LABELS: Record<string, string> = {
  "director": "Director",
  "secretary": "Company Secretary",
  "llp-member": "LLP Member",
  "llp-designated-member": "LLP Designated Member",
  "corporate-director": "Corporate Director",
  "corporate-secretary": "Corporate Secretary",
  "corporate-llp-member": "Corporate LLP Member",
  "corporate-llp-designated-member": "Corporate LLP Designated Member",
  "judicial-factor": "Judicial Factor",
  "receiver-and-manager": "Receiver & Manager",
  "nominee-director": "Nominee Director",
  "nominee-secretary": "Nominee Secretary",
};

const NOC_LABELS: Record<string, string> = {
  "ownership-of-shares-25-to-50-percent": "Owns 25–50% of shares",
  "ownership-of-shares-50-to-75-percent": "Owns 50–75% of shares",
  "ownership-of-shares-75-to-100-percent": "Owns 75–100% of shares",
  "voting-rights-25-to-50-percent": "Holds 25–50% of voting rights",
  "voting-rights-50-to-75-percent": "Holds 50–75% of voting rights",
  "voting-rights-75-to-100-percent": "Holds 75–100% of voting rights",
  "right-to-appoint-and-remove-directors": "Right to appoint/remove directors",
  "significant-influence-or-control": "Significant influence or control",
  "right-to-share-surplus-assets-25-to-50-percent": "Right to 25–50% of surplus assets",
  "right-to-share-surplus-assets-50-to-75-percent": "Right to 50–75% of surplus assets",
  "right-to-share-surplus-assets-75-to-100-percent": "Right to 75–100% of surplus assets",
};

const SIC_LABELS: Record<string, string> = {
  "01110": "Growing of cereals",
  "46900": "Non-specialised wholesale trade",
  "47110": "Retail sale in non-specialised stores (groceries)",
  "47190": "Other retail sale in non-specialised stores",
  "47710": "Retail sale of clothing",
  "47730": "Dispensing chemist",
  "47910": "Retail sale via mail/internet",
  "56101": "Licensed restaurants",
  "56102": "Unlicensed restaurants and cafes",
  "62012": "Business and domestic software development",
  "62020": "IT consultancy activities",
  "63110": "Data processing and hosting",
  "64110": "Central banking",
  "64191": "Banks",
  "64205": "Activities of financial services holding companies",
  "64209": "Activities of financial services holding companies (other)",
  "64302": "Trusts and funds",
  "65110": "Life insurance",
  "65120": "Non-life insurance",
  "66110": "Administration of financial markets",
  "66120": "Security and commodity contracts",
  "68100": "Buying and selling of own real estate",
  "68209": "Other letting and operating of own/leased real estate",
  "69101": "Barristers at law",
  "69102": "Solicitors",
  "70100": "Activities of head offices",
  "70229": "Management consultancy",
  "71111": "Architectural activities",
  "71121": "Engineering design",
  "72110": "Research of biotechnology",
  "74909": "Other professional, scientific and technical activities",
  "82990": "Other business support services",
  "85310": "General secondary education",
  "86101": "Hospital activities",
  "86210": "General medical practice activities",
  "99999": "Dormant company",
};

const CATEGORY_COLOURS: Record<string, string> = {
  "accounts": "bg-blue-100 text-blue-700",
  "confirmation-statement": "bg-purple-100 text-purple-700",
  "officers": "bg-emerald-100 text-emerald-700",
  "capital": "bg-amber-100 text-amber-700",
  "address": "bg-pink-100 text-pink-700",
  "mortgage": "bg-red-100 text-red-700",
  "persons-with-significant-control": "bg-indigo-100 text-indigo-700",
  "annual-return": "bg-cyan-100 text-cyan-700",
  "dissolution": "bg-red-100 text-red-700",
  "incorporation": "bg-green-100 text-green-700",
};

const RISK_BADGE = {
  CRITICAL: "bg-red-100 text-red-800 border-red-300",
  HIGH: "bg-orange-100 text-orange-800 border-orange-300",
  MEDIUM: "bg-yellow-100 text-yellow-800 border-yellow-300",
  LOW: "bg-green-100 text-green-800 border-green-300",
};

const RISK_BANNER = {
  CRITICAL: "bg-red-50 border-red-200 text-red-900",
  HIGH: "bg-orange-50 border-orange-200 text-orange-900",
  MEDIUM: "bg-yellow-50 border-yellow-200 text-yellow-900",
  LOW: "bg-green-50 border-green-200 text-green-900",
};

// ── Formatters ───────────────────────────────────────────────────────────────

function fmtDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function fmtDateShort(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function toTitle(s: string): string {
  return s.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function categoryLabel(cat: string): string {
  return toTitle(cat.replace(/-/g, " "));
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white border border-slate-200 rounded-2xl shadow-sm p-6 ${className}`}>
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="font-semibold text-slate-900 text-base mb-4">{children}</h3>;
}

function Row({ label, value }: { label: string; value?: React.ReactNode }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-slate-100 last:border-0">
      <span className="text-sm text-slate-500 shrink-0 w-44">{label}</span>
      <span className="text-sm text-slate-900 text-right break-words max-w-xs">{value}</span>
    </div>
  );
}

function DaysChip({ days, overdue }: { days: number | null; overdue: boolean }) {
  if (overdue) return <span className="text-xs font-bold bg-red-100 text-red-700 px-2.5 py-0.5 rounded-full">OVERDUE</span>;
  if (days === null) return null;
  const label = days < 0
    ? `${Math.abs(days)}d overdue`
    : `${days} day${days === 1 ? "" : "s"} away`;
  const cls = days < 0 ? "bg-red-100 text-red-700"
    : days <= 14 ? "bg-orange-100 text-orange-700"
    : days <= 30 ? "bg-yellow-100 text-yellow-700"
    : "bg-slate-100 text-slate-600";
  return <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${cls}`}>{label}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  const cls = s === "active" ? "bg-green-100 text-green-800 border-green-200"
    : s === "dissolved" ? "bg-slate-100 text-slate-600 border-slate-200"
    : s.includes("liquidat") ? "bg-red-100 text-red-700 border-red-200"
    : "bg-yellow-100 text-yellow-800 border-yellow-200";
  return <span className={`border rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${cls}`}>{status.replace(/-/g, " ")}</span>;
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ComplianceReport({ report }: { report: ReportData }) {
  const directors = report.officers.filter((o) =>
    ["director", "llp-member", "llp-designated-member", "corporate-director", "corporate-llp-member", "corporate-llp-designated-member", "nominee-director"].includes(o.role)
  );
  const secretaries = report.officers.filter((o) =>
    ["secretary", "corporate-secretary", "nominee-secretary"].includes(o.role)
  );
  const otherOfficers = report.officers.filter((o) =>
    !directors.includes(o) && !secretaries.includes(o)
  );

  const hasWarnings = report.hasCharges || report.hasInsolvencyHistory || report.hasBeenLiquidated
    || report.registeredOfficeInDispute || report.undeliverableRegisteredOffice;

  return (
    <div className="mt-6 space-y-4">

      {/* ── Company header ── */}
      <Card>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">{report.companyName}</h2>
              <StatusBadge status={report.companyStatus} />
              <span className={`border rounded-full px-3 py-0.5 text-xs font-bold ${RISK_BADGE[report.riskLevel]}`}>
                {report.riskLevel} RISK
              </span>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-sm text-slate-500">
              <span>No. {report.companyNumber}</span>
              {report.companyType && <span>{COMPANY_TYPE_LABELS[report.companyType] ?? report.companyType}</span>}
              {report.jurisdiction && <span>{JURISDICTION_LABELS[report.jurisdiction] ?? report.jurisdiction}</span>}
              {report.incorporatedOn && <span>Inc. {fmtDateShort(report.incorporatedOn)}</span>}
            </div>
            {report.registeredOffice && (
              <p className="mt-2 text-sm text-slate-500">📍 {report.registeredOffice}</p>
            )}
            {report.sicCodes.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {report.sicCodes.map((code) => (
                  <span key={code} className="text-xs bg-slate-100 text-slate-600 rounded-lg px-2.5 py-1">
                    SIC {code}{SIC_LABELS[code] ? ` — ${SIC_LABELS[code]}` : ""}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Risk reasons */}
        <div className={`mt-4 border rounded-xl px-4 py-3 ${RISK_BANNER[report.riskLevel]}`}>
          <ul className="space-y-1">
            {report.riskReasons.map((r) => (
              <li key={r} className="text-sm flex items-start gap-2">
                <span className="mt-0.5 shrink-0">{report.riskLevel === "LOW" ? "✓" : "⚠"}</span>
                {r}
              </li>
            ))}
          </ul>
        </div>
      </Card>

      {/* ── Warnings ── */}
      {hasWarnings && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
          <h3 className="font-semibold text-red-900 mb-2">⚠ Company Warnings</h3>
          <ul className="space-y-1 text-sm text-red-800">
            {report.hasCharges && <li>This company has registered charges (mortgages / debentures) on record.</li>}
            {report.hasInsolvencyHistory && <li>This company has an insolvency history on record.</li>}
            {report.hasBeenLiquidated && <li>This company has previously been in liquidation.</li>}
            {report.registeredOfficeInDispute && <li>The registered office address is in dispute at Companies House.</li>}
            {report.undeliverableRegisteredOffice && <li>The registered office address is marked as undeliverable.</li>}
          </ul>
        </div>
      )}

      {/* ── Filing deadlines ── */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Annual Accounts</p>
          <p className="text-2xl font-bold text-slate-900">{fmtDate(report.accountsDue)}</p>
          <div className="mt-2">
            <DaysChip days={report.accountsDays} overdue={report.accountsOverdue} />
          </div>
          <div className="mt-4 space-y-1.5 text-xs text-slate-500 border-t border-slate-100 pt-3">
            {report.accountsPeriodStart && report.accountsPeriodEnd && (
              <p><span className="font-medium text-slate-700">Period:</span> {fmtDateShort(report.accountsPeriodStart)} – {fmtDateShort(report.accountsPeriodEnd)}</p>
            )}
            {report.accountingReferenceDate && (
              <p><span className="font-medium text-slate-700">Year-end (ARD):</span> {report.accountingReferenceDate}</p>
            )}
            {report.lastAccountsMadeUpTo && (
              <p>
                <span className="font-medium text-slate-700">Last filed:</span> {fmtDateShort(report.lastAccountsMadeUpTo)}
                {report.lastAccountsType && <span className="ml-1 capitalize">({report.lastAccountsType} accounts)</span>}
              </p>
            )}
            {report.lastAccountsPeriodStart && report.lastAccountsPeriodEnd && (
              <p><span className="font-medium text-slate-700">Last period:</span> {fmtDateShort(report.lastAccountsPeriodStart)} – {fmtDateShort(report.lastAccountsPeriodEnd)}</p>
            )}
          </div>
        </Card>

        <Card>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Confirmation Statement</p>
          <p className="text-2xl font-bold text-slate-900">{fmtDate(report.confirmationStatementDue)}</p>
          <div className="mt-2">
            <DaysChip days={report.confirmationDays} overdue={report.confirmationStatementOverdue} />
          </div>
          <div className="mt-4 space-y-1.5 text-xs text-slate-500 border-t border-slate-100 pt-3">
            {report.confirmationStatementNextMadeUpTo && (
              <p><span className="font-medium text-slate-700">Made up to:</span> {fmtDateShort(report.confirmationStatementNextMadeUpTo)}</p>
            )}
            {report.confirmationStatementLastMadeUpTo && (
              <p><span className="font-medium text-slate-700">Last confirmed:</span> {fmtDateShort(report.confirmationStatementLastMadeUpTo)}</p>
            )}
          </div>
        </Card>
      </div>

      {/* ── Persons with Significant Control ── */}
      <Card>
        <SectionTitle>
          Persons with Significant Control
          {report.totalPscs !== null && report.totalPscs > 0 && (
            <span className="ml-2 text-sm font-normal text-slate-400">({report.totalPscs})</span>
          )}
        </SectionTitle>

        {report.pscExempt || report.pscs.length === 0 ? (
          <p className="text-sm text-slate-500">
            {report.hasSuperSecurePscs
              ? "This company has super-secure PSCs — details are protected."
              : "No PSCs recorded. This company may be exempt (e.g. listed on a recognised stock exchange) or have no registrable persons."}
          </p>
        ) : (
          <div className="space-y-4">
            {report.pscs.map((psc, i) => (
              <div key={i} className="pb-4 border-b border-slate-100 last:border-0 last:pb-0">
                <p className="text-sm font-semibold text-slate-900">{psc.name ?? "Unnamed PSC"}</p>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-xs text-slate-400">
                  {psc.kind && <span>{toTitle(psc.kind.replace(/-/g, " "))}</span>}
                  {psc.nationality && <span>{psc.nationality}</span>}
                  {psc.countryOfResidence && <span>Resides in {psc.countryOfResidence}</span>}
                  {psc.dateOfBirth && <span>b. {psc.dateOfBirth.month}/{psc.dateOfBirth.year}</span>}
                  {psc.notifiedOn && <span>Notified {fmtDateShort(psc.notifiedOn)}</span>}
                </div>
                {psc.naturesOfControl.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {psc.naturesOfControl.map((noc) => (
                      <span key={noc} className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full px-2.5 py-0.5">
                        {NOC_LABELS[noc] ?? toTitle(noc)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ── Directors ── */}
      {directors.length > 0 && (
        <Card>
          <SectionTitle>
            Directors
            <span className="ml-2 text-sm font-normal text-slate-400">
              ({directors.length} active
              {report.totalResignedOfficers ? ` · ${report.totalResignedOfficers} resigned` : ""})
            </span>
          </SectionTitle>
          <div className="space-y-0">
            {directors.map((o) => (
              <div key={o.name} className="py-3 border-b border-slate-100 last:border-0">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{o.name}</p>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-xs text-slate-400">
                      <span>{ROLE_LABELS[o.role] ?? toTitle(o.role)}</span>
                      {o.appointedOn && <span>Appointed {fmtDateShort(o.appointedOn)}</span>}
                      {o.nationality && <span>{o.nationality}</span>}
                      {o.countryOfResidence && <span>Resides in {o.countryOfResidence}</span>}
                      {o.dateOfBirth && <span>b. {o.dateOfBirth.month}/{o.dateOfBirth.year}</span>}
                      {o.occupation && <span className="italic">{o.occupation}</span>}
                    </div>
                  </div>
                  {o.idVerificationDue && (
                    <span className="shrink-0 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2.5 py-0.5">
                      ID verify by {fmtDateShort(o.idVerificationDue)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {secretaries.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Company Secretary</p>
              {secretaries.map((o) => (
                <div key={o.name} className="flex items-center justify-between py-1">
                  <span className="text-sm text-slate-800">{o.name}</span>
                  <span className="text-xs text-slate-400">{o.appointedOn ? `Appointed ${fmtDateShort(o.appointedOn)}` : ""}</span>
                </div>
              ))}
            </div>
          )}

          {otherOfficers.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Other Officers</p>
              {otherOfficers.map((o) => (
                <div key={o.name} className="flex items-center justify-between py-1">
                  <span className="text-sm text-slate-800">{o.name}</span>
                  <span className="text-xs text-slate-400">{ROLE_LABELS[o.role] ?? toTitle(o.role)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* ── Identity Verification ── */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-blue-400 mb-1">Identity Verification Requirement (Nov 2025)</p>
        <p className="text-sm text-blue-800">
          From 18 November 2025, all directors and PSCs must verify their identity with Companies House.
          Verification deadlines are shown above next to each director&apos;s name.
        </p>
        <a href="https://www.gov.uk/guidance/identity-verification-for-companies-house"
          target="_blank" rel="noopener noreferrer"
          className="mt-2 inline-block text-sm font-semibold text-blue-700 underline">
          GOV.UK guidance →
        </a>
      </div>

      {/* ── Filing history ── */}
      {report.filings.length > 0 && (
        <Card>
          <SectionTitle>
            Filing History
            {report.totalFilings && (
              <span className="ml-2 text-sm font-normal text-slate-400">({report.totalFilings.toLocaleString()} total filings on record)</span>
            )}
          </SectionTitle>
          <div>
            {report.filings.map((f, i) => (
              <div key={i} className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-0">
                <div className="shrink-0 w-[72px]">
                  <p className="text-xs text-slate-500">{fmtDateShort(f.date)}</p>
                  {f.actionDate && f.actionDate !== f.date && (
                    <p className="text-xs text-slate-300 mt-0.5">Act: {fmtDateShort(f.actionDate)}</p>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-800">{f.description}</p>
                  <div className="mt-1 flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CATEGORY_COLOURS[f.category] ?? "bg-slate-100 text-slate-600"}`}>
                      {categoryLabel(f.category)}
                    </span>
                    {f.subcategory && (
                      <span className="text-xs text-slate-400 capitalize">{f.subcategory}</span>
                    )}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <span className="text-xs font-mono text-slate-400">{f.type}</span>
                  {f.pages && <p className="text-xs text-slate-300 mt-0.5">{f.pages}p</p>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Company details ── */}
      <Card>
        <SectionTitle>Company Details</SectionTitle>
        <Row label="Company number" value={report.companyNumber} />
        <Row label="Company type" value={report.companyType ? (COMPANY_TYPE_LABELS[report.companyType] ?? report.companyType) : undefined} />
        <Row label="Status" value={<StatusBadge status={report.companyStatus} />} />
        {report.companyStatusDetail && <Row label="Status detail" value={report.companyStatusDetail} />}
        <Row label="Jurisdiction" value={report.jurisdiction ? (JURISDICTION_LABELS[report.jurisdiction] ?? report.jurisdiction) : undefined} />
        <Row label="Incorporated" value={fmtDate(report.incorporatedOn)} />
        <Row label="Registered office" value={report.registeredOffice} />
        {report.sicCodes.length > 0 && (
          <Row label="SIC codes" value={
            <span className="space-y-1">
              {report.sicCodes.map((c) => (
                <span key={c} className="block">{c}{SIC_LABELS[c] ? ` — ${SIC_LABELS[c]}` : ""}</span>
              ))}
            </span>
          } />
        )}
        <Row label="Year-end (ARD)" value={report.accountingReferenceDate} />
        <Row label="Can file online" value={report.canFile ? "Yes" : "No"} />
        <Row label="Charges registered" value={report.hasCharges ? "Yes ⚠" : "No"} />
        <Row label="Insolvency history" value={report.hasInsolvencyHistory ? "Yes ⚠" : "No"} />
        <Row label="Previously liquidated" value={report.hasBeenLiquidated ? "Yes ⚠" : "No"} />
        <Row label="Active officers" value={report.totalActiveOfficers} />
        <Row label="Resigned officers" value={report.totalResignedOfficers} />
        <Row label="Total filings" value={report.totalFilings?.toLocaleString()} />
        {report.lastFullMembersListDate && (
          <Row label="Last full members list" value={fmtDateShort(report.lastFullMembersListDate)} />
        )}
        {report.previousNames.length > 0 && (
          <Row label="Previous names" value={
            <span className="space-y-1.5">
              {report.previousNames.map((n) => (
                <span key={n.name} className="block">
                  {n.name}
                  <span className="text-slate-400 text-xs ml-1">
                    ({fmtDateShort(n.effectiveFrom)} – {fmtDateShort(n.ceasedOn)})
                  </span>
                </span>
              ))}
            </span>
          } />
        )}
      </Card>

      <p className="text-xs text-slate-400 text-center px-2">
        Report generated from public Companies House data. For informational purposes only — not legal, accounting, or professional advice.
        Always verify with official records and consult a qualified professional.
      </p>
    </div>
  );
}
