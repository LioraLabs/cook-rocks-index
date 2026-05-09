#!/usr/bin/env bash
# Force-push a single-commit snapshot of HEAD's tree to the GitHub mirror.
#
# Gitea is canonical with full history; GitHub holds one orphan commit per
# publish so Cloudflare Pages always sees the current state without history
# bloat. Each invocation replaces the remote branch.
set -euo pipefail

REMOTE="${1:-github}"
BRANCH="${2:-main}"

if ! git rev-parse --git-dir >/dev/null 2>&1; then
  echo "error: not inside a git repo" >&2
  exit 1
fi

if ! git remote get-url "$REMOTE" >/dev/null 2>&1; then
  echo "error: no remote named '$REMOTE'. Add one with:" >&2
  echo "  git remote add $REMOTE git@github.com:liora-labs/cook-rocks-index.git" >&2
  exit 1
fi

if ! git diff-index --quiet HEAD --; then
  echo "error: working tree has uncommitted changes. Commit to Gitea first." >&2
  exit 1
fi

TREE=$(git rev-parse HEAD^{tree})
SHORT=$(git rev-parse --short HEAD)
STAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)
COMMIT=$(git commit-tree "$TREE" -m "Snapshot ${STAMP} (gitea ${SHORT})")

git push --force "$REMOTE" "${COMMIT}:refs/heads/${BRANCH}"

echo "Pushed orphan snapshot ${COMMIT} (tree of ${SHORT}) to ${REMOTE}/${BRANCH}"
