# My Dev Stack Template

Cross-platform Node 22 starter with Doppler + Amp automation for quick project spins.

## What’s Included

- Devcontainer (`.devcontainer/devcontainer.json`) with Node 22, Amp CLI, Doppler CLI, and GitHub CLI helpers
- `scripts/bootstrap-doppler.sh` for creating/linking Doppler projects with seeded secrets
- `npm run dev` wired through `doppler run -- node …` so secrets load automatically
- Git ignores and sample env file to keep local state tidy

## Quick Start (Secure Method)

1. Use the GitHub template to create your repo.
2. Clone locally, open in VS Code/Cursor, and select "Reopen in Container."
3. Inside the container, run the login script:
   ```bash
   ./scripts/doppler-login.sh
   ```
4. Authenticate in your browser when prompted.
5. Start developing: `npm install` then `npm run dev`.

**See [`QUICKSTART.md`](./QUICKSTART.md) for detailed instructions.**

### Alternative: Automated Setup for CI/CD

For non-interactive environments, export tokens before reopening: `AMP_API_KEY`, `GITHUB_TOKEN`, `DOPPLER_TOKEN`.
Full step-by-step instructions (including macOS/Windows notes) live in [`set-up.md`](./set-up.md).

## Key Commands

```bash
# Login to Doppler (first time on each machine)
./scripts/doppler-login.sh

# Run app with Doppler-managed secrets
npm run dev

# Manage secrets
doppler secrets                    # list all
doppler secrets set KEY=value      # update
doppler secrets get KEY --plain    # view one

# Fallback without Doppler
npm run dev:plain
```

## Notes

- Secrets belong in Doppler (preferred) or `.env` (git-ignored).
- `gh auth login` prompts appear after container start; supply `GITHUB_TOKEN`/`GH_PAT` to automate.
- Amp automation runs when `AMP_API_KEY` is present; otherwise run `amp login` manually.

Need MCP support? See [InboundSocial/mcp-template](https://github.com/InboundSocial/mcp-template).
