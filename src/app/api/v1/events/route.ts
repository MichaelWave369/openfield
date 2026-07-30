import { NextResponse } from "next/server";
import { apiDemoEvents } from "@/lib/demo-data";

export function GET(request: Request) {
  const url = new URL(request.url);
  const kind = url.searchParams.get("kind");
  const events = kind ? apiDemoEvents.filter((event) => event.kind === kind) : apiDemoEvents;
  return NextResponse.json({ ok: true, synthetic: true, data: events });
}
