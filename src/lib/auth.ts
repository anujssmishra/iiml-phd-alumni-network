import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { isVerifiedGoogleIdentity, normalizeEmail, safeCallbackPath } from "@/lib/auth-policy";

export function getAuthConfiguration(): { enabled: boolean; reason: string | null } {
  if (!process.env.GOOGLE_CLIENT_ID?.trim() || !process.env.GOOGLE_CLIENT_SECRET?.trim()) return { enabled: false, reason: "Google sign-in has not been configured by the site operator yet." };
  if (!process.env.NEXTAUTH_SECRET || process.env.NEXTAUTH_SECRET.length < 32) return { enabled: false, reason: "Sign-in is temporarily unavailable because secure authentication configuration is incomplete." };
  try {
    const url = new URL(process.env.NEXTAUTH_URL ?? "");
    if (!(["https:", "http:"].includes(url.protocol)) || url.username || url.password || (process.env.NODE_ENV === "production" && url.protocol !== "https:")) throw new Error("Invalid authentication URL");
  } catch { return { enabled: false, reason: "Sign-in is temporarily unavailable because the site authentication address is not configured." }; }
  return { enabled: true, reason: null };
}

const databaseAdapter = PrismaAdapter(prisma);

export const authOptions: NextAuthOptions = {
  adapter: {
    ...databaseAdapter,
    async getSessionAndUser(sessionToken) {
      // Retire tokens minted by the removed local shortcut without deleting
      // retained users or sessions. This also protects the NextAuth session API.
      if (sessionToken.startsWith("dev-session-") || sessionToken === "dev-test-session-token") return null;
      return databaseAdapter.getSessionAndUser!(sessionToken);
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "database", maxAge: 7 * 24 * 60 * 60 },
  providers: getAuthConfiguration().enabled ? [GoogleProvider({
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    // Deliberately leave dangerous email-based account linking disabled.
    profile(profile) {
      const email = normalizeEmail(profile.email);
      if (!isVerifiedGoogleIdentity({ provider: "google", profile, email })) throw new Error("A verified Google email address is required.");
      return { id: profile.sub, name: profile.name, email, emailVerified: new Date(), image: profile.picture };
    },
  })] : [],
  callbacks: {
    async signIn({ user, account, profile }) {
      return getAuthConfiguration().enabled && isVerifiedGoogleIdentity({ provider: account?.provider, profile, email: user.email });
    },
    async session({ session, user }) {
      if (session.user) session.user.id = user.id;
      // Membership and role are read fresh at service boundaries, never from this object.
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${safeCallbackPath(url)}`;
      try {
        const candidate = new URL(url);
        if (candidate.origin === new URL(baseUrl).origin) return `${baseUrl}${safeCallbackPath(`${candidate.pathname}${candidate.search}${candidate.hash}`)}`;
      } catch { /* Fall back to the local membership page. */ }
      return `${baseUrl}/membership`;
    },
  },
  events: {
    async signIn({ user, account, profile }) {
      // NextAuth v4 sends our already-validated, normalized provider profile here,
      // and resets emailVerified during OAuth user creation. Preserve verification
      // only after that successful Google flow, for both new and returning users.
      const normalizedProfile = profile as { email?: unknown; emailVerified?: unknown } | undefined;
      if (account?.provider === "google" && normalizedProfile?.emailVerified instanceof Date
        && normalizeEmail(normalizedProfile.email) !== null && normalizeEmail(normalizedProfile.email) === normalizeEmail(user.email)) {
        await prisma.user.update({ where: { id: user.id }, data: { emailVerified: new Date() } });
      }
    },
  },
  pages: { signIn: "/signin", error: "/signin", newUser: "/membership" },
  logger: {
    error(code) { console.error("Authentication error:", code); },
    warn(code) { console.warn("Authentication warning:", code); },
  },
};
