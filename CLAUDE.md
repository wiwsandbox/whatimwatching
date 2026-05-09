@AGENTS.md

# Deployment workflow

This is a live web app with real users. Changes go live by **committing and pushing to the `main` branch on GitHub**. Vercel auto-deploys on every push — no manual steps needed.

**The correct workflow for every feature or fix:**
1. Edit files in `/Users/connor/whatimwatching/`
2. `git add` the changed files
3. `git commit` with a clear message
4. `git push origin main`

That's it. Users see the change within ~2 minutes.

**Do NOT spend time trying to run a local dev server to verify changes.** The preview tool is unreliable in this setup and is not part of the deployment path. If a local preview is needed for a specific reason, ask the user first — otherwise just push.

Connor never needs to run terminal commands himself. Always handle git add/commit/push directly.
