# flue-cloudflare-agent

A minimal Flue agent that runs on Cloudflare Workers and uses Cloudflare Workers AI.

## Stack

- Flue root workspace layout: `agents/` and `roles/`
- Cloudflare Workers deploy target
- Flue Cloudflare routing and Durable Object-backed session persistence
- Cloudflare Workers AI model: `cloudflare-workers-ai/@cf/moonshotai/kimi-k2.6`

Workers AI is used directly instead of AI Gateway for this starter because it keeps the first deploy fully Cloudflare-native and avoids requiring a separate Gateway ID. If you later want gateway observability, caching, or provider routing, switch the model to a `cloudflare-ai-gateway/...` model and add `CLOUDFLARE_GATEWAY_ID`.

## Setup

```bash
cp .env.example .env
# Fill in CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_KEY yourself.
npm run build
npm run dev
```

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
