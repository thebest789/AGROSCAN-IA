---
name: Pl@ntNet proxy boundary
description: Security and transport decision for the plant-analysis integration.
---

The browser must never receive the Pl@ntNet API key. AgroScan IA sends a validated image data URL to the server, where it is converted to multipart form data and forwarded with the key and fixed query parameters.

**Why:** Keeping provider credentials and provider-specific request formatting server-side prevents accidental exposure and keeps the UI contract stable.

**How to apply:** Preserve the server proxy boundary for future provider changes; add credentials only through Replit Secrets under `PLANTNET_API_KEY`.