# Official Flue repo notes and Cloudflare examples

Source explored: https://github.com/withastro/flue

Flue describes itself as an agent harness framework: a TypeScript runtime where the orchestration is code, while most of the agent behavior lives in Markdown (`AGENTS.md`, roles, and skills). The official repo is organized around three core packages and a few examples:

- `@flue/sdk`: core runtime, sessions, tools, skills, build system, Cloudflare helpers.
- `@flue/cli`: `flue dev`, `flue run`, and `flue build`.
- `@flue/connectors`: adapters for third-party sandbox providers.
- `examples/hello-world`: small examples for prompts, roles, skills, tools, commands, child sessions, session persistence, and sandbox behavior.
- `examples/assistant`: Cloudflare Sandbox example using `@cloudflare/sandbox`, a Durable Object binding, and a container image.

This repo keeps the production starter intentionally small: `agents/concierge.ts` is the live deployed agent. The examples below are reference patterns in `examples/official-flue-patterns/` so they do not change the live Worker surface or require paid/optional Cloudflare resources until we explicitly opt in.

## Official patterns worth copying

### 1. Webhook agents

Every HTTP-invoked Flue agent exports a webhook trigger:

```ts
export const triggers = { webhook: true };
```

Flue serves it at:

```txt
POST /agents/<agent-file-name>/<agent-id>
```

The current live example is:

```txt
POST /agents/concierge/demo-session
```

The last path segment is the stable runtime/session scope. Reuse the same ID to preserve session history and sandbox/filesystem state. Use a new ID to start fresh.

### 2. Typed structured outputs

Official examples use Valibot schemas with `session.prompt(..., { result })`. This gives Flue a typed result contract instead of freeform text.

```ts
const result = await session.prompt('What is 2 + 2? Return only the number.', {
  result: v.object({ answer: v.number() }),
});
```

The current `concierge` agent already follows this pattern.

### 3. Roles

Roles live in `roles/*.md` in this repo's root Flue workspace layout. Official examples call them by basename:

```ts
await session.prompt('Greet Tyler.', { role: 'greeter' });
```

Add a new role when you want a reusable persona or behavioral mode, not when you need runtime logic.

### 4. Skills

Skills live under `.agents/skills/<name>/SKILL.md` and are invoked from a session:

```ts
await session.skill('greet', {
  args: { name: 'Tyler' },
  result: v.object({ greeting: v.string() }),
});
```

Use skills for multi-step repeatable workflows that should be discoverable by agents, especially if the instructions are better as Markdown than TypeScript.

### 5. Virtual sandbox + R2 knowledge base

The official README shows a Cloudflare-native support-agent pattern:

- Store support articles and skills in an R2 bucket.
- Mount that R2 bucket as a virtual filesystem with `getVirtualSandbox(env.KNOWLEDGE_BASE)`.
- Let the agent use its built-in file tools (`grep`, `glob`, `read`, shell) to search docs.
- Keep inference on Workers AI if we want a fully Cloudflare-native starter.

Example file in this repo:

```txt
examples/official-flue-patterns/support-r2/agents/support.ts
```

This is not active yet because R2 is not enabled on the Cloudflare account. `wrangler r2 bucket list` currently returns Cloudflare API code `10042`: "Please enable R2 through the Cloudflare Dashboard."

Once R2 is enabled, the activation steps are:

```bash
npx wrangler r2 bucket create fluency-knowledge-base
# Add the r2_buckets snippet from examples/official-flue-patterns/support-r2/wrangler.snippet.jsonc to wrangler.jsonc.
# Copy/adapt support.ts into agents/support.ts.
npm run build
npm run deploy
```

Then call:

```bash
curl https://flue-cloudflare-agent.<your-workers-subdomain>.workers.dev/agents/support/customer-123 \
  -H "Content-Type: application/json" \
  -d '{"message":"How does the Cloudflare Flue harness persist sessions?"}'
```

### 6. Cloudflare Sandbox container

The official `examples/assistant` app uses Cloudflare Sandbox for a real container-backed Linux environment:

- Runtime dependency: `@cloudflare/sandbox`.
- Worker code calls `getSandbox(env.Sandbox, id)`.
- Worker entry must export the Sandbox Durable Object class; Flue's generated Worker handles this automatically when the Wrangler config has a DO binding whose class ends with `Sandbox`.
- `wrangler.jsonc` includes a Durable Object binding, migration, and `containers` image pointing at a Dockerfile.

Example files in this repo:

```txt
examples/official-flue-patterns/cloudflare-sandbox/agents/sandbox-assistant.ts
examples/official-flue-patterns/cloudflare-sandbox/Dockerfile
examples/official-flue-patterns/cloudflare-sandbox/wrangler.snippet.jsonc
```

Local Cloudflare Sandbox development requires Docker. Docker is not currently available in this shell (`docker info` failed), so the dependency is installed but local container testing is blocked until Docker is running.

Activation steps when ready:

```bash
# Ensure Docker Desktop is running locally.
docker info

# Add the Cloudflare Sandbox wrangler snippet to wrangler.jsonc.
# Copy/adapt sandbox-assistant.ts into agents/sandbox-assistant.ts.
npm run build
npm run deploy
```

Then call:

```bash
curl https://flue-cloudflare-agent.<your-workers-subdomain>.workers.dev/agents/sandbox-assistant/devbox-1 \
  -H "Content-Type: application/json" \
  -d '{"message":"Create a small Python script and run it."}'
```

## Installed tooling status

Installed in this repo:

- `@flue/cli`: provides `npx flue dev`, `npx flue run`, and `npx flue build`.
- `wrangler`: Cloudflare Workers CLI.
- `@cloudflare/sandbox`: Cloudflare Sandbox SDK.
- `@cloudflare/workers-types`: Worker/binding TypeScript types.

Verified commands:

```bash
npx flue --help
npx wrangler --version
node -e "console.log(require('./node_modules/@cloudflare/sandbox/package.json').version)"
```

Current observed versions:

- Flue CLI: `0.3.6`
- Wrangler: `4.87.0`
- Cloudflare Sandbox SDK: `0.9.2`

## Recommended next implementation order

1. Keep `concierge` as the stable, always-deployable baseline.
2. Enable R2 in the Cloudflare Dashboard.
3. Turn the R2 support example into a live `agents/support.ts` endpoint.
4. Seed `fluency-knowledge-base` with Markdown articles and skills.
5. Once Docker and Cloudflare Containers are available, turn on the Cloudflare Sandbox assistant as a separate endpoint.
6. Add AI Gateway later only if we need observability, provider routing, caching, or model fallback. Workers AI remains the simplest Cloudflare-native path for now.
