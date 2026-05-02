# Flue Harness Notes

These notes explain how this Flue agent project is structured, how the harness works, and where to add new behavior.

Project root:

```text
/Users/tyler/dev/agents/flue-cloudflare-agent
```

Current important files:

```text
agents/concierge.ts
roles/cloudflare-concierge.md
AGENTS.md
wrangler.jsonc
package.json
.env
README.md
```

## Short Version

Flue is not just an LLM API wrapper. It is a harness around an agent runtime.

Your TypeScript agent file decides:

- how the agent is invoked
- which model it uses
- which sandbox it gets
- which tools it gets
- which roles or skills it uses
- what prompt or workflow it runs
- what structured result it returns

Cloudflare is the hosting layer:

- Cloudflare Workers: public HTTP runtime
- Durable Objects: persistent per-agent/session state
- Workers AI: model inference provider
- Wrangler: deployment tool

## How a Request Flows

When you call:

```text
POST /agents/concierge/demo-session
```

Flue roughly does this:

1. Cloudflare Worker receives the request.
2. Flue router parses the path: `/agents/<agent-name>/<id>`.
3. `agent-name = concierge`.
4. `id = demo-session`.
5. Flue finds `agents/concierge.ts`.
6. Flue routes the request to a Durable Object instance for that agent/id.
7. The exported default function in the agent file runs.
8. The handler calls `init({ model })`.
9. `init` creates the agent runtime: model, sandbox, tools, roles, and session storage.
10. `agent.session()` opens the persisted conversation/session.
11. `session.prompt(...)` sends work to the model.
12. Valibot validates the result shape.
13. Structured JSON returns to the HTTP caller.

## Current Agent File

Main file:

```text
agents/concierge.ts
```

Current shape:

```ts
const MODEL_ID = 'cloudflare-workers-ai/@cf/moonshotai/kimi-k2.6';

export const triggers = { webhook: true };

export default async function ({ init, payload }: FlueContext) {
  const agent = await init({ model: MODEL_ID });
  const session = await agent.session();

  return await session.prompt(...);
}
```

### MODEL_ID

The model is currently:

```text
cloudflare-workers-ai/@cf/moonshotai/kimi-k2.6
```

This uses Cloudflare Workers AI directly.

If you later want AI Gateway observability, caching, or routing, change this to a `cloudflare-ai-gateway/...` model and add `CLOUDFLARE_GATEWAY_ID` to `.env`.

### triggers

```ts
export const triggers = { webhook: true };
```

This tells Flue to expose the agent over HTTP.

For this file:

```text
agents/concierge.ts
```

Flue exposes:

```text
POST /agents/concierge/<session-id>
```

If you create:

```text
agents/researcher.ts
```

with `triggers = { webhook: true }`, Flue exposes:

```text
POST /agents/researcher/<session-id>
```

### payload

`payload` is the request body from curl/fetch.

Example request:

```json
{
  "topic": "how this Flue agent runs on Cloudflare",
  "tone": "direct"
}
```

The agent receives this as:

```ts
payload.topic
payload.tone
```

This is where you define your endpoint's API contract.

### init(...)

`init` creates the agent runtime.

Current code:

```ts
const agent = await init({ model: MODEL_ID });
```

That means:

- default virtual sandbox
- Workers AI model
- no extra tools
- no R2 filesystem
- no container
- no MCP tools

Later you can pass more to `init`, such as:

- `sandbox`
- `tools`
- `role`
- `cwd`
- model overrides

### session

```ts
const session = await agent.session();
```

A session is the conversation state. On Cloudflare, Flue persists this state with Durable Objects.

The URL id scopes the persistent agent/session state:

```text
/agents/concierge/demo-session
```

`demo-session` is a stable identity. Reusing it continues the same state. A different id starts a separate stateful instance.

Key idea:

```text
agent file = behavior definition
agent id in URL = stateful runtime identity
session = conversation/history inside that runtime
```

### prompt

```ts
await session.prompt("...")
```

This sends a task/message to the harnessed agent.

The current prompt includes:

- an instruction string
- a role
- a result schema

### result schema

The project uses Valibot to force structured output:

```ts
result: v.object({
  summary: v.string(),
  recommended_next_step: v.string(),
  cloudflare_services_used: v.array(v.string()),
})
```

This makes the HTTP endpoint return predictable JSON instead of free-form text.

## Where to Build Things

### 1. Add or Change Agent Behavior

Edit:

```text
agents/concierge.ts
```

Use this for:

- changing what the endpoint does
- changing the prompt
- changing payload fields
- returning a different schema
- choosing a different model
- choosing sandbox/tool setup
- calling subagents/tasks
- connecting external APIs or MCPs

Example directions:

- turn `concierge` into a support bot
- classify incoming issues
- generate project plans
- summarize URLs
- run multi-step research

### 2. Add a New Endpoint/Agent

Create another file under:

```text
agents/
```

Example:

```text
agents/summarizer.ts
```

Minimal shape:

```ts
import type { FlueContext } from '@flue/sdk/client';

export const triggers = { webhook: true };

export default async function ({ init, payload }: FlueContext) {
  const agent = await init({ model: 'cloudflare-workers-ai/@cf/moonshotai/kimi-k2.6' });
  const session = await agent.session();

  return await session.prompt(`Summarize this:\n\n${payload.text}`);
}
```

After build/deploy, it becomes:

```text
POST /agents/summarizer/<id>
```

### 3. Add Reusable Behavior/Persona Overlays

Use:

```text
roles/
```

Current role:

```text
roles/cloudflare-concierge.md
```

Roles are prompt overlays passed per call:

```ts
session.prompt("...", {
  role: "cloudflare-concierge",
})
```

Use roles for:

- tone
- expert persona
- behavioral constraints
- output standards
- security reviewer mode
- product strategist mode
- concise support agent mode

Possible layout:

```text
roles/
  support-triager.md
  code-reviewer.md
  researcher.md
  planner.md
```

### 4. Add Global Context

Use:

```text
AGENTS.md
```

This is like root system/project context for the agent's sandbox/workspace.

Use `AGENTS.md` for stable global guidance:

- what this project is
- house style
- default conventions
- what services to prefer
- what not to do

Do not put secrets in `AGENTS.md`.

### 5. Add Repeatable Agent Skills

Flue skills live in the sandbox under:

```text
.agents/skills/<name>/SKILL.md
```

Skills are reusable multi-step tasks, such as:

- triage this GitHub issue
- write a support answer
- research this topic
- generate release notes
- audit for security risks

Example:

```text
.agents/skills/greet/SKILL.md
```

```md
---
name: greet
description: Generate a greeting
---

Given the name provided in the arguments, generate a short friendly greeting.
```

Call from an agent:

```ts
const result = await session.skill('greet', {
  args: { name: payload.name },
});
```

Important distinction:

```text
roles = behavioral/persona overlay for a prompt
skills = reusable task/workflow the agent can execute
```

### 6. Add Cloudflare Resources

Edit:

```text
wrangler.jsonc
```

Use this for Cloudflare bindings:

- R2 buckets
- KV namespaces
- D1 databases
- Vectorize indexes
- Queues
- Durable Objects
- AI bindings
- environment variables
- observability

Current root `wrangler.jsonc` is intentionally minimal:

```jsonc
{
  "name": "flue-cloudflare-agent",
  "compatibility_date": "2026-05-02",
  "compatibility_flags": ["nodejs_compat"]
}
```

Flue automatically merges its own Durable Object config into:

```text
dist/wrangler.jsonc
```

That is why deploy showed:

```text
env.Concierge (Concierge) Durable Object
```

Rule of thumb:

- edit root `wrangler.jsonc`
- do not hand-edit `dist/wrangler.jsonc`
- run `npm run build`
- Flue regenerates `dist/wrangler.jsonc`
- Wrangler deploy uses the generated dist config

### 7. Add Secrets/Config

Use:

```text
.env
```

Current required values:

```env
CLOUDFLARE_ACCOUNT_ID="..."
CLOUDFLARE_API_KEY="..."
```

If later you add other providers/services, put secrets here, for example:

```env
GITHUB_TOKEN="..."
CLOUDFLARE_GATEWAY_ID="..."
SLACK_BOT_TOKEN="..."
```

Deploy with:

```bash
wrangler deploy --secrets-file .env
```

This project already wraps that in:

```bash
npm run deploy
```

Do not commit `.env`.

### 8. Add Dependencies

Use:

```text
package.json
```

Examples:

- add a parser
- add a Cloudflare SDK
- add an API client
- add `@cloudflare/sandbox` if moving to containers
- add validation helpers
- add test tooling

Then run:

```bash
npm install
npm run build
npm run deploy
```

## Key Flue Abstractions

### Agent

Defined by a file in `agents/`.

Example:

```text
agents/concierge.ts
```

It is the top-level program for one callable agent.

### Endpoint

Created automatically from agent filename if webhook trigger is enabled.

```text
agents/concierge.ts => /agents/concierge/<id>
```

### Id

The URL id gives you a stable runtime/session scope.

```text
POST /agents/concierge/demo-session
```

`demo-session` is not just cosmetic. It decides what state/conversation you are continuing.

### Session

A conversation/history inside the agent runtime.

```ts
const session = await agent.session();
```

You can also use named sessions for separate threads inside one agent identity.

### Prompt

A single task/message to the agent.

```ts
await session.prompt("...")
```

### Skill

A reusable Markdown-defined task.

```ts
await session.skill("triage", { args: {...} })
```

### Role

A behavior overlay.

```ts
await session.prompt("...", { role: "reviewer" })
```

### Sandbox

The filesystem/shell/tools available to the agent.

Options:

1. Default virtual sandbox: simple and fast.
2. Virtual sandbox with `session.shell()` setup: good for small files/context.
3. R2-backed virtual sandbox: persistent searchable docs/knowledge base.
4. Cloudflare container sandbox: full Linux environment for coding agents.

## What This Project Has Now

This project currently has the simplest production-capable Cloudflare setup:

- one webhook agent: `concierge`
- default virtual sandbox
- one role
- Workers AI model
- Durable Object-backed session persistence
- structured JSON result

This is a good starter shape.

## Possible Next Iteration

A useful next step would be turning this generic concierge into a small multi-agent harness demo:

1. Keep `agents/concierge.ts` as the general endpoint.
2. Add `agents/research.ts` for structured research briefs.
3. Add `roles/researcher.md`.
4. Add `.agents/skills/research-brief/SKILL.md`.
5. Make the result schema return:
   - `answer`
   - `assumptions`
   - `sources_needed`
   - `next_actions`
6. Later add R2 as a knowledge base.

This would exercise the three main extension points:

- TypeScript orchestration in `agents/`
- prompt behavior in `roles/`
- reusable workflows in `.agents/skills/`

## Example Richer Layout

```text
agents/
  concierge.ts          # general helper endpoint
  support.ts            # R2-backed docs support agent
  triage.ts             # issue triage endpoint
  researcher.ts         # research/report endpoint

roles/
  cloudflare-concierge.md
  support-triager.md
  strict-json-reporter.md
  security-reviewer.md

.agents/
  skills/
    support-answer/
      SKILL.md
    issue-triage/
      SKILL.md
    research-brief/
      SKILL.md

wrangler.jsonc          # Cloudflare bindings
AGENTS.md               # global project context
.env                    # local/deploy secrets, uncommitted
```

## Development Loop

Local change:

```bash
edit agents/concierge.ts
```

Validate:

```bash
npm run typecheck
npm run build
```

Run locally:

```bash
npm run dev
```

Test locally:

```bash
curl http://localhost:3583/agents/concierge/demo-session \
  -H "Content-Type: application/json" \
  -d '{"topic":"test","tone":"direct"}'
```

Deploy:

```bash
npm run deploy
```

Test production:

```bash
curl https://flue-cloudflare-agent.tyler-r-barstow.workers.dev/agents/concierge/demo-session \
  -H "Content-Type: application/json" \
  -d '{"topic":"test","tone":"direct"}'
```
