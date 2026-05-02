# flue-cloudflare-agent

A minimal Flue agent that runs on Cloudflare Workers and uses Cloudflare Workers AI.

## Links

- Flue website: https://flueframework.com/
- Flue launch post on X: https://x.com/FredKSchott/status/2050274923852210397
- Flue GitHub repository: https://github.com/withastro/flue

## Stack

- Flue root workspace layout: `agents/` and `roles/`
- Cloudflare Workers deploy target
- Flue Cloudflare routing and Durable Object-backed session persistence
- Cloudflare Workers AI model: `cloudflare-workers-ai/@cf/moonshotai/kimi-k2.6`
- Optional Cloudflare Sandbox dependency: `@cloudflare/sandbox`
- Optional R2-backed virtual knowledge-base pattern via `getVirtualSandbox()`

Workers AI is used directly instead of AI Gateway for this starter because it keeps the first deploy fully Cloudflare-native and avoids requiring a separate Gateway ID. If you later want gateway observability, caching, or provider routing, switch the model to a `cloudflare-ai-gateway/...` model and add `CLOUDFLARE_GATEWAY_ID`.

## Setup

```bash
cp .env.example .env
# Fill in CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_KEY yourself.
npm run build
npm run dev
```

Useful local checks:

```bash
npm run flue:help
npm run cf:whoami
npm run sandbox:check  # requires Docker for Cloudflare Sandbox local dev
```

Official Flue patterns and Cloudflare examples are documented in:

- `OFFICIAL_FLUE_EXAMPLES.md`
- `examples/official-flue-patterns/support-r2/`
- `examples/official-flue-patterns/cloudflare-sandbox/`

Note: R2-backed knowledge-base functionality requires R2 to be enabled on the Cloudflare account before creating the bucket. Cloudflare Sandbox local development requires Docker to be running.

In another shell:

```bash
curl http://localhost:3583/agents/concierge/demo-session \
  -H "Content-Type: application/json" \
  -d '{"topic":"how this Flue agent runs on Cloudflare","tone":"direct"}'
```

Deploy:

```bash
npm run deploy
```

After deploy, call:

```bash
curl https://flue-cloudflare-agent.<your-workers-subdomain>.workers.dev/agents/concierge/demo-session \
  -H "Content-Type: application/json" \
  -d '{"topic":"Workers AI vs AI Gateway","tone":"practical"}'
```
