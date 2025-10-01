# Set up this template

Follow these steps to create a new repo from this template and get running locally with Doppler and Amp.

## Prerequisites (Mac & Windows)

- VS Code with the Dev Containers extension installed.
- Docker Desktop running (Windows requires WSL 2 enabled and the WSL integration for Docker).
- Git installed locally; GitHub CLI is optional but recommended for quick template cloning.
- Access to Doppler (project + config) and Amp (API key available from the Amp dashboard).
- If you plan to work outside the devcontainer, install Node.js 22.x, Amp CLI, and the Doppler CLI locally.

## 1) Create a repo from the template

- GitHub UI: Click "Use this template" → "Create a new repository".
- GitHub CLI:

```bash
gh repo create YOUR_ORG/YOUR_REPO --template InboundSocial/my-dev-stack --public
gh repo clone YOUR_ORG/YOUR_REPO
cd YOUR_REPO
```

## 2) Open in VS Code/Cursor and reopen in container

When prompted, choose "Reopen in Container". The devcontainer uses Node 22 and installs the Amp, Doppler, and GitHub CLIs automatically. On Windows, confirm Docker Desktop is running and that VS Code is connected to WSL.

If you need to install manually inside the container:

```bash
# Amp CLI
curl -fsSL https://ampcode.com/install.sh | bash

# Doppler CLI
curl -Ls --tlsv1.2 --proto "=https" --retry 3 https://cli.doppler.com/install.sh | sudo sh
```

## 3) Bootstrap Doppler (recommended)

1. **Export a management token on your host before reopening the container.** This must be a Doppler service token with Project Admin rights (create it once in Doppler, then reuse). Example:

   ```bash
   # macOS/Linux terminal (before VS Code "Reopen in Container")
   export DOPPLER_MANAGEMENT_TOKEN=dp.st.your_management_token
   ```

   On Windows PowerShell:

   ```powershell
   $env:DOPPLER_MANAGEMENT_TOKEN = "dp.st.your_management_token"
   ```

2. **Inside the devcontainer terminal, run the bootstrap script:**

   ```bash
   ./scripts/bootstrap-doppler.sh
   ```

   The script:

   - Prompts for the Doppler project/config names (defaults use the repo folder).
   - Creates them if they do not already exist.
   - Seeds secrets from `env.sample` (placeholder values).
   - Runs `doppler setup` so `.doppler.yaml` points to the chosen project/config.
   - Reminds you to run `doppler login` if you still need to authenticate personally.

If you prefer to manage Doppler manually, skip the script and follow the fallback in the next section.

## 4) Link this repo to a Doppler Project/Config (manual fallback)

```bash
doppler login
doppler setup
# pick or create a Project (e.g. my-new-app) and Config (e.g. dev)
```

Notes:

- This creates `.doppler.yaml` locally (ignored by git) so commands default to your selection.
- To specify explicitly: `doppler setup -p MY_PROJECT -c dev`.

If you open the project outside of VS Code devcontainers, run the same install commands on your host OS. The Amp login prompt expects an API key; the devcontainer post-create script will automatically log you in when `AMP_API_KEY` is present in the environment. The same hook will attempt to authenticate the GitHub CLI using a Doppler secret (`GITHUB_TOKEN`) or environment variable (`GITHUB_TOKEN`/`GH_PAT`).

```bash
# optional: export locally before reopening the container
export GITHUB_TOKEN=ghp_...
export AMP_API_KEY=amp_...
```

### Windows & Mac note

- Windows: ensure `wsl --install` (WSL 2) has completed, reboot if required, and enable Docker Desktop → Settings → Resources → WSL Integration for your default distro.
- Mac/Linux: confirm `/usr/local/bin` is on your `PATH` so the CLIs are reachable.

## 5) Add your secrets to Doppler

Use these as examples (check `env.sample` and your app’s needs):

```bash
doppler secrets set AMP_API_KEY=your_amp_api_key
doppler secrets set DATABASE_URL=postgres://USER:PASS@HOST:5432/DBNAME
doppler secrets set API_KEY=your_api_key
doppler secrets set PORT=3000
doppler secrets set NODE_ENV=development
```

Verify:

```bash
doppler secrets
doppler run -- env | grep -E '^(AMP_API_KEY|DATABASE_URL|API_KEY|PORT|NODE_ENV)='
amp whoami
```

If `amp whoami` fails, ensure `AMP_API_KEY` is present in Doppler or exported locally before rerunning the devcontainer build. Likewise, `gh auth status` should confirm GitHub CLI authentication; if unauthenticated, either set `GITHUB_TOKEN`/`GH_PAT` in Doppler or run `gh auth login` manually when prompted.

## 6) Run the app

```bash
npm install
npm run dev        # runs via: doppler run -- node src/index.js
# fallback (without Doppler):
npm run dev:plain  # uses .env if present
```

Test it:

```bash
curl http://localhost:3000
# -> {"ok":true,"env":"dev"}
```

## 7) Use Amp (terminal agent)

Interactive:

```bash
amp
```

Non‑interactive examples:

```bash
echo "What is today's date?" | amp
echo "what files in this folder are markdown?" | amp -x "answer"
```

If running in CI or headless shells, set:

```bash
export AMP_API_KEY=your-api-key-here
```

To align with the template automation, either populate `AMP_API_KEY` in Doppler (preferred) or export it locally before reopening the devcontainer. The post-create hook pipes the key into `amp login`, and you can verify with `amp whoami`.

Reference: Amp install manual — https://ampcode.com/manual#install

## 8) CI (optional quick note)

- Create a Doppler Service Token scoped to your Project/Config.
- In CI, export it (e.g. as `DOPPLER_TOKEN`) and run steps with `doppler run -- <command>`.
