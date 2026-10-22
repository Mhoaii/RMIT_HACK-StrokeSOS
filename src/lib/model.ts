export type Tier = 1 | 2 | 3;
export type Mode = 'simulation' | 'tide';
export type Role = 'PARAMEDIC' | 'DISPATCHER' | 'ADMIN';
export const TAGS: Record<Tier, string> = { 1: 'telemetry', 2: 'emergency', 3: 'restricted' };
export const FAKE_PATIENT = {
  streamKey: 'AES-256-LIVE-UNLOCKED-9981',
  patientName: 'Nguyen Van A (78)', bloodType: 'O+',
  medicalHistory: 'Atrial fibrillation, hypertension',
  currentMeds: 'Warfarin (anticoagulant)',
  tier3: { insurance: 'DEMO-POLICY-7781', psychiatric: 'Synthetic private clinical record', financial: 'Synthetic financial record' },
};
export type PatientRecord = Omit<typeof FAKE_PATIENT, 'tier3'> & { liveKey: string };
export interface Gates { attested: boolean; deadline: number | null; authenticated: boolean; role: Role; closed: boolean }
export function gateReason(tier: Tier, gates: Gates, now = Date.now()): string | null {
  if (gates.closed) return 'Case closed. Start a new case before requesting access.';
  if (tier === 3) return 'Tier 3 is outside the emergency scope, including for paramedics.';
  if (!gates.authenticated) return 'Authenticate before requesting decryption.';
  if (gates.role === 'ADMIN') return 'Root admin has no clinical decryption permission.';
  if (!gates.attested) return 'Edge fall attestation is required.';
  if (tier === 1) return null;
  if (gates.role !== 'PARAMEDIC') return 'Tier 2 requires EMERGENCY_PARAMEDIC.';
  if (gates.deadline === null || now < gates.deadline) return 'Wait for the patient response window to expire.';
  return null;
}
export const CAUTION = 'Patient on Warfarin (anticoagulant). Thrombolysis (tPA) is high-risk / may be contraindicated depending on INR; verify INR and follow the applicable stroke protocol before administering.';
export const LOCKED_REPLY = 'Access denied by TideCloak: medication record is cryptographically locked.';
export function mmss(seconds: number): string {
  const n = Math.max(0, Math.ceil(seconds));
  return `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;
}
export function errorText(error: unknown) { return error instanceof Error ? `${error.name}: ${error.message}` : String(error); }
