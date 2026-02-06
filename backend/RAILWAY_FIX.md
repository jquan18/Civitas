# Railway Deployment Fix - Build Error Resolution

**Error**: "Error creating build plan with Railpack"

**Root Cause**: Railway is trying to auto-detect the build but having issues with Dockerfile

**Solution**: Use Railway's web interface to trigger a redeploy with Nixpacks

---

## 🔧 Quick Fix (Via Railway Dashboard)

### Step 1: Open Railway Dashboard

```bash
railway open
```

Or go to: https://railway.com/project/e5a03a26-4ff4-44f5-a6fd-5b8ebe85940f

### Step 2: Find Your Service

You should see a service in the project (might be named "backend" or auto-generated name).

### Step 3: Check Current Settings

Click on the service, then go to **Settings** tab.

### Step 4: Change Build Settings

Look for **"Build"** or **"Deploy"** section:

1. **Build Method**: Change to **"Nixpacks"** (not Dockerfile)
2. **Root Directory**: Should be `/backend` or leave empty if already in backend
3. **Build Command**: `pnpm build`
4. **Start Command**: `node dist/index.js`

### Step 5: Trigger Redeploy

Go to **Deployments** tab and click **"Redeploy"** on the latest deployment.

---

## 🛠️ Alternative: Delete Service and Recreate

If the above doesn't work:

### Option A: Delete and Redeploy from CLI

1. **Delete the current service** in Railway dashboard (Settings → Danger Zone → Delete Service)

2. **Navigate to backend directory**:
   ```bash
   cd /Users/johnnytan5/Documents/Civitas/backend
   ```

3. **Create a new deployment**:
   ```bash
   # Make sure nixpacks.toml exists
   ls nixpacks.toml

   # Deploy (Railway will auto-detect Nixpacks)
   railway up
   ```

### Option B: Use GitHub Integration (Recommended)

This is more reliable than CLI uploads:

1. **Push backend to GitHub** (if not already):
   ```bash
   cd /Users/johnnytan5/Documents/Civitas
   git add backend/
   git commit -m "feat: configure backend for Railway with Nixpacks"
   git push origin main
   ```

2. **In Railway Dashboard**:
   - Click "New Service"
   - Select "GitHub Repo"
   - Choose your repository
   - **Important**: Set root directory to `/backend`
   - Deploy

3. **Railway will automatically**:
   - Detect `nixpacks.toml`
   - Install dependencies with pnpm
   - Build with swc
   - Start the server

---

## 📋 Files Created for Railway

I've created these configuration files:

### `nixpacks.toml` (NEW - Railway's default builder)
```toml
[phases.setup]
nixPkgs = ["nodejs-20_x", "pnpm"]

[phases.install]
cmds = ["pnpm install"]

[phases.build]
cmds = ["pnpm build"]

[start]
cmd = "node dist/index.js"
```

This tells Railway:
- Use Node.js 20 and pnpm
- Run `pnpm install` and `pnpm build`
- Start with `node dist/index.js`

### Backups Created
- `Dockerfile.backup` - Original Dockerfile (still valid)
- `railway.json.backup` - Original Railway config

---

## 🔍 Why the Error Happened

Railway has multiple build systems:
1. **Dockerfile** - Custom Docker builds
2. **Nixpacks** - Railway's auto-detect system (faster, simpler)
3. **Buildpacks** - Heroku-style builds

The error "creating build plan with Railpack" suggests Railway tried to use its auto-detection but got confused by multiple config files.

**Solution**: Use Nixpacks explicitly with `nixpacks.toml`.

---

## ✅ Verification Steps

After redeployment succeeds:

### 1. Check Deployment Logs

In Railway dashboard, go to **Deployments** → Click on latest deployment → View logs

Look for:
```
✓ Installing dependencies with pnpm
✓ Building with swc
✓ Successfully compiled: 38 files
✓ Starting server...
Server running { port: 3001, environment: 'production' }
```

### 2. Test Health Endpoint

```bash
curl https://civitas-production-4c27.up.railway.app/health
```

Expected:
```json
{
  "status": "ok",
  "timestamp": "2026-02-06T...",
  "environment": "production"
}
```

### 3. Check Environment Variables Are Set

In Railway dashboard → Service → Variables

Verify all 8 variables are present:
- ✅ NODE_ENV
- ✅ PORT
- ✅ FRONTEND_URL
- ✅ BASE_RPC_URL
- ✅ CIVITAS_FACTORY_ADDRESS
- ✅ NEXT_PUBLIC_SUPABASE_URL
- ✅ NEXT_PUBLIC_SUPABASE_ANON_KEY
- ✅ SUPABASE_SERVICE_ROLE_KEY

---

## 🎯 Recommended Approach

**For fastest deployment, use GitHub integration**:

1. Commit the changes:
   ```bash
   cd /Users/johnnytan5/Documents/Civitas
   git add backend/nixpacks.toml
   git commit -m "feat: add Nixpacks config for Railway"
   git push origin main
   ```

2. In Railway dashboard:
   - Delete current failing service (if exists)
   - New Service → GitHub Repo → Select "Civitas" repo
   - Set root directory: `/backend`
   - Deploy

3. Add environment variables (you already did this, just verify they're there)

4. Wait 2-3 minutes for build

5. Test health endpoint

---

## 🆘 If Still Failing

Share the error message from Railway deployment logs and I can help debug further.

Common issues:
- **Missing environment variables**: Check all 8 are set
- **Wrong root directory**: Should be `/backend` or empty if CLI is in backend dir
- **pnpm version mismatch**: Nixpacks should handle this automatically
- **Build timeout**: Increase timeout in Settings

---

## 📞 Quick Commands

```bash
# Open Railway dashboard
railway open

# Check current deployment status
railway status

# View logs (if service is linked)
railway logs --tail 50

# Redeploy via CLI (after fixing)
railway up

# Get domain
railway domain
```

---

**Your backend URL** (once deployed): `https://civitas-production-4c27.up.railway.app`

Let me know which approach you want to try and I can guide you through it!
