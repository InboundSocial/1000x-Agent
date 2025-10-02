# Quick Start Guide

## 🚀 First Time Setup (Mac or PC)

### 1. Clone and Open

```bash
git clone https://github.com/YOUR_USERNAME/1000x-Agent
cd 1000x-Agent
code .  # or cursor .
```

### 2. Reopen in Container

When prompted, click "Reopen in Container"

### 3. Login to Doppler (One Time Per Machine)

```bash
# Inside the container terminal
doppler login
# This opens your browser - authenticate with Doppler

# Link this project to Doppler
doppler setup --project 1000x-agent --config dev
```

### 4. Verify Secrets Work

```bash
# Check secrets are accessible
doppler secrets get NODE_ENV --plain
# Should print: development

# Test in Node
doppler run -- node -e 'console.log({NODE_ENV:process.env.NODE_ENV, PORT:process.env.PORT})'
# Should show: { NODE_ENV: 'development', PORT: '3000' }
```

### 5. Run the App

```bash
npm install
npm run dev
```

### 6. Test

```bash
curl http://localhost:3000
# Should return: {"ok":true,"env":"dev"}
```

---

## 🔄 Daily Workflow

### Opening the Project

```bash
# Pull latest changes
git pull

# Open in VS Code/Cursor
code .

# Reopen in Container (if not already)

# Run the app - Doppler auth persists!
npm run dev
```

**No need to login again!** Your Doppler authentication is saved in `~/.doppler/.doppler.yaml` inside the container and persists across container rebuilds.

---

## 🔐 Security Notes

- ✅ Your personal Doppler auth is stored securely in `~/.doppler/` (NOT in git)
- ✅ No tokens in your shell profile or environment variables
- ✅ Each machine authenticates independently via browser
- ✅ You can revoke access anytime from Doppler Dashboard

---

## 🆘 Troubleshooting

### "Unable to download secrets"

```bash
# Re-authenticate
doppler login
doppler setup --project 1000x-agent --config dev
```

### Check what project/config you're using

```bash
doppler configure get
```

### Update a secret value

```bash
doppler secrets set API_KEY=your_new_value
```

### View all secrets

```bash
doppler secrets
```

---

## 📝 Managing Secrets

### From Command Line

```bash
# Set a secret
doppler secrets set AMP_API_KEY=your_real_key

# Get a secret
doppler secrets get AMP_API_KEY --plain

# Delete a secret
doppler secrets delete UNUSED_KEY
```

### From Dashboard

1. Go to https://dashboard.doppler.com
2. Select `1000x-agent` project → `dev` config
3. Add/edit/delete secrets in the UI

Changes are immediately available - just restart your app!

---

## 🔄 Switching Machines

When you switch from Mac to PC (or vice versa):

1. Push changes: `git push`
2. On other machine: `git pull`
3. Open in container
4. **First time only**: `doppler login` + `doppler setup`
5. Run: `npm run dev`

That's it! 🎉
