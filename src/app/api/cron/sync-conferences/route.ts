import { NextResponse } from "next/server";
import { syncAllConferencesBatch } from "@/lib/batch-sync";

function isAuthorized(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    // If no explicit CRON_SECRET is set, allow in non-production environments
    return process.env.NODE_ENV !== "production";
  }

  const url = new URL(request.url);
  const querySecret = url.searchParams.get("secret");
  const headerSecret = request.headers.get("x-cron-secret");
  const authHeader = request.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;

  return (
    querySecret === cronSecret ||
    headerSecret === cronSecret ||
    bearerToken === cronSecret
  );
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await syncAllConferencesBatch();
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary,
    });
  } catch (error) {
    console.error("[Cron Sync Error]:", error);
    return NextResponse.json(
      { error: "Failed to execute conference sync batch", message: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}
