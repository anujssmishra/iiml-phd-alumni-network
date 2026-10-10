import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import LinkedInProvider from "next-auth/providers/linkedin";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    LinkedInProvider({
      clientId: process.env.LINKEDIN_CLIENT_ID!,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET!,
    })
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Step 2: Gated Authentication
      // Reject non-academic emails unless manually approved (here we enforce .ac.in or .edu)
      if (user.email) {
        if (user.email.endsWith(".ac.in") || user.email.endsWith(".edu")) {
          return true;
        }
      }
      
      // If we want to support manual approval, we might return a custom error URL
      // return "/unauthorized";
      
      // For now, we return false to reject the sign-in
      return false;
    },
    async session({ session, user }) {
      // Pass the user id and custom fields to the session
      if (session.user) {
        session.user.id = user.id;
        // The type for session.user will need to be extended in next-auth.d.ts
      }
      return session;
    }
  },
  pages: {
    // Custom sign-in page if needed
    // signIn: '/auth/signin',
    // error: '/auth/error', // Error code passed in query string as ?error=
  }
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
