import { NextResponse } from "next/server";

export function GET() {
  const databaseConfigured = Boolean(process.env.DATABASE_URL);
  const signingConfigured = Boolean(
    process.env.OPENFIELD_SIGNING_KEY_ID &&
    process.env.OPENFIELD_SIGNING_PRIVATE_KEY &&
    process.env.OPENFIELD_SIGNING_PUBLIC_KEY
  );

  return NextResponse.json({
    ok: true,
    service: "parallax-openfield",
    version: "0.2.0",
    status: "evidence-spine",
    storage: databaseConfigured ? "postgres-postgis" : "volatile-memory",
    receiptSigning: signingConfigured ? "configured" : "not-configured",
    liveFeeds: 0,
    truthBoundary: "synthetic fixtures only",
    timestamp: new Date().toISOString()
  });
}
