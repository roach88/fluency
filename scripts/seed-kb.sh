#!/usr/bin/env bash
set -euo pipefail

BUCKET="fluency-knowledge-base"
ROOT="knowledge-base"

if [[ ! -d "$ROOT" ]]; then
  echo "Missing $ROOT directory" >&2
  exit 1
fi

while IFS= read -r file; do
  key="${file#${ROOT}/}"
  echo "Uploading $file -> r2://$BUCKET/$key"
  npx wrangler r2 object put "$BUCKET/$key" --remote --content-type "text/markdown; charset=utf-8" --file "$file"
done < <(find "$ROOT" -type f -name '*.md' | sort)
