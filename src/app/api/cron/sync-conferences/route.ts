import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { syncAllConferencesBatch, isSyncInProgress } from "@/lib/batch-sync";
import { NetworkError } from "@/lib/validation";

function isAuthorized(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  // FAIL CLOSED: Deny all requests across all environments if secret is unset or empty
  if (!cronSecret || cronSecret.trim().length === 0) {
    return false;
  }

  // Reject URL query parameters to avoid secret leakage in URLs and logs
  const headerSecret = request.headers.get("x-cron-secret");
  const authHeader = request.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;

  const candidate = headerSecret || bearerToken;
  if (!candidate) {
    return false;
  }

  const candidateBuf = Buffer.from(candidate);
  const secretBuf = Buffer.from(cronSecret);

  if (candidateBuf.length !== secretBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(candidateBuf, secretBuf);
}

export async function GET() {
  return NextResponse.json(
    { error: "Method Not Allowed. Mutating sync requests must use POST." },
    { status: 405, headers: { Allow: "POST" } }
  );
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (isSyncInProgress()) {
    return NextResponse.json(
      { error: "A conference sync operation is already in progress." },
      { status: 409 }
    );
  }

  try {
    const summary = await syncAllConferencesBatch();
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary,
    });
  } catch (error) {
    if (error instanceof NetworkError && error.status === 409) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error("[Cron Sync Error]:", error);
    return NextResponse.json(
      { error: "Failed to execute conference sync batch." },
      { status: 500 }
    );
  }
}
