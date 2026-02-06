# Railway Build Fix - Root Directory Issue

## ❌ Problem Identified

Railway is trying to build from the repository root (`/`) instead of the backend directory (`/backend`).

From the logs:
```
The app contents that Railpack analyzed contains:
./
├── backend/
├── contracts/
├── frontend/
...
```

Railway is looking at the entire monorepo and doesn't know which directory to build.

## ✅ Solution: Set Root Directory

You need to tell Railway to use `/backend` as the root directory.

### Via Railway Dashboard (Easiest)

1. **Open Railway dashboard**:
   ```bash
   railway open
   ```

2. **Click on "Civitas" service**

3. **Go to Settings tab**

4. **Find "Service Settings" or "Root Directory" section**

5. **Set Root Directory**:
   ```
   backend
   ```
   (without leading slash)

6. **Scroll down and click "Save"** or the settings auto-save

7. **Go to Deployments tab**

8. **Click "Redeploy"** on the latest deployment

### Via CLI

Unfortunately the CLI doesn't have a direct command to set root directory. You must use the dashboard.

## 🔍 What Should Happen After Fix

Once you set `backend` as the root directory and redeploy:

```
The app contents that Railpack analyzed contains:

./
├── src/
├── dist/
├── node_modules/
├── package.json
├── nixpacks.toml
├── railway.toml
└── ...
```

Railway will now see the Node.js app and build correctly!

## 📋 Expected Build Process

After setting root directory:

1. ✅ Railpack detects Node.js (sees package.json)
2. ✅ Reads nixpacks.toml configuration
3. ✅ Installs dependencies: `pnpm install`
4. ✅ Builds app: `pnpm build`
5. ✅ Starts server: `node dist/index.js`

## 🎯 Alternative: Deploy from Backend Directory Only

If Railway keeps having issues, you can deploy ONLY the backend directory:

### Option A: Create Separate Git Repo for Backend

```bash
# Create new repo for backend only
cd /Users/johnnytan5/Documents/Civitas/backend
git init
git add .
git commit -m "Initial backend commit"

# Create new GitHub repo and push
git remote add origin https://github.com/yourusername/civitas-backend.git
git push -u origin main
```

Then connect Railway to this new repo.

### Option B: Use Railway CLI from Backend Directory

Make sure you're in the backend directory:

```bash
cd /Users/johnnytan5/Documents/Civitas/backend
pwd  # Should show: /Users/johnnytan5/Documents/Civitas/backend

railway up
```

But this won't work until Railway knows about the root directory setting.

## 🚀 Quick Fix Steps

1. `railway open`
2. Click "Civitas" service → Settings
3. Find "Root Directory" field
4. Enter: `backend`
5. Save
6. Deployments tab → Click "Redeploy"
7. Wait 2-3 minutes
8. Check logs: `railway logs --tail 50`

## ✅ Verification

After successful deployment:

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

---

**The fix is simple: Set "Root Directory" to `backend` in Railway dashboard!**
