import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    ok: true,
    service: "parallax-openfield",
    status: "foundation",
    storage: "synthetic-memory",
    liveFeeds: 0,
    timestamp: new Date().toISOString()
  });
}
