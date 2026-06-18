"use client";

import { useState } from "react";

interface ReportData {
  companyName: string;
  companyNumber: string;
  companyStatus: string;
  accountsDue: string | null;
  confirmationStatementDue: string | null;
  riskLevel: string;
}

export default function LeadCapture({ report }: { report: ReportData }) {
  const [email, setEmail] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function saveLead() {
    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/save-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          companyNumber: report.companyNumber,
          companyName: report.companyName,
          companyStatus: report.companyStatus,
          accountsDue: report.accountsDue,
          confirmationStatementDue: report.confirmationStatementDue,
          riskLevel: report.riskLevel,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Could not save reminder.");
      }

      setSaved(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  if (saved) {
    return (
      <div className="mt-4 bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
        <div className="text-2xl mb-2">✓</div>
        <h3 className="font-semibold text-green-900">You&apos;re on the list.</h3>
        <p className="text-sm text-green-700 mt-1">
          We&apos;ll email you before the deadlines for {report.companyName}.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 bg-slate-900 text-white rounded-2xl p-6">
      <h3 className="text-lg font-bold">Get deadline reminders for {report.companyName}</h3>
      <p className="text-slate-300 text-sm mt-1">
        We&apos;ll email you 30, 14, and 7 days before each filing deadline — free.
      </p>

      <div className="flex gap-3 mt-4">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && saveLead()}
          placeholder="you@company.com"
          className="flex-1 bg-white text-slate-900 rounded-xl px-4 py-3 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-white"
        />
        <button
          onClick={saveLead}
          disabled={loading || !email.trim()}
          className="bg-white text-slate-900 rounded-xl px-5 py-3 font-semibold disabled:opacity-50 hover:bg-slate-100 transition-colors"
        >
          {loading ? "Saving..." : "Remind me"}
        </button>
      </div>

      {error && (
        <p className="text-red-300 text-sm mt-2">{error}</p>
      )}

      <p className="text-xs text-slate-400 mt-4">
        No spam. Unsubscribe any time. Completely free.
      </p>
    </div>
  );
}
