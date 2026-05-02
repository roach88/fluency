import { getSandbox } from '@cloudflare/sandbox';
import type { FlueContext } from '@flue/sdk/client';
import * as v from 'valibot';

export const triggers = { webhook: true };

/**
 * Container-backed Cloudflare Sandbox assistant.
 *
 * Activation requirements:
 * - Add @cloudflare/sandbox.
 * - Add Durable Object + containers config from wrangler.snippet.jsonc.
 * - Copy this file to agents/sandbox-assistant.ts.
 * - Ensure Docker is available for local dev.
 */
export default async function ({ init, id, env, payload }: FlueContext) {
  const sandbox = getSandbox(env.Sandbox, id);
  const agent = await init({
    sandbox,
    model: 'cloudflare-workers-ai/@cf/moonshotai/kimi-k2.6',
  });
  const session = await agent.session();

  const response = await session.prompt(
    payload.message ??
      'Inspect the sandbox, report the OS, Node version, Python version, and current working directory.',
    {
      result: v.object({
        summary: v.string(),
        commands_run: v.array(v.string()),
        files_changed: v.array(v.string()),
      }),
    },
  );

  return response;
}
