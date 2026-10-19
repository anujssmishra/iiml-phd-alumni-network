import type { Metadata } from "next";
import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { SignOutButton } from "@/components/auth-controls";
import { getCurrentUser } from "@/lib/session";
import "./globals.css";

// Navigation contains session state; never prerender it into a shared public page.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "IIM PhD & FPM Network", template: "%s | IIM PhD & FPM Network" },
  description: "An independent academic community for IIM PhD and FPM alumni. Reviewed membership, a consent-based private directory, and conference connections.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const approved = user?.membershipStatus === "approved";

  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <a href="#main-content" className="skip-link">Skip to main content</a>
        <header className="site-header">
          <div className="network-shell header-inner">
            <Link href="/" className="site-brand" aria-label="IIM PhD and FPM Network home">
              <span className="brand-icon"><GraduationCap size={26} aria-hidden="true" /></span>
              <span>IIM PhD &amp; FPM<span className="brand-subtitle">The alumni network</span></span>
            </Link>
            <nav className="site-nav" aria-label="Main navigation">
              <Link href="/conferences">Conferences</Link>
              {approved && <Link href="/conferences/attendance">My RSVPs</Link>}
              {approved && <Link href="/directory">Directory</Link>}
              {approved && <Link href="/contacts">Contact requests</Link>}
              {user && <Link href="/profile">{approved ? "My profile" : "Privacy controls"}</Link>}
              {user && <Link href="/membership">Membership</Link>}
              {approved && user?.role === "admin" && <Link href="/admin/members">Review members</Link>}
              {approved && (user?.role === "admin" || user?.role === "curator") && <Link href="/admin/conferences">Curate conferences</Link>}
              {user ? <SignOutButton /> : <Link href="/signin" className="nav-signin">Sign in</Link>}
            </nav>
          </div>
        </header>
        <main id="main-content" tabIndex={-1}>{children}</main>
        <footer className="site-footer">
          <div className="network-shell footer-inner">
            <p>IIM PhD &amp; FPM Network <span>Independent, community-led.</span></p>
            <div><Link href="/membership">Membership</Link><Link href="/profile">Privacy controls</Link></div>
          </div>
        </footer>
      </body>
    </html>
  );
}
