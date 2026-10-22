import type { Mode, Tier } from './model';
export interface AuditInput {
  timestamp: string; requester: string; tier: Tier | 'ALL' | 'SYSTEM';
  outcome: 'ENCRYPT' | 'DENIED' | 'DECRYPT' | 'REVOKE' | 'ATTEST' | 'INFO' | 'ERROR' | 'COSIGN';
  message: string; expiresAt: string | null; mode: Mode;
}
export interface AuditEvent extends AuditInput { sequence: number; previousHash: string; hash: string; receiptType: 'local hash-chain (simulated receipt)' }
export const GENESIS = '0'.repeat(64);
export async function hashEvent(event: Omit<AuditEvent, 'hash'>) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(event)));
  return Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, '0')).join('');
}
export async function appendEvent(events: AuditEvent[], input: AuditInput): Promise<AuditEvent> {
  const event = { ...input, sequence: events.length + 1, previousHash: events.at(-1)?.hash || GENESIS, receiptType: 'local hash-chain (simulated receipt)' as const };
  return { ...event, hash: await hashEvent(event) };
}
export async function verifyChain(events: AuditEvent[]) {
  let previousHash = GENESIS;
  for (let i = 0; i < events.length; i++) {
    const { hash, ...entry } = events[i];
    if (entry.sequence !== i + 1 || entry.previousHash !== previousHash || hash !== await hashEvent(entry)) return false;
    previousHash = hash;
  }
  return true;
}
