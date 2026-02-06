# ✅ Backend Deployment - Almost Complete!

**Your Backend URL**: https://civitas-production-4c27.up.railway.app

**Status**: Deployed, but needs environment variables

---

## 🎯 What's Done

✅ Railway project created
✅ Backend code deployed
✅ Domain generated: `https://civitas-production-4c27.up.railway.app`
⚠️ Environment variables need to be added via Railway dashboard

---

## 📋 Next Step: Add Environment Variables

### Method 1: Via Railway Dashboard (Recommended)

1. **Open Railway Dashboard**:
   ```bash
   railway open
   ```
   Or go to: https://railway.com/project/e5a03a26-4ff4-44f5-a6fd-5b8ebe85940f

2. **Click on your service** (should be named "backend" or "Civitas")

3. **Go to "Variables" tab**

4. **Click "Raw Editor" button** (top right)

5. **Paste this entire block**:
   ```env
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://civitas.app

BASE_RPC_URL=https://sepolia.base.org
CIVITAS_FACTORY_ADDRESS=0xa44EbCC68383fc6761292A4D5Ec13127Cc123B56

NEXT_PUBLIC_SUPABASE_URL=https://rauowpwmuscewwffpocn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhdW93cHdtdXNjZXd3ZmZwb2NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5NTM3NDgsImV4cCI6MjA4NTUyOTc0OH0.FuLlRVpOQraz5yiqa9jIOWqpeYC4v0hd4nO0oUSxeo4
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhdW93cHdtdXNjZXd3ZmZwb2NuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTk1Mzc0OCwiZXhwIjoyMDg1NTI5NzQ4fQ.kEibEnU3OB9JHlfL8pm9ZHBYRrWfc-eP-xz1cUXINto
   ```

6. **Click "Save"** (or "Update Variables")

7. **Wait 1-2 minutes** - Railway will automatically redeploy with new environment variables

### Method 2: One Variable at a Time

If Raw Editor doesn't work, add them individually:

1. Click "New Variable" button
2. For each variable below, add:
   - **Name**: Variable name
   - **Value**: Variable value

| Name | Value |
|------|-------|
| `NODE_ENV` | `production` |
| `PORT` | `3001` |
| `FRONTEND_URL` | `https://civitas.app` |
| `BASE_RPC_URL` | `https://sepolia.base.org` |
| `CIVITAS_FACTORY_ADDRESS` | `0xa44EbCC68383fc6761292A4D5Ec13127Cc123B56` |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://rauowpwmuscewwffpocn.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhdW93cHdtdXNjZXd3ZmZwb2NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5NTM3NDgsImV4cCI6MjA4NTUyOTc0OH0.FuLlRVpOQraz5yiqa9jIOWqpeYC4v0hd4nO0oUSxeo4` |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhdW93cHdtdXNjZXd3ZmZwb2NuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTk1Mzc0OCwiZXhwIjoyMDg1NTI5NzQ4fQ.kEibEnU3OB9JHlfL8pm9ZHBYRrWfc-eP-xz1cUXINto` |

---

## 🔍 Verify Deployment

### Step 1: Wait for Redeploy

After adding environment variables, Railway will automatically redeploy (1-2 minutes).

### Step 2: Check Health Endpoint

```bash
curl https://civitas-production-4c27.up.railway.app/health
```

**Expected Response**:
```json
{
  "status": "ok",
  "timestamp": "2026-02-06T...",
  "environment": "production"
}
```

### Step 3: Check Logs

```bash
railway logs --tail 50
```

**Look for these success messages**:
```
Server running { port: 3001, environment: 'production' }
Cron jobs registered successfully
CivitasFactory event listener started (polling) {
  fromBlock: ...,
  factoryAddress: '0xa44ebcc68383fc6761292a4d5ec13127cc123b56'
}
All services initialized successfully
```

### Step 4: Test API Endpoints

```bash
# Test templates endpoint
curl https://civitas-production-4c27.up.railway.app/api/templates

# Expected: JSON array of templates
```

---

## 🎯 What These Environment Variables Do

### Server Configuration
- `NODE_ENV=production` - Runs in production mode
- `PORT=3001` - Backend listens on port 3001 (Railway auto-routes)
- `FRONTEND_URL=https://civitas.app` - CORS allowed origin (wide open for hackathon)

### Blockchain Configuration (Base Sepolia Testnet)
- `BASE_RPC_URL=https://sepolia.base.org` - RPC endpoint for Base Sepolia
- `CIVITAS_FACTORY_ADDRESS=0xa44E...3B56` - Factory contract on Base Sepolia

**Network Details**:
- Chain ID: 84532 (Base Sepolia Testnet)
- Free testnet - no real money
- Factory verified: https://sepolia.basescan.org/address/0xa44EbCC68383fc6761292A4D5Ec13127Cc123B56

### Supabase Database
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Public anon key (safe to expose)
- `SUPABASE_SERVICE_ROLE_KEY` - Admin key (backend only, NEVER expose to frontend!)

---

## 🚀 Next: Update Frontend

Once backend is verified working, update your frontend environment variables in Vercel:

```env
NEXT_PUBLIC_BACKEND_URL=https://civitas-production-4c27.up.railway.app
```

**In Vercel Dashboard**:
1. Go to your project settings
2. Environment Variables
3. Edit `NEXT_PUBLIC_BACKEND_URL`
4. Set value to: `https://civitas-production-4c27.up.railway.app`
5. Save and redeploy

---

## 📊 Monitoring

### Real-Time Logs
```bash
railway logs --follow
```

### Check Deployment Status
```bash
railway status
```

### Open Dashboard
```bash
railway open
```

---

## ⚠️ Troubleshooting

### Issue: Health endpoint returns 502

**Cause**: Environment variables not set or backend crashed

**Fix**:
```bash
# Check logs for errors
railway logs --tail 100

# Common issues:
# - Missing SUPABASE_SERVICE_ROLE_KEY
# - Missing BASE_RPC_URL
# - Syntax error in environment variables
```

### Issue: "Missing required environment variables"

**Cause**: Not all variables were added

**Fix**: Double-check all 8 variables are set in Railway dashboard

### Issue: Event listener not starting

**Cause**: Wrong factory address or RPC URL

**Fix**: Verify these match:
- `BASE_RPC_URL=https://sepolia.base.org`
- `CIVITAS_FACTORY_ADDRESS=0xa44EbCC68383fc6761292A4D5Ec13127Cc123B56`

### Issue: CORS errors from frontend

**Cause**: Backend CORS is configured to allow all origins (`*`)

**Expected**: Should work from any domain (hackathon mode)

If still issues, check:
```bash
railway logs | grep CORS
```

---

## 📝 Summary

✅ **Completed**:
- Backend deployed to Railway
- Domain generated: `https://civitas-production-4c27.up.railway.app`
- CORS configured for hackathon (allow all origins)
- Build system fixed (using swc)

⏳ **In Progress**:
- Add environment variables via Railway dashboard (you need to do this)

🔜 **Next Steps**:
1. Add environment variables (see above)
2. Verify health endpoint works
3. Update frontend `NEXT_PUBLIC_BACKEND_URL`
4. Test end-to-end (frontend → backend → blockchain)

---

## 🎉 Almost There!

Your backend is deployed and ready. Just add the environment variables via the Railway dashboard and you're done!

**Quick Link**: https://railway.com/project/e5a03a26-4ff4-44f5-a6fd-5b8ebe85940f

After adding variables, test:
```bash
curl https://civitas-production-4c27.up.railway.app/health
```

Good luck with the hackathon! 🚀
