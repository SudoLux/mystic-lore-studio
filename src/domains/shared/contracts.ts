/**
 * Shared 2.0 domain contracts. These are deliberately framework-neutral so
 * the current local/cloud adapters can be replaced without rewriting callers.
 */
export type DomainCommandOrigin = 'user' | 'sync' | 'import' | 'system';

export type DomainCommand<TType extends string, TPayload> = {
  actorId?: string;
  id: string;
  origin: DomainCommandOrigin;
  payload: TPayload;
  type: TType;
};

export type DomainCommandResult<T> = {
  data: T;
  operationId?: string;
};

export interface DomainRepository<TRecord extends { id: string }, TInput> {
  create(input: TInput): Promise<DomainCommandResult<TRecord>>;
  delete(id: string): Promise<void>;
  findById(id: string): Promise<TRecord | null>;
  list(): Promise<TRecord[]>;
  update(id: string, input: Partial<TInput>): Promise<DomainCommandResult<TRecord>>;
}

export type DomainSelector<TSource, TResult> = (source: TSource) => TResult;

export type DomainSyncState =
  | 'idle'
  | 'syncing'
  | 'synced'
  | 'offline'
  | 'conflict'
  | 'failed';

export type DomainSyncStatus = {
  lastSyncedAt?: string | null;
  message?: string | null;
  pendingCount: number;
  state: DomainSyncState;
};
