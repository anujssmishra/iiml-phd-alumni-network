import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getAuthConfiguration } from "@/lib/auth";
import { safeCallbackPath } from "@/lib/auth-policy";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
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

  async function devSignInAction(formData: FormData) {
    "use server";
    if (process.env.APP_ENV !== "local") return;
    const targetUserId = String(formData.get("userId") || "dev-scholar-1");
    const cookieStore = await cookies();
    const token = `dev-session-${targetUserId}`;
    await prisma.session.upsert({
      where: { sessionToken: token },
      update: {
        userId: targetUserId,
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      create: {
        sessionToken: token,
        userId: targetUserId,
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    cookieStore.set("next-auth.session-token", token, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
    });
    redirect(callbackUrl || "/conferences");
  }

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

        {process.env.APP_ENV === "local" && (
          <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50/80 p-4 text-xs text-blue-900">
            <p className="font-bold text-blue-950">Local Dev Sign-In (Testing Bypass)</p>
            <p className="mt-1 text-slate-700">
              Sign in as a seeded test user to test member RSVP, attendance roles, and curator features on localhost without Google OAuth.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <form action={devSignInAction}>
                <input type="hidden" name="userId" value="dev-scholar-1" />
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-3 py-1.5 font-semibold text-white hover:bg-blue-500 shadow-xs cursor-pointer"
                >
                  Sign In as Dr. Anuj Mishra (Member)
                </button>
              </form>
              <form action={devSignInAction}>
                <input type="hidden" name="userId" value="dev-curator-1" />
                <button
                  type="submit"
                  className="rounded-lg bg-slate-800 px-3 py-1.5 font-semibold text-white hover:bg-slate-700 shadow-xs cursor-pointer"
                >
                  Sign In as Curator
                </button>
              </form>
            </div>
          </div>
        )}

        <p className="muted">Your directory profile starts private, and contact requests remain off until you opt in.</p>
        <Link href="/conferences">Browse conferences</Link>
      </section>
    </div>
  );
}
