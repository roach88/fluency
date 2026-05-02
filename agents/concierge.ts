import type { FlueContext } from '@flue/sdk/client';
import * as v from 'valibot';

const MODEL_ID = 'cloudflare-workers-ai/@cf/moonshotai/kimi-k2.6';

export const triggers = { webhook: true };

export default async function ({ init, payload }: FlueContext) {
  const agent = await init({ model: MODEL_ID });
  const session = await agent.session();

  const topic = typeof payload?.topic === 'string' && payload.topic.trim().length > 0
    ? payload.topic.trim()
    : 'Cloudflare Workers agents';

  const tone = typeof payload?.tone === 'string' && payload.tone.trim().length > 0
    ? payload.tone.trim()
    : 'clear, practical, and concise';

  return await session.prompt(
    `You are a Cloudflare-native concierge agent running in Flue on Cloudflare Workers.

Explain the topic for a developer and return a compact action-oriented response.

Topic: ${topic}
Tone: ${tone}`,
    {
      role: 'cloudflare-concierge',
      result: v.object({
        summary: v.string(),
        recommended_next_step: v.string(),
        cloudflare_services_used: v.array(v.string()),
      }),
    },
  );
}
