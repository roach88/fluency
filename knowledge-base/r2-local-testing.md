# R2 knowledge base local testing

The project uses a remote R2 binding for local Cloudflare dev:

```jsonc
"r2_buckets": [
  {
    "binding": "KNOWLEDGE_BASE",
    "bucket_name": "fluency-knowledge-base",
    "remote": true
  }
]
```

This means `npm run dev` talks to the real Cloudflare R2 bucket instead of local simulated storage. That is intentional for this project because the user chose R2-backed local testing instead of Docker/container sandboxes.

## Seed content

Run:

```bash
npm run kb:seed
```

This uploads files from `knowledge-base/` into the remote `fluency-knowledge-base` bucket using `wrangler r2 object put --remote`.

Verify one seeded object with:

```bash
npm run kb:get-overview
```

## Test support agent locally

Start the Cloudflare dev server:

```bash
npm run dev
```

Then call:

```bash
curl http://localhost:3583/agents/support/kb-test \
  -H "Content-Type: application/json" \
  -d '{"message":"What services does this Fluency agent use?"}'
```

Expected behavior: the support agent searches the mounted R2 knowledge base, cites Markdown paths, and returns structured JSON with `answer`, `sources`, and optionally `missing_information`.
