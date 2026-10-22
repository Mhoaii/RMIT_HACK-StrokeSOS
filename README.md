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

For setup, deployment, demo instructions, and implementation details, see [guide.md](guide.md).
