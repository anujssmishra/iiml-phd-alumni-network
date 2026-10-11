import NextAuth from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions, getAuthConfiguration } from "@/lib/auth";

export const dynamic = "force-dynamic";
const authHandler = NextAuth(authOptions);

async function handler(request: NextRequest, context: { params: Promise<{ nextauth: string[] }> }) {
  if (!getAuthConfiguration().enabled) {
    return NextResponse.json({ error: "Authentication is not configured. Please contact the site operator." }, { status: 503, headers: { "Cache-Control": "private, no-store" } });
  }
  const response = await authHandler(request, context);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export { handler as GET, handler as POST };
