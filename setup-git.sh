#!/bin/bash
# Sets up git credential helper (reads GITHUB_TOKEN from env) and installs
# the post-commit auto-push hook. Run once after cloning, or after any
# Replit restart where git config may have been reset.
set -e

# ── 1. Credential helper ──────────────────────────────────────────────────────
# Reads GITHUB_TOKEN from the environment at push time; never stores the token
# in any file on disk.
git config --global credential.helper \
  '!f() { echo "username=x-access-token"; echo "password=${GITHUB_TOKEN}"; }; f'
echo "✓ Credential helper configured"

# ── 2. Post-commit hook ───────────────────────────────────────────────────────
HOOK=".git/hooks/post-commit"
cat > "$HOOK" << 'HOOK_EOF'
#!/bin/sh
BRANCH=$(git symbolic-ref --short HEAD 2>/dev/null)
if [ -z "$BRANCH" ]; then
  echo "✗ Auto-push skipped: detached HEAD"
  exit 0
fi
echo "→ Auto-pushing $BRANCH to GitHub..."
git push origin "$BRANCH" 2>&1
if [ $? -eq 0 ]; then
  echo "✓ Pushed to GitHub (Render will auto-deploy)"
else
  echo "✗ Push failed — run: git push origin $BRANCH"
fi
HOOK_EOF
chmod +x "$HOOK"
echo "✓ post-commit hook installed"

echo ""
echo "Git auto-sync is ready. Every commit will push to GitHub automatically."
echo "Or run:  bash sync.sh \"your message\""
