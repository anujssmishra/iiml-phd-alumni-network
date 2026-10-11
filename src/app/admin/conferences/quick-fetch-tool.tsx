"use client";

import { useState } from "react";
import { quickFetchConferenceAction, applyQuickFetchAction } from "./actions";

interface ExtractedData {
  name: string;
  acronym: string | null;
  startDate: string;
  endDate: string;
  timezone: string;
  cfpDeadline: string | null;
  location: string;
  description: string | null;
  url: string;
  sourceUrl: string;
  confidenceScore: number;
}

interface MatchData {
  matchType: string;
  conference: {
    id: string;
    name: string;
    acronym: string | null;
    publicationState: string;
  };
}

interface DiffItem {
  field: string;
  label: string;
  oldValue: string | null;
  newValue: string | null;
}

interface FetchResult {
  extracted: ExtractedData;
  match: MatchData | null;
  diff: {
    hasChanges: boolean;
    items: DiffItem[];
  } | null;
}

export function QuickFetchTool() {
  const [urlInput, setUrlInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FetchResult | null>(null);

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault();
    if (!urlInput.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    const res = await quickFetchConferenceAction(urlInput);

    setLoading(false);
    if (!res.success) {
      setError(res.error || "Failed to analyze URL.");
    } else if (res.extracted) {
      setResult({
        extracted: {
          ...res.extracted,
          startDate: new Date(res.extracted.startDate).toISOString().split("T")[0],
          endDate: new Date(res.extracted.endDate).toISOString().split("T")[0],
          cfpDeadline: res.extracted.cfpDeadline
            ? new Date(res.extracted.cfpDeadline).toISOString().split("T")[0]
            : null,
        },
        match: res.match,
        diff: res.diff,
      });
    }
  }

  return (
    <section className="rounded-xl border border-blue-200 bg-blue-50/50 p-6 mb-8 shadow-2xs">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-blue-950">Quick-Fetch Conference from URL</h2>
          <p className="mt-1 text-sm text-slate-600">
            Paste an academic conference website URL (e.g., AOM, ICIS, IEEE, ACM, WikiCFP) to automatically extract event dates, venue, CFP deadline, and acronym.
          </p>
        </div>
        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-900 border border-blue-200">
          Automated Ingestion (Phase P3)
        </span>
      </div>

      <form onSubmit={handleAnalyze} className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input
          type="url"
          required
          placeholder="https://aom.org/events/annual-meeting or http://www.wikicfp.com/..."
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          className="flex-1 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm shadow-2xs focus:border-blue-600 focus:outline-hidden"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-blue-800 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-900 disabled:opacity-50"
        >
          {loading ? "Fetching & Analyzing..." : "Fetch & Analyze"}
        </button>
      </form>

      {error && (
        <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm font-medium text-red-800 border border-red-200">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-6 rounded-lg border bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="font-bold text-slate-900 text-base">Extracted Conference Preview</h3>
            <span className="text-xs text-slate-500 font-medium">
              Confidence Score: {Math.round(result.extracted.confidenceScore * 100)}%
            </span>
          </div>

          {result.match && (
            <div className="my-3 rounded-md bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">
              <span className="font-bold">Matching record found in database:</span> {result.match.conference.name}{" "}
              {result.match.conference.acronym && `(${result.match.conference.acronym})`} — State:{" "}
              <span className="uppercase font-bold">{result.match.conference.publicationState}</span>
            </div>
          )}

          {result.diff && result.diff.hasChanges && (
            <div className="my-3 rounded-md bg-blue-50 border border-blue-200 p-3 text-xs text-blue-900">
              <p className="font-bold mb-1">Detected Updates / Diffs:</p>
              <ul className="list-disc pl-4 space-y-0.5">
                {result.diff.items.map((item) => (
                  <li key={item.field}>
                    <span className="font-semibold">{item.label}:</span> {item.oldValue || "None"} &rarr;{" "}
                    <span className="font-bold text-blue-950">{item.newValue || "None"}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <dl className="mt-4 grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 text-xs">
            <div>
              <dt className="text-slate-500 font-medium">Conference Name</dt>
              <dd className="font-semibold text-slate-900 mt-0.5">{result.extracted.name}</dd>
            </div>
            <div>
              <dt className="text-slate-500 font-medium">Acronym</dt>
              <dd className="font-semibold text-slate-900 mt-0.5">{result.extracted.acronym || "None"}</dd>
            </div>
            <div>
              <dt className="text-slate-500 font-medium">Event Dates</dt>
              <dd className="font-semibold text-slate-900 mt-0.5">
                {result.extracted.startDate} to {result.extracted.endDate} ({result.extracted.timezone})
              </dd>
            </div>
            <div>
              <dt className="text-slate-500 font-medium">CFP Submission Deadline</dt>
              <dd className="font-semibold text-slate-900 mt-0.5">{result.extracted.cfpDeadline || "Not specified"}</dd>
            </div>
            <div>
              <dt className="text-slate-500 font-medium">Location</dt>
              <dd className="font-semibold text-slate-900 mt-0.5">{result.extracted.location}</dd>
            </div>
            <div>
              <dt className="text-slate-500 font-medium">Source URL</dt>
              <dd className="font-semibold text-blue-800 truncate mt-0.5">
                <a href={result.extracted.sourceUrl} target="_blank" rel="noreferrer" className="hover:underline">
                  {result.extracted.sourceUrl}
                </a>
              </dd>
            </div>
          </dl>

          <form action={applyQuickFetchAction} className="mt-6 flex flex-wrap gap-2 pt-4 border-t">
            <input type="hidden" name="extractedPayload" value={JSON.stringify(result.extracted)} />
            {result.match && <input type="hidden" name="targetConferenceId" value={result.match.conference.id} />}

            {result.match && (
              <button
                type="submit"
                name="reconcileAction"
                value="update_existing"
                className="rounded-md bg-amber-700 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-800"
              >
                Update Existing Entry ({result.match.conference.acronym || "Matched"})
              </button>
            )}

            <button
              type="submit"
              name="reconcileAction"
              value="create_draft"
              className="rounded-md bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-900"
            >
              Save as Draft
            </button>

            <button
              type="submit"
              name="reconcileAction"
              value="create_published"
              className="rounded-md bg-blue-800 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-900"
            >
              Approve & Publish Immediately
            </button>
          </form>
        </div>
      )}
    </section>
  );
}
