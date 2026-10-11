"use client";

import Link from "next/link";

export default function MemberPageError({ reset }: { reset: () => void }) {
  return (
    <div className="network-shell page-space stack">
      <h1>We could not load this page</h1>
      <p role="alert" className="notice notice-error">Your connection or membership status may have changed. Retry, or check your membership before continuing.</p>
      <div className="button-row">
        <button type="button" className="button" onClick={reset}>Try again</button>
        <Link href="/membership" className="text-link">Check membership</Link>
      </div>
    </div>
  );
}
