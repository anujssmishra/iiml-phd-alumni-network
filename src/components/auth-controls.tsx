"use client";

import { useState } from "react";
import { signIn, signOut } from "next-auth/react";

export function SignInButton({ callbackUrl = "/membership" }: { callbackUrl?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return <div>
    <button type="button" disabled={busy} className="button" onClick={async () => {
      setBusy(true); setError(null);
      try { await signIn("google", { callbackUrl }); }
      catch { setError("Sign-in could not start. Please try again."); setBusy(false); }
    }}>{busy ? "Opening Google…" : "Continue with Google"}</button>
    {error && <p role="alert" className="notice notice-error">{error}</p>}
  </div>;
}

export function SignOutButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return <span>
    <button type="button" disabled={busy} className="button-secondary" onClick={async () => {
      setBusy(true); setError(null);
      try { await signOut({ callbackUrl: "/" }); }
      catch { setError("Sign-out failed. Please try again."); setBusy(false); }
    }}>{busy ? "Signing out…" : "Sign out"}</button>
    {error && <span role="alert" className="notice notice-error">{error}</span>}
  </span>;
}
