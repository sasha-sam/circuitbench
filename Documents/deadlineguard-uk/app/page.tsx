import CompanyScanner from "@/components/CompanyScanner";

const PENALTIES = [
  { label: "Up to 1 month late", amount: "£150" },
  { label: "1–3 months late", amount: "£375" },
  { label: "3–6 months late", amount: "£750" },
  { label: "More than 6 months late", amount: "£1,500" },
];

const STEPS = [
  {
    n: "01",
    title: "Search any UK company",
    desc: "Enter a company name or Companies House number. We pull live data in under 2 seconds.",
  },
  {
    n: "02",
    title: "Instant compliance report",
    desc: "Full risk score, all deadlines, officers, PSCs, and filing history — every detail in one place.",
  },
  {
    n: "03",
    title: "Automated deadline alerts",
    desc: "Add your email and we'll warn you 30, 14, and 7 days before each deadline. No manual checking.",
  },
];

export default function Home() {
  return (
    <main style={{ background: "var(--background)", color: "var(--foreground)" }} className="min-h-screen">

      {/* Nav */}
      <nav className="border-b border-stone-200 bg-[#fafaf9] sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-emerald-800 rounded flex items-center justify-center">
              <span className="text-white text-xs font-black font-display tracking-tighter">L</span>
            </div>
            <span className="font-display font-800 text-base tracking-tight text-stone-900" style={{ fontWeight: 800 }}>
              LEGALITE.AI
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-stone-400 font-body">Free beta</span>
            <span className="text-xs text-emerald-800 font-semibold border border-emerald-800 rounded px-2.5 py-1">
              UK Companies House
            </span>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 pt-20 pb-16 max-w-6xl mx-auto">
        <p className="text-xs font-semibold tracking-[0.2em] text-emerald-800 uppercase mb-6">
          Compliance intelligence
        </p>

        <h1
          className="font-display leading-[0.92] tracking-tight text-stone-900 mb-8"
          style={{
            fontWeight: 800,
            fontSize: "clamp(3.5rem, 10vw, 8rem)",
          }}
        >
          AUTOMATE YOUR<br />
          UK COMPANY<br />
          <span className="text-emerald-800">COMPLIANCE.</span>
        </h1>

        <div className="max-w-2xl mb-12">
          <p className="text-lg text-stone-500 leading-relaxed">
            Instant risk scores, deadline tracking, and automated email reminders
            for every Companies House filing — so you never pay a late penalty again.
            Free, forever.
          </p>
        </div>

        <CompanyScanner />
      </section>

      {/* Stats */}
      <section className="border-t border-stone-200 bg-stone-50">
        <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-3 gap-px">
          {[
            { n: "4M+", label: "UK companies on Companies House" },
            { n: "£1,500", label: "Max penalty for late accounts" },
            { n: "<2s", label: "Average full scan time" },
          ].map(({ n, label }) => (
            <div key={n} className="px-6 first:pl-0 last:pr-0">
              <p
                className="font-display text-stone-900 leading-none mb-1"
                style={{ fontWeight: 800, fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)" }}
              >
                {n}
              </p>
              <p className="text-xs text-stone-400 leading-snug max-w-[15ch]">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 py-24 max-w-6xl mx-auto">
        <div className="mb-16">
          <p className="text-xs font-semibold tracking-[0.2em] text-emerald-800 uppercase mb-3">
            How it works
          </p>
          <h2
            className="font-display text-stone-900 leading-tight"
            style={{ fontWeight: 800, fontSize: "clamp(2rem, 4vw, 3.5rem)" }}
          >
            FROM SEARCH TO AUTOMATED<br />IN 30 SECONDS.
          </h2>
        </div>

        <div className="grid sm:grid-cols-3 gap-16">
          {STEPS.map(({ n, title, desc }) => (
            <div key={n}>
              <p
                className="font-display text-stone-100 leading-none mb-6 select-none"
                style={{ fontWeight: 800, fontSize: "5rem" }}
              >
                {n}
              </p>
              <h3
                className="font-display text-stone-900 mb-3"
                style={{ fontWeight: 700, fontSize: "1.2rem", letterSpacing: "-0.01em" }}
              >
                {title}
              </h3>
              <p className="text-sm text-stone-500 leading-relaxed max-w-[38ch]">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Penalty table */}
      <section className="border-t border-stone-200 bg-stone-50 px-6 py-20">
        <div className="max-w-6xl mx-auto grid sm:grid-cols-2 gap-12 items-start">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-red-600 uppercase mb-3">
              The stakes
            </p>
            <h2
              className="font-display text-stone-900 leading-tight mb-4"
              style={{ fontWeight: 800, fontSize: "clamp(1.8rem, 3.5vw, 3rem)" }}
            >
              LATE FILING<br />PENALTIES.
            </h2>
            <p className="text-sm text-stone-500 leading-relaxed max-w-[38ch]">
              Automatic. No warnings. Penalties double if your accounts are late two years running.
            </p>
            <p className="text-xs text-stone-400 mt-6">Source: GOV.UK</p>
          </div>

          <div className="divide-y divide-stone-200 border border-stone-200 rounded-xl overflow-hidden bg-white">
            {PENALTIES.map(({ label, amount }) => (
              <div key={label} className="flex justify-between items-center px-5 py-4">
                <span className="text-sm text-stone-600">{label}</span>
                <span
                  className="font-display text-red-600"
                  style={{ fontWeight: 800, fontSize: "1.15rem" }}
                >
                  {amount}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Free CTA */}
      <section className="px-6 py-24 max-w-6xl mx-auto">
        <div className="border border-stone-200 rounded-2xl p-12 bg-white flex flex-col sm:flex-row sm:items-end justify-between gap-8">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-emerald-800 uppercase mb-4">
              Pricing
            </p>
            <p
              className="font-display text-stone-900 leading-none mb-4"
              style={{ fontWeight: 800, fontSize: "clamp(3rem, 6vw, 5.5rem)" }}
            >
              FREE,<br />FOREVER.
            </p>
            <p className="text-stone-500 text-base max-w-[40ch] leading-relaxed">
              Unlimited scans, automated reminders, full compliance reports.
              No account. No credit card. No catch.
            </p>
          </div>
          <div className="shrink-0">
            <div className="text-xs text-stone-400 space-y-2">
              {["Unlimited company scans", "Automated email reminders", "Full officer & PSC reports", "Live Companies House data"].map(item => (
                <div key={item} className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                    <span className="text-emerald-800 text-[10px] font-bold">✓</span>
                  </span>
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-stone-200 px-6 py-10">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-start justify-between gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-5 h-5 bg-emerald-800 rounded flex items-center justify-center">
                <span className="text-white text-[10px] font-black font-display">L</span>
              </div>
              <span className="font-display text-sm text-stone-900" style={{ fontWeight: 800 }}>LEGALITE.AI</span>
            </div>
            <p className="text-xs text-stone-400 max-w-xs leading-relaxed">
              Uses public Companies House data. Not legal, accounting, or professional advice.
              Not affiliated with Companies House or His Majesty&apos;s Government.
            </p>
            <p className="text-xs text-stone-300 mt-4">© {new Date().getFullYear()} Legalite.ai</p>
          </div>

          <div className="flex flex-col gap-2 text-xs text-stone-400">
            <a href="https://www.gov.uk/file-your-company-annual-accounts" target="_blank" rel="noopener noreferrer" className="hover:text-stone-700 underline underline-offset-2">
              GOV.UK: File accounts
            </a>
            <a href="https://www.gov.uk/confirmation-statement" target="_blank" rel="noopener noreferrer" className="hover:text-stone-700 underline underline-offset-2">
              GOV.UK: Confirmation statement
            </a>
            <a href="https://find-and-update.company-information.service.gov.uk" target="_blank" rel="noopener noreferrer" className="hover:text-stone-700 underline underline-offset-2">
              Companies House search
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
