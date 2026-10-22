// Windows-friendly port of Tide's verified nextjs-e2ee-vault bootstrap.
// Uses the exact documented Admin REST endpoints; never deletes or resets a realm.
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
async function main() {
if (existsSync('.env.local')) process.loadEnvFile('.env.local');
const base = (process.env.TIDECLOAK_URL || 'http://localhost:8080').replace(/\/$/,'');
const realm = process.env.REALM_NAME || 'zero-spyware-edge';
const client = process.env.CLIENT_NAME || 'zero-spyware-edge-client';
const origin = process.env.CLIENT_APP_URL || 'http://localhost:3000';
const email = process.env.TIDE_LICENSE_EMAIL;
if (!email || process.env.TIDE_TERMS_ACCEPTED !== 'yes' || !process.env.KC_BOOTSTRAP_ADMIN_PASSWORD) {
  console.error('Bootstrap stopped: set your license email, explicit Tide terms agreement, and local admin password in .env.local.'); process.exit(2);
}
if (!/^[a-zA-Z0-9-]+$/.test(realm) || !/^[a-zA-Z0-9-]+$/.test(client)) throw new Error('Realm and client names must be simple identifiers.');
await fs.mkdir('data',{recursive:true});
let state = existsSync('data/bootstrap-state.json') ? JSON.parse(await fs.readFile('data/bootstrap-state.json','utf8')) : { realm, level:0 };
if (state.realm !== realm) throw new Error('Bootstrap state belongs to a different realm. Refusing to overwrite it.');
const save = () => fs.writeFile('data/bootstrap-state.json',JSON.stringify(state,null,2));
async function token() {
  const response = await fetch(`${base}/realms/master/protocol/openid-connect/token`,{
    method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},signal:AbortSignal.timeout(20000),
    body:new URLSearchParams({client_id:'admin-cli',grant_type:'password',username:process.env.KC_BOOTSTRAP_ADMIN_USERNAME||'admin',password:process.env.KC_BOOTSTRAP_ADMIN_PASSWORD}),
  });
  if (!response.ok) throw new Error(`Master authentication failed (${response.status}); no token printed.`);
  const result=await response.json(); if(!result.access_token) throw new Error('No master token returned'); return result.access_token;
}
async function api(path,{method='GET',body,form,allow404=false}={}) {
  const headers={Authorization:`Bearer ${await token()}`};
  if(body!==undefined)headers['Content-Type']='application/json';
  if(form)headers['Content-Type']='application/x-www-form-urlencoded';
  const response=await fetch(`${base}${path}`,{method,headers,body:form?new URLSearchParams(form):body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(90000),redirect:'manual'});
  const text=await response.text();
  if(response.status===404&&allow404)return null;
  if(!response.ok)throw new Error(`${method} ${path.split('?')[0]} failed (${response.status}): ${text.slice(0,300)}`);
  if(!text)return null;
  try{return JSON.parse(text);}catch{return text;}
}
const rp=`/admin/realms/${realm}`;
async function drain() {
  for(let pass=0;pass<5;pass++) {
    let pending=await api(`${rp}/iga/change-requests?status=PENDING`);
    if(!Array.isArray(pending))throw new Error('Unexpected change-request response');
    if(pending.some(item=>['DISABLE_IGA','DELETE_REALM','OFFBOARD_REALM'].includes(item.actionType)))throw new Error('Destructive governance request detected; not approving it.');
    if(!pending.length)return;
    for(const item of pending)await api(`${rp}/iga/change-requests/${item.id}/authorize`,{method:'POST',body:{}});
    pending=await api(`${rp}/iga/change-requests?status=PENDING`);
    const ready=pending.filter(item=>item.readyToCommit===true);
    for(const item of ready)await api(`${rp}/iga/change-requests/${item.id}/commit`,{method:'POST'});
    if(!ready.length)throw new Error('Governed changes need manual enclave approval. No approvals were fabricated.');
  }
  const remaining=await api(`${rp}/iga/change-requests?status=PENDING`);
  if(remaining.length)throw new Error('Change requests remain pending; finish in the real Tide console.');
}
async function user(username,roles) {
  let users=await api(`${rp}/users?username=${encodeURIComponent(username)}&exact=true`);
  if(!users.length){await api(`${rp}/users`,{method:'POST',body:{username,...(username==='admin'?{email}:{}),enabled:true,emailVerified:false,attributes:{tideInvitable:['true']}}});await drain();users=await api(`${rp}/users?username=${username}&exact=true`);}
  if(!users[0]?.id)throw new Error(`Unable to create ${username}`);
  const representations=await Promise.all(roles.map(role=>api(`${rp}/roles/${encodeURIComponent(role)}`)));
  await api(`${rp}/users/${users[0].id}/role-mappings/realm`,{method:'POST',body:representations});await drain();return users[0].id;
}
async function enrollment(id) {
  const link=await api(`${rp}/tideAdminResources/get-required-action-link?userId=${id}&lifespan=43200`,{method:'POST',body:['link-tide-account-action']});
  if(typeof link!=='string'||!link.startsWith('http'))throw new Error('Unexpected enrollment link; nothing invented.');return link;
}
if(process.argv.includes('--finish')) {
  if(state.level<5)throw new Error('Run tide:bootstrap first.');
  const admin=(await api(`${rp}/users?username=admin&exact=true`))[0];
  const paramedic=(await api(`${rp}/users?username=paramedic&exact=true`))[0];
  if(!admin?.attributes?.tideUserKey?.[0]||!paramedic?.attributes?.tideUserKey?.[0]){
    console.error('Enrollment is still required for BOTH accounts. Open the two links in data/enrollment-links.json and complete Tide enrollment yourself. No adapter was fabricated.');process.exit(3);
  }
  if(!state.finished) {
    await drain();
    const instance=await api(`${rp}/identity-provider/instances/tide`);
    instance.config.CustomAdminUIDomain=`${base}/realms/${realm}/tide-console/`;
    await api(`${rp}/identity-provider/instances/tide`,{method:'PUT',body:instance});
    await api(`${rp}/vendorResources/sign-idp-settings`,{method:'POST'});
    const management=(await api(`${rp}/clients?clientId=realm-management`))[0];
    const adminRole=await api(`${rp}/clients/${management.id}/roles/tide-realm-admin`);
    await api(`${rp}/users/${admin.id}/role-mappings/clients/${management.id}`,{method:'POST',body:[adminRole]});
    await drain();state.finished=true;await save();
  }
  const app=(await api(`${rp}/clients?clientId=${encodeURIComponent(client)}`))[0];
  const adapter=await api(`${rp}/vendorResources/get-installations-provider?clientId=${app.id}&providerId=keycloak-oidc-keycloak-json`);
  if(!adapter?.jwk?.keys?.length||!adapter.vendorId||!adapter.homeOrkUrl)throw new Error('Exported adapter is incomplete. Check licensing and governance; refusing to hand-build it.');
  await fs.writeFile('data/tidecloak.json',JSON.stringify(adapter,null,2));
  console.log('Actual public Tide adapter exported to data/tidecloak.json. Restart the app, then log in as paramedic for real SDK testing.');
  process.exit(0);
}
if(state.level<1) {
  const existing=await api(rp,{allow404:true});
  if(existing)throw new Error('This realm already exists without this bootstrap state. Refusing to overwrite it; use its console.');
  const template=(await fs.readFile('scripts/realm.json.template','utf8')).replaceAll('REALM_NAME',realm).replaceAll('CLIENT_NAME',client).replaceAll('CLIENT_APP_URL',origin);
  await api('/admin/realms',{method:'POST',body:JSON.parse(template)});state.level=1;await save();console.log('Realm and public DPoP client created.');
}
if(state.level<2) {
  const executions=await api(`${rp}/authentication/flows/first%20broker%20login/executions`);
  const review=executions.find(item=>item.providerId==='idp-review-profile');
  if(review){const body={alias:'review profile config',config:{'update.profile.on.first.login':'off'}};await api(review.authenticationConfig?`${rp}/authentication/config/${review.authenticationConfig}`:`${rp}/authentication/executions/${review.id}/config`,{method:review.authenticationConfig?'PUT':'POST',body});}
  state.level=2;await save();
}
if(state.level<3) {
  if(state.licenseFailure && !process.argv.includes('--retry-license')) throw new Error('Previous Tide licensing failed. Inspect data/bootstrap-state.json and resolve it with Tide support before explicitly retrying with --retry-license. The partial realm is preserved.');
  console.log('Requesting a real Tide license with the operator-provided email and explicit terms acceptance…');
  let result;
  try { result=await api(`${rp}/vendorResources/setUpTideRealm`,{method:'POST',form:{email,isRagnarokEnabled:'true'}}); }
  catch(error) { state.licenseFailure=error.message;await save();throw error; }
  if(JSON.stringify(result).includes('NEED_PAYMENT'))throw new Error('Tide requires payment for this license. No payment was authorized or attempted.');
  delete state.licenseFailure;state.level=3;await save();console.log('Tide setup endpoint completed; configuring governance.');
}
if(state.level<4) {
  const rep=await api(rp);rep.attributes={...rep.attributes,'iga.attestor':'tide'};
  await api(rp,{method:'PUT',body:rep});
  if(String(rep.attributes.isIGAEnabled).toLowerCase()!=='true'){
    const result=await api(`${rp}/tide-admin/toggle-iga`,{method:'POST',form:{isIGAEnabled:'true'}});
    if(result?.enabled!==true)throw new Error('Tide did not confirm governance enabled. Do not call the toggle again blindly.');
  }
  await drain();state.level=4;await save();
}
if(state.level<5) {
  const encryptRoles=['telemetry','emergency','restricted'].map(tag=>`_tide_${tag}.selfencrypt`);
  state.admin=await user('admin',['_tide_enabled','appUser',...encryptRoles]);
  state.paramedic=await user('paramedic',['_tide_enabled','appUser','EMERGENCY_PARAMEDIC',...encryptRoles,'_tide_telemetry.selfdecrypt','_tide_emergency.selfdecrypt']);
  state.level=5;await save();
}
const links={admin:await enrollment(state.admin),paramedic:await enrollment(state.paramedic)};
await fs.writeFile('data/enrollment-links.json',JSON.stringify(links,null,2));
console.log('Prepared separate admin (encrypt only) and paramedic (Tier 1/2 decrypt) identities.');
console.log('ACTION REQUIRED: Open the two real invitation URLs in the ignored data/enrollment-links.json. Create/link each Tide account yourself, then run npm run tide:finish. No passwords, tokens, or invitation secrets were printed.');
}
main().catch(error => { console.error(`Tide setup incomplete: ${error instanceof Error ? error.message : String(error)}`);process.exitCode=1; });
