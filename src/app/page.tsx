import Link from "next/link";
import { ArrowRight, BookOpen, CalendarDays, ShieldCheck, Users } from "lucide-react";

export default function Home() {
  return (
    <>
      <section className="home-hero">
        <div className="network-shell hero-grid">
          <div className="stack">
            <p className="eyebrow">An independent academic community</p>
            <h1>Good research begins<br />with a conversation.</h1>
            <p className="hero-description">A considered space for IIM PhD and FPM alumni to find colleagues, share academic interests, and plan conference connections.</p>
            <div className="button-row">
              <Link href="/membership" className="button">Join the network <ArrowRight aria-hidden="true" size={18} /></Link>
              <Link href="/conferences" className="button button-light">Explore conferences</Link>
            </div>
            <p className="hero-note">Membership is individually reviewed. Your profile starts private.</p>
          </div>
          <div className="hero-note-card" aria-label="How the network works">
            <BookOpen size={32} aria-hidden="true" />
            <h2>A smaller network.<br />A shared academic context.</h2>
            <ol>
              <li><span>01</span><div><strong>Introduce yourself</strong><p>Sign in and submit your doctoral or alumni background for review.</p></div></li>
              <li><span>02</span><div><strong>Choose what you share</strong><p>Decide whether your profile is visible to approved members.</p></div></li>
              <li><span>03</span><div><strong>Make a connection</strong><p>Discover research interests and request an introduction with consent.</p></div></li>
            </ol>
          </div>
        </div>
      </section>

      <section className="network-shell home-features stack" aria-labelledby="network-features">
        <div className="page-heading">
          <p className="eyebrow">Built around trust</p>
          <h2 id="network-features">The essentials for staying connected</h2>
          <p className="muted">Useful academic connections begin with clear membership, current profiles, and deliberate sharing.</p>
        </div>
        <div className="feature-grid">
          <article className="panel stack">
            <ShieldCheck className="feature-icon" size={30} aria-hidden="true" />
            <h3>Reviewed membership</h3>
            <p>Signing in establishes your identity. A separate review establishes membership, including an alumni route for people without an academic mailbox.</p>
            <Link href="/membership" className="text-link">Membership and access <ArrowRight aria-hidden="true" size={16} /></Link>
          </article>
          <article className="panel stack">
            <Users className="feature-icon" size={30} aria-hidden="true" />
            <h3>A private directory</h3>
            <p>Approved members can find opted-in colleagues by institution, research domain, and methods. Contact requests require acceptance before a reply address is shared.</p>
            <Link href="/directory" className="text-link">Find colleagues <ArrowRight aria-hidden="true" size={16} /></Link>
          </article>
          <article className="panel stack">
            <CalendarDays className="feature-icon" size={30} aria-hidden="true" />
            <h3>Conference connections</h3>
            <p>Browse the conference catalogue and manage your attendance as an approved member. Event information is a starting point; check organizer details before making plans.</p>
            <Link href="/conferences" className="text-link">Browse conferences <ArrowRight aria-hidden="true" size={16} /></Link>
          </article>
        </div>
        <p className="home-community-note">This independent peer network does not claim official endorsement by any IIM. Academic affiliations are self-reported; membership approval is not institutional verification of every profile field.</p>
      </section>
    </>
  );
}
