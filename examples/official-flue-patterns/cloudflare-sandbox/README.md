# Cloudflare Sandbox pattern

This example mirrors the official `withastro/flue` `examples/assistant` pattern.

Use it when the agent needs a real Linux container instead of Flue's fast virtual sandbox. Good fits:

- cloning repositories
- running language/package-manager tooling
- long-lived shell state
- code execution that needs system packages
- previewing small services from inside the sandbox

Activation checklist:

1. Install dependency: `npm install @cloudflare/sandbox` (already done in this repo).
2. Ensure Docker is running for local development: `docker info`.
3. Add `wrangler.snippet.jsonc` content to the root `wrangler.jsonc`.
4. Copy `agents/sandbox-assistant.ts` to root `agents/sandbox-assistant.ts`.
5. Copy `Dockerfile` to a stable path and ensure the Wrangler `containers[].image` path points at it.
6. Run `npm run build`.
7. Deploy with `npm run deploy`.

The live starter does not enable this by default because Cloudflare Containers/Sandbox is optional infrastructure and Docker is not currently available in this shell.
