import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gateReason, type Gates } from '../src/lib/model';
import { createLocalVault, generateStreamKey, importStreamKey, encryptBytes, decryptBytes } from '../src/lib/crypto';
import { appendEvent, verifyChain, type AuditInput } from '../src/lib/audit';
import { fallMetrics, FallTracker, REFERENCE_POSE } from '../src/lib/pose';
const valid: Gates = { attested:true,deadline:5000,authenticated:true,role:'PARAMEDIC',closed:false };
test('Tier 2 requires ALL workflow conditions; a db flag cannot bypass them',()=>{
  assert.equal(gateReason(2,valid,5001),null);
  for (const patch of [{attested:false},{deadline:null},{authenticated:false},{role:'ADMIN' as const},{role:'DISPATCHER' as const},{closed:true}]) assert.ok(gateReason(2,{...valid,...patch},5001));
  assert.ok(gateReason(2,valid,4999));
});
test('Dispatcher can see Tier 1 after attestation; nobody gets Tier 3',()=>{
  assert.equal(gateReason(1,{...valid,role:'DISPATCHER',deadline:99999},5001),null);
  for (const role of ['PARAMEDIC','DISPATCHER','ADMIN'] as const) assert.ok(gateReason(3,{...valid,role},5001));
});
test('AES-GCM ciphertext opens only with correct key and rejects altered bytes',async()=>{
  const {encoded,key}=await generateStreamKey();
  const viewer=await importStreamKey(encoded);
  const message=new TextEncoder().encode('synthetic camera frame');
  const packet=await encryptBytes(key,message);
  assert.deepEqual(await decryptBytes(viewer,packet),message);
  const wrong=await generateStreamKey();
  const wrongViewer=await importStreamKey(wrong.encoded);
  await assert.rejects(()=>decryptBytes(wrongViewer,packet));
  packet.data[0]^=1;
  await assert.rejects(()=>decryptBytes(viewer,packet));
});
test('independent local vaults cannot open each other’s ciphertext',async()=>{
  const a=await createLocalVault(),b=await createLocalVault();
  const ciphertext=await a.seal('synthetic private record');
  assert.equal(await a.open(ciphertext),'synthetic private record');
  await assert.rejects(()=>b.open(ciphertext));
});
test('audit verification rejects tampering, reordering and dropped internal events',async()=>{
  const input:AuditInput={timestamp:'2026-10-22T00:00:00Z',requester:'test',tier:2,outcome:'DENIED',message:'synthetic rejection',expiresAt:null,mode:'simulation'};
  const first=await appendEvent([],input),second=await appendEvent([first],{...input,outcome:'DECRYPT'});
  assert.equal(await verifyChain([first,second]),true);
  assert.equal(await verifyChain([{...first,message:'changed'},second]),false);
  assert.equal(await verifyChain([second,first]),false);
  assert.equal(await verifyChain([second]),false);
});
test('fall heuristic does not flag upright or low-visibility poses',()=>{
  assert.equal(fallMetrics(REFERENCE_POSE)?.horizontal,false);
  const tracker=new FallTracker();
  for(let time=1000;time<6000;time+=100) assert.equal(tracker.update(REFERENCE_POSE,time).fall,false);
  assert.equal(fallMetrics(REFERENCE_POSE.map(point=>({...point,visibility:0}))),null);
});
