# My Dev Stack Template

Cross-platform Node 22 starter with Doppler + Amp automation for quick project spins.

## What’s Included

- Devcontainer (`.devcontainer/devcontainer.json`) with Node 22, Amp CLI, Doppler CLI, and GitHub CLI helpers
- `scripts/bootstrap-doppler.sh` for creating/linking Doppler projects with seeded secrets
- `npm run dev` wired through `doppler run -- node …` so secrets load automatically
- Git ignores and sample env file to keep local state tidy

## Quick Start

1. Use the GitHub template to create your repo.
2. Clone locally, open in VS Code/Cursor, and select “Reopen in Container.”
3. (Optional) Export any tokens before reopening: `AMP_API_KEY`, `GITHUB_TOKEN`, `DOPPLER_MANAGEMENT_TOKEN`.
4. Inside the container run `./scripts/bootstrap-doppler.sh` to create/link a Doppler project.
5. Follow the prompts to log into Doppler and add real secrets.
6. Start developing: `npm install` then `npm run dev`.

Full step-by-step instructions (including macOS/Windows notes) live in [`set-up.md`](./set-up.md).

## Key Commands

```bash
# create Doppler project/config, seed secrets, link repo
./scripts/bootstrap-doppler.sh

# run app with Doppler-managed secrets
npm run dev

# fallback without Doppler
npm run dev:plain
```

## Notes

- Secrets belong in Doppler (preferred) or `.env` (git-ignored).
- `gh auth login` prompts appear after container start; supply `GITHUB_TOKEN`/`GH_PAT` to automate.
- Amp automation runs when `AMP_API_KEY` is present; otherwise run `amp login` manually.

Need MCP support? See [InboundSocial/mcp-template](https://github.com/InboundSocial/mcp-template).
