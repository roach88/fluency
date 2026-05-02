import { getVirtualSandbox } from '@flue/sdk/cloudflare';
import type { FlueContext } from '@flue/sdk/client';
import * as v from 'valibot';

export const triggers = { webhook: true };

/**
 * R2-backed support agent pattern from the official Flue README.
 *
 * Activation requirements:
 * - Enable R2 in Cloudflare Dashboard.
 * - Create an R2 bucket, e.g. `npx wrangler r2 bucket create fluency-knowledge-base`.
 * - Add the R2 binding from wrangler.snippet.jsonc to the root wrangler.jsonc.
 * - Copy this file to agents/support.ts.
 *
 * The bucket is mounted as a virtual filesystem. The agent can then search
 * Markdown support articles and skills using its built-in file/shell tools.
 */
export default async function ({ init, payload, env }: FlueContext) {
  const sandbox = await getVirtualSandbox(env.KNOWLEDGE_BASE, {
    prefix: payload.customerId ? `customers/${payload.customerId}/` : undefined,
  });

  const agent = await init({
    sandbox,
    model: 'cloudflare-workers-ai/@cf/moonshotai/kimi-k2.6',
  });
  const session = await agent.session();

  return await session.prompt(
    `You are a Cloudflare-native support agent.

Search the mounted knowledge base before answering. Cite the file names or paths
that informed your answer. If the knowledge base does not contain enough
information, say so and suggest the next article to add.

Customer request:
${payload.message ?? 'Explain what this support agent can do.'}`,
    {
      role: 'support-triager',
      result: v.object({
        answer: v.string(),
        sources: v.array(v.string()),
        missing_information: v.optional(v.string()),
      }),
    },
  );
}
