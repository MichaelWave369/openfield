import { NextResponse } from "next/server";

export function GET() {
  const databaseConfigured = Boolean(process.env.DATABASE_URL);
  const signingConfigured = Boolean(
    process.env.OPENFIELD_SIGNING_KEY_ID &&
    process.env.OPENFIELD_SIGNING_PRIVATE_KEY &&
    process.env.OPENFIELD_SIGNING_PUBLIC_KEY
  );
  const secConfigured = Boolean(
    process.env.OPENFIELD_SEC_CIK &&
    process.env.OPENFIELD_SEC_USER_AGENT
  );

  return NextResponse.json({
    ok: true,
    service: "parallax-openfield",
    version: "0.4.0",
    status: "mission-operations",
    storage: databaseConfigured ? "postgres-postgis" : "volatile-memory",
    receiptSigning: signingConfigured ? "configured" : "not-configured",
    signingKeyLifecycle: "supported",
    privacyDirectives: "supported",
    connectorExecutionReceipts: "supported",
    lawfulConnectors: {
      secEdgarSubmissions: secConfigured ? "configured-not-scheduled" : "available-not-configured",
      secEdgarDocuments: secConfigured ? "operator-selection-required" : "available-not-configured"
    },
    liveFeeds: 0,
    truthBoundary: "No connector runs automatically and no filing interpretation is performed.",
    timestamp: new Date().toISOString()
  });
}
