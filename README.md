# RMIT_HACK — StrokeSOS

## Project overview

StrokeSOS (Zero-Spyware Edge) is a privacy-first emergency monitoring prototype exploring time-limited, role-scoped access to home-camera data.

### 1. Vision & originality

Home monitoring should support emergency response without routine surveillance. StrokeSOS combines a skeleton-only normal view with a visible emergency-access workflow, separate data tiers, automatic re-locking, and a patient-readable audit trail.

### 2. Trust constraint insight

Patients must often trust whoever operates a home camera with intimate footage. Removing unrestricted operator access could make monitoring acceptable to people who would otherwise refuse it. The proposed boundary is conditional cryptographic access; this prototype's emergency conditions remain local, simulated policy.

### 3. Value & impact

Older adults living alone, families, dispatchers, and paramedics could benefit. After an unresponsive fall, a dispatcher could receive posture telemetry while a paramedic requests medication history. Psychiatric, insurance, and financial records remain outside the intended emergency scope.

### 4. Why TideCloak matters

The source integrates the official TideCloak SDK for authentication, role checks, and tag-based `doEncrypt`/`doDecrypt` calls. The goal is to make database overrides insufficient to authorize decryption. Local activation failed with Tide/Midgard HTTP 500; live network enforcement and cross-user emergency release are not demonstrated.

### 5. Prototype & storytelling

Judges should follow: encrypted startup → rejected admin override → simulated fall → five-second countdown → demo paramedic co-sign → Tier 2 decrypt → Tier 3 denial → revoke → audit. Local AES-GCM, optional MediaPipe inference, and the SHA-256 audit chain are real. Tide authority, co-signing, and sensors are simulated; audit receipts are local hash-chain records, not Tide signatures.

---

## Demo and implementation status

Built for the UNLOCKED hackathon with Next.js App Router, TypeScript, Tailwind CSS, lucide-react, MediaPipe Pose, Web Crypto, and the official TideCloak SDK. Deployment target: **Vercel**.

The complete demo runs without credentials. It clearly labels simulated identity and authority. A real TideCloak adapter switches the app to documented SDK calls; it never fabricates a Tide rejection, ciphertext, signature, or API.

**Live demo:** [rmit-hack-stroke-sos.vercel.app](https://rmit-hack-stroke-sos.vercel.app/) · **Repository:** [Mhoaii/RMIT_HACK-StrokeSOS](https://github.com/Mhoaii/RMIT_HACK-StrokeSOS)

**Choose your demo guide:** [English](docs/DEMO_EN.md) · [Vietnamese](docs/DEMO_VI.md). Both include a timed two-minute script, button sequence and camera fallback.

The public site currently uses labeled simulation. Local Docker/TideCloak was installed and started, but the real license activation returned Tide/Midgard HTTP 500. See [verified setup status](docs/SETUP_STATUS.md) before retrying; no real adapter or successful Tide network decrypt is claimed.

## Run on Windows

Node.js 22 or newer is recommended. Dependencies and npm cache stay inside the project; no Python/pip or global npm installation is used.

```powershell
cd F:\RMIT\Track2
npm ci
npm run setup:vision
npm run dev
```

Open **http://localhost:3000**. `setup:vision` copies MediaPipe WASM and the exact installed Tide DPoP relay, and downloads Google's pose model into `public/models/`. The model and WASM are generated assets, excluded from Git. `npm run build` also prepares them automatically.

To test the production server:

```powershell
npm run build
npm start
```

Use a separate terminal for commands while the server runs. Stop it with Ctrl+C. Camera access requires localhost or HTTPS. Enabling the camera is always a user click; raw camera input is an off-DOM video element. Skeleton landmarks are the only normal camera visualization.

## Two-minute demo

1. Open the page in simulation mode. The amber status explicitly says Tide authority is simulated. Three ciphertexts are created with real local AES-GCM.
2. Click **Rogue admin: override & decrypt**. The local simulated policy denies access even though the local database override flag becomes true. Inspect the actual local error.
3. Optionally click **Enable private camera**, granting camera permission. MediaPipe runs locally. The fallback reference skeleton is labeled simulated.
4. Click **Simulate fall** or press **F** outside an input. Wait five seconds. **I'm okay** cancels an alert before access is granted.
5. Click **Demo sign in**, with **Emergency paramedic** selected, then **Co-sign & request emergency decrypt**. The wait is at least 1.5 seconds. The synthetic clinical record is actually decrypted. If a camera is enabled, its actual JPEG bytes are encrypted and decrypted with AES-GCM before rendering in dispatch.
6. Test Tier 3; it stays denied in the simulated policy. Ask the copilot about tPA. The scripted response reads only the unlocked record and warns about Warfarin/INR without making an absolute contraindication claim.
7. Click **Close case & revoke access**. Camera tracks stop and responder data/context are cleared. Alternatively, demo access expires after **60 seconds**. With Demo mode off, the response window is **60 seconds** and the access lease is **15 minutes**. Timer settings cannot change during an active incident.
8. Open **Patient audit**, **Verify chain**, and **Export JSON**. Audit data stays in memory until exported. Refreshing starts a fresh session.

The **Dispatcher** simulation role can request Tier 1 after a fall without waiting for the response window. The **Root admin** role cannot unlock clinical tiers. Start a new case with the reset control after closing one.

## Real versus simulated

| Capability | Status |
| --- | --- |
| Browser AES-256-GCM record and JPEG encryption | Real; independent local keys for three record tiers, random IV per encryption |
| MediaPipe 33-landmark webcam inference | Real when camera/model initialize; the fall heuristic is experimental and is not medical stroke detection |
| Tide authentication, role checks, `doEncrypt`, `doDecrypt` | Real SDK path when a licensed realm and actual exported public adapter exist; unverified until live login/decrypt succeeds |
| Tide-less authentication and denial | Explicitly simulated; no Tide network calls |
| Patient data, heart rate, mmWave sensor | Synthetic/simulated |
| Signed edge attestation, responder multi-party co-sign | Simulated; local state/UI actions, no hardware signature or deployed Forseti contract |
| Three emergency conditions enforced by Tide network | **Not implemented**; client gates do not become cryptographic policy simply because the SDK is used |
| Scope enforcement by Tide | Depends on genuine configured tag permissions and deployed policy; an unexpected success is reported as policy error |
| Cross-user paramedic release of edge-owner ciphertext | Not claimed. The documented selfencrypt/selfdecrypt flow is a single-user integration demonstration |
| 15-minute expiry / close-case revoke | Local viewer lease; clears references, canvas and chat, and stops camera on explicit close. Does not erase copies already obtained or revoke long-lived Tide roles |
| Audit receipts | Real local SHA-256 chain labeled **local hash-chain (simulated receipt)**; no Tide-signed receipt exposed by this integration |
| Copilot | Clearly labeled scripted support by default; optional verified live Anthropic API route |
| Remote camera transport / cloud DB | Not implemented; single-browser prototype, ciphertext in memory |

**The edge process creates and retains a symmetric stream encryption key.** The same browser runs edge and dispatch for this prototype. Do not describe this harness as proving that nobody holds any key, that an administrator cannot modify its JavaScript, or that plaintext can be retroactively recalled. Real deployment requires isolated devices, verified hardware attestations, a governed cross-user key-release contract, externally enforced lease policy, shared replay/rate-limit storage and externally anchored audit events.

## Connect a real local TideCloak realm

TideCloak is a separate identity/encryption service. It does **not** run inside a Vercel function. This project includes `compose.tidecloak.yml` and a Windows-friendly setup helper; configuration is never fabricated from a URL and client ID.

1. Install/start Docker Desktop with its Linux/WSL 2 backend. Docker's application and WSL disk were requested on F: for this workspace; Windows components and temporary installer files can still use C:. A Windows administrator prompt, Docker terms acceptance, or restart may need the computer owner.
2. Copy `.env.example` to `.env.local`. Set a strong `KC_BOOTSTRAP_ADMIN_PASSWORD`, your real `TIDE_LICENSE_EMAIL`, and `TIDE_TERMS_ACCEPTED=yes` **only after accepting [Tide's terms](https://tide.org/legal)**. Keep this file private. Never add admin credentials to a `NEXT_PUBLIC_` variable.
3. Run:

   ```powershell
   npm run tide:start
   ```

   This uses Docker Compose with `.env.local`, persists a named Docker volume, binds the identity server to **127.0.0.1:8080**, and reuses an existing container. It never deletes a realm or its database.

4. Open **http://localhost:8080** and sign in with the master-admin credentials from `.env.local`. Use the official **Set up this realm** wizard for `zero-spyware-edge` and your license email. Complete the Tide account enrollment link yourself; the app has no functioning realm until enrollment and licensing finish.

   Alternatively, for a **new** realm, `npm run tide:bootstrap` automates the verified Admin REST sequence without Python, Bash or jq. It creates the DPoP client and separate admin/paramedic accounts, then writes private invitation links to the Git-ignored `data/enrollment-links.json`. Complete both invitations yourself, then run `npm run tide:finish` to sign the IdP settings, grant governed admin authority last, and export the actual adapter. The admin has encryption permissions and no clinical decrypt; the paramedic gets Tier 1/2 decrypt. The helper refuses to overwrite an existing realm without its own state. The current local realm is partially initialized after a server-side license failure; do not run the wizard over it or delete its data as a retry strategy.
5. In the realm's Tide console, create a **public** OIDC app `zero-spyware-edge-client`. Include exact local Web Origin `http://localhost:3000`, redirect URI `http://localhost:3000/*`, and logout redirect `http://localhost:3000/*`. This integration enables **strict DPoP**, so use DPoP-bound access tokens in the client configuration. The exact SDK relay is served at `/tide_dpop/...` with the template headers/rewrite.
6. Configure the following roles under Tide governance. If quorum approvals are enabled, changes must be approved/committed by the real realm administrators:

   | Purpose | Role |
   | --- | --- |
   | Paramedic identity | `EMERGENCY_PARAMEDIC` |
   | Dispatcher identity | `DISPATCHER` |
   | Encrypt Tier 1 / 2 / 3 | `_tide_telemetry.selfencrypt`, `_tide_emergency.selfencrypt`, `_tide_restricted.selfencrypt` |
   | Dispatcher decrypt | `_tide_telemetry.selfdecrypt` |
   | Paramedic decrypt | `_tide_telemetry.selfdecrypt`, `_tide_emergency.selfdecrypt` |
   | Restricted clinical data | **Do not grant** `_tide_restricted.selfdecrypt` to any demo responder/admin |

   For the **single-account SDK exercise**, the responder needs all three selfencrypt roles so startup can seal the three synthetic records. A separate admin test account needs selfencrypt roles and **no selfdecrypt**. These permissions demonstrate tag access, not cross-user delegation. In real mode the UI refuses to represent a paramedic session as a rogue admin; use a separate browser profile/account. A caught SDK error is displayed verbatim, but may be an authentication or network error, so the UI does not automatically attribute it to consensus denial.

7. Export the **real Tide adapter** from Apps → your app → Credentials → Tide adapter. Save as `data/tidecloak.json`. It must include `realm`, `resource`, `auth-server-url`, embedded `jwk`, `vendorId`, and `homeOrkUrl`, and must not contain a client secret. Do not hand-build this file or substitute remote JWKS.
8. Restart `npm run dev`. The app selects the real SDK path when the adapter is valid. Authentication is required before encrypting startup data. A failed live connection is not silently replaced by simulation. `/?mode=simulation` explicitly opens the labeled simulation instead.

The local startup helper supports `TIDECLOAK_DOCKER_EXE` if Docker is outside PATH. The real adapter and local secrets are Git-ignored. To stop TideCloak without deleting data, run `docker compose --env-file .env.local -f compose.tidecloak.yml stop`.

## Deploy the website to Vercel

### Recommended: import GitHub repository

1. Sign in to [Vercel](https://vercel.com/new) with GitHub.
2. Import **Mhoaii/RMIT_HACK-StrokeSOS** and allow the Vercel GitHub integration to access this private repository.
3. Use framework **Next.js**, repository root `.`, Node.js **24.x** (22.x is also supported), install command `npm ci`, and build command `npm run build`. Leave the output directory on the framework default. `vercel.json` supplies the framework and commands.
4. For an immediately usable demo, **leave `CLIENT_ADAPTER` empty**. Click **Deploy**. Vercel builds and serves the labeled simulation on HTTPS; open the returned URL and run the demo flow above.
5. To enable real Tide on the hosted website, first provide an HTTPS TideCloak instance reachable by visitors. **A localhost:8080 service on your laptop is not a public authentication backend.** Keep local Tide for development; do not expose its development container or master-admin console directly to the internet.
6. Register the actual Vercel origin in Tide's Web Origins, valid redirects and logout redirects. Use the stable production/custom domain. Register preview domains individually if you need them; avoid broad wildcard origins. Export the adapter again if configuration changed.
7. In Vercel → project → Settings → Environment Variables, set `CLIENT_ADAPTER` to the full exported **public adapter JSON**. Select the intended Production/Preview environments. Do not put bootstrap passwords or license/operator credentials in Vercel.
8. **Redeploy** after changing environment variables; existing deployments retain their previous configuration. Open the new URL and test sign-in, encryption, permitted decrypt, real denial, and logout.

Every push to the linked production branch can trigger a deployment. The webcam is processed on the visitor's device. The pose model/WASM are served from your site after the build.

### Optional live copilot

Set server-only `ANTHROPIC_API_KEY` and `ANTHROPIC_MODEL` to a model available in your Anthropic account. Without both, the client labels responses as scripted. The API route verifies the real Tide token, `EMERGENCY_PARAMEDIC`, `_tide_emergency.selfdecrypt`, and a bound DPoP proof. Live requests are not authorized by the simulated identity.

On Vercel, also configure `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` for shared atomic DPoP replay protection. Without them, live LLM requests fail closed and the UI uses labeled fallback. Local development uses the template's in-memory replay cache. This is not production abuse/rate-limit protection; add quotas before enabling a publicly reachable paid API.

The client sends only decrypted `currentMeds`, `medicalHistory`, and `bloodType`, plus the question. It never sends stream keys, video, Tier 3, or ciphertext to the LLM. The server verifies identity/permissions but cannot independently prove that client-supplied context was decrypted by Tide or that the client's local emergency gates were satisfied. Do not use this synthetic demo endpoint for actual patient care.

## Validation

```powershell
npm run typecheck
npm test
npm run build
```

Tests cover all access preconditions, Dispatcher/Tier 3 boundaries, AES-GCM wrong-key/tamper rejection, independent vault keys, audit modification/reordering detection, and baseline pose behavior. Browser verification should additionally exercise fall → countdown → sign-in → decrypt → revoke, TTL expiry, role changes, camera errors, audit export and mobile layout. Real Tide assertions require a live enrolled realm; a passing build or simulation is not evidence of network policy enforcement.

## Source map and references

- `src/components/dashboard.tsx` — operations, post-recovery audit, architecture and setup UI
- `src/components/use-emergency.ts` — emergency state, decrypt lifecycle, late-response cancellation and audit queue
- `src/components/edge-camera.tsx` — off-DOM camera, pose inference and encrypted JPEG loop
- `src/components/auth-provider.tsx` — explicit Tide versus simulation boundary
- `src/lib/crypto.ts`, `src/lib/audit.ts`, `src/lib/pose.ts` — browser cryptography, audit and fall heuristic
- `src/app/api/triage/route.ts` — optional authenticated LLM route
- `src/lib/auth/verifyDpop.ts`, `next.config.ts` — adapted from Tide's official verified Next.js template

Primary documentation: [Tide quickstart](https://docs.tide.org/Admin/Quick-deploy-test), [Tide Next.js API reference](https://docs.tide.org/Languages/NextJS/tidecloak-nextjs-reference), [Tide MCP](https://docs.tide.org/ai-agent-pack), [MediaPipe web pose guide](https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker/web_js), [Next.js on Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs), [Vercel environment variables](https://vercel.com/docs/environment-variables), [Docker Windows installation](https://docs.docker.com/desktop/setup/install/windows-install/).

Tide's official remote MCP was queried with `tools/list` before integration. Its available names and the discovery helper are recorded in `docs/TIDE_MCP.md`; no local Tide MCP tool was initially connected to the chat.
