# Fluency knowledge base seed

This directory contains seed Markdown files for the `fluency-knowledge-base` R2 bucket.

Upload all files with:

```bash
npm run kb:seed
```

The live support agent mounts that bucket with `getVirtualSandbox(env.KNOWLEDGE_BASE)` and can search these Markdown files through its filesystem tools.
