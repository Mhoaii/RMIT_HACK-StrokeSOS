# Verified Tide API discovery

Initial session inventory contained **no Tide MCP tools**. Plugin discovery returned no Tide integration. The official documented endpoint `https://mcp.tide.org/mcp` was then queried directly with JSON-RPC `initialize` and `tools/list` using the project-local `scripts/tide-discovery.mjs` helper.

Available tool names returned on 2026-10-22:

`tide_list`, `tide_canon`, `tide_playbook`, `tide_skill`, `tide_prompt`, `tide_adapter`, `tide_list_scenarios`, `tide_scenario`, `tide_scenario_manifest`, `tide_scenario_roles`, `tide_scenario_bootstrap`, `tide_choose_scenario`, `tide_choose_playbook`, `tide_security_analysis`, `tide_blast_radius`, `tide_hosting`, `tide_dpop_asset`, `tide_onboarding`, `tide_branding`, `tide_scaffold`, `tide_doctor`, `tide_gaps`.

The exact live catalog can be refreshed with `node scripts/tide-discovery.mjs`. Read-only calls to `tide_hosting` and `tide_scaffold` (`nextjs-e2ee-vault`) supplied the hosting prerequisites and template. The official Next.js quickstart and API reference were also read. The pack's Next.js auth configuration, DPoP verifier and callback handler were used as reference source; the exact installed SDK DPoP asset is copied on setup/build.

Real SDK surface used: `TideCloakProvider`, `useTideCloak`, `login`, `logout`, `hasRealmRole`, `hasClientRole`, `getValueFromToken`, `doEncrypt([{data,tags}])`, `doDecrypt([{encrypted,tags}])`, `secureFetch`, `useAuthCallback`, and server `verifyTideCloakToken`. SDK return shapes were checked against installed type declarations.

The crypto helpers do not expose a signed decryption receipt through the surface used here. The app therefore marks its local hash-chain as a simulated receipt. No undocumented method is invented for emergency policy consensus, cross-user delegation, network revoke, attestation signing, or hardware verification.
