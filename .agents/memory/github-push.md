---
name: GitHub push setup
description: How GitHub pushing is configured for this project
---

# GitHub Push Setup

## Remote
- Origin: `https://github.com/oalevelresourcesby01/oalevelresources`
- Remote URL updated to embed PAT: `https://x-access-token:${GITHUB_TOKEN}@github.com/oalevelresourcesby01/oalevelresources.git`

## How to push
- Token stored in `GITHUB_TOKEN` Replit secret
- Git user: `Replit Agent <replit-agent@users.noreply.github.com>`
- Push with: `git push origin main` (token is embedded in remote URL)
- Or use `gitPush({})` callback from the git-remote skill

**Why:** User wants all file edits synced directly to GitHub. The remote URL includes the token for seamless pushes without interactive auth prompts.

**How to apply:** After every set of edits, commit and push. The remote URL is persistent in the git config for this session, but note that `GITHUB_TOKEN` must remain in secrets for the URL to work after resets.
