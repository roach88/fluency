import { getVirtualSandbox } from '@flue/sdk/cloudflare';
import type { FlueContext } from '@flue/sdk/client';

export const triggers = { webhook: true };

const SEED_FILES: Record<string, string> = {
  'flue-cloudflare-overview.md': `# Fluency Flue + Cloudflare overview

Fluency is a Flue agent project deployed to Cloudflare Workers.

## Runtime stack

- Flue provides the agent harness: agents, sessions, roles, skills, tools, and sandbox abstraction.
- Cloudflare Workers hosts the HTTP runtime.
- Flue's Cloudflare target generates Worker routing for webhook agents.
- Durable Objects persist agent/session state on Cloudflare.
- Workers AI runs model inference through the Flue model provider.
- R2 stores the support knowledge base and is mounted as the agent filesystem through getVirtualSandbox().

## Current live agents

- concierge: explains Cloudflare-native agent architecture and implementation decisions.
- support: searches this R2 knowledge base before answering support-style questions.
`,
  'r2-local-testing.md': `# R2 knowledge base local testing

The project uses a remote R2 binding for local Cloudflare dev. The KNOWLEDGE_BASE binding points at the fluency-knowledge-base bucket and has remote: true in wrangler.jsonc.

This means npm run dev talks to the real Cloudflare R2 bucket instead of local simulated storage. That is intentional because the local knowledge-base workflow uses R2 instead of Docker or Cloudflare Sandbox containers.

Useful commands:

- npm run kb:seed uploads seed Markdown files with Wrangler.
- npm run kb:get-overview verifies one remote R2 object.
- npm run kb:test calls the local support endpoint.
`,
};

function shellQuote(value: string) {
  return `'${value.replace(/'/g, `'"'"'`)}'`;
}

/**
 * R2-backed knowledge-base support agent.
 *
 * The `KNOWLEDGE_BASE` R2 bucket is mounted as a virtual filesystem. In local
 * dev this repo intentionally uses `remote: true` on the R2 binding so the
 * Cloudflare-hosted bucket is used instead of Docker/container sandboxes.
 */
export default async function ({ init, payload, env }: FlueContext) {
  const sandbox = await getVirtualSandbox(env.KNOWLEDGE_BASE);

  const agent = await init({
    sandbox,
    model: 'cloudflare-workers-ai/@cf/moonshotai/kimi-k2.6',
  });
  const session = await agent.session();

  try {
    await session.shell('mkdir -p /workspace');
    for (const [path, content] of Object.entries(SEED_FILES)) {
      await session.shell(`printf %s ${shellQuote(content)} > /workspace/${path}`);
    }

    const inventory = await session.shell('find /workspace -maxdepth 2 -type f | sort');

    const response = await session.prompt(
      `You are a Cloudflare-native support agent.

The R2-backed knowledge base is mounted at /workspace. Current files:
${inventory.stdout.trim() || '(no files found)'}

Search the mounted R2 knowledge base before answering. Cite the file names or
paths that informed your answer. If the knowledge base does not contain enough
information, say so and suggest the next Markdown article to add.

Customer request:
${payload.message ?? 'Explain what this support agent can do.'}`,
      { role: 'support-triager' },
    );

    return {
      answer: response.text,
      sources: inventory.stdout
        .split('\n')
        .map((path) => path.trim())
        .filter(Boolean),
    };
  } catch (error) {
    return {
      answer: `The support agent could not access the R2-backed virtual knowledge base: ${error instanceof Error ? error.message : String(error)}`,
      sources: [],
      missing_information:
        'Verify the KNOWLEDGE_BASE R2 binding, the fluency-knowledge-base bucket, and Cloudflare local remote binding support.',
    };
  }
}
