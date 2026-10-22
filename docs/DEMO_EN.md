# StrokeSOS demo guide — English

**Open:** https://rmit-hack-stroke-sos.vercel.app/

**Duration:** approximately two minutes.

**Vietnamese version:** [Hướng dẫn tiếng Việt](DEMO_VI.md).

## Before recording

1. Open the live site in Chrome/Edge. Use a desktop window, ideally 1920 × 1080. Close the setup dialog if it is open.
2. Keep **Demo mode** enabled: five-second response window, 60-second access lease. Standard mode uses 60 seconds / 15 minutes.
3. Refresh the page for a clean audit trail. Confirm the amber **TIDE AUTHORITY SIMULATED** label and that ciphertext appears in the middle panel.
4. Optionally click **Enable private camera**, grant permission, and stand where the camera can see your torso and legs. The normal view shows only a green skeleton. Do not perform a real fall; use the demo trigger.
5. If camera permission, lighting, hardware or inference fails, keep the camera off and use **Simulate fall**. The reference skeleton is labeled simulated. Unlocking still decrypts the synthetic record, but the video box correctly says camera offline.
6. Select **Emergency paramedic** in the simulated-role selector. Keep the pointer away from the reset control until the end.

The UI is in English in both guides; the Vietnamese guide translates the narration and explains the same English button labels.

## Two-minute walkthrough and narration

| Time | Action | Suggested narration |
| --- | --- | --- |
| 00:00–00:15 | Show the three panels and amber simulation label. | “StrokeSOS demonstrates privacy-first emergency response. Normal monitoring displays a skeleton instead of raw video. This public demo uses real browser AES-GCM encryption; Tide identity and emergency authority are explicitly simulated because real license activation is currently blocked.” |
| 00:15–00:30 | In the middle panel, click **Rogue admin: override & decrypt**. Optionally expand **Inspect actual result**. | “The database override changes to true, but the local demonstration policy still rejects clinical access. This illustrates the trust constraint; it is not a live Tide network rejection.” |
| 00:30–00:45 | Click **Simulate fall** or press **F** outside an input. Point to the five-second countdown and simulated heart rate. | “A simulated fall starts the patient response window. The edge signature, heart rate and mmWave sensor are simulated. A real camera can also run the experimental MediaPipe fall heuristic locally.” |
| 00:45–01:00 | Click **Demo sign in** if not already signed in. After the countdown reaches 00:00, click **Co-sign & request emergency decrypt**. | “The workflow requires the fall flag, an expired response window, and a paramedic demo identity. The request waits at least 1.5 seconds before showing the result.” |
| 01:00–01:15 | Show the unlocked emergency record and TTL. With a camera enabled, show the actual decrypted frames. | “Tier 2 is decrypted: blood type O-positive, Warfarin and relevant history. Camera frames are actually encrypted and decrypted with the unwrapped local stream key. Without a camera, the app reports camera offline rather than inventing video.” |
| 01:15–01:35 | Click **Test access** beside Tier 3. Ask **Can we administer tPA?** in the copilot, then click send. | “Private psychiatric, insurance and financial fields stay denied. The bounded copilot only receives unlocked emergency fields. The scripted response warns that Warfarin requires INR verification and the applicable stroke protocol; it does not make an absolute contraindication claim.” |
| 01:35–01:48 | Click **Close case & revoke access** before the 60-second lease ends. | “Closing the case immediately clears the responder record, key reference and chat, and stops the camera. This is local session revocation; it cannot erase plaintext someone already copied.” |
| 01:48–02:00 | Click **Patient audit**, then **Verify chain**. Optionally click **Export JSON**. | “The patient can inspect who requested which tier, the outcome, and expiry. These are real local SHA-256 chained events, explicitly labeled simulated receipts—not Tide-signed evidence.” |

The 60-second lease starts at successful decryption, so move to revoke promptly. If you speak for longer, automatic expiry re-locks the case; point to the **REVOKE / TTL expired automatically** event in the audit.

## Quick click sequence

**Rogue admin** → **Simulate fall** → wait 5 seconds → **Demo sign in** → **Co-sign** → **Test access** → ask about tPA → **Close case** → **Patient audit** → **Verify chain**.

To repeat: return to **Live operations**, click the reset icon **Start a new case**, and enable the camera again if desired. Refresh also resets the browser session and in-memory audit.

## If something interrupts the demo

- **Co-sign is disabled:** check all three condition indicators. The response window must reach zero; the selected role must be Emergency paramedic and signed in. A closed case needs a new case.
- **You accidentally cancel with “I'm okay”:** trigger a new simulated fall and wait again.
- **The lease expires:** show the automatic revoke event, then reset for another attempt.
- **No camera / no pose:** continue with the simulated fall and decrypted record. Do not describe the reference skeleton or offline video as live footage.
- **Copilot says access denied:** Tier 2 is still locked. Complete co-sign first. The locked response is an intended boundary.
- **Tier 3 denied:** this is the expected result. The public site uses a simulated authority policy.

## How to answer “Is this real TideCloak?”

“The source integrates the official Tide SDK using its documented login, roles, doEncrypt and doDecrypt APIs. Docker and a local TideCloak instance are installed, but Tide's real license finalization returned HTTP 500, so this public deployment remains explicitly simulated for Tide authority. Local AES-GCM encryption, optional MediaPipe inference and the audit hash chain are real. Hardware attestation, multi-party signing, cross-user emergency release and network-enforced lease revocation are not claimed.”

See [setup status](SETUP_STATUS.md) and the [README](../README.md) for the actual error and steps to resume setup. Do not remove the simulation label until real enrollment and network authorization tests succeed. Local TideCloak is not a public HTTPS backend for Vercel visitors.
