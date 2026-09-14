const textEncoder = new TextEncoder();

export const ML_STUDIO_MIGRATION_NAMESPACE =
  '4d4c5332-2d57-5032-8000-000000000001';

export function stableStringify(value: unknown) {
  return JSON.stringify(sortJson(value));
}

export async function sha256Hex(value: unknown) {
  const bytes = textEncoder.encode(
    typeof value === 'string' ? value : stableStringify(value),
  );
  const digest = await crypto.subtle.digest('SHA-256', bytes.buffer);
  return bytesToHex(new Uint8Array(digest));
}

/** RFC 9562 UUIDv5, implemented with Web Crypto for browser and Node parity. */
export async function stableUuid(
  name: string,
  namespace = ML_STUDIO_MIGRATION_NAMESPACE,
) {
  const namespaceBytes = uuidToBytes(namespace);
  const nameBytes = textEncoder.encode(name);
  const input = new Uint8Array(namespaceBytes.length + nameBytes.length);
  input.set(namespaceBytes);
  input.set(nameBytes, namespaceBytes.length);
  const digest = new Uint8Array(
    await crypto.subtle.digest('SHA-1', input.buffer),
  ).slice(0, 16);

  digest[6] = (digest[6] & 0x0f) | 0x50;
  digest[8] = (digest[8] & 0x3f) | 0x80;

  const hex = bytesToHex(digest);
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join('-');
}

function sortJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJson);

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, item]) => item !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, sortJson(item)]),
    );
  }

  return value;
}

function uuidToBytes(uuid: string) {
  const hex = uuid.replaceAll('-', '');
  if (!/^[0-9a-f]{32}$/i.test(hex)) {
    throw new Error(`Invalid UUID namespace: ${uuid}`);
  }
  return Uint8Array.from(hex.match(/.{2}/g) ?? [], (byte) => parseInt(byte, 16));
}

function bytesToHex(bytes: Uint8Array) {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
