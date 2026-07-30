"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { calculateConfidence, confidenceLabel, type ConfidenceVector } from "@/lib/confidence";

export const kinds = ["observation", "claim", "inference", "forecast", "contradiction", "unknown"] as const;
export type RecordKind = (typeof kinds)[number];

type EventRecord = {
  id: string;
  kind: RecordKind;
  title: string;
  summary: string;
  place: string;
  longitude: number;
  latitude: number;
  confidence: ConfidenceVector;
  receipt: { source: string; hash: string; transformation: string } | null;
};

export const demoEvents: EventRecord[] = [
  { id: "permit", kind: "observation", title: "Large-load site plan enters review", summary: "A synthetic planning record describes a multi-building technology campus entering preliminary review.", place: "Synthetic East Site", longitude: -84.5, latitude: 38.1, confidence: { sourceReliability: .92, directness: .94, corroboration: .55, independence: .7, freshness: .88, contradictionPenalty: .08, uncertainty: .18 }, receipt: { source: "Synthetic county planning record", hash: "sha256:demo-permit-8c59c0b1", transformation: "normalization" } },
  { id: "grid", kind: "observation", title: "High-capacity grid request appears", summary: "A synthetic utility queue lists a large-load request near the reference site.", place: "Synthetic Utility Zone", longitude: -84.7, latitude: 38.25, confidence: { sourceReliability: .9, directness: .9, corroboration: .72, independence: .84, freshness: .93, contradictionPenalty: .05, uncertainty: .12 }, receipt: { source: "Synthetic utility queue", hash: "sha256:demo-grid-1442df19", transformation: "extraction" } },
  { id: "claim", kind: "claim", title: "Developer describes site as construction-ready", summary: "The statement remains an attributed claim rather than a verified site condition.", place: "Synthetic East Site", longitude: -84.6, latitude: 38.18, confidence: { sourceReliability: .64, directness: .98, corroboration: .36, independence: .22, freshness: .95, contradictionPenalty: .12, uncertainty: .35 }, receipt: { source: "Synthetic company statement", hash: "sha256:demo-company-cb950e0a", transformation: "none" } },
  { id: "inference", kind: "inference", title: "Evidence suggests coordinated development", summary: "Planning and grid records support a bounded inference that they may concern one development program.", place: "Synthetic East Site", longitude: -84.6, latitude: 38.18, confidence: { sourceReliability: .88, directness: .58, corroboration: .78, independence: .82, freshness: .9, contradictionPenalty: .08, uncertainty: .26 }, receipt: null },
  { id: "unknown", kind: "unknown", title: "Power delivery date remains unresolved", summary: "No admitted evidence establishes when sufficient power could be delivered.", place: "Synthetic East Site", longitude: -84.65, latitude: 38.2, confidence: { sourceReliability: .85, directness: .74, corroboration: .42, independence: .66, freshness: .9, contradictionPenalty: .1, uncertainty: .82 }, receipt: null }
];

const markerClass: Record<RecordKind, string> = {
  observation: "mint", claim: "gold", inference: "blue", forecast: "violet", contradiction: "red", unknown: "orange"
};

function project(longitude: number, latitude: number) {
  return { left: `${((longitude + 180) / 360) * 100}%`, top: `${((90 - latitude) / 180) * 100}%` };
}

function pct(value: number) { return `${Math.round(value * 100)}%`; }

export function OpenFieldConsole() {
  const [kind, setKind] = useState<RecordKind | "all">("all");
  const [selectedId, setSelectedId] = useState(demoEvents[0].id);
  const visible = useMemo(() => demoEvents.filter((event) => kind === "all" || event.kind === kind), [kind]);
  const selected = demoEvents.find((event) => event.id === selectedId) ?? visible[0] ?? demoEvents[0];
  const score = calculateConfidence(selected.confidence);

  return <main className="shell">
    <header><div className="brand"><Image src="/openfield-mark.svg" alt="" width={44} height={44}/><div><small>PARALLAX</small><h1>OPENFIELD</h1></div></div><div className="node"><i/>FOUNDATION NODE <b>DEMO</b></div></header>
    <section className="mission"><div><small>ACTIVE MISSION</small><h2>Data Center Development Watch</h2><p>Evidence-governed tracking of infrastructure development signals.</p></div><div className="metrics"><span><b>{demoEvents.length}</b> records</span><span><b>3</b> receipts</span><span><b>0</b> live feeds</span></div></section>
    <nav><button className={kind === "all" ? "active" : ""} onClick={() => setKind("all")}>all</button>{kinds.map((item) => <button key={item} className={kind === item ? "active" : ""} onClick={() => setKind(item)}>{item}</button>)}</nav>
    <section className="workspace">
      <div className="mapPanel panel"><div className="heading"><div><small>WORLD FIELD</small><h3>Evidence geography</h3></div><span>{visible.length} visible</span></div><div className="map"><svg viewBox="0 0 1000 500"><defs><pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse"><path d="M50 0H0V50" fill="none" stroke="currentColor" strokeWidth=".5"/></pattern></defs><rect width="1000" height="500" fill="#07171d"/><rect width="1000" height="500" fill="url(#grid)"/><g><path d="M88 118L155 73l94 11 51 40-7 45-42 21-31 73-62 29-40-31-27-70z"/><path d="M257 278l51 21 24 72-15 96-34-17-23-74-29-48z"/><path d="M434 115l75-34 74 18 33 38-41 24-11 41-51 4-48-31-51-16z"/><path d="M505 221l75-8 48 44-7 88-42 79-53-39-21-78-26-47z"/><path d="M589 101l111-23 116 29 88 61-23 57-85 5-50 51-91-30-37-65-62-24z"/><path d="M817 341l61-23 55 31-18 49-66 6-35-31z"/></g></svg>{visible.map((event) => <button key={event.id} className={`marker ${markerClass[event.kind]} ${selected.id === event.id ? "selected" : ""}`} style={project(event.longitude, event.latitude)} onClick={() => setSelectedId(event.id)} aria-label={`${event.kind}: ${event.title}`}><span/></button>)}<em>SYNTHETIC REFERENCE FIELD · NO LIVE COLLECTION</em></div></div>
      <aside className="feed panel"><div className="heading"><div><small>MISSION FEED</small><h3>Records, not narratives</h3></div></div>{visible.map((event) => { const itemScore = calculateConfidence(event.confidence).score; return <button key={event.id} className={selected.id === event.id ? "selected" : ""} onClick={() => setSelectedId(event.id)}><label className={markerClass[event.kind]}>{event.kind}</label><strong>{event.title}</strong><span>{event.place}</span><em>{pct(itemScore)} {confidenceLabel(itemScore)}</em></button>; })}</aside>
    </section>
    <section className="details">
      <article className="panel"><label className={markerClass[selected.kind]}>{selected.kind}</label><h2>{selected.title}</h2><p>{selected.summary}</p><div className="fact"><span>Classification</span><b>{selected.kind}</b></div><div className="fact"><span>Data status</span><b>synthetic fixture</b></div></article>
      <article className="panel confidence"><div className="ring" style={{"--score": `${Math.round(score.score * 360)}deg`} as React.CSSProperties}><div><b>{pct(score.score)}</b><span>{confidenceLabel(score.score)}</span></div></div><div className="bars">{Object.entries(selected.confidence).map(([name, value]) => <div key={name}><span>{name.replace(/([A-Z])/g, " $1")}</span><i><b style={{width: pct(value)}}/></i><strong>{pct(value)}</strong></div>)}</div><p>Aggregate confidence remains inspectable; it never replaces the underlying vector.</p></article>
      <article className="panel receipt"><small>CHAIN OF CUSTODY</small><h3>Evidence receipt</h3>{selected.receipt ? <><b>{selected.receipt.source}</b><code>{selected.receipt.hash}</code><div className="fact"><span>Transformation</span><strong>{selected.receipt.transformation}</strong></div><div className="fact"><span>License</span><strong>Synthetic fixture</strong></div></> : <p>This derived record links to upstream evidence rather than pretending to be a source.</p>}</article>
    </section>
    <footer><span>Evidence before narrative.</span><span>Operator authority retained.</span><span>v0.1.0-foundation</span></footer>
  </main>;
}
