# Security & Secrets Management

## 🔐 How Secrets Work in This Project

This project uses **Doppler** to manage secrets securely. Secrets are **never** stored in:

- ✅ Git repository
- ✅ Environment variable files committed to GitHub
- ✅ Your shell profile (unless you explicitly choose the CI/CD method)

## 🔑 Personal Auth (Recommended for Development)

### How It Works

1. Run `./scripts/doppler-login.sh` once per machine
2. Authenticate via browser (OAuth)
3. Your personal token is stored in `~/.doppler/.doppler.yaml` (NOT in the project)
4. The project remembers: "use 1000x-agent/dev from Doppler"
5. `npm run dev` automatically loads secrets via `doppler run`

### Security Benefits

- ✅ No tokens in your shell profile
- ✅ No tokens in environment variables
- ✅ Easy to revoke from Doppler Dashboard
- ✅ Each machine authenticates independently
- ✅ Secrets stay in Doppler's secure vault

### Where Secrets Are Stored

```
~/.doppler/.doppler.yaml  ← Your personal auth (not in git)
├─ Personal token (expires, can be revoked)
└─ Workspace mapping: /workspaces/1000x-Agent → 1000x-agent/dev

Doppler Cloud (doppler.com)
├─ 1000x-agent project
   └─ dev config
      ├─ NODE_ENV=development
      ├─ PORT=3000
      ├─ AMP_API_KEY=your_key
      ├─ SUPABASE_KEY=your_key
      └─ ... more secrets
```

## 🔄 Service Token (For CI/CD Only)

If you need non-interactive access (GitHub Actions, deployment servers):

1. Create a **Service Token** in Doppler Dashboard
2. Set it as a secret in your CI/CD platform:
   ```bash
   # GitHub Actions: Settings → Secrets → Actions
   DOPPLER_TOKEN=dp.st.dev.YOUR_TOKEN
   DOPPLER_PROJECT=1000x-agent
   DOPPLER_CONFIG=dev
   ```
3. Use in CI workflow:
   ```yaml
   - name: Run with secrets
     env:
       DOPPLER_TOKEN: ${{ secrets.DOPPLER_TOKEN }}
       DOPPLER_PROJECT: ${{ secrets.DOPPLER_PROJECT }}
       DOPPLER_CONFIG: ${{ secrets.DOPPLER_CONFIG }}
     run: npm run dev
   ```

## 🚨 What to Do If a Token Leaks

### If Personal Token Leaks

1. Go to Doppler Dashboard → Account Settings
2. Click "Log out all sessions"
3. Re-run `./scripts/doppler-login.sh` on your machines

### If Service Token Leaks

1. Go to Doppler Dashboard → 1000x-agent → Service Tokens
2. Delete the leaked token
3. Create a new one
4. Update your CI/CD secrets

## ✅ Security Checklist

- [x] `.env` is in `.gitignore`
- [x] `.doppler.yaml` is in `.gitignore`
- [x] Service tokens have minimal permissions (read-only when possible)
- [x] Personal auth used for development
- [x] Service tokens only in CI/CD platforms
- [x] Regular token rotation (every 90 days recommended)

## 📚 Learn More

- [Doppler Best Practices](https://docs.doppler.com/docs/best-practices)
- [Token Types Explained](https://docs.doppler.com/docs/service-tokens)
- [Revoking Access](https://docs.doppler.com/docs/workplace-access-controls)
