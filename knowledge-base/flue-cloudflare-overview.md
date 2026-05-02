# Fluency Flue + Cloudflare overview

Fluency is a Flue agent project deployed to Cloudflare Workers.

## Runtime stack

- Flue provides the agent harness: agents, sessions, roles, skills, tools, and sandbox abstraction.
- Cloudflare Workers hosts the HTTP runtime.
- Flue's Cloudflare target generates Worker routing for webhook agents.
- Durable Objects persist agent/session state on Cloudflare.
- Workers AI runs model inference through the Flue model provider.
- R2 stores the support knowledge base and is mounted as the agent filesystem through `getVirtualSandbox()`.

## Current live agents

- `concierge`: explains Cloudflare-native agent architecture and implementation decisions.
- `support`: searches this R2 knowledge base before answering support-style questions.

## Endpoint shape

Webhook agents are POST-only:

```txt
POST /agents/<agent-name>/<id>
```

The final path segment is the agent/session scope. Reuse the same id to continue the same persisted context; use a new id to start fresh.
