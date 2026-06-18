"use client";

import { useState, KeyboardEvent } from "react";
import ComplianceReport, { ReportData } from "./ComplianceReport";
import LeadCapture from "./LeadCapture";

export default function CompanyScanner() {
  const [query, setQuery] = useState("");
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function scanCompany() {
    if (!query.trim()) return;

    setLoading(true);
    setError("");
    setReport(null);

    try {
      const res = await fetch("/api/scan-company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Could not scan company.");
      }

      setReport(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") scanCompany();
  }

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
        <label
          htmlFor="company-input"
          className="block text-sm font-semibold text-slate-700 mb-2"
        >
          Company name or Companies House number
        </label>

        <div className="flex gap-3">
          <input
            id="company-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. Acme Ltd or 12345678"
            className="flex-1 border border-slate-300 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
          />

          <button
            onClick={scanCompany}
            disabled={loading || !query.trim()}
            className="bg-slate-900 text-white px-6 py-3 rounded-xl font-semibold disabled:opacity-40 hover:bg-slate-800 transition-colors"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Scanning...
              </span>
            ) : (
              "Scan company"
            )}
          </button>
        </div>

        {loading && (
          <div className="mt-4 space-y-1">
            {[
              "Checking Companies House records...",
              "Looking for accounts deadline...",
              "Checking confirmation statement status...",
            ].map((msg) => (
              <p key={msg} className="text-sm text-slate-500 flex items-center gap-2">
                <span className="inline-block w-1.5 h-1.5 bg-slate-400 rounded-full animate-pulse" />
                {msg}
              </p>
            ))}
          </div>
        )}

        {error && (
          <div className="mt-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <p className="text-xs text-slate-400 mt-3">
          Uses public Companies House data. No login required.
        </p>
      </div>

      {report && (
        <>
          <ComplianceReport report={report} />
          <LeadCapture report={report} />
        </>
      )}
    </div>
  );
}
