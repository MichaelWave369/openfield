import type { DocumentSelection, WatchlistEntry } from "@/domain/mission";

export function normalizeCik(value: string): string {
  const normalized = value.trim();
  if (!/^\d{1,10}$/.test(normalized)) throw new Error("CIK must contain 1 to 10 digits");
  return normalized.padStart(10, "0");
}

export function normalizeAccessionNumber(value: string): string {
  const digits = value.replace(/-/g, "");
  if (!/^\d{18}$/.test(digits)) {
    throw new Error("SEC accession number must contain exactly 18 digits");
  }
  return `${digits.slice(0, 10)}-${digits.slice(10, 12)}-${digits.slice(12)}`;
}

export function validatePrimaryDocument(value: string): string {
  const normalized = value.trim();
  if (!normalized || normalized.includes("/") || normalized.includes("\\") || normalized.includes("..")) {
    throw new Error("SEC primary document must be a safe archive filename");
  }
  if (!/^[A-Za-z0-9._-]+$/.test(normalized)) {
    throw new Error("SEC primary document contains unsupported characters");
  }
  return normalized;
}

export function secArchiveDocumentUrl(
  cik: string,
  accessionNumber: string,
  primaryDocument: string
): string {
  const normalizedCik = String(Number(normalizeCik(cik)));
  const accession = normalizeAccessionNumber(accessionNumber).replace(/-/g, "");
  const document = validatePrimaryDocument(primaryDocument);
  return `https://www.sec.gov/Archives/edgar/data/${normalizedCik}/${accession}/${document}`;
}

export function createCompanyWatch(input: {
  watchId: string;
  label: string;
  cik: string;
  createdAt: string;
  createdBy: string;
  missionId?: string;
  aliases?: string[];
  tags?: string[];
  notes?: string | null;
}): WatchlistEntry {
  const cik = normalizeCik(input.cik);
  return {
    watchId: input.watchId,
    missionId: input.missionId ?? "data-center-watch",
    subjectKind: "company",
    label: input.label.trim(),
    cik,
    identifiers: { cik },
    aliases: [...new Set(input.aliases ?? [])].sort(),
    tags: [...new Set(input.tags ?? [])].sort(),
    status: "active",
    createdAt: input.createdAt,
    createdBy: input.createdBy,
    notes: input.notes ?? null
  };
}

export function createDocumentSelection(input: Omit<DocumentSelection, "cik" | "accessionNumber" | "primaryDocument"> & {
  cik: string;
  accessionNumber: string;
  primaryDocument: string;
}): DocumentSelection {
  return {
    ...input,
    cik: normalizeCik(input.cik),
    accessionNumber: normalizeAccessionNumber(input.accessionNumber),
    primaryDocument: validatePrimaryDocument(input.primaryDocument)
  };
}
