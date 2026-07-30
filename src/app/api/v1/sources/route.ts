import { NextResponse } from "next/server";
import { assessSourceHealth } from "@/lib/source-health";
import {
  builtInSources,
  syntheticDataCenterHealth
} from "@/lib/source-registry";

export function GET() {
  const data = builtInSources.map((source) => ({
    ...source,
    health: assessSourceHealth(
      source,
      source.sourceId === syntheticDataCenterHealth.sourceId ? syntheticDataCenterHealth : null
    )
  }));

  return NextResponse.json({
    ok: true,
    synthetic: true,
    data
  });
}
