# Verified setup status — 2026-10-22

- GitHub: private repository `Mhoaii/RMIT_HACK-StrokeSOS`, source pushed to `main`.
- Vercel: deployed successfully on the existing Hobby account. Production URL: https://rmit-hack-stroke-sos.vercel.app/ . No server secrets or local operator credentials were uploaded.
- App: labeled simulation works with real local AES-GCM. Production build and TypeScript passed. Six unit tests passed. Browser verification covered startup encryption, admin denial, locked copilot, fall/countdown, paramedic demo sign-in, decrypt, Tier 3 denial, automatic TTL re-lock, and local audit verification.
- Docker Desktop: official signed installer used; installed under `F:\RMIT\Track2\tools\docker`. WSL disk requested under `F:\RMIT\Track2\tools\docker-data`. Windows/temp components may still use C:.
- Local TideCloak: official `tideorg/tidecloak-dev:latest`, persistent named volume, listening only on localhost:8080. A one-shot volume-owner initialization fixes the image's observed H2 directory permission issue.
- Realm: `zero-spyware-edge` and public DPoP client `zero-spyware-edge-client` created from Tide's verified template, with independent telemetry/emergency/restricted roles and no default clinical decryption.
- Secrets: generated master-admin password and operator-provided license details exist only in ignored `.env.local`. Bootstrap progress is in ignored `data/bootstrap-state.json`.

## External blocker to real Tide activation

The real form-encoded `POST /admin/realms/zero-spyware-edge/vendorResources/setUpTideRealm` request reached the free-tier licensing path, then failed:

```text
HTTP 500 / TIDE-IDPEXT-VENDOR-KEYGEN_FAILED
The vendor key was created but the license could not be set up.
Server diagnostic: Midgard.FinalizeWallet returned HTTP 500.
```

One retry returned `HTTP 500 / TIDE-IDPEXT-VENDOR-REALM_SETUP_FAILED`. The realm was preserved. No fabricated adapter, license success, enrollment link, signed receipt, or decrypt success was substituted. IGA/account enrollment/export were not advanced past the failed prerequisite.

Resolve the licensing/finalization failure through [Tide support](mailto:info@tide.org) or the Tide console before retrying. Support should receive the error codes and relevant redacted container logs, never the local master-admin password. No support message was sent automatically.

The setup helper stores a failed license result and refuses automatic repeated attempts. After the underlying issue is resolved, an explicit `npm run tide:bootstrap -- --retry-license` resumes the same state. If Tide advises a different recovery, follow that documented procedure; do not delete the partial realm or make new realms repeatedly.

After licensing succeeds, complete the admin and paramedic enrollment links yourself, run `npm run tide:finish`, and perform real login/encrypt/deny/decrypt tests locally. Vercel visitors still need a separately reachable HTTPS TideCloak deployment; the laptop's localhost service is not that backend.
