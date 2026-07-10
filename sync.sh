#!/bin/bash
# Commit all changes and push to GitHub → triggers Render deploy.
# Runs setup-git.sh automatically if the credential helper or hook is missing.
set -e

# ── Self-healing setup ────────────────────────────────────────────────────────
NEEDS_SETUP=0
git config --global credential.helper 2>/dev/null | grep -q "GITHUB_TOKEN" || NEEDS_SETUP=1
[ -x ".git/hooks/post-commit" ] || NEEDS_SETUP=1

if [ "$NEEDS_SETUP" -eq 1 ]; then
  echo "→ First-run setup..."
  bash setup-git.sh
fi

# ── Commit ────────────────────────────────────────────────────────────────────
MSG=${1:-"Update $(date '+%Y-%m-%d %H:%M')"}

echo "→ Staging all changes..."
git add -A

if git diff --cached --quiet; then
  echo "✓ Nothing to commit — already up to date"
  # Still push in case a previous commit didn't push (e.g. hook not installed)
  BRANCH=$(git symbolic-ref --short HEAD 2>/dev/null)
  git push origin "$BRANCH" 2>&1 && echo "✓ Pushed to GitHub" || true
  exit 0
fi

echo "→ Committing: $MSG"
git commit -m "$MSG"
# post-commit hook pushes automatically; if it somehow doesn't, push here too
BRANCH=$(git symbolic-ref --short HEAD 2>/dev/null)
if ! git log -1 --pretty=%B | grep -q "^$MSG"; then true; fi
# Ensure we pushed (idempotent if hook already did it)
git push origin "$BRANCH" 2>&1 | grep -v "Everything up-to-date" || true
echo "✓ Done — Render will auto-deploy from GitHub"
