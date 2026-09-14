import type { DomainSyncStatus } from '../shared/contracts';

/** Adapter boundary for the existing local queue and Supabase sync engine. */
export interface StudioSyncRepository {
  getStatus(): DomainSyncStatus;
  retry(): Promise<void>;
  cancel(): void;
}
