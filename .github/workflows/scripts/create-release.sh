#!/usr/bin/env bash
set -euo pipefail

VERSION=$(jq -r .version deno.json)
TAG="v${VERSION}"

# A dispatch repeated for the same version no-ops in deno publish, so the release skips too
# instead of failing the run on a duplicate tag.
if git rev-parse -q --verify "refs/tags/${TAG}" >/dev/null; then
  echo "Tag ${TAG} already exists, skipping release"
  exit 0
fi

PREV_TAG=$(git describe --tags --match 'v*' --exclude "${TAG}" --abbrev=0 2>/dev/null || echo "")
RANGE="${PREV_TAG:+$PREV_TAG..HEAD}"
NOTES=$(git log ${RANGE:-HEAD} --oneline)

# An empty range (previous tag already at HEAD) yields no commits;
# fall back to HEAD so the release body still renders a commit instead of empty.
NOTES=${NOTES:-$(git log -1 HEAD --oneline)}

gh release create "${TAG}" \
  --title "${TAG}" \
  --notes "${NOTES}"
