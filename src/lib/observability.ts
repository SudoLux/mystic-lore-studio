export type ObservabilityKind =
  | 'ai_job'
  | 'client_error'
  | 'export_failure'
  | 'migration_warning'
  | 'publication_failure'
  | 'sync_failure';

export type ObservabilityEvent = {
  at: string;
  context: Record<string, boolean | number | string>;
  id: string;
  kind: ObservabilityKind;
  severity: 'error' | 'info' | 'warning';
};

const storageKey = 'mystic-lore-studio:private-observability:v1';
const eventName = 'mystic-lore-studio:observability';
const maxEvents = 75;
const blockedContextKey = /asset|content|copy|description|email|image|media|name|note|payload|prompt|raw|text|url/i;

/**
 * Stores only operational metadata on this device. It deliberately excludes
 * error messages and content-bearing values so diagnostic records cannot become
 * a second private-data store.
 */
export function recordClientEvent(input: {
  context?: Record<string, unknown>;
  kind: ObservabilityKind;
  severity?: ObservabilityEvent['severity'];
}) {
  if (typeof window === 'undefined') return null;
  const event: ObservabilityEvent = {
    at: new Date().toISOString(),
    context: sanitizeContext(input.context),
    id: crypto.randomUUID(),
    kind: input.kind,
    severity: input.severity ?? (input.kind.endsWith('failure') || input.kind === 'client_error' ? 'error' : 'warning'),
  };
  const next = [event, ...getClientEvents()].slice(0, maxEvents);
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(next));
  } catch {
    // Diagnostics must never prevent the user from continuing their work.
  }
  window.dispatchEvent(new CustomEvent(eventName, { detail: event }));
  return event;
}

export function getClientEvents(): ObservabilityEvent[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(storageKey) ?? '[]') as unknown;
    return Array.isArray(parsed) ? parsed.filter(isEvent) : [];
  } catch {
    return [];
  }
}

export function clearClientEvents() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(storageKey);
  window.dispatchEvent(new CustomEvent(eventName));
}

export function subscribeToClientEvents(listener: () => void) {
  if (typeof window === 'undefined') return () => undefined;
  window.addEventListener(eventName, listener);
  return () => window.removeEventListener(eventName, listener);
}

function sanitizeContext(context: Record<string, unknown> | undefined) {
  return Object.fromEntries(Object.entries(context ?? {}).flatMap(([key, value]) => {
    if (blockedContextKey.test(key) || !['string', 'number', 'boolean'].includes(typeof value)) return [];
    if (typeof value === 'string' && value.length > 80) return [[key, 'redacted']];
    return [[key, value as string | number | boolean]];
  }));
}

function isEvent(value: unknown): value is ObservabilityEvent {
  if (!value || typeof value !== 'object') return false;
  const event = value as Partial<ObservabilityEvent>;
  return typeof event.id === 'string'
    && typeof event.at === 'string'
    && typeof event.kind === 'string'
    && typeof event.severity === 'string'
    && Boolean(event.context && typeof event.context === 'object');
}

export const observabilityEventName = eventName;
