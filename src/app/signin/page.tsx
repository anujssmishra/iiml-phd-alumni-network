import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthConfiguration } from "@/lib/auth";
import { safeCallbackPath } from "@/lib/auth-policy";
import { getCurrentUser } from "@/lib/session";
import { SignInButton } from "@/components/auth-controls";

export const dynamic = "force-dynamic";

const errorMessages: Record<string, string> = {
  AccessDenied: "Google could not verify this email address. Use an account with a verified email address.",
  OAuthAccountNotLinked: "This email is already associated with another sign-in identity. Use the original account or ask the site operator for help.",
  OAuthSignin: "Google sign-in could not start. Please try again.",
  OAuthCallback: "Google sign-in did not finish. Please try again.",
  SessionRequired: "Please sign in to continue.",
};

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string; error?: string }> }) {
  const params = await searchParams;
  const configuration = getAuthConfiguration();
  const callbackUrl = safeCallbackPath(params.callbackUrl);
  if (await getCurrentUser()) redirect(callbackUrl);

  return (
    <div className="network-shell stack">
      <div className="page-heading">
        <p className="eyebrow">Member access</p>
        <h1>Sign in to your network</h1>
      </div>
      <section className="panel stack">
        <p>Use a Google account with a verified email address. Academic and personal addresses are welcome; a reviewer separately checks doctoral membership before private member features become available.</p>
        {params.error && <p role="alert" className="notice notice-error">{errorMessages[params.error] ?? "Sign-in was unsuccessful. Please try again or contact the site operator."}</p>}
        {configuration.enabled ? <SignInButton callbackUrl={callbackUrl} /> : <p role="status" className="notice">{configuration.reason} Public conference information remains available.</p>}

        <p className="muted">Your directory profile starts private, and contact requests remain off until you opt in.</p>
        <Link href="/conferences">Browse conferences</Link>
      </section>
    </div>
  );
}
