---
name: GitHub auto-sync setup
description: How GitHub push auth is configured and how auto-sync works in this project
---

# GitHub Auto-Sync

## Rule
Never embed the GITHUB_TOKEN in the git remote URL. Use a git credential helper that reads from the env var at push time.

**Why:** Token in remote URL is stored in `.git/config` and can leak in logs/screenshots. Credential helper reads the env var only at push time, never writes it to disk.

**How to apply:** If git auth ever breaks (e.g. after a Replit restart), re-run:
```sh
git config --global credential.helper '!f() { echo "username=x-access-token"; echo "password=${GITHUB_TOKEN}"; }; f'
```
The remote URL must be the plain HTTPS form: `https://github.com/oalevelresourcesby01/oalevelresources.git`

## Auto-push mechanism
- `.git/hooks/post-commit` — pushes current branch to origin after every commit
- `sync.sh` — stages all, commits with optional message, relies on hook to push
- Hook uses `git symbolic-ref --short HEAD` to get current branch (not hardcoded `main`)

## Caution
The global git config credential helper may not persist across Replit restarts. If pushes fail, re-run the `git config --global credential.helper` command above.
