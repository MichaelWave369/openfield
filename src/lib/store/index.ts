import { MemoryEvidenceStore } from "@/lib/store/memory";
import { PostgresEvidenceStore } from "@/lib/store/postgres";
import type { EvidenceStore } from "@/lib/store/types";

const globalStore = globalThis as typeof globalThis & { __openfieldStore?: EvidenceStore };

export function getEvidenceStore(): EvidenceStore {
  if (globalStore.__openfieldStore) return globalStore.__openfieldStore;
  globalStore.__openfieldStore = process.env.DATABASE_URL
    ? new PostgresEvidenceStore(process.env.DATABASE_URL)
    : new MemoryEvidenceStore();
  return globalStore.__openfieldStore;
}
