#!/usr/bin/env bash
set -euo pipefail

LATEST_TAG=$(git describe --tags --match '[0-9]*' --abbrev=0 2>/dev/null || echo "0.0.0")
CURRENT=$(jq -r .version deno.json)

# A deno.json ahead of the latest tag is a manual major or minor bump, published as written.
HIGHEST=$(printf '%s\n%s\n' "$LATEST_TAG" "$CURRENT" | sort -V | tail -1)
if [ "$HIGHEST" = "$CURRENT" ] && [ "$CURRENT" != "$LATEST_TAG" ]; then
  echo "Version ${CURRENT} is a manual bump past ${LATEST_TAG}, keeping it"
  exit 0
fi

# Every merge without a manual bump publishes as the next patch over the latest tag.
IFS=. read -r MAJOR MINOR PATCH <<<"$LATEST_TAG"
NEXT="${MAJOR}.${MINOR}.$((PATCH + 1))"
echo "Auto-incrementing ${LATEST_TAG} to ${NEXT}"

jq --arg v "$NEXT" '.version = $v' deno.json > deno.json.tmp
mv deno.json.tmp deno.json

git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
git add deno.json
git commit -m "chore: bump to ${NEXT}"
git push
