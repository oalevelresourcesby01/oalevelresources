#!/bin/bash
# Commit all changes and push to GitHub → triggers Render deploy
set -e

MSG=${1:-"Update $(date '+%Y-%m-%d %H:%M')"}

echo "→ Staging all changes..."
git add -A

if git diff --cached --quiet; then
  echo "✓ Nothing to commit — already up to date"
  exit 0
fi

echo "→ Committing: $MSG"
git commit -m "$MSG"
# post-commit hook handles the push automatically
