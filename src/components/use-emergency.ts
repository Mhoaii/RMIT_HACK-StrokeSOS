'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from './auth-provider';
import { createLocalVault, generateStreamKey, importStreamKey, toBase64 } from '@/lib/crypto';
import { appendEvent, verifyChain, type AuditEvent, type AuditInput } from '@/lib/audit';
import { FAKE_PATIENT, TAGS, gateReason, errorText, CAUTION, LOCKED_REPLY, type Tier, type PatientRecord, type Gates } from '@/lib/model';
import { REFERENCE_POSE } from '@/lib/pose';

type Cipher = string | Uint8Array;
type ChatMessage = { role: 'user' | 'assistant'; text: string; source?: string };
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
export function displayCipher(value?: Cipher) { return value ? typeof value === 'string' ? value : toBase64(value) : ''; }
function decode(value: Cipher) { return typeof value === 'string' ? value : new TextDecoder().decode(value); }

export function useEmergency() {
  const auth = useAuth();
  const authRef = useRef(auth); authRef.current = auth;
  const [demo, setDemo] = useState(true);
  const [critical, setCritical] = useState(false);
  const [simulatedFall, setSimulatedFall] = useState(false);
  const [confidence, setConfidence] = useState(0);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [closed, setClosed] = useState(false);
  const [expires, setExpires] = useState<number | null>(null);
  const [bundles, setBundles] = useState<Partial<Record<Tier, Cipher>>>({});
  const bundlesRef = useRef(bundles); bundlesRef.current = bundles;
  const [edgeKey, setEdgeKey] = useState<CryptoKey | null>(null);
  const [viewerKey, setViewerKey] = useState<CryptoKey | null>(null);
  const [record, setRecord] = useState<PatientRecord | null>(null);
  const [telemetry, setTelemetry] = useState<string | null>(null);
  const [status, setStatus] = useState('Initializing edge encryption…');
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [adminBusy, setAdminBusy] = useState(false);
  const [adminAttempt, setAdminAttempt] = useState(false);
  const [adminResult, setAdminResult] = useState<{ denied: boolean; text: string; raw: string } | null>(null);
  const [tier3Error, setTier3Error] = useState('');
  const [caseId, setCaseId] = useState(1);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [chatBusy, setChatBusy] = useState(false);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [auditStatus, setAuditStatus] = useState('');
  const eventsRef = useRef<AuditEvent[]>([]);
  const auditQueue = useRef(Promise.resolve());
  const localVault = useRef<Awaited<ReturnType<typeof createLocalVault>>[] | null>(null);
  const epoch = useRef(0);
  const gateRef = useRef<Gates>({ attested: false, deadline: null, authenticated: false, role: 'ADMIN', closed: false });
  gateRef.current = { attested: critical, deadline, authenticated: auth.authenticated, role: auth.role, closed };
  const busyRef = useRef(false);

  const log = useCallback((outcome: AuditInput['outcome'], message: string, tier: AuditInput['tier'] = 'SYSTEM', requester?: string, expiry?: number) => {
    const input: AuditInput = { timestamp: new Date().toISOString(), requester: requester || authRef.current.identity,
      tier, outcome, message, expiresAt: expiry ? new Date(expiry).toISOString() : null, mode: authRef.current.mode };
    auditQueue.current = auditQueue.current.then(async () => {
      const event = await appendEvent(eventsRef.current, input);
      eventsRef.current = [...eventsRef.current, event]; setEvents(eventsRef.current);
    }).catch(() => setAuditStatus('Audit hash failed. Do not treat this run as a verified trail.'));
  }, []);

  useEffect(() => {
    let canceled = false;
    const current = authRef.current;
    // SDK encryption requires a real authenticated user with selfencrypt roles.
    if (current.mode === 'tide' && !current.authenticated) {
      setStatus('Sign in to TideCloak to encrypt synthetic records.'); setReady(false); return;
    }
    setReady(false); setStatus('Encrypting independent field tiers…');
    async function initialize() {
      const { encoded, key } = await generateStreamKey();
      const plaintexts = [
        JSON.stringify({ heartRate: 72, sensor: 'simulated', skeleton: REFERENCE_POSE, skeletonSource: 'simulated reference pose' }),
        JSON.stringify({ ...FAKE_PATIENT, tier3: undefined, liveKey: encoded }),
        JSON.stringify(FAKE_PATIENT.tier3),
      ];
      let encrypted: Cipher[];
      if (current.mode === 'tide') {
        encrypted = await current.encrypt!(plaintexts.map((data,i) => ({ data, tags: [TAGS[(i+1) as Tier]] })));
      } else {
        const vaults = await Promise.all(plaintexts.map(() => createLocalVault()));
        encrypted = await Promise.all(plaintexts.map((data,index) => vaults[index].seal(data)));
        if (!canceled) localVault.current = vaults;
      }
      if (!Array.isArray(encrypted) || encrypted.length !== 3 || encrypted.some(item => !(typeof item === 'string' || item instanceof Uint8Array))) throw new Error('SDK returned an unexpected encryption result.');
      if (canceled) return;
      setBundles({ 1: encrypted[0], 2: encrypted[1], 3: encrypted[2] }); setEdgeKey(key); setReady(true);
      setStatus(current.mode === 'tide' ? 'TideCloak field encryption complete.' : 'Local AES-GCM ready. Tide authority is simulated.');
      for (const tier of [1,2,3] as Tier[]) log('ENCRYPT', `${TAGS[tier]} sealed · ${current.mode === 'tide' ? 'Tide SDK ciphertext' : 'local AES-256-GCM / simulated Tide'}`, tier, 'Edge Sensor #01');
    }
    initialize().catch(error => { if (!canceled) { setStatus(errorText(error)); log('ERROR', `Encryption unavailable: ${errorText(error)}`); } });
    return () => { canceled = true; };
    // Recreate envelopes on auth transition or new case, never on ordinary timer/UI renders.
  }, [auth.mode, auth.mode === 'tide' ? auth.authenticated : false, caseId, log]);

  const revoke = useCallback((reason = 'Case closed by responder') => {
    epoch.current++; busyRef.current = false; setBusy(false);
    setViewerKey(null); setRecord(null); setTelemetry(null); setChat([]); setChatBusy(false); setExpires(null);
    setClosed(true); setCritical(false); setDeadline(null);
    setStatus('Case closed. Decrypted views cleared; start a new case to request again.');
    log('REVOKE', `${reason}. Viewer key reference, record and copilot context cleared. Session revocation only; prior copies cannot be recalled.`, 'ALL');
  }, [log]);
  const revokeRef = useRef(revoke); revokeRef.current = revoke;
  useEffect(() => {
    const tick = () => { const time = Date.now(); setNow(time); if (expires && time >= expires) revokeRef.current('TTL expired automatically'); };
    tick(); const timer = setInterval(tick, 200);
    document.addEventListener('visibilitychange', tick); window.addEventListener('focus', tick);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', tick); window.removeEventListener('focus', tick); };
  }, [expires]);
  const previousAuth = useRef(auth.authenticated);
  useEffect(() => {
    if (previousAuth.current && !auth.authenticated) revokeRef.current('Authentication ended');
    previousAuth.current = auth.authenticated;
  }, [auth.authenticated]);

  const triggerFall = useCallback((simulated = true, certainty = .97) => {
    if (gateRef.current.attested || gateRef.current.closed || !ready) return;
    const deadline = Date.now() + (demo ? 5000 : 60000);
    gateRef.current = { ...gateRef.current, attested: true, deadline };
    setCritical(true); setDeadline(deadline); setConfidence(certainty); setSimulatedFall(simulated);
    setStatus(`Fall detected. Patient response window: ${demo ? 5 : 60} seconds.`);
    log('ATTEST', `${simulated ? 'Simulated fall' : 'MediaPipe fall heuristic'} · local attestation flag set (simulated signature).`, 1, 'Edge Sensor #01');
  }, [ready, demo, log]);
  useEffect(() => {
    function shortcut(event: KeyboardEvent) {
      const element = event.target as HTMLElement;
      if (['INPUT','TEXTAREA','SELECT'].includes(element.tagName) || element.isContentEditable || event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key.toLowerCase() === 'f') { event.preventDefault(); triggerFall(true); }
    }
    window.addEventListener('keydown',shortcut); return () => window.removeEventListener('keydown',shortcut);
  }, [triggerFall]);

  async function decryptTier(tier: Tier, bypassLocalGate = false): Promise<string> {
    const encrypted = bundlesRef.current[tier]; if (!encrypted) throw new Error('No ciphertext available.');
    const current = authRef.current;
    if (current.mode === 'tide') {
      // No invented Tide API. Actual rejection or success comes from the SDK.
      const result = await current.decrypt!([{ encrypted, tags: [TAGS[tier]] }]);
      if (!Array.isArray(result) || result.length !== 1) throw new Error('Unexpected Tide decrypt response');
      return decode(result[0]);
    }
    const reason = bypassLocalGate ? 'Root admin has no clinical decryption permission.' : gateReason(tier, gateRef.current);
    if (reason) { const error = new Error(`SIMULATED local authority: ${reason}`); error.name = 'LocalPolicyDenied'; throw error; }
    if (!localVault.current) throw new Error('Local vault unavailable');
    return localVault.current[tier-1].open(String(encrypted));
  }

  async function rogueAttempt() {
    if (adminBusy || !ready) return;
    setAdminBusy(true); setAdminAttempt(true); setAdminResult(null);
    if (authRef.current.mode === 'tide' && authRef.current.role !== 'ADMIN') {
      setAdminResult({ denied: false, text: 'Separate admin session required', raw: 'This Tide session is authorized as a responder. Open another browser profile, sign in as the admin without selfdecrypt roles, and encrypt a test envelope there. An authorized paramedic request is not an admin bypass test.' });
      log('INFO', 'Admin trust test not run: current Tide identity is a responder.',2); setAdminBusy(false); return;
    }
    try {
      await decryptTier(2,true);
      setAdminResult({ denied: false, text: 'Unexpected decrypt success — review realm policy', raw: 'The SDK returned plaintext to the admin. It was discarded. This run does NOT prove the trust constraint; remove selfdecrypt permission from the admin and verify governed policy.' });
      log('ERROR', 'Admin decrypt unexpectedly succeeded. Plaintext discarded. Realm policy needs correction.',2);
    } catch (error) {
      const raw = errorText(error);
      setAdminResult({ denied: true, text: authRef.current.mode === 'tide' ? 'Tide SDK rejected the request' : 'Admin override rejected · simulated authority', raw });
      log('DENIED', `Admin test: ${raw}. A transport or authentication error alone is not proof of network authorization denial.`,2,'Root admin');
    } finally { setAdminBusy(false); }
  }

  async function unlock(tier: 1 | 2 = 2) {
    if (busyRef.current || !ready) return;
    const reason = gateReason(tier,gateRef.current);
    if (reason) { setStatus(reason); log('DENIED',`Local workflow gate: ${reason}`,tier); return; }
    busyRef.current = true; setBusy(true);
    const operation = ++epoch.current;
    log('COSIGN',`Responder requested Tier ${tier}. Co-sign represented by authenticated UI action; multi-party signature is simulated.`,tier);
    setStatus(authRef.current.mode === 'tide' ? 'Waiting for Tide Network nodes to reach Emergent Authority consensus… (SDK request pending; network phase unobservable)' : 'Simulated consensus · evaluating emergency conditions…');
    const started = Date.now();
    try {
      let result: string | undefined, failure: unknown;
      try { result = await decryptTier(tier); } catch (error) { failure = error; }
      await sleep(Math.max(0,1500 - (Date.now()-started)));
      if (failure) throw failure;
      if (operation !== epoch.current || gateReason(tier,gateRef.current)) return;
      const expiry = Date.now() + (demo ? 60000 : 15*60000);
      if (tier === 1) {
        // Validate JSON before allowing it into the display.
        JSON.parse(result!); setTelemetry(result!);
      } else {
        const parsed = JSON.parse(result!) as PatientRecord;
        if (typeof parsed.currentMeds !== 'string' || typeof parsed.liveKey !== 'string') throw new Error('Decrypted Tier 2 record is malformed.');
        const key = await importStreamKey(parsed.liveKey);
        if (operation !== epoch.current || gateReason(tier,gateRef.current)) return;
        // Do not retain the exportable key string in React state.
        setRecord({ ...parsed, liveKey: '' }); setViewerKey(key);
      }
      setExpires(expiry); setStatus(`Tier ${tier} decrypted. ${demo ? '60-second demo' : '15-minute'} session lease started.`);
      log('DECRYPT',`Tier ${tier} decrypted by ${authRef.current.identity} + local edge flag. ${demo ? 'Demo' : 'Standard'} lease.`,tier,undefined,expiry);
    } catch (error) { if (operation === epoch.current) { setStatus(`Decrypt unavailable: ${errorText(error)}`); log('DENIED',errorText(error),tier); } }
    finally { if (operation === epoch.current) { busyRef.current = false; setBusy(false); } }
  }

  async function testTier3() {
    if (!ready) return;
    const operation = epoch.current;
    try {
      await decryptTier(3);
      if (operation !== epoch.current) return;
      setTier3Error('Unexpected SDK success. Plaintext discarded. Remove restricted.selfdecrypt from the responder and review policy.');
      log('ERROR','Tier 3 unexpectedly decrypted. Plaintext discarded. Realm role/policy misconfiguration.',3);
    } catch (error) {
      if (operation !== epoch.current) return;
      setTier3Error(errorText(error)); log('DENIED',errorText(error),3);
    }
  }

  async function sendChat(question: string) {
    if (!question.trim() || chatBusy) return;
    const operation = epoch.current;
    setChat(messages => [...messages, { role: 'user', text: question.trim() }]);
    if (!record || !expires || Date.now() >= expires) {
      setChat(messages => [...messages, { role: 'assistant', text: `${auth.mode === 'simulation' ? '[Simulated Tide authority] ' : ''}${LOCKED_REPLY}`, source: 'ACCESS GATE' }]);
      log('DENIED','Copilot medication context withheld: Tier 2 locked.',2); return;
    }
    setChatBusy(true);
    let text = `${CAUTION} Decision support only, not medical advice.`;
    let source = 'SCRIPTED · SIMULATED AI';
    try {
      // Only the decrypted Tier 2 allowlist is sent. No ciphertext, Tier 3, stream keys, or camera.
      const payload = JSON.stringify({ question: question.slice(0,1000), record: { currentMeds: record.currentMeds, medicalHistory: record.medicalHistory, bloodType: record.bloodType } });
      const request = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, signal: AbortSignal.timeout(20000) };
      const response = auth.mode === 'tide' && auth.secureFetch ? await auth.secureFetch('/api/triage',request) : await fetch('/api/triage',request);
      if (response.ok) { const data = await response.json(); if (typeof data.text === 'string') { text = data.text; source = data.source; } }
      else if (response.status !== 503) { source = `SCRIPTED FALLBACK · API ${response.status}`; }
    } catch { source = 'SCRIPTED FALLBACK · API UNAVAILABLE'; }
    if (operation === epoch.current && gateRef.current.authenticated) { setChat(messages => [...messages, { role: 'assistant', text, source }]); setChatBusy(false); }
  }

  function newCase() {
    epoch.current++; busyRef.current = false;
    setBusy(false); setCritical(false); setClosed(false); setDeadline(null); setExpires(null);
    setRecord(null); setViewerKey(null); setTelemetry(null); setChat([]); setChatBusy(false); setTier3Error('');
    setAdminAttempt(false); setAdminResult(null); setBundles({}); setEdgeKey(null); setReady(false);
    gateRef.current = { ...gateRef.current, attested:false, closed:false, deadline:null };
    setCaseId(value => value+1); log('INFO','New synthetic case started. Fresh stream key and ciphertext requested.');
  }
  function cancelAlert() {
    if (record || busyRef.current) return;
    setCritical(false); setDeadline(null); setStatus('Patient responded. Emergency request canceled.');
    gateRef.current = { ...gateRef.current, attested:false, deadline:null };
    log('INFO','Patient response canceled the local emergency workflow.',1,'Patient');
  }
  async function verifyAudit() { await auditQueue.current; setAuditStatus(await verifyChain(eventsRef.current) ? `Verified ${eventsRef.current.length} local events. No Tide signature is claimed.` : 'Hash-chain integrity failed.'); }
  async function exportAudit() {
    await auditQueue.current;
    const blob = new Blob([JSON.stringify({ application:'Zero-Spyware Edge', receipt:'local hash-chain (simulated receipt)', events:eventsRef.current },null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob); const a=document.createElement('a');a.href=url;a.download='zero-spyware-audit.json';a.click();URL.revokeObjectURL(url);
  }
  return { auth, demo, setDemo, critical, simulatedFall, confidence, deadline, now, closed, expires, bundles, edgeKey, viewerKey, record, telemetry,
    status, ready, busy, adminBusy, adminAttempt, adminResult, tier3Error, caseId, chat, chatBusy, events, auditStatus,
    log, triggerFall, rogueAttempt, unlock, testTier3, revoke, newCase, cancelAlert, sendChat, verifyAudit, exportAudit,
    countdown: deadline ? Math.max(0,Math.ceil((deadline-now)/1000)) : null,
    ttl: expires ? Math.max(0,(expires-now)/1000) : 0,
  };
}
